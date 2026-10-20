\ir ../tests/local-only.sql
BEGIN;
INSERT INTO public.profiles(id,role,company_id) VALUES('b2000000-0000-4000-8000-000000000001','owner','b2000000-0000-4000-8000-000000000001');
INSERT INTO public.clients(user_id,name,phone,email) VALUES('b2000000-0000-4000-8000-000000000001','Nome CRM','11988887777','crm@example.invalid');
INSERT INTO public.public_clients(business_id,name,phone,email) VALUES('b2000000-0000-4000-8000-000000000001','Nome CRM','11988887777','crm@example.invalid');
DO $$
DECLARE leaked boolean:=false; changed boolean;
BEGIN
 SET LOCAL ROLE anon;
 BEGIN
  SELECT EXISTS(SELECT 1 FROM public.get_public_client_by_phone('b2000000-0000-4000-8000-000000000001','11988887777')) INTO leaked;
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 RESET ROLE;
 IF leaked THEN RAISE EXCEPTION 'SEC02_PHONE_READS_PII'; END IF;
 SET LOCAL ROLE anon;
 PERFORM public.upsert_public_client('b2000000-0000-4000-8000-000000000001','Nome enviado','11988887777',NULL,'submitted@example.invalid');
 RESET ROLE;
 SELECT EXISTS(SELECT 1 FROM public.public_clients WHERE name='Nome enviado' OR email='submitted@example.invalid') INTO changed;
 IF changed THEN RAISE EXCEPTION 'SEC02_OVERWRITES_CLIENT'; END IF;
 IF EXISTS(SELECT 1 FROM public.clients WHERE user_id='b2000000-0000-4000-8000-000000000001' AND (name<>'Nome CRM' OR email<>'crm@example.invalid')) THEN RAISE EXCEPTION 'SEC02_OVERWRITES_CRM'; END IF;
 RAISE NOTICE 'PASS phone lookup denied and existing client immutable';
END $$;
ROLLBACK;
