-- ROLLBACK exato de 20261013200100_booking_lead_time_minutes.
-- Restaura get_available_slots_v2 (md5 e4c417d6b16e0dc5a53ec0355f261711) e
-- enforce_lead_time_on_public_bookings (md5 4befcd5bf439cb553cdbe528f586ef30) com o corpo
-- de prod de 2026-10-13, remove a função interna e a coluna. Volta a valer
-- booking_lead_time_hours (o front grava o teto de minutos/60 nela, então nenhum
-- negócio fica mais permissivo do que configurou). Reverter o frontend ANTES. Idempotente.

BEGIN;

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

DROP FUNCTION IF EXISTS public.public_booking_lead_time_minutes(text);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS booking_lead_time_minutes_range;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS booking_lead_time_minutes;

COMMIT;
