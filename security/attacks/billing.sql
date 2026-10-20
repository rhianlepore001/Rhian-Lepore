\ir ../tests/local-only.sql
BEGIN;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.set_stripe_customer_id_for_caller(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'BILLING_CLIENT_CAN_BIND_CUSTOMER: authenticated retains access to legacy setter';
  END IF;
  IF to_regprocedure('public.set_stripe_customer_id_for_user(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'BILLING_BACKEND_SETTER_MISSING';
  END IF;
  IF has_function_privilege('anon', 'public.set_stripe_customer_id_for_user(uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.set_stripe_customer_id_for_user(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'BILLING_BACKEND_SETTER_EXPOSED';
  END IF;
END $$;

INSERT INTO profiles (id, role, company_id) VALUES
 ('a0000000-0000-4000-8000-0000000000a0', 'owner', 'a0000000-0000-4000-8000-0000000000a0'),
 ('a0000000-0000-4000-8000-0000000000a1', 'staff', 'a0000000-0000-4000-8000-0000000000a0'),
 ('b0000000-0000-4000-8000-0000000000b0', 'owner', 'b0000000-0000-4000-8000-0000000000b0');

SET ROLE authenticated;
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = 'b0000000-0000-4000-8000-0000000000b0';
DO $$
DECLARE statement text;
BEGIN
  FOREACH statement IN ARRAY ARRAY[
    $q$SELECT set_stripe_customer_id_for_caller('cus_ForeignFixture')$q$,
    $q$SELECT set_stripe_customer_id_for_user('b0000000-0000-4000-8000-0000000000b0','cus_ForeignFixture')$q$,
    $q$UPDATE profiles SET stripe_customer_id='cus_ForeignFixture' WHERE id=auth.uid()::text$q$,
    $q$UPDATE profiles SET subscription_status='active' WHERE id=auth.uid()::text$q$,
    $q$UPDATE profiles SET subscription_plan='team' WHERE id=auth.uid()::text$q$,
    $q$UPDATE profiles SET trial_ends_at=now()+interval '100 years' WHERE id=auth.uid()::text$q$,
    $q$INSERT INTO profiles(id,subscription_status) VALUES(auth.uid()::text,'active') ON CONFLICT(id) DO UPDATE SET subscription_status='active'$q$
  ] LOOP
    BEGIN
      EXECUTE statement;
      RAISE EXCEPTION 'BILLING_UNAUTHORIZED_STATEMENT_SUCCEEDED';
    EXCEPTION
      WHEN insufficient_privilege THEN NULL;
      WHEN raise_exception THEN
        IF SQLERRM <> 'PROFILE_BILLING_IMMUTABLE' THEN RAISE; END IF;
    END;
  END LOOP;
  UPDATE profiles SET business_name='Fictional legitimate owner' WHERE id=auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_PROFILE_UPDATE_REGRESSED'; END IF;
END $$;
RESET ROLE;

SET ROLE service_role;
SET request.jwt.claim.role = 'service_role';
SET request.jwt.claim.sub = '';
SELECT public.set_stripe_customer_id_for_user('b0000000-0000-4000-8000-0000000000b0', 'cus_OwnerBFixture');
SELECT public.set_stripe_customer_id_for_user('b0000000-0000-4000-8000-0000000000b0', 'cus_OwnerBFixture');
DO $$
BEGIN
  BEGIN
    PERFORM public.set_stripe_customer_id_for_user('b0000000-0000-4000-8000-0000000000b0', 'cus_ConflictFixture');
    RAISE EXCEPTION 'BILLING_CONFLICT_OVERWROTE_CUSTOMER';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.set_stripe_customer_id_for_user('a0000000-0000-4000-8000-0000000000a1', 'cus_StaffFixture');
    RAISE EXCEPTION 'BILLING_STAFF_LINK_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT stripe_customer_id FROM profiles WHERE id='b0000000-0000-4000-8000-0000000000b0') IS DISTINCT FROM 'cus_OwnerBFixture'
     OR EXISTS (SELECT 1 FROM profiles WHERE subscription_status IS DISTINCT FROM 'trial')
     OR EXISTS (SELECT 1 FROM profiles WHERE id LIKE 'a%' AND stripe_customer_id IS NOT NULL) THEN
    RAISE EXCEPTION 'BILLING_FINAL_STATE_INVALID';
  END IF;
  RAISE NOTICE 'PASS billing authorization, direct writes, insert/upsert, idempotency, conflict and owner update';
END $$;

ROLLBACK;
