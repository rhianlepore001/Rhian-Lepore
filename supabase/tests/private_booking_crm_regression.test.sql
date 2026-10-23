\ir ../../security/tests/local-only.sql
BEGIN;
SET client_min_messages=notice;
INSERT INTO public.profiles(id,role,company_id) VALUES
 ('b3000000-0000-4000-8000-000000000001','owner','b3000000-0000-4000-8000-000000000001'),
 ('b3000000-0000-4000-8000-000000000002','owner','b3000000-0000-4000-8000-000000000002');
INSERT INTO public.team_members(id,user_id,name,is_owner,active) VALUES
 ('b3000000-0000-4000-8001-000000000001','b3000000-0000-4000-8000-000000000001','Profissional teste',true,true);
INSERT INTO public.services(id,user_id,name,price,duration_minutes) VALUES
 ('b3000000-0000-4000-8002-000000000001','b3000000-0000-4000-8000-000000000001','Serviço teste',40,30);
INSERT INTO public.clients(user_id,name,phone,email,photo_url) VALUES
 ('b3000000-0000-4000-8000-000000000001','CRM original','11988887777','crm@example.invalid',NULL);
CREATE TEMP TABLE original_crm AS SELECT * FROM public.clients WHERE user_id='b3000000-0000-4000-8000-000000000001';
INSERT INTO public.public_clients(business_id,name,phone,email,photo_url) VALUES
 ('b3000000-0000-4000-8000-000000000001','Contato externo','11988887777','external@example.invalid','https://example.invalid/unverified.jpg');
DO $$
DECLARE r jsonb; b uuid; t text; new_id uuid;
BEGIN
 IF EXISTS(SELECT * FROM public.clients WHERE user_id='b3000000-0000-4000-8000-000000000001' EXCEPT SELECT * FROM original_crm) THEN RAISE EXCEPTION 'SEC02_MIRROR_OVERWROTE_CRM'; END IF;
 SET LOCAL ROLE anon;
 PERFORM public.upsert_public_client('b3000000-0000-4000-8000-000000000001','Diferente','+55 11 98888-7777','https://example.invalid/other.jpg','other@example.invalid');
 r:=public.create_public_booking_private('b3000000-0000-4000-8000-000000000001','Contato pedido manual','11988887777',ARRAY['b3000000-0000-4000-8002-000000000001']::uuid[],'b3000000-0000-4000-8001-000000000001',now()+interval '15 days',40,30,'[]','submitted@example.invalid');
 b:=(r->'booking'->>'id')::uuid; t:=r->>'management_token';
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
 SET LOCAL ROLE authenticated;
 PERFORM public.accept_public_booking_v2(b);
 RESET ROLE;
 IF EXISTS(SELECT * FROM public.clients WHERE user_id='b3000000-0000-4000-8000-000000000001' EXCEPT SELECT * FROM original_crm) THEN RAISE EXCEPTION 'SEC02_MANUAL_ACCEPT_OVERWROTE_CRM'; END IF;
 INSERT INTO public.business_settings(user_id,online_booking_requires_approval) VALUES('b3000000-0000-4000-8000-000000000001',false);
 PERFORM set_config('request.jwt.claim.sub','',true);
 SET LOCAL ROLE anon;
 r:=public.create_public_booking_private('b3000000-0000-4000-8000-000000000001','Contato pedido automático','11988887777',ARRAY['b3000000-0000-4000-8002-000000000001']::uuid[],'b3000000-0000-4000-8001-000000000001',now()+interval '16 days',40,30,'[]');
 RESET ROLE;
 IF r->'booking'->>'status'<>'confirmed' THEN RAISE EXCEPTION 'SEC02_AUTO_CONFIRM_REGRESSION'; END IF;
 IF EXISTS(SELECT * FROM public.clients WHERE user_id='b3000000-0000-4000-8000-000000000001' EXCEPT SELECT * FROM original_crm) THEN RAISE EXCEPTION 'SEC02_AUTO_CONFIRM_OVERWROTE_CRM'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.appointments WHERE public_booking_id=(r->'booking'->>'id')::uuid AND status='Confirmed') THEN RAISE EXCEPTION 'SEC02_AUTO_APPOINTMENT_MISSING'; END IF;
 PERFORM set_config('test.realtime_topic','booking:'||b,true);
 INSERT INTO realtime.messages(topic,extension) VALUES('booking:'||b,'broadcast');
 SET LOCAL ROLE anon;
 IF EXISTS(SELECT 1 FROM realtime.messages) THEN RAISE EXCEPTION 'SEC02_REALTIME_ANON_LEAK'; END IF;
 BEGIN
  PERFORM 1 FROM agendix_private.public_booking_access;
  RAISE EXCEPTION 'SEC02_HASH_TABLE_EXPOSED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM realtime.messages) THEN RAISE EXCEPTION 'SEC02_REALTIME_UNAUTH_TENANT_LEAK'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000002',true);
 SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM realtime.messages) THEN RAISE EXCEPTION 'SEC02_REALTIME_OTHER_OWNER_LEAK'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
 SET LOCAL ROLE authenticated;
 IF NOT EXISTS(SELECT 1 FROM realtime.messages) THEN RAISE EXCEPTION 'SEC02_REALTIME_OWNER_REGRESSION'; END IF;
 RESET ROLE;
 RAISE NOTICE 'PASS mirror/upsert/manual accept/auto-confirm preserve all existing CRM columns; booking/contact/materialization work; realtime tenant-only and token hashes private';
END $$;
ROLLBACK;
