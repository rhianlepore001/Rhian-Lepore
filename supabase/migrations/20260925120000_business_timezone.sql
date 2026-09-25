-- =============================================================================
-- Fuso horário fixo por estabelecimento (business timezone)
-- =============================================================================
-- PROBLEMA
--   get_available_slots montava os horários com
--   (p_date::text || ' ' || '09:00')::timestamptz. A sessão do banco está em
--   UTC, então "09:00" virava 09:00 UTC (= 06:00 em São Paulo, 10:00 em Lisboa
--   no verão). Consequências no agendamento online:
--     * "horário já passou" comparado em UTC: negócio BR perdia os horários do
--       dia 3h antes (às 16:00 BRT sumiam 16:30…19:00);
--     * conflitos (appointments/public_bookings, gravados como instante real)
--       eram checados contra o instante errado (3h de deslocamento no BR,
--       1h em PT no horário de verão).
--
-- O QUE ESTA MIGRATION FAZ (somente aditivo; nenhuma linha existente de
-- appointments/public_bookings é alterada)
--   1. business_settings.timezone (text, NULL permitido) + backfill a partir de
--      profiles.region: PT -> Europe/Lisbon, BR -> America/Sao_Paulo.
--   2. public.business_timezone(text): fuso efetivo do negócio
--      (coluna válida -> região -> fallback America/Sao_Paulo).
--   3. get_available_slots: MESMA assinatura e MESMO retorno ({"slots": text[]}).
--      Agora interpreta o expediente no fuso do negócio; o rótulo "HH:MM"
--      devolvido continua sendo a hora local do negócio.
--   4. get_public_business_settings_json: MESMA assinatura; o JSON ganha a
--      chave extra "timezone" (clientes antigos ignoram).
--   get_full_dates chama get_available_slots e é corrigida por tabela.
--
-- COMPATIBILIDADE
--   * Frontend novo antes desta migration: resolve o fuso pela região
--     (mesmo default) e funciona.
--   * Frontend antigo depois desta migration: recebe os mesmos rótulos locais;
--     o JSON extra é ignorado.
--
-- ROLLBACK (manual, se necessário)
--   Script pronto em docs/rollbacks/20260925120000_business_timezone_rollback.sql
--   (fora de supabase/migrations de propósito): recria get_available_slots e
--   get_public_business_settings_json exatamente como estavam em produção em
--   2026-09-25 e faz DROP FUNCTION public.business_timezone(text).
--   A coluna business_settings.timezone pode ficar (inofensiva) ou ser removida.
--   O frontend novo continua funcionando sem a coluna/sem a chave (usa a região).
-- =============================================================================

-- 1. Coluna + backfill -------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS timezone text;

COMMENT ON COLUMN public.business_settings.timezone IS
  'Fuso IANA fixo do estabelecimento (ex.: America/Sao_Paulo, Europe/Lisbon). '
  'NULL = derivar da região (PT -> Europe/Lisbon, demais -> America/Sao_Paulo).';

UPDATE public.business_settings bs
   SET timezone = CASE upper(trim(p.region))
                    WHEN 'PT' THEN 'Europe/Lisbon'
                    WHEN 'BR' THEN 'America/Sao_Paulo'
                  END
  FROM public.profiles p
 WHERE p.id::text = bs.user_id
   AND bs.timezone IS NULL
   AND upper(trim(p.region)) IN ('PT', 'BR');

-- 2. Helper: fuso efetivo do negócio ------------------------------------------
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

COMMENT ON FUNCTION public.business_timezone(text) IS
  'Fuso IANA efetivo do negócio: business_settings.timezone válido -> região (PT=Europe/Lisbon) -> America/Sao_Paulo.';

-- Uso interno pelas RPCs SECURITY DEFINER; não expor a anon/PUBLIC.
REVOKE EXECUTE ON FUNCTION public.business_timezone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_timezone(text) TO authenticated, service_role;

-- 3. get_available_slots (mesma assinatura / mesmo retorno) -------------------
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_business_id uuid,
  p_date date,
  p_professional_id uuid DEFAULT NULL::uuid,
  p_duration_min integer DEFAULT 30,
  p_is_professional boolean DEFAULT false
)
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
                    v_slots := array_append(v_slots, to_char(v_local_slot, 'HH24:MI'));
                END IF;

                v_local_slot := v_local_slot + INTERVAL '30 minutes';
            END LOOP;
        END LOOP;
    END IF;

    RETURN json_build_object('slots', v_slots);
END;
$function$;

-- 4. get_public_business_settings_json (mesma assinatura; + chave timezone) ----
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
    'queue_late_minutes', bs.queue_late_minutes,
    'timezone', public.business_timezone(p_business_id::text)
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;
