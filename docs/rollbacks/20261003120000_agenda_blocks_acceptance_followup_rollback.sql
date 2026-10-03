-- =============================================================================
-- ROLLBACK de 20261003120000_agenda_blocks_acceptance_followup
-- =============================================================================
-- Volta as funções ao corpo do #113 / live lido em 2026-10-03.
-- O rollback confere o md5 das 8 funções restauradas.
-- enforce_agenda_block_on_appointments volta a 150219aaaec7688797ec0e09229d8da5.
-- Se 20261003090000 tiver sido aplicada e este rollback rodar por cima, a fila
-- volta a falhar no bloqueio: reaplique 20261003090000 para manter B-41.
-- Nenhuma linha de agenda_blocks é apagada. O índice novo sai.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.create_agenda_block(uuid, timestamptz, timestamptz, boolean, uuid[]);

CREATE OR REPLACE FUNCTION public.delete_agenda_block(p_block_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company text;
  v_pro uuid;
BEGIN
  v_company := get_auth_company_id();
  IF v_company IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  SELECT professional_id INTO v_pro
  FROM public.agenda_blocks
  WHERE id = p_block_id AND user_id = v_company;

  IF v_pro IS NULL THEN
    RETURN json_build_object('success', true);
  END IF;

  IF NOT public.staff_can_manage_agenda_block(v_pro) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  DELETE FROM public.agenda_blocks WHERE id = p_block_id AND user_id = v_company;
  RETURN json_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_agenda_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_agenda_block(uuid) TO authenticated, service_role;

-- 7. Trigger em appointments (INSERT / mudança de horário) --------------------
CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
BEGIN
  IF NEW.status IN ('Cancelled', 'NoShow') THEN
    RETURN NEW;
  END IF;
  IF NEW.professional_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Atendimento que já ocupava o intervalo (bloqueio com ack) continua editável.
  -- Recusa só quem entra no bloqueio (INSERT ou mover de horário livre para travado).
  -- Cancelled/NoShow reativado no intervalo travado NÃO herda o skip.
  IF TG_OP = 'UPDATE'
     AND OLD.professional_id IS NOT NULL
     AND OLD.status NOT IN ('Cancelled', 'NoShow') THEN
    v_end := OLD.appointment_time + make_interval(mins => GREATEST(COALESCE(OLD.duration_minutes, 30), 1));
    IF public.agenda_interval_blocked(OLD.user_id, OLD.professional_id, OLD.appointment_time, v_end) THEN
      RETURN NEW;
    END IF;
  END IF;
  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.user_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Este horário está bloqueado. Remova o bloqueio para agendar.',
      HINT = 'agenda_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
BEGIN
  IF NEW.status IN ('Cancelled', 'NoShow') THEN
    RETURN NEW;
  END IF;
  IF NEW.professional_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Atendimento que já ocupava o intervalo (bloqueio com ack) continua editável.
  -- Recusa só quem entra no bloqueio (INSERT ou mover de horário livre para travado).
  -- Cancelled/NoShow reativado no intervalo travado NÃO herda o skip.
  IF TG_OP = 'UPDATE'
     AND OLD.professional_id IS NOT NULL
     AND OLD.status NOT IN ('Cancelled', 'NoShow') THEN
    v_end := OLD.appointment_time + make_interval(mins => GREATEST(COALESCE(OLD.duration_minutes, 30), 1));
    IF public.agenda_interval_blocked(OLD.user_id, OLD.professional_id, OLD.appointment_time, v_end) THEN
      RETURN NEW;
    END IF;
  END IF;
  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.user_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Este horário está bloqueado. Remova o bloqueio para agendar.',
      HINT = 'agenda_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_appointments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_appointments() TO service_role;

DROP TRIGGER IF EXISTS enforce_agenda_block_on_appointments ON public.appointments;
CREATE TRIGGER enforce_agenda_block_on_appointments
  BEFORE INSERT OR UPDATE OF appointment_time, professional_id, duration_minutes, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agenda_block_on_appointments();

CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_public_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' AND NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;
  -- Pedido que já ocupava o intervalo (ex. aceitar pending) não pode ficar preso.
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('pending', 'confirmed') THEN
    v_end := OLD.appointment_time + make_interval(mins => GREATEST(COALESCE(OLD.duration_minutes, 30), 1));
    IF public.agenda_interval_blocked(OLD.business_id, OLD.professional_id, OLD.appointment_time, v_end) THEN
      RETURN NEW;
    END IF;
  END IF;
  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.business_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'slot_unavailable',
      HINT = 'agenda_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.staff_can_manage_agenda_block(p_professional_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_company text;
  v_flag boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.role, COALESCE(NULLIF(btrim(p.company_id), ''), p.id)
    INTO v_role, v_company
  FROM public.profiles p
  WHERE p.id = v_uid::text;

  IF v_company IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id = v_company
      AND tm.deleted_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  IF v_role IS DISTINCT FROM 'staff' THEN
    RETURN true;
  END IF;

  SELECT COALESCE(bs.staff_can_block_agenda, true)
    INTO v_flag
  FROM public.business_settings bs
  WHERE bs.user_id = v_company
  LIMIT 1;

  IF COALESCE(v_flag, true) IS NOT TRUE THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id = v_company
      AND tm.staff_user_id = v_uid
      AND tm.deleted_at IS NULL
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.staff_can_manage_agenda_block(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_can_manage_agenda_block(uuid) TO service_role;

-- 5. create_agenda_block ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_agenda_block(
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_acknowledge_conflicts boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company text;
  v_id uuid;
  v_conflicts json;
BEGIN
  v_company := get_auth_company_id();
  IF v_company IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RETURN json_build_object('success', false, 'code', 'invalid_interval');
  END IF;

  IF NOT public.staff_can_manage_agenda_block(p_professional_id) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id = v_company
      AND tm.deleted_at IS NULL
      AND COALESCE(tm.active, true)
  ) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('agenda_block:' || v_company),
    hashtext(p_professional_id::text)
  );

  IF EXISTS (
    SELECT 1 FROM public.agenda_blocks b
    WHERE b.user_id = v_company
      AND b.professional_id = p_professional_id
      AND b.starts_at < p_ends_at
      AND b.ends_at > p_starts_at
  ) THEN
    RETURN json_build_object('success', false, 'code', 'overlap');
  END IF;

  SELECT COALESCE(json_agg(item), '[]'::json)
    INTO v_conflicts
  FROM (
    SELECT json_build_object(
      'id', a.id,
      'kind', 'appointment',
      'client_name', COALESCE(c.name, 'Cliente'),
      'service', a.service,
      'appointment_time', a.appointment_time,
      'status', a.status
    ) AS item
    FROM public.appointments a
    LEFT JOIN public.clients c ON c.id = a.client_id
    WHERE a.user_id = v_company
      AND a.professional_id = p_professional_id
      AND a.status IN ('Confirmed', 'Pending')
      AND a.appointment_time < p_ends_at
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_starts_at

    UNION ALL

    SELECT json_build_object(
      'id', pb.id,
      'kind', 'public_booking',
      'client_name', COALESCE(pb.customer_name, 'Pedido online'),
      'service', NULL,
      'appointment_time', pb.appointment_time,
      'status', pb.status
    )
    FROM public.public_bookings pb
    WHERE pb.business_id = v_company
      AND pb.professional_id = p_professional_id
      AND pb.status IN ('pending', 'confirmed')
      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
      AND pb.appointment_time < p_ends_at
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_starts_at
  ) q;

  IF json_array_length(v_conflicts) > 0 AND NOT COALESCE(p_acknowledge_conflicts, false) THEN
    RETURN json_build_object('success', false, 'code', 'conflicts', 'items', v_conflicts);
  END IF;

  INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at, created_by)
  VALUES (v_company, p_professional_id, p_starts_at, p_ends_at, auth.uid())
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_agenda_block(
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_acknowledge_conflicts boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company text;
  v_id uuid;
  v_conflicts json;
BEGIN
  v_company := get_auth_company_id();
  IF v_company IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RETURN json_build_object('success', false, 'code', 'invalid_interval');
  END IF;

  IF NOT public.staff_can_manage_agenda_block(p_professional_id) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id = v_company
      AND tm.deleted_at IS NULL
      AND COALESCE(tm.active, true)
  ) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('agenda_block:' || v_company),
    hashtext(p_professional_id::text)
  );

  IF EXISTS (
    SELECT 1 FROM public.agenda_blocks b
    WHERE b.user_id = v_company
      AND b.professional_id = p_professional_id
      AND b.starts_at < p_ends_at
      AND b.ends_at > p_starts_at
  ) THEN
    RETURN json_build_object('success', false, 'code', 'overlap');
  END IF;

  SELECT COALESCE(json_agg(item), '[]'::json)
    INTO v_conflicts
  FROM (
    SELECT json_build_object(
      'id', a.id,
      'kind', 'appointment',
      'client_name', COALESCE(c.name, 'Cliente'),
      'service', a.service,
      'appointment_time', a.appointment_time,
      'status', a.status
    ) AS item
    FROM public.appointments a
    LEFT JOIN public.clients c ON c.id = a.client_id
    WHERE a.user_id = v_company
      AND a.professional_id = p_professional_id
      AND a.status IN ('Confirmed', 'Pending')
      AND a.appointment_time < p_ends_at
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_starts_at

    UNION ALL

    SELECT json_build_object(
      'id', pb.id,
      'kind', 'public_booking',
      'client_name', COALESCE(pb.customer_name, 'Pedido online'),
      'service', NULL,
      'appointment_time', pb.appointment_time,
      'status', pb.status
    )
    FROM public.public_bookings pb
    WHERE pb.business_id = v_company
      AND pb.professional_id = p_professional_id
      AND pb.status IN ('pending', 'confirmed')
      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
      AND pb.appointment_time < p_ends_at
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_starts_at
  ) q;

  IF json_array_length(v_conflicts) > 0 AND NOT COALESCE(p_acknowledge_conflicts, false) THEN
    RETURN json_build_object('success', false, 'code', 'conflicts', 'items', v_conflicts);
  END IF;

  INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at, created_by)
  VALUES (v_company, p_professional_id, p_starts_at, p_ends_at, auth.uid())
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_agenda_block(uuid, timestamptz, timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agenda_block(uuid, timestamptz, timestamptz, boolean) TO authenticated, service_role;

-- 6. delete_agenda_block ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_agenda_block(p_block_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company text;
  v_pro uuid;
BEGIN
  v_company := get_auth_company_id();
  IF v_company IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  SELECT professional_id INTO v_pro
  FROM public.agenda_blocks
  WHERE id = p_block_id AND user_id = v_company;

  IF v_pro IS NULL THEN
    RETURN json_build_object('success', true);
  END IF;

  IF NOT public.staff_can_manage_agenda_block(v_pro) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden');
  END IF;

  DELETE FROM public.agenda_blocks WHERE id = p_block_id AND user_id = v_company;
  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_public_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' AND NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;
  -- Pedido que já ocupava o intervalo (ex. aceitar pending) não pode ficar preso.
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('pending', 'confirmed') THEN
    v_end := OLD.appointment_time + make_interval(mins => GREATEST(COALESCE(OLD.duration_minutes, 30), 1));
    IF public.agenda_interval_blocked(OLD.business_id, OLD.professional_id, OLD.appointment_time, v_end) THEN
      RETURN NEW;
    END IF;
  END IF;
  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.business_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'slot_unavailable',
      HINT = 'agenda_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_public_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_public_bookings() TO service_role;

DROP TRIGGER IF EXISTS enforce_agenda_block_on_public_bookings ON public.public_bookings;
CREATE TRIGGER enforce_agenda_block_on_public_bookings
  BEFORE INSERT OR UPDATE OF appointment_time, professional_id, duration_minutes, status
  ON public.public_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agenda_block_on_public_bookings();

-- 8. Slots / busy / booking interno (CREATE OR REPLACE, mesmas assinaturas)
CREATE OR REPLACE FUNCTION public.get_available_slots(p_business_id uuid, p_date date, p_professional_id uuid DEFAULT NULL::uuid, p_duration_min integer DEFAULT 30, p_is_professional boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_hours JSONB;
    v_day_name TEXT;
    v_day_hours JSONB;
    v_tz TEXT;
    v_local_slot TIMESTAMP;
    v_local_end TIMESTAMP;
    v_current_slot TIMESTAMPTZ;
    v_slots TEXT[] := '{}';
    v_is_busy BOOLEAN;
    v_day_of_week INTEGER;
    v_block RECORD;
    v_duration INTERVAL;
    v_min_duration integer := GREATEST(COALESCE(p_duration_min, 0), 15);
BEGIN
    v_duration := (v_min_duration || ' minutes')::INTERVAL;
    v_tz := public.business_timezone(p_business_id::text);

    SELECT business_hours INTO v_hours FROM public.business_settings WHERE user_id = p_business_id::text;

    v_day_of_week := extract(dow from p_date);
    v_day_name := CASE v_day_of_week
        WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
        WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
        WHEN 6 THEN 'sat'
    END;

    v_day_hours := v_hours->v_day_name;

    IF (v_day_hours IS NULL OR NOT (v_day_hours->>'isOpen')::BOOLEAN) AND NOT p_is_professional THEN
        RETURN json_build_object('slots', v_slots);
    END IF;

    IF p_is_professional THEN
        v_local_slot := (p_date::TEXT || ' 06:00')::TIMESTAMP;
        v_local_end := (p_date::TEXT || ' 22:30')::TIMESTAMP;

        WHILE v_local_slot + v_duration <= v_local_end LOOP
            v_current_slot := v_local_slot AT TIME ZONE v_tz;

            SELECT EXISTS (
                SELECT 1 FROM public.appointments a
                WHERE a.user_id = p_business_id::text
                  AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                  AND a.status NOT IN ('Cancelled', 'NoShow')
                  AND a.appointment_time < v_current_slot + v_duration
                  AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot

                UNION ALL

                SELECT 1 FROM public.public_bookings pb
                WHERE pb.business_id = p_business_id::text
                  AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
                  AND pb.status IN ('pending', 'confirmed')
                  AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
                  AND pb.appointment_time < v_current_slot + v_duration
                  AND (pb.appointment_time + v_duration) > v_current_slot

                UNION ALL

                SELECT 1 WHERE public.agenda_interval_blocked(
                  p_business_id::text, p_professional_id, v_current_slot, v_current_slot + v_duration)
            ) INTO v_is_busy;

            IF NOT v_is_busy THEN
                v_slots := array_append(v_slots, to_char(v_local_slot, 'HH24:MI'));
            END IF;

            v_local_slot := v_local_slot + INTERVAL '30 minutes';
        END LOOP;
    ELSE
        FOR v_block IN SELECT * FROM jsonb_to_recordset(v_day_hours->'blocks') AS x(start TEXT, "end" TEXT) LOOP
            v_local_slot := (p_date::TEXT || ' ' || v_block.start)::TIMESTAMP;
            v_local_end := (p_date::TEXT || ' ' || v_block."end")::TIMESTAMP;

            WHILE v_local_slot + v_duration <= v_local_end LOOP
                v_current_slot := v_local_slot AT TIME ZONE v_tz;

                SELECT EXISTS (
                    SELECT 1 FROM public.appointments a
                    WHERE a.user_id = p_business_id::text
                      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                      AND a.status NOT IN ('Cancelled', 'NoShow')
                      AND a.appointment_time < v_current_slot + v_duration
                      AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot

                    UNION ALL

                    SELECT 1 FROM public.public_bookings pb
                    WHERE pb.business_id = p_business_id::text
                      AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
                      AND pb.status IN ('pending', 'confirmed')
                      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
                      AND pb.appointment_time < v_current_slot + v_duration
                      AND (pb.appointment_time + v_duration) > v_current_slot

                    UNION ALL

                    SELECT 1 WHERE public.agenda_interval_blocked(
                      p_business_id::text, p_professional_id, v_current_slot, v_current_slot + v_duration)
                ) INTO v_is_busy;

                IF NOT v_is_busy AND v_current_slot > NOW() THEN
                    v_slots := array_append(v_slots, to_char(v_local_slot, 'HH24:MI'));
                END IF;

                v_local_slot := v_local_slot + INTERVAL '30 minutes';
            END LOOP;
        END LOOP;
    END IF;

    RETURN json_build_object('slots', v_slots);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_available_slots(p_business_id uuid, p_date date, p_professional_id uuid DEFAULT NULL::uuid, p_duration_min integer DEFAULT 30, p_is_professional boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_hours JSONB;
    v_day_name TEXT;
    v_day_hours JSONB;
    v_tz TEXT;
    v_local_slot TIMESTAMP;
    v_local_end TIMESTAMP;
    v_current_slot TIMESTAMPTZ;
    v_slots TEXT[] := '{}';
    v_is_busy BOOLEAN;
    v_day_of_week INTEGER;
    v_block RECORD;
    v_duration INTERVAL;
    v_min_duration integer := GREATEST(COALESCE(p_duration_min, 0), 15);
BEGIN
    v_duration := (v_min_duration || ' minutes')::INTERVAL;
    v_tz := public.business_timezone(p_business_id::text);

    SELECT business_hours INTO v_hours FROM public.business_settings WHERE user_id = p_business_id::text;

    v_day_of_week := extract(dow from p_date);
    v_day_name := CASE v_day_of_week
        WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
        WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
        WHEN 6 THEN 'sat'
    END;

    v_day_hours := v_hours->v_day_name;

    IF (v_day_hours IS NULL OR NOT (v_day_hours->>'isOpen')::BOOLEAN) AND NOT p_is_professional THEN
        RETURN json_build_object('slots', v_slots);
    END IF;

    IF p_is_professional THEN
        v_local_slot := (p_date::TEXT || ' 06:00')::TIMESTAMP;
        v_local_end := (p_date::TEXT || ' 22:30')::TIMESTAMP;

        WHILE v_local_slot + v_duration <= v_local_end LOOP
            v_current_slot := v_local_slot AT TIME ZONE v_tz;

            SELECT EXISTS (
                SELECT 1 FROM public.appointments a
                WHERE a.user_id = p_business_id::text
                  AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                  AND a.status NOT IN ('Cancelled', 'NoShow')
                  AND a.appointment_time < v_current_slot + v_duration
                  AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot

                UNION ALL

                SELECT 1 FROM public.public_bookings pb
                WHERE pb.business_id = p_business_id::text
                  AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
                  AND pb.status IN ('pending', 'confirmed')
                  AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
                  AND pb.appointment_time < v_current_slot + v_duration
                  AND (pb.appointment_time + v_duration) > v_current_slot

                UNION ALL

                SELECT 1 WHERE public.agenda_interval_blocked(
                  p_business_id::text, p_professional_id, v_current_slot, v_current_slot + v_duration)
            ) INTO v_is_busy;

            IF NOT v_is_busy THEN
                v_slots := array_append(v_slots, to_char(v_local_slot, 'HH24:MI'));
            END IF;

            v_local_slot := v_local_slot + INTERVAL '30 minutes';
        END LOOP;
    ELSE
        FOR v_block IN SELECT * FROM jsonb_to_recordset(v_day_hours->'blocks') AS x(start TEXT, "end" TEXT) LOOP
            v_local_slot := (p_date::TEXT || ' ' || v_block.start)::TIMESTAMP;
            v_local_end := (p_date::TEXT || ' ' || v_block."end")::TIMESTAMP;

            WHILE v_local_slot + v_duration <= v_local_end LOOP
                v_current_slot := v_local_slot AT TIME ZONE v_tz;

                SELECT EXISTS (
                    SELECT 1 FROM public.appointments a
                    WHERE a.user_id = p_business_id::text
                      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                      AND a.status NOT IN ('Cancelled', 'NoShow')
                      AND a.appointment_time < v_current_slot + v_duration
                      AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot

                    UNION ALL

                    SELECT 1 FROM public.public_bookings pb
                    WHERE pb.business_id = p_business_id::text
                      AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
                      AND pb.status IN ('pending', 'confirmed')
                      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
                      AND pb.appointment_time < v_current_slot + v_duration
                      AND (pb.appointment_time + v_duration) > v_current_slot

                    UNION ALL

                    SELECT 1 WHERE public.agenda_interval_blocked(
                      p_business_id::text, p_professional_id, v_current_slot, v_current_slot + v_duration)
                ) INTO v_is_busy;

                IF NOT v_is_busy AND v_current_slot > NOW() THEN
                    v_slots := array_append(v_slots, to_char(v_local_slot, 'HH24:MI'));
                END IF;

                v_local_slot := v_local_slot + INTERVAL '30 minutes';
            END LOOP;
        END LOOP;
    END IF;

    RETURN json_build_object('slots', v_slots);
END;
$function$;

CREATE OR REPLACE FUNCTION public.public_booking_slot_busy(p_business_id text, p_appointment_time timestamp with time zone, p_duration_minutes integer, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.user_id::text = p_business_id
      AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
      AND a.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time

    UNION ALL

    SELECT 1
    FROM public.public_bookings pb
    WHERE pb.business_id = p_business_id
      AND pb.status IN ('pending', 'confirmed')
      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
      AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
      AND pb.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time

    UNION ALL

    SELECT 1
    WHERE public.agenda_interval_blocked(
      p_business_id,
      p_professional_id,
      p_appointment_time,
      p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.public_booking_slot_busy(p_business_id text, p_appointment_time timestamp with time zone, p_duration_minutes integer, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.user_id::text = p_business_id
      AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
      AND a.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time

    UNION ALL

    SELECT 1
    FROM public.public_bookings pb
    WHERE pb.business_id = p_business_id
      AND pb.status IN ('pending', 'confirmed')
      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
      AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
      AND pb.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time

    UNION ALL

    SELECT 1
    WHERE public.agenda_interval_blocked(
      p_business_id,
      p_professional_id,
      p_appointment_time,
      p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_secure_booking(p_business_id uuid, p_professional_id uuid, p_customer_name text, p_customer_phone text, p_customer_email text, p_appointment_time timestamp with time zone, p_service_ids text[], p_total_price numeric, p_duration_min integer DEFAULT 30, p_status text DEFAULT 'pending'::text, p_client_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_custom_service_name text DEFAULT NULL::text, p_payment_method text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_busy BOOLEAN;
    v_booking_id UUID;
    v_service_names TEXT;
    v_caller_tenant TEXT;
    v_status TEXT;
    v_client_id UUID;
    v_end timestamptz;
BEGIN
    v_caller_tenant := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);

    IF v_caller_tenant IS NULL OR v_caller_tenant IS DISTINCT FROM p_business_id::TEXT THEN
        RAISE EXCEPTION 'Acesso negado ao estabelecimento informado.'
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_status := COALESCE(p_status, 'pending');
    v_client_id := p_client_id;
    v_end := p_appointment_time + (COALESCE(p_duration_min, 30) || ' minutes')::INTERVAL;

    IF v_client_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = v_client_id
          AND c.user_id::TEXT = p_business_id::TEXT
    ) THEN
        RAISE EXCEPTION 'Cliente nao pertence ao estabelecimento.';
    END IF;

    IF p_professional_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = p_professional_id
          AND tm.user_id::TEXT = p_business_id::TEXT
    ) THEN
        RAISE EXCEPTION 'Profissional nao pertence ao estabelecimento.';
    END IF;

    IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 AND EXISTS (
        SELECT 1
        FROM unnest(p_service_ids::uuid[]) AS sid
        WHERE NOT EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = sid
              AND s.user_id::TEXT = p_business_id::TEXT
        )
    ) THEN
        RAISE EXCEPTION 'Servico nao pertence ao estabelecimento.';
    END IF;

    IF public.agenda_interval_blocked(p_business_id::text, p_professional_id, p_appointment_time, v_end) THEN
        RETURN json_build_object(
          'success', false,
          'code', 'agenda_blocked',
          'message', 'Este horário está bloqueado. Remova o bloqueio para agendar.'
        );
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_business_id::text
          AND a.professional_id = p_professional_id
          AND a.status NOT IN ('Cancelled', 'NoShow')
          AND a.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (a.appointment_time + INTERVAL '1 minute') > p_appointment_time
        UNION ALL
        SELECT 1 FROM public.public_bookings pb
        WHERE pb.business_id = p_business_id::text
          AND pb.professional_id = p_professional_id
          AND pb.status IN ('pending', 'confirmed')
          AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
          AND pb.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (pb.appointment_time + (p_duration_min || ' minutes')::INTERVAL) > p_appointment_time
    ) INTO v_is_busy;

    IF v_is_busy THEN
        RETURN json_build_object(
          'success', false,
          'message', 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.'
        );
    END IF;

    SELECT string_agg(name, ', ') INTO v_service_names
    FROM public.services
    WHERE id = ANY(p_service_ids::uuid[])
      AND user_id::TEXT = p_business_id::TEXT;

    IF p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN
        IF v_service_names IS NOT NULL AND v_service_names != '' THEN
            v_service_names := v_service_names || ' + ' || p_custom_service_name;
        ELSE
            v_service_names := p_custom_service_name;
        END IF;
    END IF;

    IF v_status = 'Confirmed' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.appointments (
            user_id, client_id, professional_id, service, appointment_time, price,
            duration_minutes, status, notes, payment_method
        ) VALUES (
            p_business_id::text, v_client_id, p_professional_id, v_service_names,
            p_appointment_time, p_total_price, p_duration_min, 'Confirmed',
            p_notes, p_payment_method
        ) RETURNING id INTO v_booking_id;
    ELSE
        INSERT INTO public.public_bookings (
            business_id, professional_id, customer_name, customer_phone, customer_email,
            appointment_time, service_ids, total_price, duration_minutes, status, notes, payment_method
        ) VALUES (
            p_business_id::text, p_professional_id, p_customer_name, p_customer_phone,
            p_customer_email, p_appointment_time, p_service_ids::uuid[], p_total_price,
            p_duration_min, v_status,
            CASE
                WHEN p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN
                    COALESCE(p_notes, '') || E'\nServiço Personalizado: ' || p_custom_service_name
                ELSE p_notes
            END,
            p_payment_method
        ) RETURNING id INTO v_booking_id;
    END IF;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.business_timezone(p_business_id text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_region text;
BEGIN
  SELECT NULLIF(trim(bs.timezone), '')
    INTO v_tz
    FROM public.business_settings bs
   WHERE bs.user_id = p_business_id
   LIMIT 1;

  IF v_tz IS NOT NULL THEN
    BEGIN
      -- Valida o nome IANA sem varrer pg_timezone_names (lento).
      PERFORM now() AT TIME ZONE v_tz;
      RETURN v_tz;
    EXCEPTION WHEN OTHERS THEN
      v_tz := NULL; -- inválido: cai para a região
    END;
  END IF;

  SELECT upper(trim(p.region))
    INTO v_region
    FROM public.profiles p
   WHERE p.id::text = p_business_id
   LIMIT 1;

  IF v_region = 'PT' THEN
    RETURN 'Europe/Lisbon';
  END IF;

  -- BR e região desconhecida: America/Sao_Paulo (comportamento histórico do
  -- app para não-PT e mercado majoritário; o dono pode alterar em Ajustes).
  RETURN 'America/Sao_Paulo';
END;
$$;

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
  v_booking public.public_bookings%ROWTYPE;
BEGIN
  v_business_id := btrim(COALESCE(p_business_id, ''));
  IF v_business_id = '' THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF btrim(COALESCE(p_customer_name, '')) = '' OR btrim(COALESCE(p_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;

  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'invalid_services';
  END IF;

  IF p_appointment_time IS NULL OR p_appointment_time <= NOW() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  v_duration := GREATEST(COALESCE(p_duration_minutes, 30), 1);

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

  PERFORM pg_advisory_xact_lock(hashtextextended(v_business_id, 0));

  IF public.public_booking_slot_busy(
    v_business_id,
    p_appointment_time,
    v_duration,
    p_professional_id
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

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
    COALESCE(p_total_price, 0),
    'pending',
    v_duration,
    COALESCE(p_product_lines, '[]'::jsonb)
  )
  RETURNING * INTO v_booking;

  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_first_available_professional(p_business_id uuid, p_appointment_time timestamp with time zone, p_duration_min integer DEFAULT 30)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pro_id uuid;
  v_end_time timestamp with time zone;
BEGIN
  v_end_time := p_appointment_time + (p_duration_min * interval '1 minute');

  SELECT id INTO v_pro_id
  FROM team_members tm
  WHERE tm.user_id = p_business_id
  AND tm.active = true
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.professional_id = tm.id
    AND a.status NOT IN ('Cancelled', 'Rejected')
    AND (a.appointment_time, a.appointment_time + (a.duration_minutes * interval '1 minute')) OVERLAPS (p_appointment_time, v_end_time)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public_bookings pb
    WHERE pb.professional_id = tm.id
    AND pb.status = 'pending'
    AND (pb.appointment_time, pb.appointment_time + (pb.duration_minutes * interval '1 minute')) OVERLAPS (p_appointment_time, v_end_time)
  )
  ORDER BY random()
  LIMIT 1;

  RETURN v_pro_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_first_available_professional(uuid, timestamptz, integer) TO PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_appointments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_appointments() TO service_role;
REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_public_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_public_bookings() TO service_role;
REVOKE ALL ON FUNCTION public.create_agenda_block(uuid, timestamptz, timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agenda_block(uuid, timestamptz, timestamptz, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_agenda_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_agenda_block(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.agenda_any_professional_busy(text, timestamptz, timestamptz);
DROP INDEX IF EXISTS public.agenda_blocks_professional_id_idx;

-- Confere o corpo restaurado das 8 funções (não só o trigger de appointments).
DO $verify$
DECLARE
  v_got text;
  v_expected text := $md5$create_agenda_block=4ca66817d4c7453c060df13e95df208f
create_public_booking=4f8eca2e78c1acf0a27c3d99f2f69bd6
create_secure_booking=d969b63cc4725c904164451006127eea
delete_agenda_block=f161c0cdf5868403f9f3a8cfa613320d
enforce_agenda_block_on_appointments=150219aaaec7688797ec0e09229d8da5
enforce_agenda_block_on_public_bookings=ef82f24f283c21d6a37ab0f4bb53b134
get_available_slots=1040ec012729035f3000c94ae8debb61
public_booking_slot_busy=042e4ac7aae805011c3220bc2e6757b3$md5$;
BEGIN
  SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), E'\n' ORDER BY p.proname)
    INTO v_got
  FROM pg_proc p
  WHERE p.oid IN (
    'public.enforce_agenda_block_on_appointments()'::regprocedure,
    'public.enforce_agenda_block_on_public_bookings()'::regprocedure,
    'public.create_agenda_block(uuid,timestamptz,timestamptz,boolean)'::regprocedure,
    'public.delete_agenda_block(uuid)'::regprocedure,
    'public.get_available_slots(uuid,date,uuid,integer,boolean)'::regprocedure,
    'public.public_booking_slot_busy(text,timestamptz,integer,uuid)'::regprocedure,
    'public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)'::regprocedure,
    'public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb)'::regprocedure
  );
  IF btrim(v_got) IS DISTINCT FROM btrim(v_expected) THEN
    RAISE EXCEPTION E'rollback md5 divergente\ngot:\n%\nexpected:\n%', v_got, btrim(v_expected);
  END IF;
END
$verify$;

COMMIT;
