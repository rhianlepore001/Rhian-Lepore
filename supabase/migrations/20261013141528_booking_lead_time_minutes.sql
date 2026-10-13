-- Antecedência mínima do link público com precisão de minutos (ex.: 1h30, 20 min).
-- Aditivo:
--   1) profiles.booking_lead_time_minutes integer NULL (0..43200 = 720h).
--      NULL = ainda não gravado → vale booking_lead_time_hours * 60 (valores atuais intactos).
--      O frontend grava as duas colunas (horas = teto de minutos/60, para o rollback
--      ficar no lado mais restritivo).
--   2) public_booking_lead_time_minutes(text): interna, SECURITY DEFINER, só service_role
--      (mesmo padrão de public_booking_lead_time_hours, que fica intocada).
--   3) get_available_slots_v2: corte com make_interval(mins => …); devolve também
--      'lead_time_minutes'; 'lead_time_hours' vira teto(minutos/60) para bundles antigos.
--      Corpo = prod (md5 e4c417d6b16e0dc5a53ec0355f261711, 2026-10-13) + essas linhas.
--   4) enforce_lead_time_on_public_bookings: mesmo corte em minutos. DETAIL igual ao de
--      hoje para horas cheias; "minutes=N" fora da hora cheia.
--      Corpo = prod (md5 4befcd5bf439cb553cdbe528f586ef30) + essas linhas.
-- CREATE OR REPLACE mantém dono/ACL. Agenda interna (você/equipe) não passa por aqui.
--
-- ROLLBACK: docs/rollbacks/20261013200100_booking_lead_time_minutes.rollback.sql
-- Reverter o frontend ANTES (ele lê/grava booking_lead_time_minutes).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_lead_time_minutes integer;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS booking_lead_time_minutes_range;
ALTER TABLE public.profiles
  ADD CONSTRAINT booking_lead_time_minutes_range
  CHECK (booking_lead_time_minutes IS NULL OR booking_lead_time_minutes BETWEEN 0 AND 43200);

COMMENT ON COLUMN public.profiles.booking_lead_time_minutes IS
  'Antecedência mínima do link público em minutos. NULL = booking_lead_time_hours * 60.';

CREATE OR REPLACE FUNCTION public.public_booking_lead_time_minutes(p_business_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(COALESCE(
    (
      SELECT COALESCE(p.booking_lead_time_minutes, p.booking_lead_time_hours * 60)
      FROM public.profiles p
      WHERE p.id = p_business_id
      LIMIT 1
    ),
    120
  ), 0);
$function$;

REVOKE ALL ON FUNCTION public.public_booking_lead_time_minutes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_booking_lead_time_minutes(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_available_slots_v2(p_business_id uuid, p_date date, p_professional_id uuid DEFAULT NULL::uuid, p_duration_min integer DEFAULT 30, p_is_professional boolean DEFAULT false)
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
  v_lead_min integer;
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
  v_lead_min := public.public_booking_lead_time_minutes(p_business_id::text);
  -- Compat: bundles antigos leem horas inteiras (arredonda para cima).
  v_lead := CEIL(v_lead_min / 60.0)::integer;

  IF p_is_professional THEN
    RETURN json_build_object(
      'slots', v_slots,
      'lead_time_hours', 0,
      'lead_time_minutes', 0,
      'empty_reason', NULL
    );
  END IF;

  v_tz := public.business_timezone(p_business_id::text);
  v_cutoff := NOW() + make_interval(mins => v_lead_min);

  v_kept := COALESCE(ARRAY(
    SELECT s
    FROM unnest(v_slots) WITH ORDINALITY AS t(s, ord)
    WHERE ((p_date::text || ' ' || s)::timestamp AT TIME ZONE v_tz) >= v_cutoff
    ORDER BY t.ord
  ), '{}'::text[]);

  RETURN json_build_object(
    'slots', v_kept,
    'lead_time_hours', v_lead,
    'lead_time_minutes', v_lead_min,
    'empty_reason', CASE
      WHEN cardinality(v_kept) = 0 AND v_had_any AND v_lead_min > 0 THEN 'lead_time'
      ELSE NULL
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_lead_time_on_public_bookings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead integer;
  v_lead_min integer;
  v_was_active boolean;
  v_now_active boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()::text = NEW.business_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.staff_user_id = auth.uid()
      AND tm.user_id = NEW.business_id
      AND tm.active IS TRUE
      AND tm.deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status, 'pending') NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Restaurar pedido de alteração (reject): o horário original já estava reservado.
    IF OLD.status = 'pending'
       AND COALESCE(OLD.is_edit, false)
       AND NEW.status = 'confirmed'
       AND NEW.appointment_time IS NOT DISTINCT FROM OLD.original_appointment_time THEN
      RETURN NEW;
    END IF;

    v_was_active := COALESCE(OLD.status, 'pending') IN ('pending', 'confirmed');
    v_now_active := COALESCE(NEW.status, 'pending') IN ('pending', 'confirmed');
    IF NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
       AND NOT (NOT v_was_active AND v_now_active) THEN
      RETURN NEW;
    END IF;
  END IF;

  v_lead_min := public.public_booking_lead_time_minutes(NEW.business_id);
  v_lead := CEIL(v_lead_min / 60.0)::integer;

  IF NEW.appointment_time < NOW() + make_interval(mins => v_lead_min) THEN
    -- DETAIL: horas inteiras como antes ("2"); fora da hora cheia, "minutes=90"
    -- (bundles antigos não parseiam e caem no fallback de horas do slots v2).
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'lead_time_violation',
      DETAIL = CASE WHEN v_lead_min % 60 = 0 THEN (v_lead_min / 60)::text ELSE 'minutes=' || v_lead_min::text END,
      HINT = 'lead_time_violation';
  END IF;

  RETURN NEW;
END;
$function$;
