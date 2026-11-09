\set ON_ERROR_STOP on
-- Each case is independently selectable to record red before green.
SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ DECLARE r jsonb; BEGIN
 r:=public.get_chair_hour_v1('2026-09-01',NULL);
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(r->'professionals') x WHERE x->>'id'='20000000-0000-0000-0000-0000000000e1' AND (x->>'attendance_count')::int=1) THEN
 RAISE EXCEPTION 'REGRESSION: inactive historical professional disappeared'; END IF;
END $$;
RESET ROLE;
-- Rule approved 9/11: any ACTIVE member closes colleagues' work of the SAME business (see
-- chair_hour_team_checkout.test.sql). Another business's staff never can, even via the legacy entry point.
SET request.jwt.claim.sub='30000000-0000-0000-0000-0000000000b1';
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
 PERFORM public.complete_appointment_with_duration('91000000-0000-0000-0000-000000000001');
 RAISE EXCEPTION 'REGRESSION: cross-business checkout accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
