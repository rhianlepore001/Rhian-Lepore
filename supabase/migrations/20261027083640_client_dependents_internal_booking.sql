BEGIN;

CREATE UNIQUE INDEX clients_tenant_id_dependent_fk ON public.clients(user_id, id);
CREATE TABLE public.client_dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80 AND name !~ '[[:cntrl:]]'),
  nickname text CHECK (length(nickname) <= 40),
  notes text CHECK (length(notes) <= 500),
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'agendamento_online')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_dependents_holder_tenant_fk FOREIGN KEY (user_id, client_id)
    REFERENCES public.clients(user_id, id) ON DELETE CASCADE,
  CONSTRAINT client_dependents_tenant_holder_id_key UNIQUE (user_id, client_id, id)
);
CREATE UNIQUE INDEX client_dependents_active_name_key
  ON public.client_dependents(client_id, lower(btrim(name))) WHERE is_active;
CREATE INDEX client_dependents_tenant_holder_idx ON public.client_dependents(user_id, client_id);

ALTER TABLE public.client_dependents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_dependents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_dependents TO authenticated;
GRANT ALL ON public.client_dependents TO service_role;
CREATE POLICY "Owners manage company dependents" ON public.client_dependents FOR ALL TO authenticated
  USING (user_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (user_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');
CREATE POLICY "Staff read company dependents" ON public.client_dependents FOR SELECT TO authenticated
  USING (user_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'staff');
CREATE POLICY "Staff insert company dependents" ON public.client_dependents FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'staff');

ALTER TABLE public.appointments
  ADD COLUMN dependent_id uuid,
  ADD COLUMN attendee_name text,
  ADD CONSTRAINT appointments_dependent_holder_tenant_fk FOREIGN KEY (user_id, client_id, dependent_id)
    REFERENCES public.client_dependents(user_id, client_id, id) ON DELETE SET NULL (dependent_id);
CREATE INDEX appointments_dependent_id_idx ON public.appointments(dependent_id) WHERE dependent_id IS NOT NULL;

CREATE FUNCTION public.snapshot_internal_attendee() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_name text;
BEGIN
  IF NEW.dependent_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR NEW.dependent_id IS DISTINCT FROM OLD.dependent_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      SELECT d.name INTO v_name FROM public.client_dependents d
        WHERE d.id = NEW.dependent_id AND d.client_id = NEW.client_id AND d.user_id = NEW.user_id AND d.is_active;
      IF v_name IS NULL THEN RAISE EXCEPTION 'invalid_dependent' USING ERRCODE = '23503'; END IF;
      NEW.attendee_name := v_name;
    ELSIF NEW.attendee_name IS DISTINCT FROM OLD.attendee_name THEN
      NEW.attendee_name := OLD.attendee_name;
    END IF;
  ELSIF NEW.attendee_name IS NULL THEN
    SELECT c.name INTO NEW.attendee_name FROM public.clients c WHERE c.id = NEW.client_id AND c.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.snapshot_internal_attendee() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER appointments_snapshot_attendee BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_internal_attendee();

CREATE FUNCTION public.create_internal_attendee_bookings(
  p_business_id uuid, p_client_id uuid, p_professional_id uuid,
  p_appointment_time timestamptz, p_attendees jsonb, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_item jsonb;
  v_ids text[];
  v_dependent uuid;
  v_time timestamptz := p_appointment_time;
  v_duration integer;
  v_price numeric;
  v_custom text;
  v_services text;
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
      IF v_price < 0 OR v_price::text IN ('NaN', 'Infinity', '-Infinity') OR v_duration NOT BETWEEN 1 AND 1440 OR v_time + make_interval(mins => v_duration) > p_appointment_time + interval '24 hours' THEN
        RAISE EXCEPTION 'invalid_price_or_duration';
      END IF;
      IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.user_id = p_business_id::text
        AND a.professional_id = p_professional_id AND a.status NOT IN ('Cancelled', 'NoShow')
        AND a.appointment_time < v_time + make_interval(mins => v_duration)
        AND a.appointment_time + make_interval(mins => COALESCE(a.duration_minutes, 30)) > v_time) THEN
        RAISE EXCEPTION 'sequence_slot_unavailable' USING ERRCODE = 'P0002';
      END IF;
      IF public.agenda_interval_blocked(p_business_id::text, p_professional_id, v_time, v_time + make_interval(mins => v_duration)) THEN
        v_error := 'O profissional tem um bloqueio nesta sequência.';
        RAISE EXCEPTION 'sequence_slot_unavailable' USING ERRCODE = 'P0002';
      END IF;
      IF public.public_booking_slot_busy(p_business_id::text, v_time, v_duration, p_professional_id) THEN
        RAISE EXCEPTION 'sequence_slot_unavailable' USING ERRCODE = 'P0002';
      END IF;
      IF v_custom IS NOT NULL THEN v_services := concat_ws(', ', v_services, v_custom); END IF;
      INSERT INTO public.appointments(user_id, client_id, dependent_id, professional_id, service,
        appointment_time, price, duration_minutes, status, notes, payment_method)
      VALUES (p_business_id::text, p_client_id, v_dependent, p_professional_id, v_services,
        v_time, v_price, v_duration, 'Confirmed', p_notes, NULL)
      RETURNING id INTO v_booking;
      v_bookings := array_append(v_bookings, v_booking);
      v_time := v_time + make_interval(mins => v_duration);
    END LOOP;
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    RETURN jsonb_build_object('success', false, 'code', 'sequence_slot_unavailable', 'message', COALESCE(v_error, 'Um horário da sequência está ocupado. Escolha outro horário.'));
  END;
  RETURN jsonb_build_object('success', true, 'booking_id', v_bookings[1], 'booking_ids', to_jsonb(v_bookings));
END;
$$;
REVOKE ALL ON FUNCTION public.create_internal_attendee_bookings(uuid, uuid, uuid, timestamptz, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_internal_attendee_bookings(uuid, uuid, uuid, timestamptz, jsonb, text) TO authenticated, service_role;

COMMIT;
