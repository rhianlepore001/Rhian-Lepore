\ir ../../security/tests/local-only.sql
BEGIN;
SET client_min_messages=notice;
SET TIMEZONE='UTC';
INSERT INTO public.profiles(id,role,company_id) VALUES
 ('b2000000-0000-4000-8000-000000000001','owner','b2000000-0000-4000-8000-000000000001'),
 ('b2000000-0000-4000-8000-000000000002','owner','b2000000-0000-4000-8000-000000000002');
INSERT INTO public.team_members(id,user_id,name,is_owner,active) VALUES
 ('b2000000-0000-4000-8001-000000000001','b2000000-0000-4000-8000-000000000001','Profissional teste',true,true);
INSERT INTO public.services(id,user_id,name,price,duration_minutes) VALUES
 ('b2000000-0000-4000-8002-000000000001','b2000000-0000-4000-8000-000000000001','Serviço teste',40,30);
INSERT INTO public.clients(user_id,name,phone,email) VALUES
 ('b2000000-0000-4000-8000-000000000001','CRM intocado','11988887777','crm@example.invalid');
DO $$
DECLARE r jsonb; b uuid; t text; n integer; rejected boolean;
BEGIN
 SET LOCAL ROLE anon;
 PERFORM public.upsert_public_client('b2000000-0000-4000-8000-000000000001','Nome enviado sem prova','11988887777',NULL,'submitted@example.invalid');
 r:=public.create_public_booking_private('b2000000-0000-4000-8000-000000000001','Nome só no pedido','11988887777',ARRAY['b2000000-0000-4000-8002-000000000001']::uuid[],'b2000000-0000-4000-8001-000000000001',now()+interval '10 days',40,30,'[]','submitted@example.invalid');
 b:=(r->'booking'->>'id')::uuid; t:=r->>'management_token';
 IF length(t)<>64 OR t !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'SEC02_TOKEN_ENTROPY'; END IF;
 SELECT count(*) INTO n FROM public.get_public_booking_with_token(b,t);
 IF n<>1 THEN RAISE EXCEPTION 'SEC02_VALID_TOKEN_REJECTED'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_public_booking_with_token(b,repeat('0',64))) THEN RAISE EXCEPTION 'SEC02_WRONG_TOKEN_READ'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_public_booking_with_token(gen_random_uuid(),t)) THEN RAISE EXCEPTION 'SEC02_TOKEN_OTHER_BOOKING'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_public_booking_with_token(b,NULL)) THEN RAISE EXCEPTION 'SEC02_MISSING_TOKEN'; END IF;
 BEGIN
  PERFORM public.cancel_public_booking_with_token(b,repeat('0',64));
  RAISE EXCEPTION 'SEC02_WRONG_TOKEN_CANCEL';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'booking_not_found' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.update_public_booking_with_token(b,repeat('0',64),ARRAY['b2000000-0000-4000-8002-000000000001']::uuid[],'b2000000-0000-4000-8001-000000000001',now()+interval '11 days',now()+interval '10 days','Nome editado','11988887777',40,30,'[]');
  RAISE EXCEPTION 'SEC02_WRONG_TOKEN_EDIT';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'booking_not_found' THEN RAISE; END IF; END;
 RESET ROLE;
 IF EXISTS(SELECT 1 FROM public.clients WHERE user_id='b2000000-0000-4000-8000-000000000001' AND (name<>'CRM intocado' OR email<>'crm@example.invalid')) THEN RAISE EXCEPTION 'SEC02_CRM_OVERWRITE_ON_BOOK'; END IF;
 IF EXISTS(SELECT 1 FROM public.public_clients WHERE business_id::text='b2000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'SEC02_INSERTED_OVER_EXISTING_CRM'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.public_bookings WHERE id=b AND customer_name='Nome só no pedido' AND customer_email='submitted@example.invalid') THEN RAISE EXCEPTION 'SEC02_CONTACT_NOT_ON_BOOKING'; END IF;
 IF EXISTS(SELECT 1 FROM agendix_private.public_booking_access WHERE token_hash=convert_to(t,'UTF8')) THEN RAISE EXCEPTION 'SEC02_TOKEN_PLAINTEXT'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('get_public_client_by_phone','get_active_booking_by_phone','get_booking_by_id','get_booking_by_id_v2','get_public_booking_by_id','get_client_bookings_history','get_client_bookings_history_v2','get_client_booking_cancellations','cancel_public_booking_by_client','cancel_public_booking_by_client_v2','update_public_booking_by_client','update_public_booking_by_client_v2','find_client_by_phone_normalized','get_public_client_membership','cancel_public_client_membership','find_active_queue_entry_by_phone') AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))) THEN RAISE EXCEPTION 'SEC02_LEGACY_PHONE_BYPASS'; END IF;
 SET LOCAL ROLE anon;
 PERFORM public.update_public_booking_with_token(b,t,ARRAY['b2000000-0000-4000-8002-000000000001']::uuid[],'b2000000-0000-4000-8001-000000000001',now()+interval '11 days',now()+interval '10 days','Nome editado','11988887777',40,30,'[]');
 IF NOT public.cancel_public_booking_with_token(b,t) THEN RAISE EXCEPTION 'SEC02_VALID_CANCEL'; END IF;
 RESET ROLE;
 IF NOT EXISTS(SELECT 1 FROM public.public_bookings WHERE id=b AND status='cancelled') THEN RAISE EXCEPTION 'SEC02_CANCEL_NOT_SAVED'; END IF;
 UPDATE agendix_private.public_booking_access SET expires_at=now()-interval '1 second' WHERE booking_id=b;
 SET LOCAL ROLE anon;
 IF EXISTS(SELECT 1 FROM public.get_public_booking_with_token(b,t)) THEN RAISE EXCEPTION 'SEC02_EXPIRED_TOKEN'; END IF;
 RESET ROLE;
 RAISE NOTICE 'PASS token entropy/hash, valid/wrong/missing/other/expired token, read/edit/cancel, legacy ACLs, CRM immutable';
END $$;
ROLLBACK;
