-- Cliente cancelou pelo link público / Minha Área: o dono (e o profissional com acesso) recebe aviso
-- no sino e o "Novo pedido" pendente daquele pedido deixa de contar (fica lido).
--   1. Nova função interna notify_booking_cancelled_by_client(public_bookings, boolean)
--      (SECURITY DEFINER, search_path=public, só service_role executa).
--   2. cancel_public_booking_by_client_v2(uuid,text) = definição de produção (10/11/2026) + chamada
--      do aviso num bloco protegido (falha no aviso nunca impede o cancelamento).
--      CREATE OR REPLACE mantém assinatura, dono, SECURITY DEFINER, search_path e grants (anon incluso).
-- Aviso: tipo 'warning' (já permitido em notifications_type_check), event_key 'cancel:<id>', link /agenda.
-- Cancelamento pelo dono (recusa ou cancelar na agenda) não passa por aqui: sem aviso para si mesmo.
-- Idempotente. Rollback: docs/rollbacks/20261110090000_client_cancel_notifies_owner.rollback.sql

CREATE OR REPLACE FUNCTION public.notify_booking_cancelled_by_client(
  p_booking public.public_bookings,
  p_pending_edit boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service text;
  v_when text;
  v_person text;
  v_title text := 'Cancelado pelo cliente';
  v_message text;
  v_event text := 'cancel:' || p_booking.id::text;
  v_uid text;
BEGIN
  IF current_setting('agendix.fail_booking_notifications', true) = 'on' THEN
    RAISE EXCEPTION 'forced_notification_failure';
  END IF;

  -- Resolve os avisos pendentes deste pedido ("Novo pedido", "Novo agendamento",
  -- "Pedido de alteração") para todos os destinatários: deixam de contar no sino.
  UPDATE public.notifications n
     SET read = true
   WHERE n.booking_id = p_booking.id
     AND n.read = false
     AND n.event_key IN ('new:' || p_booking.id::text, 'edit:' || p_booking.id::text);

  v_service := public.booking_notification_service_label(p_booking.business_id, p_booking.service_ids);
  v_when := public.format_booking_notification_when(
    CASE WHEN p_pending_edit
      THEN COALESCE(p_booking.original_appointment_time, p_booking.appointment_time)
      ELSE p_booking.appointment_time END,
    p_booking.business_id
  );
  v_person := COALESCE(NULLIF(btrim(p_booking.customer_name), ''), 'Cliente');
  IF NULLIF(btrim(COALESCE(p_booking.attendee_name, '')), '') IS NOT NULL
     AND btrim(p_booking.attendee_name) IS DISTINCT FROM btrim(COALESCE(p_booking.customer_name, '')) THEN
    v_person := btrim(p_booking.attendee_name) || ' (responsável: ' || v_person || ')';
  END IF;
  v_message := 'Cliente cancelou: ' || v_person || ', ' || v_service || ', ' || v_when;

  PERFORM public.upsert_booking_notification(
    p_booking.business_id, v_title, v_message, 'warning', p_booking.id, v_event, '/agenda'
  );

  FOR v_uid IN
    SELECT DISTINCT tm.staff_user_id::text
    FROM public.team_members tm
    WHERE tm.id IN (p_booking.professional_id, p_booking.original_professional_id)
      AND tm.user_id = p_booking.business_id
      AND tm.active IS TRUE
      AND tm.deleted_at IS NULL
      AND tm.staff_user_id IS NOT NULL
  LOOP
    IF v_uid IS DISTINCT FROM p_booking.business_id THEN
      PERFORM public.upsert_booking_notification(
        v_uid, v_title, v_message, 'warning', p_booking.id, v_event, '/agenda'
      );
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_booking_cancelled_by_client(public.public_bookings, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_booking_cancelled_by_client(public.public_bookings, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_public_booking_by_client_v2(p_booking_id uuid, p_phone text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking public.public_bookings%ROWTYPE;
  v_cutoff integer;
  v_digits_in text;
  v_digits_stored text;
  v_updated integer;
  v_cutoff_time timestamptz;
  v_pending_edit boolean;
  v_auto_grace boolean;
BEGIN
  -- TODO(PR-9): depósito pago — ainda não há regra de cancelamento/reembolso.
  v_digits_in := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_digits_in = '' THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  SELECT * INTO v_booking
  FROM public.public_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  v_digits_stored := regexp_replace(COALESCE(v_booking.customer_phone, ''), '\D', '', 'g');
  IF v_digits_stored = '' OR v_digits_stored IS DISTINCT FROM v_digits_in THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.status IS DISTINCT FROM 'pending'
     AND v_booking.status IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  v_pending_edit := (v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false));
  v_cutoff_time := CASE
    WHEN v_pending_edit THEN COALESCE(v_booking.original_appointment_time, v_booking.appointment_time)
    ELSE v_booking.appointment_time
  END;

  IF NOT v_pending_edit AND v_booking.appointment_time <= now() THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  -- Auto-confirmado: o cliente pode cancelar online nos primeiros 15 minutos
  -- depois de agendar, mesmo dentro do prazo, enquanto o horário não chegou.
  -- A marca vem de tabela interna (o cliente não consegue forjar).
  v_auto_grace := v_cutoff_time > now() AND EXISTS (
    SELECT 1
    FROM public.public_booking_auto_confirmations ac
    WHERE ac.booking_id = v_booking.id
      AND ac.confirmed_at <= now()
      AND now() < ac.confirmed_at + interval '15 minutes'
  );

  IF (v_booking.status = 'confirmed' OR v_pending_edit) AND NOT v_auto_grace THEN
    SELECT bs.client_cancel_cutoff_hours
      INTO v_cutoff
    FROM public.business_settings bs
    WHERE bs.user_id::text = v_booking.business_id
    LIMIT 1;
    v_cutoff := COALESCE(v_cutoff, 2);

    IF v_cutoff <= 0
       OR now() > (v_cutoff_time - make_interval(hours => v_cutoff)) THEN
      RAISE EXCEPTION 'cancel_window_closed';
    END IF;
  END IF;

  UPDATE public.public_bookings
     SET status = 'cancelled',
         updated_at = NOW()
   WHERE id = v_booking.id
     AND status IN ('pending', 'confirmed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  -- Avisa o dono (e o profissional com acesso) e resolve o "Novo pedido" pendente.
  -- Falha no aviso nunca impede o cancelamento.
  BEGIN
    PERFORM public.notify_booking_cancelled_by_client(v_booking, v_pending_edit);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_booking_cancelled_by_client: %', SQLERRM;
  END;

  -- Libera a agenda. Pedido já está cancelled: #98 não reescreve (WHERE
  -- status = 'confirmed'); #123 retorna cedo para cancelled.
  UPDATE public.appointments a
     SET status = 'Cancelled',
         updated_at = NOW()
   WHERE a.id IN (
     SELECT l.appointment_id
     FROM public.public_booking_linked_appointments(v_booking.id) l
     WHERE l.status IS DISTINCT FROM 'Cancelled'
   );

  RETURN true;
END;
$function$;
