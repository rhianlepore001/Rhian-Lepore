BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_booking_service_quote(
  p_business_id text,
  p_service_ids uuid[]
)
RETURNS TABLE (total_price numeric, duration_minutes integer)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*), sum(s.price), LEAST(sum(s.duration_minutes), 1440)::integer
    INTO v_count, total_price, duration_minutes
  FROM public.services s
  WHERE s.user_id::text = p_business_id
    AND s.id = ANY (p_service_ids)
    AND s.active IS TRUE
    AND s.price > 0
    AND s.duration_minutes > 0;

  IF v_count = 0 OR v_count IS DISTINCT FROM cardinality(p_service_ids)::bigint THEN
    RAISE EXCEPTION 'invalid_services';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_booking_service_quote(text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_booking_service_quote(text, uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_service_ids UUID[],
  p_professional_id UUID,
  p_appointment_time TIMESTAMPTZ,
  p_total_price NUMERIC,
  p_duration_minutes INTEGER,
  p_product_lines JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id TEXT;
  v_duration INTEGER;
  v_total_price NUMERIC;
  v_booking public.public_bookings%ROWTYPE;
  v_auto BOOLEAN;
  v_appointment_id UUID;
BEGIN
  v_business_id := btrim(COALESCE(p_business_id, ''));
  IF v_business_id = '' THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF btrim(COALESCE(p_customer_name, '')) = '' OR btrim(COALESCE(p_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;

  IF p_appointment_time IS NULL OR NOT isfinite(p_appointment_time) OR p_appointment_time <= NOW() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_business_id
  ) THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id::text = v_business_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_professional';
  END IF;

  SELECT q.total_price, q.duration_minutes INTO v_total_price, v_duration
  FROM public.get_public_booking_service_quote(v_business_id, p_service_ids) q;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_business_id, 0));

  IF p_professional_id IS NULL THEN
    p_professional_id := public.get_first_available_professional(v_business_id::uuid, p_appointment_time, v_duration);
  END IF;
  IF p_professional_id IS NULL THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  IF public.public_booking_slot_busy(
    v_business_id,
    p_appointment_time,
    v_duration,
    p_professional_id
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  -- Decisão sempre lida no banco (nenhum parâmetro do cliente influencia).
  -- Sem linha em business_settings → aprovação manual (comportamento histórico).
  v_auto := NOT COALESCE((
    SELECT bs.online_booking_requires_approval
    FROM public.business_settings bs
    WHERE bs.user_id = v_business_id
    LIMIT 1
  ), true);

  INSERT INTO public.public_bookings (
    business_id,
    customer_name,
    customer_phone,
    service_ids,
    professional_id,
    appointment_time,
    total_price,
    status,
    duration_minutes,
    product_lines
  ) VALUES (
    v_business_id,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    p_service_ids,
    p_professional_id,
    p_appointment_time,
    v_total_price,
    CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END,
    v_duration,
    COALESCE(p_product_lines, '[]'::jsonb)
  )
  RETURNING * INTO v_booking;

  IF v_auto THEN
    -- Mesma transação e mesmo advisory lock: se o agendamento falhar, o pedido
    -- confirmado também volta (nunca fica pedido confirmado sem agendamento).
    v_appointment_id := public.materialize_public_booking_appointment(v_booking);

    INSERT INTO public.public_booking_auto_confirmations (booking_id, business_id, appointment_id)
    VALUES (v_booking.id, v_business_id, v_appointment_id);

    -- O trigger de notificação só avisa pedidos pending; aqui avisa o dono e o
    -- profissional. Falha de notificação nunca derruba o agendamento.
    BEGIN
      IF current_setting('agendix.fail_booking_notifications', true) = 'on' THEN
        RAISE EXCEPTION 'forced_notification_failure';
      END IF;
      PERFORM public.notify_booking_recipients(v_booking, 'new', NULL, ARRAY[v_booking.professional_id]);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'create_public_booking notify(%): %', v_booking.id, SQLERRM;
    END;
  END IF;

  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_public_booking_by_client_v2(
  p_booking_id                UUID,
  p_phone                     TEXT,
  p_service_ids               UUID[],
  p_professional_id           UUID,
  p_appointment_time          TIMESTAMPTZ,
  p_original_appointment_time TIMESTAMPTZ,
  p_customer_name             TEXT,
  p_customer_phone            TEXT,
  p_total_price               NUMERIC,
  p_duration_minutes          INTEGER,
  p_product_lines             JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking public.public_bookings%ROWTYPE;
  v_digits_in text;
  v_digits_stored text;
  v_allow boolean;
  v_cutoff integer;
  v_skip boolean;
  v_duration integer;
  v_total_price numeric;
  v_reserved_time timestamptz;
  v_reserved_pro uuid;
  v_same_slot boolean;
  v_fits boolean;
  v_already_edit boolean;
BEGIN
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

  SELECT COALESCE(bs.enable_self_rescheduling, true),
         COALESCE(bs.client_cancel_cutoff_hours, 2),
         COALESCE(bs.service_only_edit_skip_acceptance, false)
    INTO v_allow, v_cutoff, v_skip
  FROM public.business_settings bs
  WHERE bs.user_id::text = v_booking.business_id
  LIMIT 1;
  v_allow := COALESCE(v_allow, true);
  v_cutoff := COALESCE(v_cutoff, 2);
  v_skip := COALESCE(v_skip, false);

  IF NOT v_allow THEN
    RAISE EXCEPTION 'self_rescheduling_disabled';
  END IF;

  IF v_booking.status IS DISTINCT FROM 'pending'
     AND v_booking.status IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'booking_not_editable';
  END IF;

  v_already_edit := (v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false));
  v_reserved_time := CASE
    WHEN v_already_edit THEN COALESCE(v_booking.original_appointment_time, v_booking.appointment_time)
    ELSE v_booking.appointment_time
  END;
  v_reserved_pro := CASE
    WHEN v_already_edit THEN COALESCE(v_booking.original_professional_id, v_booking.professional_id)
    ELSE v_booking.professional_id
  END;

  IF v_booking.status = 'confirmed' OR v_already_edit THEN
    IF EXISTS (
      SELECT 1
      FROM public.public_booking_linked_appointments(v_booking.id) l
      WHERE l.status IN ('Completed', 'NoShow')
    ) THEN
      RAISE EXCEPTION 'booking_not_editable';
    END IF;
    IF v_reserved_time <= now() THEN
      RAISE EXCEPTION 'booking_not_editable';
    END IF;
    IF v_cutoff <= 0
       OR now() > (v_reserved_time - make_interval(hours => v_cutoff)) THEN
      RAISE EXCEPTION 'cancel_window_closed';
    END IF;
  ELSE
    IF v_booking.appointment_time <= now() THEN
      RAISE EXCEPTION 'booking_not_editable';
    END IF;
  END IF;

  IF p_appointment_time IS NULL OR NOT isfinite(p_appointment_time) OR p_appointment_time <= now() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id::text = v_booking.business_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_professional';
  END IF;

  SELECT q.total_price, q.duration_minutes INTO v_total_price, v_duration
  FROM public.get_public_booking_service_quote(v_booking.business_id, p_service_ids) q;

  v_same_slot := p_appointment_time IS NOT DISTINCT FROM v_reserved_time
    AND p_professional_id IS NOT DISTINCT FROM v_reserved_pro;

  -- Troca só serviço, setting ON, cabe no horário, pedido confirmed (não é 2ª edição).
  IF v_booking.status = 'confirmed'
     AND NOT v_already_edit
     AND v_skip
     AND v_same_slot THEN
    v_fits := NOT public.client_edit_request_slot_conflict(
      v_booking.business_id,
      p_appointment_time,
      v_duration,
      p_professional_id,
      v_booking.id,
      true
    );
    IF v_fits THEN
      UPDATE public.public_bookings pb
      SET
        service_ids = p_service_ids,
        duration_minutes = v_duration,
        total_price = v_total_price,
        product_lines = COALESCE(p_product_lines, '[]'::jsonb),
        customer_name = COALESCE(NULLIF(btrim(p_customer_name), ''), pb.customer_name),
        customer_phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), pb.customer_phone),
        updated_at = NOW()
      WHERE pb.id = v_booking.id;

      UPDATE public.appointments a
      SET
        duration_minutes = v_duration,
        price = v_total_price,
        service = COALESCE((
          SELECT string_agg(s.name, ', ' ORDER BY s.name)
          FROM public.services s
          WHERE s.user_id::text = v_booking.business_id
            AND s.id = ANY (p_service_ids)
        ), a.service),
        updated_at = NOW()
      WHERE a.id IN (
        SELECT l.appointment_id
        FROM public.public_booking_linked_appointments(v_booking.id) l
        WHERE l.status IS DISTINCT FROM 'Cancelled'
      );

      RETURN QUERY
      SELECT pb.* FROM public.public_bookings pb WHERE pb.id = v_booking.id LIMIT 1;
      RETURN;
    END IF;
  END IF;

  -- Pedido ainda Aguardando (não é edição de confirmado): substitui direto.
  IF v_booking.status = 'pending' AND NOT v_already_edit THEN
    IF public.client_edit_request_slot_conflict(
      v_booking.business_id, p_appointment_time, v_duration, p_professional_id,
      v_booking.id, false
    ) THEN
      RAISE EXCEPTION 'slot_unavailable';
    END IF;

    UPDATE public.public_bookings pb
    SET
      service_ids = p_service_ids,
      professional_id = p_professional_id,
      appointment_time = p_appointment_time,
      duration_minutes = v_duration,
      total_price = v_total_price,
      product_lines = COALESCE(p_product_lines, '[]'::jsonb),
      customer_name = COALESCE(NULLIF(btrim(p_customer_name), ''), pb.customer_name),
      customer_phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), pb.customer_phone),
      updated_at = NOW(),
      is_edit = false
    WHERE pb.id = v_booking.id;

    RETURN QUERY
    SELECT pb.* FROM public.public_bookings pb WHERE pb.id = v_booking.id LIMIT 1;
    RETURN;
  END IF;

  -- Pedido de alteração (confirmed, ou 2ª edição ainda pending).
  -- Sempre exclui os appointments ligados ao próprio pedido (o original
  -- continua reservado; senão mover 30 min no mesmo pro conflita consigo).
  IF public.client_edit_request_slot_conflict(
    v_booking.business_id, p_appointment_time, v_duration, p_professional_id,
    v_booking.id, true
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  UPDATE public.public_bookings pb
  SET
    original_appointment_time = CASE
      WHEN v_already_edit THEN pb.original_appointment_time
      ELSE pb.appointment_time
    END,
    original_professional_id = CASE
      WHEN v_already_edit THEN pb.original_professional_id
      ELSE pb.professional_id
    END,
    original_service_ids = CASE
      WHEN v_already_edit THEN pb.original_service_ids
      ELSE pb.service_ids
    END,
    original_duration_minutes = CASE
      WHEN v_already_edit THEN pb.original_duration_minutes
      ELSE pb.duration_minutes
    END,
    original_total_price = CASE
      WHEN v_already_edit THEN pb.original_total_price
      ELSE pb.total_price
    END,
    original_product_lines = CASE
      WHEN v_already_edit THEN pb.original_product_lines
      ELSE pb.product_lines
    END,
    service_ids = p_service_ids,
    professional_id = p_professional_id,
    appointment_time = p_appointment_time,
    duration_minutes = v_duration,
    total_price = v_total_price,
    product_lines = COALESCE(p_product_lines, '[]'::jsonb),
    customer_name = COALESCE(NULLIF(btrim(p_customer_name), ''), pb.customer_name),
    customer_phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), pb.customer_phone),
    status = 'pending',
    is_edit = true,
    updated_at = NOW()
  WHERE pb.id = v_booking.id;

  RETURN QUERY
  SELECT pb.* FROM public.public_bookings pb WHERE pb.id = v_booking.id LIMIT 1;
END;
$function$;

COMMIT;
