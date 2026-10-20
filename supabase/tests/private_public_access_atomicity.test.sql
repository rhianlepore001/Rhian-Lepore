\ir ../../security/tests/local-only.sql
BEGIN;
SET client_min_messages=notice;
INSERT INTO public.profiles(id,role,company_id,business_slug) VALUES ('b4000000-0000-4000-8000-000000000001','owner','b4000000-0000-4000-8000-000000000001','atomic-private-test');
INSERT INTO public.business_settings(user_id,queue_mode) VALUES ('b4000000-0000-4000-8000-000000000001','shared');
INSERT INTO public.team_members(id,user_id,name,is_owner,active) VALUES ('b4000000-0000-4000-8001-000000000001','b4000000-0000-4000-8000-000000000001','Profissional',true,true);
INSERT INTO public.services(id,user_id,name,price,duration_minutes) VALUES ('b4000000-0000-4000-8002-000000000001','b4000000-0000-4000-8000-000000000001','Serviço',40,30);
INSERT INTO public.membership_plans(id,user_id,name,price_cents) VALUES ('b4000000-0000-4000-8003-000000000001','b4000000-0000-4000-8000-000000000001','Plano',4000);
CREATE FUNCTION agendix_private.fail_access_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced_token_failure'; END $$;
CREATE TRIGGER fail_queue_access BEFORE INSERT ON agendix_private.queue_entry_access FOR EACH ROW EXECUTE FUNCTION agendix_private.fail_access_test();
CREATE TRIGGER fail_membership_access BEFORE INSERT ON agendix_private.client_membership_access FOR EACH ROW EXECUTE FUNCTION agendix_private.fail_access_test();
DO $$ BEGIN
 SET LOCAL ROLE anon;
 BEGIN
  PERFORM public.join_queue_entry_private('atomic-private-test','Cliente','11955554444','b4000000-0000-4000-8002-000000000001',NULL,'pix','test-code','test-tx');
  RAISE EXCEPTION 'QUEUE_NOT_ATOMIC';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'forced_token_failure' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.create_client_membership_private('b4000000-0000-4000-8000-000000000001','Cliente','11955554444','b4000000-0000-4000-8003-000000000001','in_person');
  RAISE EXCEPTION 'MEMBERSHIP_NOT_ATOMIC';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'forced_token_failure' THEN RAISE; END IF; END;
 RESET ROLE;
 IF EXISTS(SELECT 1 FROM public.queue_entries WHERE business_id='b4000000-0000-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM public.queue_payments WHERE business_id='b4000000-0000-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM public.client_memberships WHERE user_id='b4000000-0000-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM public.clients WHERE user_id='b4000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'PARTIAL_PRIVATE_CREATION'; END IF;
 RAISE NOTICE 'PASS queue/payment and membership/new-client creation roll back if token persistence fails';
END $$;
ROLLBACK;
