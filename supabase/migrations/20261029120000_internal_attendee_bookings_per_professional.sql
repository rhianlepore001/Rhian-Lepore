BEGIN;

CREATE OR REPLACE FUNCTION public.create_internal_attendee_bookings_v2(
  p_business_id uuid, p_client_id uuid, p_professional_id uuid,
  p_appointment_time timestamptz, p_attendees jsonb, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_item jsonb;
  v_ids text[];
  v_dependent uuid;
  v_pro uuid;
  v_cursors jsonb := '{}'::jsonb;
  v_time timestamptz;
  v_duration integer;
  v_price numeric;
  v_custom text;
  v_services text;
  v_pro_name text;
  v_booking uuid;
  v_bookings uuid[] := '{}';
  v_error text;
BEGIN
  IF auth.uid() IS NULL OR public.get_auth_company_id() IS DISTINCT FROM p_business_id::text
     OR COALESCE(public.get_auth_role(), '') NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND user_id = p_business_id::text)
    OR NOT EXISTS (SELECT 1 FROM public.team_members WHERE id = p_professional_id AND user_id = p_business_id::text AND active AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'invalid_holder_or_professional';
  END IF;
  IF p_attendees IS NULL OR jsonb_typeof(p_attendees) <> 'array' THEN RAISE EXCEPTION 'invalid_attendees'; END IF;
  IF jsonb_array_length(p_attendees) NOT BETWEEN 1 AND 10 OR p_appointment_time IS NULL OR NOT isfinite(p_appointment_time) THEN
    RAISE EXCEPTION 'invalid_attendees';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_attendees) item
    GROUP BY COALESCE(NULLIF(item->>'dependent_id', '')::uuid::text, 'self') HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate_attendee';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));
  BEGIN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_attendees) LOOP
      IF jsonb_typeof(v_item) <> 'object' THEN RAISE EXCEPTION 'invalid_attendees'; END IF;
      v_pro := COALESCE(NULLIF(v_item->>'professional_id', '')::uuid, p_professional_id);
      SELECT tm.name INTO v_pro_name FROM public.team_members tm
        WHERE tm.id = v_pro AND tm.user_id = p_business_id::text AND tm.active AND tm.deleted_at IS NULL;
      IF NOT FOUND THEN RAISE EXCEPTION 'invalid_holder_or_professional'; END IF;
      v_dependent := NULLIF(v_item->>'dependent_id', '')::uuid;
      IF v_dependent IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.client_dependents WHERE id = v_dependent AND client_id = p_client_id
          AND user_id = p_business_id::text AND is_active
      ) THEN RAISE EXCEPTION 'invalid_dependent' USING ERRCODE = '23503'; END IF;
      IF jsonb_typeof(v_item->'service_ids') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_services'; END IF;
      SELECT array_agg(value) INTO v_ids FROM jsonb_array_elements_text(v_item->'service_ids');
      IF EXISTS (SELECT 1 FROM unnest(v_ids) sid WHERE NOT EXISTS (
        SELECT 1 FROM public.services WHERE id = sid::uuid AND user_id = p_business_id::text AND active
      )) OR COALESCE(cardinality(v_ids), 0) IS DISTINCT FROM (SELECT count(DISTINCT sid)::integer FROM unnest(v_ids) sid) THEN
        RAISE EXCEPTION 'invalid_services';
      END IF;
      v_custom := NULLIF(btrim(v_item->>'custom_service_name'), '');
      IF COALESCE(cardinality(v_ids), 0) = 0 AND v_custom IS NULL THEN RAISE EXCEPTION 'invalid_services'; END IF;
      SELECT COALESCE(sum(COALESCE(duration_minutes, 30)), 30), COALESCE(sum(price), 0), string_agg(name, ', ' ORDER BY array_position(v_ids, id::text))
        INTO v_duration, v_price, v_services FROM public.services WHERE id = ANY(v_ids::uuid[]) AND user_id = p_business_id::text;
      v_price := COALESCE((v_item->>'total_price')::numeric, v_price);
      v_time := COALESCE((v_cursors->>v_pro::text)::timestamptz, p_appointment_time);
      IF v_price < 0 OR v_price::text IN ('NaN', 'Infinity', '-Infinity') OR v_duration NOT BETWEEN 1 AND 1440 OR v_time + make_interval(mins => v_duration) > p_appointment_time + interval '24 hours' THEN
        RAISE EXCEPTION 'invalid_price_or_duration';
      END IF;
      IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.user_id = p_business_id::text
        AND a.professional_id = v_pro AND a.status NOT IN ('Cancelled', 'NoShow')
        AND a.appointment_time < v_time + make_interval(mins => v_duration)
        AND a.appointment_time + make_interval(mins => COALESCE(a.duration_minutes, 30)) > v_time) THEN
        v_error := format('O horário com %s já está ocupado. Escolha outro horário ou outro profissional.', v_pro_name);
        RAISE EXCEPTION 'sequence_slot_unavailable' USING ERRCODE = 'P0002';
      END IF;
      IF public.agenda_interval_blocked(p_business_id::text, v_pro, v_time, v_time + make_interval(mins => v_duration)) THEN
        v_error := format('%s tem um bloqueio neste horário. Escolha outro horário ou outro profissional.', v_pro_name);
        RAISE EXCEPTION 'sequence_slot_unavailable' USING ERRCODE = 'P0002';
      END IF;
      IF public.public_booking_slot_busy(p_business_id::text, v_time, v_duration, v_pro) THEN
        v_error := format('O horário com %s já está ocupado. Escolha outro horário ou outro profissional.', v_pro_name);
        RAISE EXCEPTION 'sequence_slot_unavailable' USING ERRCODE = 'P0002';
      END IF;
      IF v_custom IS NOT NULL THEN v_services := concat_ws(', ', v_services, v_custom); END IF;
      INSERT INTO public.appointments(user_id, client_id, dependent_id, professional_id, service,
        appointment_time, price, duration_minutes, status, notes, payment_method)
      VALUES (p_business_id::text, p_client_id, v_dependent, v_pro, v_services,
        v_time, v_price, v_duration, 'Confirmed', p_notes, NULL)
      RETURNING id INTO v_booking;
      v_bookings := array_append(v_bookings, v_booking);
      v_cursors := v_cursors || jsonb_build_object(v_pro::text, v_time + make_interval(mins => v_duration));
    END LOOP;
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    RETURN jsonb_build_object('success', false, 'code', 'sequence_slot_unavailable', 'message', COALESCE(v_error, 'Um horário do grupo está ocupado. Escolha outro horário.'));
  END;
  RETURN jsonb_build_object('success', true, 'booking_id', v_bookings[1], 'booking_ids', to_jsonb(v_bookings));
END;
$$;
REVOKE ALL ON FUNCTION public.create_internal_attendee_bookings_v2(uuid, uuid, uuid, timestamptz, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_internal_attendee_bookings_v2(uuid, uuid, uuid, timestamptz, jsonb, text) TO authenticated, service_role;

COMMIT;
