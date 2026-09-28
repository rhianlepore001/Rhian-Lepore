-- Rollback de 20260925170000_booking_cancel_sync.
-- Restaura accept_public_booking com a definição EXATA de prod em 2026-09-25
-- (md5 de pg_get_functiondef = b98f18bf7fb7dec61a548ac67ecf2bc6; ACL não muda
-- com CREATE OR REPLACE) e remove a trigger e as 3 funções novas.
-- Não mexe em dados: pedidos que o sync já marcou 'cancelled' continuam
-- 'cancelled' (é o estado correto — o agendamento foi cancelado pelo salão), e
-- appointments.public_booking_id já gravados continuam (coluna/FK pré-existentes).

DROP TRIGGER IF EXISTS sync_public_booking_on_appointment_cancel ON public.appointments;
DROP FUNCTION IF EXISTS public.sync_public_booking_on_appointment_cancel();
DROP FUNCTION IF EXISTS public.get_client_booking_cancellations(text, uuid);
DROP FUNCTION IF EXISTS public.public_booking_linked_appointments(uuid);

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
    CASE WHEN COALESCE(v_booking.is_edit, false) THEN v_booking.id ELSE NULL END
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
