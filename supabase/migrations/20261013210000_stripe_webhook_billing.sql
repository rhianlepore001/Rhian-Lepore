-- =============================================================================
-- Stripe subscription webhook support
-- Spec: draft PR fix/stripe-checkout-webhook
-- Rollback: docs/rollbacks/20261013210000_stripe_webhook_billing.rollback.sql
--
-- Additive:
--   1. profiles.stripe_subscription_id, profiles.subscription_current_period_end
--   2. protect_profile_identity also guards the new billing columns
--   3. REVOKE UPDATE on new columns for anon/authenticated
--   4. public.stripe_webhook_events for idempotent webhook processing (service_role)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_uidx
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

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
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     ) THEN
    RAISE EXCEPTION 'PROFILE_BILLING_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE UPDATE (
  subscription_status,
  subscription_plan,
  trial_ends_at,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_current_period_end
) ON TABLE public.profiles FROM anon, authenticated, PUBLIC;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  livemode boolean,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_at_idx
  ON public.stripe_webhook_events (processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → deny by default. service_role bypasses RLS.
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;
GRANT ALL ON TABLE public.stripe_webhook_events TO postgres;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency store for Stripe webhook event ids (edge stripe-webhook, service_role).';
