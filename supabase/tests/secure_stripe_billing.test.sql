\i supabase/migrations/20261120131400_secure_stripe_billing.sql

DO $$
DECLARE
  rpc text := 'public.apply_stripe_billing_event(text,text,boolean,timestamptz,text,text,jsonb)';
BEGIN
  ASSERT NOT has_function_privilege('anon', rpc, 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', rpc, 'EXECUTE');
  ASSERT has_function_privilege('service_role', rpc, 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public.set_stripe_customer_id_for_caller(text)', 'EXECUTE');
  ASSERT NOT has_table_privilege('anon', 'public.stripe_webhook_events', 'SELECT');
END $$;

UPDATE public.profiles SET stripe_subscription_id = 'sub_OwnerB', stripe_customer_id = 'cus_OwnerB'
WHERE id = '00000000-0000-4000-8000-000000000002';

GRANT USAGE ON SCHEMA public, auth TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO service_role;
SET ROLE service_role;
SELECT set_config('test.role', 'service_role', false);

DO $$
DECLARE
  owner_a text := '00000000-0000-4000-8000-000000000001';
  owner_b text := '00000000-0000-4000-8000-000000000002';
  staff_b text := '00000000-0000-4000-8000-000000000003';
BEGIN
  ASSERT public.apply_stripe_billing_event('evt_conflict', 'invoice.paid', false,
    '2026-11-05 12:00Z', owner_a, 'sub_OwnerB', '{"subscription_status":"active"}') = 'profile_conflict';
  ASSERT public.apply_stripe_billing_event('evt_staff', 'invoice.paid', false,
    '2026-11-05 12:00Z', staff_b, NULL, '{"subscription_status":"active"}') = 'profile_not_found';
  ASSERT (SELECT subscription_status FROM public.profiles WHERE id = owner_a) = 'trial';
  ASSERT (SELECT subscription_status FROM public.profiles WHERE id = owner_b) = 'trial';
  ASSERT (SELECT subscription_status FROM public.profiles WHERE id = staff_b) = 'trial';

  BEGIN
    PERFORM public.apply_stripe_billing_event('evt_retry', 'invoice.paid', false,
      '2026-11-05 12:00Z', NULL, 'sub_OwnerB', '{"subscription_current_period_end":"invalid"}');
    RAISE EXCEPTION 'expected transaction failure';
  EXCEPTION WHEN invalid_datetime_format THEN
    ASSERT NOT EXISTS (SELECT 1 FROM public.stripe_webhook_events WHERE event_id = 'evt_retry');
  END;

  ASSERT public.apply_stripe_billing_event('evt_retry', 'invoice.paid', false,
    '2026-11-05 12:00Z', NULL, 'sub_OwnerB', '{"subscription_status":"active"}') = 'ok';
  ASSERT public.apply_stripe_billing_event('evt_retry', 'invoice.paid', false,
    '2026-11-05 12:00Z', NULL, 'sub_OwnerB', '{"subscription_status":"canceled"}') = 'duplicate';
  ASSERT public.apply_stripe_billing_event('evt_older', 'invoice.payment_failed', false,
    '2026-11-05 11:00Z', NULL, 'sub_OwnerB', '{"subscription_status":"past_due"}') = 'stale_event';
  ASSERT (SELECT subscription_status FROM public.profiles WHERE id = owner_a) = 'trial';
  ASSERT (SELECT subscription_status FROM public.profiles WHERE id = owner_b) = 'active';
END $$;

RESET ROLE;
SELECT set_config('test.role', '', false);
\i docs/rollbacks/20261120131400_secure_stripe_billing.rollback.sql

DO $$ BEGIN
  ASSERT to_regprocedure('public.apply_stripe_billing_event(text,text,boolean,timestamptz,text,text,jsonb)') IS NULL;
  ASSERT has_function_privilege('authenticated', 'public.set_stripe_customer_id_for_caller(text)', 'EXECUTE');
END $$;
