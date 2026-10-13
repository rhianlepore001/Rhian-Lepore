-- Harness de 20261013200100_booking_lead_time_minutes: a cadeia auto-confirm não cria
-- get_available_slots_v2; aqui entra o corpo de prod (md5 e4c417d6b16e0dc5a53ec0355f261711, 2026-10-13).

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
