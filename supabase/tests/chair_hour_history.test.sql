\set ON_ERROR_STOP on
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
CREATE TEMP TABLE history_before AS SELECT public.get_chair_hour_v1('2026-10-02','20000000-0000-0000-0000-0000000000a1','2026-10-02') AS value;
DO $$ DECLARE r jsonb; BEGIN
 SELECT value INTO r FROM history_before;
 IF (r->'total'->>'available_minutes')::numeric<>480 OR (r->'total'->>'revenue')::numeric<>100 OR (r->'total'->>'machine_fee')::numeric<>2 OR (r->'total'->>'fixed_cost')::numeric<>25 THEN RAISE EXCEPTION 'wrong historical inputs: %',r; END IF;
 IF (r->'total'->>'cost_per_hour')::numeric<>6.5 OR (r->'total'->>'margin_per_hour')::numeric<>6 THEN RAISE EXCEPTION 'inconsistent denominators or fee double deduction: %',r; END IF;
 IF r->>'history_estimated'<>'true' THEN RAISE EXCEPTION 'baseline uncertainty hidden'; END IF;
END $$;
UPDATE public.service_costs SET amount=99 WHERE service_id='93000000-0000-0000-0000-000000000008';
UPDATE public.team_members SET active=false,working_hours='{"fri":{"isOpen":true,"blocks":[{"start":"09:00","end":"11:00"}]}}' WHERE id='20000000-0000-0000-0000-0000000000a1';
UPDATE public.business_settings SET business_hours='{}';
DO $$ BEGIN
 IF (SELECT value FROM history_before) IS DISTINCT FROM public.get_chair_hour_v1('2026-10-02','20000000-0000-0000-0000-0000000000a1','2026-10-02') THEN RAISE EXCEPTION 'changing material, hours or active flag rewrote historical metrics'; END IF;
END $$;
-- Large result is computed inside SQL, not truncated by API default pagination.
INSERT INTO public.appointments(user_id,client_id,appointment_time,status,price,professional_id,duration_minutes,service)
 SELECT '10000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','2026-10-03 14:00+00','Completed',1,'20000000-0000-0000-0000-0000000000a1',1,'Ambíguo + outro' FROM generate_series(1,1001);
DO $$ DECLARE r jsonb; BEGIN
 r:=public.get_chair_hour_v1('2026-10-03','20000000-0000-0000-0000-0000000000a1','2026-10-03');
 IF (r->'total'->>'attendance_count')::int<>1001 OR (r->>'services_pending_count')::int<>1001 OR r->'total'->>'margin_per_hour' IS NOT NULL THEN RAISE EXCEPTION 'pagination/ambiguous history: %',r; END IF;
END $$;
SELECT 'PASS historical retention, hours/material versioning, coherent rates, single fee, 1001-row period, unknown services' AS result;
