\ir ../../security/tests/local-only.sql
BEGIN;
SET client_min_messages=notice;
INSERT INTO public.profiles(id,role,company_id) VALUES('b4000000-0000-4000-8000-000000000001','owner','b4000000-0000-4000-8000-000000000001');
INSERT INTO public.team_members(id,user_id,name,is_owner,active) VALUES('b4000000-0000-4000-8001-000000000001','b4000000-0000-4000-8000-000000000001','Profissional teste',true,true);
INSERT INTO public.services(id,user_id,name,price,duration_minutes) VALUES('b4000000-0000-4000-8002-000000000001','b4000000-0000-4000-8000-000000000001','Serviço teste',40,30);
INSERT INTO public.business_settings(user_id,online_booking_requires_approval) VALUES('b4000000-0000-4000-8000-000000000001',false);
CREATE FUNCTION pg_temp.force_access_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SEC02_FIXTURE_FORCED_FAILURE'; END $$;
CREATE TRIGGER fixture_force_access_failure BEFORE INSERT ON agendix_private.public_booking_access FOR EACH ROW EXECUTE FUNCTION pg_temp.force_access_failure();
DO $$ BEGIN
 SET LOCAL ROLE anon;
 BEGIN
  PERFORM public.create_public_booking_private('b4000000-0000-4000-8000-000000000001','Cliente fictício','11988887777',ARRAY['b4000000-0000-4000-8002-000000000001']::uuid[],'b4000000-0000-4000-8001-000000000001',now()+interval '20 days',40,30,'[]');
  RAISE EXCEPTION 'SEC02_FAILURE_NOT_PROPAGATED';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'SEC02_FIXTURE_FORCED_FAILURE' THEN RAISE; END IF; END;
 RESET ROLE;
 IF EXISTS(SELECT 1 FROM public.public_bookings WHERE business_id='b4000000-0000-4000-8000-000000000001')
 OR EXISTS(SELECT 1 FROM public.appointments WHERE user_id='b4000000-0000-4000-8000-000000000001')
 OR EXISTS(SELECT 1 FROM public.clients WHERE user_id='b4000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'SEC02_ORPHAN_AFTER_TOKEN_FAILURE'; END IF;
 RAISE NOTICE 'PASS token creation failure rolls back booking, appointment and new CRM client atomically';
END $$;
ROLLBACK;
