-- =============================================================================
-- Falta (NoShow) libera o horário para novos agendamentos
-- =============================================================================
-- DIAGNÓSTICO (prod, 2026-09-25, pg_get_functiondef)
--   Tratavam NoShow como OCUPADO (só excluíam 'Cancelled'):
--     * get_available_slots        (slots do booking online; get_full_dates chama esta)
--     * public_booking_slot_busy   (checagem atômica de create_public_booking)
--     * create_secure_booking(uuid,...) (agenda interna: wizard dono/colaborador)
--   Além disso, um public_booking 'confirmed' (pedido online já aceito) seguia
--   bloqueando o horário mesmo quando o agendamento gerado virava NoShow — ou
--   Cancelled — porque não há FK pedido->agendamento.
--
-- O QUE ESTA MIGRATION FAZ (CREATE OR REPLACE, mesmas assinaturas/atributos;
-- ACL e dono das funções são preservados pelo CREATE OR REPLACE)
--   1. NOVA função auxiliar public.confirmed_booking_slot_released(text, timestamptz, uuid)
--      (SQL, STABLE, INVOKER; só service_role/postgres executam): true quando
--      existe agendamento no mesmo horário/profissional e TODOS estão
--      Cancelled/NoShow.
--   2. get_available_slots, public_booking_slot_busy e create_secure_booking(uuid):
--        * agendamentos: status NOT IN ('Cancelled','NoShow')  (antes: != 'Cancelled')
--        * pedidos online: 'confirmed' deixa de bloquear quando
--          confirmed_booking_slot_released(...) (pedido 'pending' continua bloqueando)
--      Nada mais muda (horários, fuso do #93, durações, mensagens, retorno).
--   Não mexe em linhas, policies, triggers (inclui a do item 4) nem em
--   get_first_available_professional (quebrada em prod por text = uuid; ver PR).
--
-- ORDEM DE APLICAÇÃO
--   * Banco novo + front antigo: só libera horários; nenhuma chamada muda.
--   * Front novo + banco antigo: "Reagendar"/"+" no horário da falta abrem o
--     wizard; se escolher o MESMO horário da falta, o banco antigo recusa com a
--     mensagem de sempre ("horário acabou de ser ocupado"); outros horários ok.
--
-- ROLLBACK: docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql
-- =============================================================================

-- 1. Auxiliar (antes das funções que a usam: public_booking_slot_busy é LANGUAGE sql)
CREATE OR REPLACE FUNCTION public.confirmed_booking_slot_released(
  p_business_id text,
  p_appointment_time timestamp with time zone,
  p_professional_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  -- Um public_booking 'confirmed' já virou agendamento (accept_public_booking
  -- insere o appointment no MESMO horário e profissional — ou no profissional
  -- padrão quando o pedido veio sem profissional). Se TODOS os agendamentos
  -- correspondentes estão Cancelled/NoShow, o pedido não segura mais o horário.
  -- Sem agendamento correspondente (legado / 'confirmed' sem cliente), nada muda.
  SELECT EXISTS (
           SELECT 1 FROM public.appointments a
           WHERE a.user_id = p_business_id
             AND a.appointment_time = p_appointment_time
             AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
             AND a.status IN ('Cancelled', 'NoShow')
         )
     AND NOT EXISTS (
           SELECT 1 FROM public.appointments a
           WHERE a.user_id = p_business_id
             AND a.appointment_time = p_appointment_time
             AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
             AND a.status NOT IN ('Cancelled', 'NoShow')
         );
$function$;

REVOKE ALL ON FUNCTION public.confirmed_booking_slot_released(text, timestamp with time zone, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmed_booking_slot_released(text, timestamp with time zone, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.confirmed_booking_slot_released(text, timestamp with time zone, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirmed_booking_slot_released(text, timestamp with time zone, uuid) TO service_role;

-- 2. get_available_slots
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
    v_local_slot TIMESTAMP;      -- hora de parede no fuso do negócio
    v_local_end TIMESTAMP;
    v_current_slot TIMESTAMPTZ;  -- instante real do slot
    v_slots TEXT[] := '{}';
    v_is_busy BOOLEAN;
    v_day_of_week INTEGER;
    v_block RECORD;
    v_duration INTERVAL;
    v_min_duration integer := GREATEST(COALESCE(p_duration_min, 0), 15); -- Garante mínimo de 15 min para evitar loop, aceita 0 como cooldown
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

    -- Se estiver fechado e não for profissional, retorna vazio
    IF (v_day_hours IS NULL OR NOT (v_day_hours->>'isOpen')::BOOLEAN) AND NOT p_is_professional THEN
        RETURN json_build_object('slots', v_slots);
    END IF;

    -- Lógica para profissionais (permite agendar fora do horário comercial se p_is_professional for true)
    IF p_is_professional THEN
        v_local_slot := (p_date::TEXT || ' 06:00')::TIMESTAMP;
        v_local_end := (p_date::TEXT || ' 22:30')::TIMESTAMP;

        WHILE v_local_slot + v_duration <= v_local_end LOOP
            v_current_slot := v_local_slot AT TIME ZONE v_tz;

            SELECT EXISTS (
                SELECT 1 FROM public.appointments a
                WHERE a.user_id = p_business_id::text
                  AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                  AND a.status NOT IN ('Cancelled', 'NoShow') -- falta (NoShow) libera o horário
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
            ) INTO v_is_busy;

            IF NOT v_is_busy THEN
                v_slots := array_append(v_slots, to_char(v_local_slot, 'HH24:MI'));
            END IF;

            v_local_slot := v_local_slot + INTERVAL '30 minutes';
        END LOOP;
    ELSE
        -- Lógica para Clientes (respeita blocos de horário, no fuso do negócio)
        FOR v_block IN SELECT * FROM jsonb_to_recordset(v_day_hours->'blocks') AS x(start TEXT, "end" TEXT) LOOP
            v_local_slot := (p_date::TEXT || ' ' || v_block.start)::TIMESTAMP;
            v_local_end := (p_date::TEXT || ' ' || v_block."end")::TIMESTAMP;

            WHILE v_local_slot + v_duration <= v_local_end LOOP
                v_current_slot := v_local_slot AT TIME ZONE v_tz;

                SELECT EXISTS (
                    SELECT 1 FROM public.appointments a
                    WHERE a.user_id = p_business_id::text
                      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                      AND a.status NOT IN ('Cancelled', 'NoShow') -- falta (NoShow) libera o horário
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
$function$
;

-- 3. public_booking_slot_busy
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
      AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow') -- falta (NoShow) libera o horário
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
  );
$function$
;

-- 4. create_secure_booking (assinatura uuid; o wrapper text só delega)
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
BEGIN
    v_caller_tenant := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);

    IF v_caller_tenant IS NULL OR v_caller_tenant IS DISTINCT FROM p_business_id::TEXT THEN
        RAISE EXCEPTION 'Acesso negado ao estabelecimento informado.'
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_status := COALESCE(p_status, 'pending');
    v_client_id := p_client_id;

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

    SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_business_id::text
          AND a.professional_id = p_professional_id
          AND a.status NOT IN ('Cancelled', 'NoShow') -- falta (NoShow) libera o horário
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
$function$
;
