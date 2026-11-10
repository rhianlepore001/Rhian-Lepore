-- Rollback de 20261110090000_client_cancel_notifies_owner:
-- volta cancel_public_booking_by_client_v2 ao corpo de produção anterior (10/11/2026) e remove a função de aviso.
-- Avisos já criados (event_key 'cancel:<id>') e "Novo pedido" marcados como lidos não são desfeitos:
--   para apagar os avisos: DELETE FROM public.notifications WHERE event_key LIKE 'cancel:%' AND title = 'Cancelado pelo cliente';

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

DROP FUNCTION IF EXISTS public.notify_booking_cancelled_by_client(public.public_bookings, boolean);
