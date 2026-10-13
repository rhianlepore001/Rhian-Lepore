-- Tests for 20261013210000_stripe_webhook_billing
SET client_min_messages = warning;
CREATE TEMP TABLE swb_result (n serial, name text, ok boolean, detail text);
GRANT ALL ON swb_result TO PUBLIC;
GRANT ALL ON SEQUENCE swb_result_n_seq TO PUBLIC;

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_got text, p_exp text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO swb_result(name, ok, detail)
  VALUES (p_name, p_got IS NOT DISTINCT FROM p_exp,
          'got=' || COALESCE(p_got, 'NULL') || ' expected=' || COALESCE(p_exp, 'NULL'));
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), false);
  PERFORM set_config('request.jwt.claim.role', p_role, false);
  EXECUTE format('SET ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN COALESCE(v, 'ok');
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN 'error:' || SQLERRM;
  END;
END;
$$;

-- [S] columns exist after migration
SELECT pg_temp.check(
  'S profiles has stripe_subscription_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='stripe_subscription_id'
  ) THEN 'yes' ELSE 'no' END,
  'yes'
);

SELECT pg_temp.check(
  'S stripe_webhook_events exists',
  CASE WHEN to_regclass('public.stripe_webhook_events') IS NOT NULL THEN 'yes' ELSE 'no' END,
  'yes'
);

-- [S] authenticated cannot bump billing via new cols
SELECT pg_temp.check(
  'S auth cannot set stripe_subscription_id',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$UPDATE public.profiles SET stripe_subscription_id='sub_HACK' WHERE id='a0000000-0000-4000-8000-0000000000a0' RETURNING 'upd'$$
  ) LIKE 'error:%' THEN 'blocked' ELSE 'leaked' END,
  'blocked'
);

SELECT pg_temp.check(
  'S auth cannot set subscription_status active',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$UPDATE public.profiles SET subscription_status='active' WHERE id='a0000000-0000-4000-8000-0000000000a0' RETURNING 'upd'$$
  ) LIKE 'error:%' THEN 'blocked' ELSE 'leaked' END,
  'blocked'
);

-- [F] service_role can apply billing (webhook path)
SELECT pg_temp.check(
  'F service_role can set active+plan+sub',
  CASE WHEN pg_temp.run_as('service_role', '',
    $$UPDATE public.profiles
       SET subscription_status='active',
           subscription_plan='solo',
           stripe_subscription_id='sub_TEST123',
           subscription_current_period_end=now() + interval '30 days'
       WHERE id='a0000000-0000-4000-8000-0000000000a0'
       RETURNING 'upd'$$
  ) = 'upd' THEN 'ok' ELSE 'fail' END,
  'ok'
);

SELECT pg_temp.check(
  'F owner A is active solo',
  (SELECT subscription_status || ':' || COALESCE(subscription_plan,'') || ':' || COALESCE(stripe_subscription_id,'')
   FROM profiles WHERE id='a0000000-0000-4000-8000-0000000000a0'),
  'active:solo:sub_TEST123'
);

-- [F] idempotency insert
SELECT pg_temp.check(
  'F insert webhook event',
  CASE WHEN pg_temp.run_as('service_role', '',
    $$INSERT INTO public.stripe_webhook_events(event_id, event_type, livemode)
      VALUES ('evt_test_1','checkout.session.completed', false) RETURNING 'ins'$$
  ) = 'ins' THEN 'ok' ELSE 'fail' END,
  'ok'
);

SELECT pg_temp.check(
  'F duplicate event id rejected',
  CASE WHEN pg_temp.run_as('service_role', '',
    $$INSERT INTO public.stripe_webhook_events(event_id, event_type, livemode)
      VALUES ('evt_test_1','checkout.session.completed', false) RETURNING 'ins'$$
  ) LIKE 'error:%' THEN 'rejected' ELSE 'accepted' END,
  'rejected'
);

-- [S] authenticated cannot read/write stripe_webhook_events
SELECT pg_temp.check(
  'S auth cannot insert webhook events',
  CASE WHEN pg_temp.run_as('authenticated', 'a0000000-0000-4000-8000-0000000000a0',
    $$INSERT INTO public.stripe_webhook_events(event_id, event_type) VALUES ('evt_x','x') RETURNING 'ins'$$
  ) LIKE 'error:%' THEN 'blocked' ELSE 'leaked' END,
  'blocked'
);

-- Summary
DO $$
DECLARE
  fail int;
  total int;
BEGIN
  SELECT count(*) FILTER (WHERE NOT ok), count(*) INTO fail, total FROM swb_result;
  IF fail > 0 THEN
    RAISE EXCEPTION 'stripe_webhook_billing: %/% checks falharam', fail, total;
  END IF;
  RAISE NOTICE 'stripe_webhook_billing: % checks ok', total;
END;
$$;

SELECT name, ok, detail FROM swb_result ORDER BY n;
