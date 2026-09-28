-- Item 5b: pedido online cancelado pelo salão aparece para o cliente.
--
-- Problema (prod, 2026-09-25): quando o salão cancela (status 'Cancelled') o
-- agendamento que nasceu de um pedido online, public_bookings fica 'confirmed'.
-- A Minha Área do cliente segue mostrando "Confirmado" (com Editar/Cancelar) e,
-- desde o item 5, o horário já é oferecido a outras pessoas.
--
-- Solução (só aditiva + CREATE OR REPLACE com a mesma assinatura):
--  1) public_booking_linked_appointments(uuid): agendamentos ligados a um pedido.
--     Vínculo explícito appointments.public_booking_id (FK já existe) ou, para
--     linhas antigas sem vínculo, mesmo negócio + mesmo horário + profissional
--     compatível + telefone do cliente igual (phones_match).
--  2) Trigger AFTER UPDATE OF status em appointments: ao virar 'Cancelled',
--     o pedido 'confirmed' ligado vira 'cancelled' — só se nenhum outro
--     agendamento ligado continuar ativo. Funciona para qualquer tela/RPC que
--     cancele. Falha no sync nunca bloqueia o cancelamento (vira WARNING).
--     NoShow NÃO mexe no pedido (cliente vê como agendamento passado).
--  3) get_client_booking_cancellations(phone, business): para a Minha Área
--     saber quais pedidos cancelados foram cancelados pelo estabelecimento.
--  4) accept_public_booking passa a gravar public_booking_id sempre (antes só
--     em pedidos de edição), para o vínculo não depender de horário/telefone.
--
-- Rollback: docs/rollbacks/20260925170000_booking_cancel_sync_rollback.sql

-- 1) Agendamentos ligados a um pedido online ------------------------------------
CREATE OR REPLACE FUNCTION public.public_booking_linked_appointments(p_booking_id uuid)
RETURNS TABLE(appointment_id uuid, status text, updated_at timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.status, a.updated_at
  FROM public.public_bookings pb
  JOIN public.appointments a ON a.user_id = pb.business_id
  WHERE pb.id = p_booking_id
    AND (
      a.public_booking_id = pb.id
      OR (
        -- linhas antigas (accept sem vínculo): mesmo horário, profissional
        -- compatível e o cliente do agendamento tem o telefone do pedido
        a.public_booking_id IS NULL
        AND a.appointment_time = pb.appointment_time
        AND (pb.professional_id IS NULL OR a.professional_id = pb.professional_id)
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = a.client_id
            AND public.phones_match(c.phone, pb.customer_phone)
        )
      )
    );
$function$;

REVOKE ALL ON FUNCTION public.public_booking_linked_appointments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_booking_linked_appointments(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_booking_linked_appointments(uuid) TO service_role;

-- 2) Salão cancelou o agendamento -> pedido online cancelado ----------------------
CREATE OR REPLACE FUNCTION public.sync_public_booking_on_appointment_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    UPDATE public.public_bookings pb
       SET status = 'cancelled',
           updated_at = NOW()
     WHERE pb.business_id = NEW.user_id
       AND pb.status = 'confirmed'
       AND (
         pb.id = NEW.public_booking_id
         OR (NEW.public_booking_id IS NULL AND pb.appointment_time = NEW.appointment_time)
       )
       AND EXISTS (
         SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
         WHERE l.appointment_id = NEW.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
         WHERE l.status IS DISTINCT FROM 'Cancelled'
       );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_public_booking_on_appointment_cancel(%): %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_public_booking_on_appointment_cancel() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_public_booking_on_appointment_cancel() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_booking_on_appointment_cancel() TO service_role;

DROP TRIGGER IF EXISTS sync_public_booking_on_appointment_cancel ON public.appointments;
CREATE TRIGGER sync_public_booking_on_appointment_cancel
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'Cancelled' AND OLD.status IS DISTINCT FROM 'Cancelled')
  EXECUTE FUNCTION public.sync_public_booking_on_appointment_cancel();

-- 3) Minha Área: quem cancelou -------------------------------------------------
-- cancelled_by_business = há agendamento ligado 'Cancelled' cuja última
-- alteração não é posterior ao cancelamento do pedido (o sync grava os dois na
-- mesma transação). Se o cliente cancelou antes e o salão só limpou a agenda
-- depois, fica false (mensagem neutra).
CREATE OR REPLACE FUNCTION public.get_client_booking_cancellations(p_phone text, p_business_id uuid)
RETURNS TABLE(booking_id uuid, cancelled_by_business boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT pb.id,
         EXISTS (
           SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
           WHERE l.status = 'Cancelled'
             AND l.updated_at <= pb.updated_at
         )
  FROM public.public_bookings pb
  WHERE pb.business_id = p_business_id::text
    AND pb.status = 'cancelled'
    AND public.phones_match(pb.customer_phone, p_phone);
$function$;

REVOKE ALL ON FUNCTION public.get_client_booking_cancellations(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_booking_cancellations(text, uuid) TO anon, authenticated, service_role;

-- 4) accept_public_booking: vínculo sempre gravado ---------------------------------
-- Igual à definição de prod (20260918190000), exceto public_booking_id.
CREATE OR REPLACE FUNCTION public.accept_public_booking(p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
  v_booking public.public_bookings%ROWTYPE;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  v_company_id := public.get_auth_company_id();
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT * INTO v_booking
  FROM public.public_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.business_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'booking_not_pending';
  END IF;

  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id::text = v_company_id
    AND public.phones_match(c.phone, v_booking.customer_phone)
  ORDER BY c.id
  LIMIT 1;

  SELECT pc.photo_url INTO v_photo
  FROM public.public_clients pc
  WHERE public.phones_match(pc.phone, v_booking.customer_phone)
    AND pc.business_id::text = v_company_id
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, photo_url)
    VALUES (
      v_company_id,
      v_booking.customer_name,
      v_booking.customer_phone,
      v_booking.customer_email,
      v_photo
    )
    RETURNING id INTO v_client_id;
  ELSIF v_photo IS NOT NULL THEN
    UPDATE public.clients
    SET photo_url = COALESCE(photo_url, v_photo)
    WHERE id = v_client_id
      AND user_id::text = v_company_id;
  END IF;

  SELECT string_agg(s.name, ', ' ORDER BY s.name)
    INTO v_service_names
  FROM public.services s
  WHERE s.user_id::text = v_company_id
    AND s.id = ANY (v_booking.service_ids);

  v_service_names := COALESCE(NULLIF(v_service_names, ''), 'Serviço');

  v_professional_id := v_booking.professional_id;
  IF v_professional_id IS NULL THEN
    SELECT tm.id INTO v_professional_id
    FROM public.team_members tm
    WHERE tm.user_id::text = v_company_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
    ORDER BY tm.is_owner DESC NULLS LAST, tm.display_order NULLS LAST, tm.created_at
    LIMIT 1;
  END IF;

  INSERT INTO public.appointments (
    user_id,
    client_id,
    professional_id,
    service,
    appointment_time,
    price,
    status,
    duration_minutes,
    public_booking_id
  ) VALUES (
    v_company_id,
    v_client_id,
    v_professional_id,
    v_service_names,
    v_booking.appointment_time,
    v_booking.total_price,
    'Confirmed',
    COALESCE(v_booking.duration_minutes, 30),
    v_booking.id
  )
  RETURNING id INTO v_appointment_id;

  UPDATE public.public_bookings
  SET status = 'confirmed',
      updated_at = NOW()
  WHERE id = v_booking.id
    AND business_id = v_company_id;

  BEGIN
    PERFORM public.copy_booking_products_to_appointment(v_booking.id, v_appointment_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN json_build_object(
    'appointment_id', v_appointment_id,
    'booking_id', v_booking.id,
    'service_names', v_service_names,
    'customer_name', v_booking.customer_name,
    'customer_phone', v_booking.customer_phone,
    'appointment_time', v_booking.appointment_time,
    'total_price', v_booking.total_price
  );
END;
$$;
