-- =============================================================================
-- PR-2: antecedência mínima de verdade no link público
-- =============================================================================
-- Aditiva. Não altera o corpo de get_available_slots, create_public_booking,
-- create_secure_booking nem enforce_agenda_block_on_appointments (md5
-- conferido no harness local — não é o md5 de produção).
--
-- Fonte única: profiles.booking_lead_time_hours (DEFAULT 2 — D1: os 83
-- negócios já têm 2h salvo; a regra passa a valer sem backfill).
-- business_settings.lead_time_hours, se existir no banco, NÃO é lida.
--
-- O atalho public_bookings_insert_anon fura a RPC, por isso a regra vive
-- num trigger BEFORE INSERT/UPDATE OF appointment_time, status. A Agenda
-- (appointments, inclusive encaixe no passado do #101) e o staff/dono do
-- mesmo tenant (auth.uid + get_auth_company_id) não são afetados — o
-- Remarcar (#120, 20261003150000) aplica primeiro e atualiza
-- public_bookings.appointment_time no pedido vinculado.
--
-- get_available_slots_v2 envolve a v1 e filtra >= now() + lead no fuso do
-- negócio (#93). p_is_professional = true devolve a v1 sem antecedência.
-- get_full_dates_v2 marca o dia cheio com a v2 (lead-aware).
--
-- NÃO CORRIGIDO neste PR (achado fora da spec): com profissional escolhido,
-- get_available_slots ainda trata todo atendimento como 30 min.
--
-- Em produção a versão do ficheiro alinha-se no apply; #120 aplica antes.
-- ROLLBACK: docs/rollbacks/20261003160000_public_booking_lead_time_rollback.sql
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_lead_time_hours integer DEFAULT 2;

COMMENT ON COLUMN public.profiles.booking_lead_time_hours IS
  'Antecedência mínima em horas para pedidos do link público. 0 = sem mínimo. Padrão 2. A Agenda da equipe não usa este campo.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_lead_time_hours_range'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT booking_lead_time_hours_range
      CHECK (booking_lead_time_hours IS NULL OR booking_lead_time_hours BETWEEN 0 AND 720)
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.profiles VALIDATE CONSTRAINT booking_lead_time_hours_range;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_settings'
      AND column_name = 'lead_time_hours'
  ) THEN
    EXECUTE $c$
      COMMENT ON COLUMN public.business_settings.lead_time_hours IS
        'Não usada. Fonte da antecedência do link público: profiles.booking_lead_time_hours.'
    $c$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.public_booking_lead_time_hours(p_business_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(COALESCE(
    (
      SELECT p.booking_lead_time_hours
      FROM public.profiles p
      WHERE p.id = p_business_id
      LIMIT 1
    ),
    2
  ), 0);
$function$;

REVOKE ALL ON FUNCTION public.public_booking_lead_time_hours(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_booking_lead_time_hours(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_available_slots_v2(
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
  v_base json;
  v_slots text[];
  v_kept text[];
  v_lead integer;
  v_tz text;
  v_cutoff timestamptz;
  v_had_any boolean;
BEGIN
  v_base := public.get_available_slots(
    p_business_id, p_date, p_professional_id, p_duration_min, p_is_professional
  );
  v_slots := COALESCE(
    ARRAY(SELECT json_array_elements_text(COALESCE(v_base->'slots', '[]'::json))),
    '{}'::text[]
  );
  v_had_any := cardinality(v_slots) > 0;
  v_lead := public.public_booking_lead_time_hours(p_business_id::text);

  IF p_is_professional THEN
    RETURN json_build_object(
      'slots', v_slots,
      'lead_time_hours', 0,
      'empty_reason', NULL
    );
  END IF;

  v_tz := public.business_timezone(p_business_id::text);
  v_cutoff := NOW() + make_interval(hours => v_lead);

  v_kept := COALESCE(ARRAY(
    SELECT s
    FROM unnest(v_slots) WITH ORDINALITY AS t(s, ord)
    WHERE ((p_date::text || ' ' || s)::timestamp AT TIME ZONE v_tz) >= v_cutoff
    ORDER BY t.ord
  ), '{}'::text[]);

  RETURN json_build_object(
    'slots', v_kept,
    'lead_time_hours', v_lead,
    'empty_reason', CASE
      WHEN cardinality(v_kept) = 0 AND v_had_any AND v_lead > 0 THEN 'lead_time'
      ELSE NULL
    END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_available_slots_v2(uuid, date, uuid, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots_v2(uuid, date, uuid, integer, boolean)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_full_dates_v2(
  p_business_id uuid,
  p_start_date date,
  p_end_date date,
  p_professional_id uuid DEFAULT NULL::uuid,
  p_duration_min integer DEFAULT 30
)
RETURNS date[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_date date;
  v_full_dates date[] := ARRAY[]::date[];
  v_slots_resp json;
  v_duration integer := GREATEST(COALESCE(p_duration_min, 30), 15);
BEGIN
  FOR v_date IN SELECT (generate_series(p_start_date, p_end_date, '1 day'::interval))::date
  LOOP
    v_slots_resp := public.get_available_slots_v2(
      p_business_id, v_date, p_professional_id, v_duration, false
    );
    IF COALESCE(json_array_length(v_slots_resp->'slots'), 0) = 0 THEN
      v_full_dates := array_append(v_full_dates, v_date);
    END IF;
  END LOOP;
  RETURN v_full_dates;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_full_dates_v2(uuid, date, date, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_full_dates_v2(uuid, date, date, uuid, integer)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_lead_time_on_public_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead integer;
  v_was_active boolean;
  v_now_active boolean;
BEGIN
  IF auth.uid() IS NOT NULL
     AND COALESCE(public.get_auth_company_id()::text, auth.uid()::text) = NEW.business_id THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status, 'pending') NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_was_active := COALESCE(OLD.status, 'pending') IN ('pending', 'confirmed');
    v_now_active := COALESCE(NEW.status, 'pending') IN ('pending', 'confirmed');
    IF NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
       AND NOT (NOT v_was_active AND v_now_active) THEN
      RETURN NEW;
    END IF;
  END IF;

  v_lead := public.public_booking_lead_time_hours(NEW.business_id);

  IF NEW.appointment_time < NOW() + make_interval(hours => v_lead) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'lead_time_violation',
      DETAIL = v_lead::text,
      HINT = 'lead_time_violation';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_lead_time_on_public_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_lead_time_on_public_bookings() TO service_role;

DROP TRIGGER IF EXISTS enforce_lead_time_on_public_bookings ON public.public_bookings;
CREATE TRIGGER enforce_lead_time_on_public_bookings
  BEFORE INSERT OR UPDATE OF appointment_time, status
  ON public.public_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_lead_time_on_public_bookings();

COMMIT;
