-- Harness: profiles + C-02 protect_profile_identity (prod 2026-10-13) before stripe webhook mig.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    CASE WHEN current_user IN ('authenticated','anon','service_role') THEN current_user ELSE 'anon' END
  )
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  full_name text,
  role text DEFAULT 'owner'::text,
  company_id text,
  subscription_status text DEFAULT 'trial'::text,
  subscription_plan text,
  trial_ends_at timestamptz DEFAULT (now() + interval '20 days'),
  stripe_customer_id text,
  updated_at timestamptz DEFAULT now()
);

-- C-02 protect_profile_identity (billing cols without stripe_subscription_id yet)
CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_allow_identity boolean := (
    lower(COALESCE(current_setting('agendix.allow_profile_identity', true), 'off')) = 'on'
  );
  v_allow_billing boolean := (
    lower(COALESCE(current_setting('agendix.allow_billing_update', true), 'off')) = 'on'
    OR v_allow_identity
  );
  v_privileged boolean := (
    COALESCE(auth.role(), '') = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
  );
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NOT v_privileged AND NOT v_allow_identity
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
     ) THEN
    RAISE EXCEPTION 'PROFILE_IDENTITY_IMMUTABLE';
  END IF;

  IF NOT v_privileged AND NOT v_allow_billing
     AND (
       NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     ) THEN
    RAISE EXCEPTION 'PROFILE_BILLING_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_protect_profile_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

REVOKE UPDATE (
  subscription_status,
  subscription_plan,
  trial_ends_at,
  stripe_customer_id
) ON TABLE public.profiles FROM anon, authenticated, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION public.set_stripe_customer_id_for_caller(p_customer_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := auth.uid()::text;
  v_current text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_customer_id IS NULL OR p_customer_id !~ '^cus_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_stripe_customer_id';
  END IF;
  SELECT stripe_customer_id INTO v_current FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF v_current IS NOT NULL AND v_current IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'stripe_customer_id_already_set';
  END IF;
  IF v_current IS NOT DISTINCT FROM p_customer_id THEN RETURN v_current; END IF;
  PERFORM set_config('agendix.allow_billing_update', 'on', true);
  UPDATE public.profiles
  SET stripe_customer_id = p_customer_id, updated_at = now()
  WHERE id = v_uid AND stripe_customer_id IS NULL;
  RETURN p_customer_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.set_stripe_customer_id_for_caller(text) TO authenticated, service_role;

INSERT INTO public.profiles (id, full_name, role, company_id, subscription_status, stripe_customer_id)
VALUES
  ('a0000000-0000-4000-8000-0000000000a0', 'Owner A', 'owner', 'a0000000-0000-4000-8000-0000000000a0', 'trial', 'cus_TESTOWNERA'),
  ('b0000000-0000-4000-8000-0000000000b0', 'Owner B', 'owner', 'b0000000-0000-4000-8000-0000000000b0', 'trial', NULL);
