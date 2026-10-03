-- =============================================================================
-- Follow-up do bloqueio de agenda (ACCEPTANCE B-18, B-19, B-20, B-25,
-- B-35, B-38, B-41, B-44, B-46, B-51, B-54..B-56, C-B17, M1)
-- =============================================================================
-- Aditiva: não apaga linha. Troca o corpo de funções (CREATE OR REPLACE) e
-- substitui a assinatura de create_agenda_block por uma com a lista de
-- conflitos confirmados (o 4-arg é removido e recriado com default, então a
-- chamada antiga continua válida).
--
-- Se 20261003090000 já tiver sido aplicada, este CREATE OR REPLACE do trigger
-- preserva o passe de Completed (B-41) e ainda recusa reabrir para
-- Pending/Confirmed.
--
-- ROLLBACK: docs/rollbacks/20261003120000_agenda_blocks_acceptance_followup_rollback.sql
-- =============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS agenda_blocks_professional_id_idx
  ON public.agenda_blocks (professional_id);

-- Capacidade do "qualquer profissional": livres e desbloqueados > sem profissional.
CREATE OR REPLACE FUNCTION public.agenda_any_professional_busy(
  p_user_id text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    SELECT count(*)
    FROM public.team_members tm
    WHERE tm.user_id = p_user_id
      AND COALESCE(tm.active, true)
      AND tm.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_user_id
          AND a.professional_id = tm.id
          AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
          AND a.appointment_time > p_starts_at - interval '1 day'
          AND a.appointment_time < p_ends_at
          AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_starts_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.public_bookings pb
        WHERE pb.business_id = p_user_id
          AND pb.professional_id = tm.id
          AND pb.status IN ('pending', 'confirmed')
          AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
          AND pb.appointment_time > p_starts_at - interval '1 day'
          AND pb.appointment_time < p_ends_at
          AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_starts_at
      )
      AND NOT public.agenda_interval_blocked(p_user_id, tm.id, p_starts_at, p_ends_at)
  ) <= (
    SELECT count(*) FROM (
      SELECT 1 FROM public.appointments a
      WHERE a.user_id = p_user_id
        AND a.professional_id IS NULL
        AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
        AND a.appointment_time > p_starts_at - interval '1 day'
        AND a.appointment_time < p_ends_at
        AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_starts_at
      UNION ALL
      SELECT 1 FROM public.public_bookings pb
      WHERE pb.business_id = p_user_id
        AND pb.professional_id IS NULL
        AND pb.status IN ('pending', 'confirmed')
        AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
        AND pb.appointment_time > p_starts_at - interval '1 day'
        AND pb.appointment_time < p_ends_at
        AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_starts_at
    ) unassigned
  );
$function$;

REVOKE ALL ON FUNCTION public.agenda_any_professional_busy(text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agenda_any_professional_busy(text, timestamptz, timestamptz) TO service_role;

-- Trigger: revalida o intervalo NOVO quando hora, profissional ou duração mudam (B-30/B-35/B-38).
-- Completed passa (B-41). Só status, com o anterior ainda ocupando, segue (B-42 recusa reabrir).
CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
  v_name text;
BEGIN
  IF NEW.status IN ('Cancelled', 'NoShow', 'Completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.professional_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Status só muda de verdade quando o anterior ainda ocupava o horário.
  -- Cancelled/NoShow/Completed reaberto para Confirmed/Pending volta a ser checado (B-42).
  IF TG_OP = 'UPDATE'
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
     AND NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id
     AND NEW.duration_minutes IS NOT DISTINCT FROM OLD.duration_minutes
     AND OLD.status NOT IN ('Cancelled', 'NoShow', 'Completed') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id, 0));

  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.user_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    SELECT tm.name INTO v_name
    FROM public.team_members tm
    WHERE tm.id = NEW.professional_id AND tm.user_id = NEW.user_id;
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format(
        'Horário bloqueado na agenda de %s. Para agendar, remova o bloqueio primeiro.',
        COALESCE(NULLIF(btrim(v_name), ''), 'profissional')
      ),
      HINT = 'professional_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_appointments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_appointments() TO service_role;

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
  IF TG_OP = 'UPDATE'
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
     AND NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id
     AND NEW.duration_minutes IS NOT DISTINCT FROM OLD.duration_minutes THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_id, 0));

  -- B-44: insert direto sem profissional recebe o primeiro livre (ou slot_unavailable).
  IF NEW.professional_id IS NULL THEN
    NEW.professional_id := public.get_first_available_professional(
      NEW.business_id::uuid,
      NEW.appointment_time,
      NEW.duration_minutes
    );
    IF NEW.professional_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'slot_unavailable',
        HINT = 'slot_unavailable';
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

-- create_agenda_block: validações B-18/B-19/B-20 + trava da empresa (B-54).
DROP FUNCTION IF EXISTS public.create_agenda_block(uuid, timestamptz, timestamptz, boolean);

CREATE OR REPLACE FUNCTION public.create_agenda_block(
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_acknowledge_conflicts boolean DEFAULT false,
  p_confirmed_conflict_ids uuid[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company text;
  v_tz text;
  v_id uuid;
  v_conflicts json;
  v_ids uuid[];
BEGIN
  v_company := get_auth_company_id();
  IF v_company IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'forbidden', 'message', 'Sua sessão expirou. Entre de novo.');
  END IF;

  IF NOT public.staff_can_manage_agenda_block(p_professional_id) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden', 'message', 'Você não tem permissão para bloquear esta agenda.');
  END IF;

  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RETURN json_build_object('success', false, 'code', 'invalid_interval', 'message', 'O fim do bloqueio precisa ser depois do início.');
  END IF;

  IF p_ends_at - p_starts_at > interval '366 days' THEN
    RETURN json_build_object('success', false, 'code', 'block_too_long', 'message', 'Um bloqueio pode ter no máximo 366 dias.');
  END IF;

  v_tz := public.business_timezone(v_company);

  IF p_ends_at <= now() THEN
    RETURN json_build_object(
      'success', false,
      'code', 'block_starts_in_past',
      'message', 'Esse período já terminou.'
    );
  END IF;

  -- B-21/B-22: hoje e ainda em curso → não grava; devolve o início em agora para confirmar.
  IF p_starts_at < now() - interval '5 minutes' THEN
    IF (p_starts_at AT TIME ZONE v_tz)::date = (now() AT TIME ZONE v_tz)::date THEN
      RETURN json_build_object(
        'success', false,
        'code', 'block_start_adjusted',
        'message', 'O início do bloqueio já passou. Ajustamos para agora — confira e confirme de novo.',
        'starts_at', now(),
        'ends_at', p_ends_at
      );
    END IF;
    RETURN json_build_object(
      'success', false,
      'code', 'block_starts_in_past',
      'message', 'O início do bloqueio já passou.'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id = v_company
      AND tm.deleted_at IS NULL
      AND COALESCE(tm.active, true)
  ) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden', 'message', 'Esse profissional não está disponível.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_company, 0));

  SELECT COALESCE(json_agg(item), '[]'::json), COALESCE(array_agg(cid), '{}'::uuid[])
    INTO v_conflicts, v_ids
  FROM (
    SELECT a.id AS cid, json_build_object(
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

    SELECT pb.id, json_build_object(
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

  IF cardinality(v_ids) > 0 AND NOT COALESCE(p_acknowledge_conflicts, false) THEN
    RETURN json_build_object('success', false, 'code', 'conflicts', 'items', v_conflicts);
  END IF;

  IF cardinality(v_ids) > 0 AND p_confirmed_conflict_ids IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'code', 'conflicts',
      'message', 'Confirme a lista de atendimentos deste período.',
      'items', v_conflicts
    );
  END IF;

  IF cardinality(v_ids) > 0
     AND p_confirmed_conflict_ids IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM unnest(v_ids) AS cid
       WHERE NOT (cid = ANY (p_confirmed_conflict_ids))
     ) THEN
    RETURN json_build_object(
      'success', false,
      'code', 'block_conflicts_changed',
      'message', 'Entrou um novo atendimento nesse período. Revise a lista e confirme de novo.',
      'items', v_conflicts
    );
  END IF;

  INSERT INTO public.agenda_blocks (user_id, professional_id, starts_at, ends_at, created_by)
  VALUES (v_company, p_professional_id, p_starts_at, p_ends_at, auth.uid())
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_agenda_block(uuid, timestamptz, timestamptz, boolean, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agenda_block(uuid, timestamptz, timestamptz, boolean, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_agenda_block(p_block_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company text;
  v_pro uuid;
  v_ends timestamptz;
BEGIN
  v_company := get_auth_company_id();
  IF v_company IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'forbidden', 'message', 'Sua sessão expirou. Entre de novo.');
  END IF;

  SELECT professional_id, ends_at INTO v_pro, v_ends
  FROM public.agenda_blocks
  WHERE id = p_block_id AND user_id = v_company;

  IF v_pro IS NULL THEN
    RETURN json_build_object('success', true);
  END IF;

  IF NOT public.staff_can_manage_agenda_block(v_pro) THEN
    RETURN json_build_object('success', false, 'code', 'forbidden', 'message', 'Você não tem permissão para bloquear esta agenda.');
  END IF;

  IF v_ends <= now() THEN
    RETURN json_build_object(
      'success', false,
      'code', 'block_finished',
      'message', 'Este bloqueio já terminou e fica só no histórico.'
    );
  END IF;

  DELETE FROM public.agenda_blocks WHERE id = p_block_id AND user_id = v_company;
  RETURN json_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_agenda_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_agenda_block(uuid) TO authenticated, service_role;

-- get_first: user_id é text (o live comparava com uuid e quebrava). Pula bloqueados.
-- Ordem: dono, display_order, created_at. Sem profissional consome vaga (OFFSET).
CREATE OR REPLACE FUNCTION public.get_first_available_professional(
  p_business_id uuid,
  p_appointment_time timestamp with time zone,
  p_duration_min integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
  v_unassigned integer;
  v_pro uuid;
  v_company text := p_business_id::text;
BEGIN
  IF p_appointment_time IS NULL THEN
    RETURN NULL;
  END IF;
  v_end := p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_min, 30), 1));

  SELECT count(*) INTO v_unassigned
  FROM (
    SELECT 1 FROM public.appointments a
    WHERE a.user_id = v_company
      AND a.professional_id IS NULL
      AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
      AND a.appointment_time < v_end
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time
    UNION ALL
    SELECT 1 FROM public.public_bookings pb
    WHERE pb.business_id = v_company
      AND pb.professional_id IS NULL
      AND pb.status IN ('pending', 'confirmed')
      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
      AND pb.appointment_time < v_end
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time
  ) u;

  SELECT tm.id INTO v_pro
  FROM public.team_members tm
  WHERE tm.user_id = v_company
    AND COALESCE(tm.active, true)
    AND tm.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.professional_id = tm.id
        AND a.user_id = v_company
        AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
        AND a.appointment_time < v_end
        AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.public_bookings pb
      WHERE pb.professional_id = tm.id
        AND pb.business_id = v_company
        AND pb.status IN ('pending', 'confirmed')
        AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
        AND pb.appointment_time < v_end
        AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time
    )
    AND NOT public.agenda_interval_blocked(v_company, tm.id, p_appointment_time, v_end)
  ORDER BY tm.is_owner DESC NULLS LAST, tm.display_order NULLS LAST, tm.created_at NULLS LAST
  OFFSET GREATEST(v_unassigned, 0)
  LIMIT 1;

  RETURN v_pro;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_first_available_professional(uuid, timestamptz, integer) TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_booking_slot_busy(p_business_id text, p_appointment_time timestamp with time zone, p_duration_minutes integer, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_professional_id IS NOT NULL THEN EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.user_id::text = p_business_id
        AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
        AND a.professional_id = p_professional_id
        AND a.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
        AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time
      UNION ALL
      SELECT 1
      FROM public.public_bookings pb
      WHERE pb.business_id = p_business_id
        AND pb.status IN ('pending', 'confirmed')
        AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
        AND pb.professional_id = p_professional_id
        AND pb.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
        AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time
      UNION ALL
      SELECT 1
      WHERE public.agenda_interval_blocked(
        p_business_id, p_professional_id, p_appointment_time,
        p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      )
    )
    ELSE public.agenda_any_professional_busy(
      p_business_id,
      p_appointment_time,
      p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
    )
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

            IF p_professional_id IS NULL THEN
                v_is_busy := public.agenda_any_professional_busy(p_business_id::text, v_current_slot, v_current_slot + v_duration);
            ELSE
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
            END IF;

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

                IF p_professional_id IS NULL THEN
                    v_is_busy := public.agenda_any_professional_busy(p_business_id::text, v_current_slot, v_current_slot + v_duration);
                ELSE
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
                END IF;

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

    PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

    IF public.agenda_interval_blocked(p_business_id::text, p_professional_id, p_appointment_time, v_end) THEN
        RETURN json_build_object(
          'success', false,
          'code', 'professional_blocked',
          'message', format(
            'Horário bloqueado na agenda de %s. Para agendar, remova o bloqueio primeiro.',
            COALESCE((SELECT NULLIF(btrim(tm.name), '') FROM public.team_members tm WHERE tm.id = p_professional_id AND tm.user_id = p_business_id::text), 'profissional')
          )
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

COMMIT;
