-- Rollback de 20261109203000_public_booking_origin: volta as duas funções ao corpo de produção
-- anterior (09/11/2026, sem origin no INSERT => default 'agenda').
-- O backfill de dados NÃO é desfeito aqui de propósito: a lista exata de ids e origin antigo ficou no
-- backup fora do repositório (pr196_20261109/affected_appointments.json). Para reverter os dados:
--   UPDATE public.appointments SET origin = 'agenda' WHERE id IN (<ids do backup>) AND origin = 'booking';
-- Obs.: o UPDATE do backfill disparou update_appointments_updated_at (updated_at = now()) nessas linhas.

CREATE OR REPLACE FUNCTION public.accept_public_booking_v2(p_booking_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
  v_booking public.public_bookings%ROWTYPE;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
  v_is_edit boolean;
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

  IF NOT public.caller_can_act_on_public_booking(v_booking) THEN
    RAISE EXCEPTION 'not_allowed_for_booking';
  END IF;

  v_is_edit := (v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false));

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

  IF v_is_edit THEN
    IF COALESCE(v_booking.original_appointment_time, v_booking.appointment_time) <= now()
       OR EXISTS (
         SELECT 1
         FROM public.public_booking_linked_appointments(v_booking.id) l
         WHERE l.status IN ('Completed', 'NoShow')
       ) THEN
      RAISE EXCEPTION 'booking_not_pending';
    END IF;

    SELECT l.appointment_id
      INTO v_appointment_id
    FROM public.public_booking_linked_appointments(v_booking.id) l
    WHERE l.status IS DISTINCT FROM 'Cancelled'
    ORDER BY l.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_appointment_id IS NOT NULL THEN
      IF public.client_edit_request_slot_conflict(
        v_company_id,
        v_booking.appointment_time,
        COALESCE(v_booking.duration_minutes, 30),
        v_professional_id,
        v_booking.id,
        true
      ) THEN
        RAISE EXCEPTION 'slot_unavailable';
      END IF;

      UPDATE public.appointments
      SET
        appointment_time = v_booking.appointment_time,
        professional_id = v_professional_id,
        duration_minutes = COALESCE(v_booking.duration_minutes, 30),
        price = v_booking.total_price,
        service = v_service_names,
        status = 'Confirmed',
        updated_at = NOW()
      WHERE id = v_appointment_id
        AND user_id = v_company_id;
    END IF;
  END IF;

  IF v_appointment_id IS NULL THEN
    INSERT INTO public.appointments (
      user_id, client_id, professional_id, service, appointment_time, price, status,
      duration_minutes, public_booking_id
    ) VALUES (
      v_company_id, v_client_id, v_professional_id, v_service_names,
      v_booking.appointment_time, v_booking.total_price, 'Confirmed',
      COALESCE(v_booking.duration_minutes, 30), v_booking.id
    )
    RETURNING id INTO v_appointment_id;
  END IF;

  UPDATE public.public_bookings
  SET
    status = 'confirmed',
    is_edit = false,
    original_appointment_time = NULL,
    original_professional_id = NULL,
    original_service_ids = NULL,
    original_duration_minutes = NULL,
    original_total_price = NULL,
    original_product_lines = NULL,
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
$function$;

CREATE OR REPLACE FUNCTION public.materialize_public_booking_appointment(p_booking public_bookings)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT := p_booking.business_id;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
BEGIN
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id::text = v_company_id
    AND public.phones_match(c.phone, p_booking.customer_phone)
  ORDER BY c.id
  LIMIT 1;

  SELECT pc.photo_url INTO v_photo
  FROM public.public_clients pc
  WHERE public.phones_match(pc.phone, p_booking.customer_phone)
    AND pc.business_id::text = v_company_id
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, photo_url)
    VALUES (
      v_company_id,
      p_booking.customer_name,
      p_booking.customer_phone,
      p_booking.customer_email,
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
    AND s.id = ANY (p_booking.service_ids);

  v_service_names := COALESCE(NULLIF(v_service_names, ''), 'Serviço');

  v_professional_id := p_booking.professional_id;
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
    user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_company_id, v_client_id, v_professional_id, v_service_names,
    p_booking.appointment_time, p_booking.total_price, 'Confirmed',
    COALESCE(p_booking.duration_minutes, 30), p_booking.id
  )
  RETURNING id INTO v_appointment_id;

  -- Mesmo contrato do aceite: falha na cópia de produtos não derruba o agendamento.
  BEGIN
    PERFORM public.copy_public_booking_products_internal(p_booking.id, v_appointment_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'materialize_public_booking_appointment products(%): %', p_booking.id, SQLERRM;
  END;

  RETURN v_appointment_id;
END;
$function$;
