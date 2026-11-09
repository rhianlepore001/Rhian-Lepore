-- Local-only harness (fictional data). Run: scripts/test-sql-billing-paywall.sh
\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('test.role', true), ''), 'authenticated') $$;
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE public.profiles (
  id text PRIMARY KEY, role text, company_id text,
  subscription_status text DEFAULT 'trial', subscription_plan text,
  trial_ends_at timestamptz DEFAULT now() + interval '7 days',
  stripe_customer_id text, updated_at timestamptz
);
CREATE FUNCTION public.protect_profile_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER protect_profile_identity BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

\i supabase/migrations/20261105100000_stripe_billing_webhook_paywall.sql

INSERT INTO public.profiles (id, role, company_id, subscription_status, trial_ends_at) VALUES
 ('00000000-0000-4000-8000-000000000001','owner',NULL,'trial', now() + interval '30 days'),   -- promo trial
 ('00000000-0000-4000-8000-000000000002','owner',NULL,'trial', now() - interval '1 day'),     -- expired trial
 ('00000000-0000-4000-8000-000000000003','staff','00000000-0000-4000-8000-000000000002','trial', now() + interval '99 days'), -- staff of expired owner
 ('00000000-0000-4000-8000-000000000004','owner',NULL,'active', now() - interval '60 days');

DO $$
DECLARE r jsonb;
BEGIN
  ASSERT public.billing_has_access('paid', NULL, NULL);
  ASSERT public.billing_has_access('subscriber', NULL, NULL);
  ASSERT NOT public.billing_has_access('canceled', now() + interval '1 day', NULL);
  ASSERT public.billing_has_access('past_due', NULL, now() + interval '1 day');
  ASSERT NOT public.billing_has_access('past_due', NULL, now() - interval '1 day');
  ASSERT public.billing_has_access(NULL, now() + interval '1 day', NULL);

  PERFORM set_config('test.uid','00000000-0000-4000-8000-000000000001', true);
  ASSERT public.tenant_has_active_access(), 'promo trial owner has access';
  PERFORM set_config('test.uid','00000000-0000-4000-8000-000000000002', true);
  ASSERT NOT public.tenant_has_active_access(), 'expired trial blocked';
  PERFORM set_config('test.uid','00000000-0000-4000-8000-000000000003', true);
  ASSERT NOT public.tenant_has_active_access(), 'staff inherits owner status';
  PERFORM set_config('test.uid','00000000-0000-4000-8000-000000000004', true);
  r := public.get_my_billing_access();
  ASSERT (r->>'has_access')::boolean AND r->>'subscription_status' = 'active';
  PERFORM set_config('test.uid','', true);
  ASSERT NOT public.tenant_has_active_access(), 'anonymous blocked';

  RAISE NOTICE 'billing paywall SQL tests: OK';
END $$;

-- authenticated (Supabase grants table-level UPDATE) cannot self-upgrade new billing columns
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
SET ROLE authenticated;
DO $$ BEGIN
  UPDATE public.profiles SET stripe_subscription_id = 'sub_FAKE' WHERE id = '00000000-0000-4000-8000-000000000002';
  RAISE EXCEPTION 'should have failed';
EXCEPTION WHEN raise_exception THEN
  ASSERT SQLERRM = 'PROFILE_BILLING_IMMUTABLE', SQLERRM;
  RAISE NOTICE 'billing columns immutable for authenticated: OK';
END $$;
RESET ROLE;

\i docs/rollbacks/20261105100000_stripe_billing_webhook_paywall.rollback.sql
DO $$ BEGIN
  ASSERT to_regclass('public.stripe_webhook_events') IS NULL;
  ASSERT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='stripe_subscription_id');
  RAISE NOTICE 'rollback: OK';
END $$;
