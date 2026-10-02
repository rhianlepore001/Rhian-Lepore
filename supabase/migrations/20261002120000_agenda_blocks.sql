-- =============================================================================
-- Bloqueio de agenda por colaborador (trava rígida, sem motivo, sem encaixe)
-- =============================================================================
-- ROLLBACK: docs/rollbacks/20261002120000_agenda_blocks_rollback.sql
-- =============================================================================

-- 1. Permissão da equipe ------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS staff_can_block_agenda boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.business_settings.staff_can_block_agenda IS
  'Se o colaborador pode criar/remover bloqueio na própria agenda. Default true. Só o dono altera. Desligar não apaga bloqueios existentes.';

-- 2. Tabela -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  professional_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_blocks_interval_chk CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS agenda_blocks_lookup_idx
  ON public.agenda_blocks (user_id, professional_id, starts_at);

COMMENT ON TABLE public.agenda_blocks IS
  'Intervalo [starts_at, ends_at) em que o profissional não recebe agendamento. Sem motivo. Mutação só via RPC.';

ALTER TABLE public.agenda_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_blocks company read" ON public.agenda_blocks;
CREATE POLICY "agenda_blocks company read"
  ON public.agenda_blocks FOR SELECT TO authenticated
  USING (user_id = get_auth_company_id());

REVOKE ALL ON TABLE public.agenda_blocks FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.agenda_blocks TO authenticated;
GRANT ALL ON TABLE public.agenda_blocks TO service_role;

-- 3. Helper: intervalo cruza algum bloqueio -----------------------------------
CREATE OR REPLACE FUNCTION public.agenda_interval_blocked(
  p_user_id text,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_professional_id IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM public.agenda_blocks b
        WHERE b.user_id = p_user_id
          AND b.professional_id = p_professional_id
          AND b.starts_at < p_ends_at
          AND b.ends_at > p_starts_at
      )
    ELSE
      EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id = p_user_id
          AND COALESCE(tm.active, true)
          AND tm.deleted_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id = p_user_id
          AND COALESCE(tm.active, true)
          AND tm.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.agenda_blocks b
            WHERE b.user_id = p_user_id
              AND b.professional_id = tm.id
              AND b.starts_at < p_ends_at
              AND b.ends_at > p_starts_at
          )
      )
  END;
$function$;

REVOKE ALL ON FUNCTION public.agenda_interval_blocked(text, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agenda_interval_blocked(text, uuid, timestamptz, timestamptz) TO service_role;

-- 4. Authz create/delete ------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.staff_can_manage_agenda_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_can_manage_agenda_block(uuid) TO authenticated, service_role;

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

REVOKE ALL ON FUNCTION public.delete_agenda_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_agenda_block(uuid) TO authenticated, service_role;

-- 7. Trigger em appointments (INSERT / mudança de horário) --------------------
CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_appointments()
RETURNS trigger
LANGUAGE plpgsql
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
  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.user_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION 'agenda_blocked'
      USING ERRCODE = '42501',
            MESSAGE = 'Este horário está bloqueado. Remova o bloqueio para agendar.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_agenda_block_on_appointments ON public.appointments;
CREATE TRIGGER enforce_agenda_block_on_appointments
  BEFORE INSERT OR UPDATE OF appointment_time, professional_id, duration_minutes
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agenda_block_on_appointments();

CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_public_bookings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' AND NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;
  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.business_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION 'agenda_blocked'
      USING ERRCODE = '42501',
            MESSAGE = 'slot_unavailable';
  END IF;
  RETURN NEW;
END;
$function$;

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

-- 9. get_first_available_professional: pula quem está bloqueado
CREATE OR REPLACE FUNCTION public.get_first_available_professional(
  p_business_id       UUID,
  p_appointment_time  TIMESTAMPTZ,
  p_duration_min      INT DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_id      UUID;
  v_end_time    TIMESTAMPTZ;
  v_is_busy     BOOLEAN;
BEGIN
  v_end_time := p_appointment_time + (p_duration_min || ' minutes')::INTERVAL;

  FOR v_pro_id IN
    SELECT id FROM team_members
    WHERE user_id = p_business_id
      AND active = true
      AND deleted_at IS NULL
    ORDER BY name
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.user_id = p_business_id
        AND a.professional_id = v_pro_id
        AND a.status NOT IN ('Cancelled', 'NoShow')
        AND a.appointment_time < v_end_time
        AND (a.appointment_time + INTERVAL '30 minutes') > p_appointment_time

      UNION ALL

      SELECT 1 FROM public_bookings pb
      WHERE pb.business_id = p_business_id
        AND pb.professional_id = v_pro_id
        AND pb.status IN ('pending', 'confirmed')
        AND pb.appointment_time < v_end_time
        AND (pb.appointment_time + (COALESCE(pb.duration_minutes, p_duration_min) || ' minutes')::INTERVAL) > p_appointment_time

      UNION ALL

      SELECT 1 WHERE public.agenda_interval_blocked(p_business_id::text, v_pro_id, p_appointment_time, v_end_time)
    ) INTO v_is_busy;

    IF NOT v_is_busy THEN
      RETURN v_pro_id;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_first_available_professional(UUID, TIMESTAMPTZ, INT) TO anon, authenticated;

-- 10. get_full_dates passa a delegar a get_available_slots (herda bloqueios)
DROP FUNCTION IF EXISTS public.get_full_dates(uuid, date, date, uuid, integer);
CREATE OR REPLACE FUNCTION public.get_full_dates(
  p_business_id       UUID,
  p_start_date        DATE,
  p_end_date          DATE,
  p_professional_id   UUID    DEFAULT NULL,
  p_duration_min      INT     DEFAULT 30
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date   DATE;
  v_full_dates     TEXT[] := '{}';
  v_slots_resp     json;
  v_duration       integer := GREATEST(COALESCE(p_duration_min, 30), 15);
BEGIN
  p_end_date := LEAST(p_end_date, p_start_date + INTERVAL '90 days');
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    v_slots_resp := public.get_available_slots(p_business_id, v_current_date, p_professional_id, v_duration, false);
    IF json_array_length(COALESCE(v_slots_resp->'slots', '[]'::json)) = 0 THEN
      v_full_dates := array_append(v_full_dates, v_current_date::TEXT);
    END IF;
    v_current_date := v_current_date + 1;
  END LOOP;
  RETURN v_full_dates;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_full_dates(UUID, DATE, DATE, UUID, INT) TO anon, authenticated;
