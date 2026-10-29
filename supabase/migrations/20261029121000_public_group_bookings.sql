BEGIN;

ALTER TABLE public.public_bookings
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS group_position smallint,
  ADD COLUMN IF NOT EXISTS attendee_name text;

ALTER TABLE public.public_bookings DROP CONSTRAINT IF EXISTS public_bookings_group_consistency;
ALTER TABLE public.public_bookings ADD CONSTRAINT public_bookings_group_consistency
  CHECK ((group_id IS NULL AND group_position IS NULL AND attendee_name IS NULL)
      OR (group_id IS NOT NULL AND group_position IS NOT NULL AND group_position >= 0));
ALTER TABLE public.public_bookings DROP CONSTRAINT IF EXISTS public_bookings_attendee_name_check;
ALTER TABLE public.public_bookings ADD CONSTRAINT public_bookings_attendee_name_check
  CHECK (attendee_name IS NULL OR (length(btrim(attendee_name)) BETWEEN 1 AND 80 AND attendee_name !~ '[[:cntrl:]]'));
CREATE INDEX IF NOT EXISTS public_bookings_group_id_idx ON public.public_bookings(group_id) WHERE group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.public_group_slot_within_hours(
  p_business_id text, p_start timestamptz, p_duration_minutes integer
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz text := public.business_timezone(p_business_id);
  v_local timestamp := p_start AT TIME ZONE v_tz;
  v_local_end timestamp := (p_start + make_interval(mins => p_duration_minutes)) AT TIME ZONE v_tz;
  v_day jsonb;
BEGIN
  SELECT bs.business_hours -> CASE extract(dow FROM v_local)::int
      WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue' WHEN 3 THEN 'wed'
      WHEN 4 THEN 'thu' WHEN 5 THEN 'fri' ELSE 'sat' END
    INTO v_day
    FROM public.business_settings bs WHERE bs.user_id = p_business_id;
  IF v_day IS NULL OR COALESCE((v_day ->> 'isOpen')::boolean, false) IS NOT TRUE THEN
    RETURN false;
  END IF;
  IF v_local::date <> v_local_end::date AND v_local_end::time <> '00:00'::time THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_day -> 'blocks') AS b(start text, "end" text)
    WHERE (v_local::date + b.start::time) <= v_local
      AND v_local_end <= (v_local::date + b."end"::time)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.public_group_slot_within_hours(text, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_group_slot_within_hours(text, timestamptz, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.create_public_group_booking(
  p_business_id text,
  p_customer_name text,
  p_customer_phone text,
  p_appointment_time timestamptz,
  p_people jsonb
) RETURNS SETOF public.public_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_business_id text := btrim(COALESCE(p_business_id, ''));
  v_holder text := btrim(COALESCE(p_customer_name, ''));
  v_item jsonb;
  v_pos integer;
  v_group uuid := gen_random_uuid();
  v_auto boolean;
  v_name text;
  v_names text[] := ARRAY[lower(btrim(COALESCE(p_customer_name, '')))];
  v_ids uuid[];
  v_pro uuid;
  v_cursors jsonb := '{}'::jsonb;
  v_start timestamptz;
  v_duration integer;
  v_price numeric;
  v_booking public.public_bookings%ROWTYPE;
  v_appointment_id uuid;
BEGIN
  IF v_business_id = '' OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_business_id) THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;
  IF v_holder = '' OR btrim(COALESCE(p_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;
  IF p_people IS NULL OR jsonb_typeof(p_people) <> 'array' OR jsonb_array_length(p_people) NOT BETWEEN 2 AND 5 THEN
    RAISE EXCEPTION 'invalid_people';
  END IF;
  IF p_appointment_time IS NULL OR NOT isfinite(p_appointment_time) OR p_appointment_time <= NOW() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_business_id, 0));

  v_auto := NOT COALESCE((
    SELECT bs.online_booking_requires_approval FROM public.business_settings bs
    WHERE bs.user_id = v_business_id LIMIT 1
  ), true);

  FOR v_item, v_pos IN SELECT value, (ordinality - 1)::integer FROM jsonb_array_elements(p_people) WITH ORDINALITY LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN RAISE EXCEPTION 'invalid_people'; END IF;

    IF v_pos = 0 THEN
      v_name := NULL;
    ELSE
      v_name := btrim(COALESCE(v_item ->> 'attendee_name', ''));
      IF length(v_name) NOT BETWEEN 1 AND 80 OR v_name ~ '[[:cntrl:]]' OR lower(v_name) = ANY (v_names) THEN
        RAISE EXCEPTION 'invalid_people';
      END IF;
      v_names := array_append(v_names, lower(v_name));
    END IF;

    IF jsonb_typeof(v_item -> 'service_ids') IS DISTINCT FROM 'array'
       OR jsonb_array_length(v_item -> 'service_ids') NOT BETWEEN 1 AND 10 THEN
      RAISE EXCEPTION 'invalid_services';
    END IF;
    SELECT array_agg(value::uuid ORDER BY ordinality) INTO v_ids
      FROM jsonb_array_elements_text(v_item -> 'service_ids') WITH ORDINALITY;
    IF (SELECT count(DISTINCT sid) FROM unnest(v_ids) sid) <> cardinality(v_ids) THEN
      RAISE EXCEPTION 'invalid_services';
    END IF;
    SELECT sum(s.duration_minutes)::integer, sum(s.price) INTO v_duration, v_price
      FROM public.services s
      WHERE s.id = ANY (v_ids) AND s.user_id = v_business_id AND s.active
        AND COALESCE(s.price, 0) > 0 AND COALESCE(s.duration_minutes, 0) > 0;
    IF (SELECT count(*) FROM public.services s
        WHERE s.id = ANY (v_ids) AND s.user_id = v_business_id AND s.active
          AND COALESCE(s.price, 0) > 0 AND COALESCE(s.duration_minutes, 0) > 0) <> cardinality(v_ids)
       OR v_duration NOT BETWEEN 1 AND 1440 THEN
      RAISE EXCEPTION 'invalid_services';
    END IF;

    v_pro := NULLIF(v_item ->> 'professional_id', '')::uuid;
    IF v_pro IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = v_pro AND tm.user_id::text = v_business_id AND tm.active = true AND tm.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'invalid_professional';
    END IF;

    v_start := COALESCE((v_cursors ->> v_pro::text)::timestamptz, p_appointment_time);
    IF NOT public.public_group_slot_within_hours(v_business_id, v_start, v_duration)
       OR public.public_booking_slot_busy(v_business_id, v_start, v_duration, v_pro) THEN
      RAISE EXCEPTION 'slot_unavailable';
    END IF;

    INSERT INTO public.public_bookings (
      business_id, customer_name, customer_phone, service_ids, professional_id,
      appointment_time, total_price, status, duration_minutes, product_lines,
      group_id, group_position, attendee_name
    ) VALUES (
      v_business_id, v_holder, btrim(p_customer_phone), v_ids, v_pro,
      v_start, v_price, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, v_duration, '[]'::jsonb,
      v_group, v_pos, v_name
    ) RETURNING * INTO v_booking;

    IF v_auto THEN
      v_appointment_id := public.materialize_public_booking_appointment(v_booking);
      INSERT INTO public.public_booking_auto_confirmations (booking_id, business_id, appointment_id)
      VALUES (v_booking.id, v_business_id, v_appointment_id);
      BEGIN
        PERFORM public.notify_booking_recipients(v_booking, 'new', NULL, ARRAY[v_booking.professional_id]);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'create_public_group_booking notify(%): %', v_booking.id, SQLERRM;
      END;
    END IF;

    v_cursors := v_cursors || jsonb_build_object(v_pro::text, v_start + make_interval(mins => v_duration));
  END LOOP;

  RETURN QUERY SELECT * FROM public.public_bookings pb WHERE pb.group_id = v_group ORDER BY pb.group_position;
END;
$$;
REVOKE ALL ON FUNCTION public.create_public_group_booking(text, text, text, timestamptz, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_group_booking(text, text, text, timestamptz, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_online_group_attendee() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_name text;
  v_dependent uuid;
BEGIN
  IF NEW.dependent_id IS NOT NULL OR NEW.public_booking_id IS NULL OR NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT pb.attendee_name INTO v_name FROM public.public_bookings pb
    WHERE pb.id = NEW.public_booking_id AND pb.business_id = NEW.user_id AND pb.attendee_name IS NOT NULL;
  IF v_name IS NULL THEN RETURN NEW; END IF;
  SELECT d.id INTO v_dependent FROM public.client_dependents d
    WHERE d.client_id = NEW.client_id AND d.user_id = NEW.user_id AND d.is_active AND lower(btrim(d.name)) = lower(btrim(v_name));
  IF v_dependent IS NULL THEN
    INSERT INTO public.client_dependents (user_id, client_id, name, source)
    VALUES (NEW.user_id, NEW.client_id, btrim(v_name), 'agendamento_online')
    ON CONFLICT (client_id, lower(btrim(name))) WHERE is_active DO NOTHING
    RETURNING id INTO v_dependent;
    IF v_dependent IS NULL THEN
      SELECT d.id INTO v_dependent FROM public.client_dependents d
        WHERE d.client_id = NEW.client_id AND d.user_id = NEW.user_id AND d.is_active AND lower(btrim(d.name)) = lower(btrim(v_name));
    END IF;
  END IF;
  NEW.dependent_id := v_dependent;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_online_group_attendee() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS appointments_a_resolve_online_attendee ON public.appointments;
CREATE TRIGGER appointments_a_resolve_online_attendee BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.resolve_online_group_attendee();

COMMIT;
