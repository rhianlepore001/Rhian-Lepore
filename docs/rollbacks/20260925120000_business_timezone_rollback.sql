-- ROLLBACK de supabase/migrations/20260925120000_business_timezone.sql
-- NÃO é migration (fica fora de supabase/migrations de propósito).
-- Rodar manualmente no SQL editor SOMENTE se for preciso desfazer.
-- Restaura as definições que estavam em produção em 2026-09-25 (capturadas via
-- pg_get_functiondef). O frontend novo continua funcionando após o rollback
-- (usa profiles.region para resolver o fuso).

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
    v_current_slot TIMESTAMPTZ;
    v_end_slot TIMESTAMPTZ;
    v_slots TEXT[] := '{}';
    v_is_busy BOOLEAN;
    v_day_of_week INTEGER;
    v_block RECORD;
    v_duration INTERVAL;
    v_min_duration integer := GREATEST(COALESCE(p_duration_min, 0), 15); -- Garante mínimo de 15 min para evitar loop, aceita 0 como cooldown
BEGIN
    v_duration := (v_min_duration || ' minutes')::INTERVAL;

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
        v_current_slot := (p_date::TEXT || ' 06:00')::TIMESTAMPTZ;
        v_end_slot := (p_date::TEXT || ' 22:30')::TIMESTAMPTZ;
        
        WHILE v_current_slot + v_duration <= v_end_slot LOOP
            SELECT EXISTS (
                SELECT 1 FROM public.appointments a
                WHERE a.user_id = p_business_id::text
                  AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                  AND a.status != 'Cancelled'
                  AND a.appointment_time < v_current_slot + v_duration
                  AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot
                
                UNION ALL
                
                SELECT 1 FROM public.public_bookings pb
                WHERE pb.business_id = p_business_id::text
                  AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
                  AND pb.status IN ('pending', 'confirmed')
                  AND pb.appointment_time < v_current_slot + v_duration
                  AND (pb.appointment_time + v_duration) > v_current_slot
            ) INTO v_is_busy;

            IF NOT v_is_busy THEN
                v_slots := array_append(v_slots, to_char(v_current_slot, 'HH24:MI'));
            END IF;

            v_current_slot := v_current_slot + INTERVAL '30 minutes';
        END LOOP;
    ELSE
        -- Lógica para Clientes (respeita blocos de horário)
        FOR v_block IN SELECT * FROM jsonb_to_recordset(v_day_hours->'blocks') AS x(start TEXT, "end" TEXT) LOOP
            v_current_slot := (p_date::TEXT || ' ' || v_block.start)::TIMESTAMPTZ;
            v_end_slot := (p_date::TEXT || ' ' || v_block."end")::TIMESTAMPTZ;

            WHILE v_current_slot + v_duration <= v_end_slot LOOP
                SELECT EXISTS (
                    SELECT 1 FROM public.appointments a
                    WHERE a.user_id = p_business_id::text
                      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
                      AND a.status != 'Cancelled'
                      AND a.appointment_time < v_current_slot + v_duration
                      AND (a.appointment_time + INTERVAL '30 minutes') > v_current_slot
                    
                    UNION ALL
                    
                    SELECT 1 FROM public.public_bookings pb
                    WHERE pb.business_id = p_business_id::text
                      AND (p_professional_id IS NULL OR pb.professional_id = p_professional_id)
                      AND pb.status IN ('pending', 'confirmed')
                      AND pb.appointment_time < v_current_slot + v_duration
                      AND (pb.appointment_time + v_duration) > v_current_slot
                ) INTO v_is_busy;

                IF NOT v_is_busy AND v_current_slot > NOW() THEN
                    v_slots := array_append(v_slots, to_char(v_current_slot, 'HH24:MI'));
                END IF;

                v_current_slot := v_current_slot + INTERVAL '30 minutes';
            END LOOP;
        END LOOP;
    END IF;

    RETURN json_build_object('slots', v_slots);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_business_settings_json(p_business_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'business_hours', bs.business_hours,
    'cancellation_policy', bs.cancellation_policy,
    'enable_self_rescheduling', bs.enable_self_rescheduling,
    'public_products_enabled', bs.public_products_enabled,
    'queue_mode', bs.queue_mode,
    'queue_allow_leave', bs.queue_allow_leave,
    'queue_late_minutes', bs.queue_late_minutes
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;

DROP FUNCTION IF EXISTS public.business_timezone(text);

-- Opcional (perde os fusos escolhidos pelos donos):
-- ALTER TABLE public.business_settings DROP COLUMN IF EXISTS timezone;
