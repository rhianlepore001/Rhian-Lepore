BEGIN;
CREATE FUNCTION public.test_affected(query text, expected integer) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual integer;
BEGIN
 EXECUTE query;
 GET DIAGNOSTICS actual = ROW_COUNT;
 IF actual <> expected THEN RAISE EXCEPTION 'Expected % rows, got %: %', expected, actual, query; END IF;
END $$;
CREATE FUNCTION public.test_forbidden(query text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE query;
 EXCEPTION WHEN insufficient_privilege THEN RETURN;
 END;
 RAISE EXCEPTION 'Expected 42501: %', query;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
SELECT public.test_affected($$UPDATE public.clients SET name='Blocked'$$,0);
SELECT public.test_affected($$UPDATE public.business_settings SET staff_can_edit_clients=true$$,0);
SELECT public.test_forbidden($$INSERT INTO public.business_settings(user_id,staff_can_edit_clients) VALUES ('00000000-0000-0000-0000-0000000000a0',true)$$);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a0',true);
SELECT public.test_affected($$UPDATE public.business_settings SET staff_can_edit_clients=true$$,1);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
SELECT public.test_affected($$UPDATE public.clients SET name='Nome fictício',phone='11900000000',email='client@example.test',birth_date='2000-01-01',notes='Fictício',photo_url='https://example.test/photo.jpg'$$,1);
SELECT public.test_forbidden($$UPDATE public.clients SET user_id='00000000-0000-0000-0000-0000000000b0'$$);
SELECT public.test_forbidden($$UPDATE public.clients SET is_active=false$$);
SELECT public.test_forbidden($$UPDATE public.clients SET total_visits=42$$);
SELECT public.test_forbidden($$UPDATE public.clients SET id=gen_random_uuid()$$);
SELECT public.test_forbidden($$UPDATE public.clients SET created_at=now()+interval '1 day'$$);
SELECT public.test_forbidden($$UPDATE public.clients SET loyalty_tier='VIP'$$);
SELECT public.test_forbidden($$UPDATE public.clients SET last_visit=now()$$);
SELECT public.test_forbidden($$UPDATE public.clients SET next_prediction=now()$$);
SELECT public.test_forbidden($$UPDATE public.clients SET rating=5$$);
SELECT public.test_forbidden($$UPDATE public.clients SET source='Other'$$);
SELECT public.test_affected($$UPDATE public.clients SET name='Other tenant' WHERE id='30000000-0000-0000-0000-000000000002'$$,0);
SELECT public.test_affected($$DELETE FROM public.clients$$,0);
SELECT public.test_affected($$UPDATE public.business_settings SET staff_can_edit_clients=false$$,0);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',true);
SELECT public.test_affected($$UPDATE public.clients SET name='Other staff' WHERE id='30000000-0000-0000-0000-000000000001'$$,0);
DO $$ BEGIN
 IF public.staff_can_edit_clients('00000000-0000-0000-0000-0000000000a0') THEN RAISE EXCEPTION 'Cross-tenant helper leak'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a0',true);
SELECT public.test_affected($$UPDATE public.clients SET name='Owner', is_active=false,total_visits=4,loyalty_tier='VIP',rating=5,source='owner',created_at=now()+interval '1 day',last_visit=now(),next_prediction=now(),id='30000000-0000-0000-0000-000000000003'$$,1);
SELECT public.test_affected($$UPDATE public.business_settings SET staff_can_edit_clients=false$$,1);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
SELECT public.test_affected($$UPDATE public.clients SET notes='Revoked'$$,0);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a0',true);
SELECT public.test_affected($$DELETE FROM public.clients$$,1);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT public.test_forbidden($$SELECT public.staff_can_edit_clients('00000000-0000-0000-0000-0000000000a0')$$);
RESET ROLE;
ROLLBACK;
