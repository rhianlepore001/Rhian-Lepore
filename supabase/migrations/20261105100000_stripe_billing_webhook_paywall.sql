-- =============================================================================
-- Stripe billing: webhook support + server-side paywall (ADDITIVE, NOT APPLIED)
-- Rollback: docs/rollbacks/20261105100000_stripe_billing_webhook_paywall.rollback.sql
-- Based on draft PR #159 (20261013210000_stripe_webhook_billing), re-timestamped.
--
--   1. profiles: stripe_subscription_id, subscription_current_period_end,
--      stripe_billing_event_at (out-of-order guard for webhook events)
--   2. protect_profile_identity also guards the new billing columns
--      (service_role — used by stripe-webhook — stays allowed)
--   3. public.stripe_webhook_events: idempotency store (service_role only)
--   4. public.billing_has_access(...)  — pure rule (mirror of _shared/billing.ts)
--      public.tenant_has_active_access() — caller's tenant (owner profile for staff)
--      public.get_my_billing_access()   — jsonb for the app / edge guards
--   Nothing here touches signup/onboarding: trial_ends_at default (7d) and
--   apply_signup_trial_promotion (30d promo) are unchanged and simply read.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_billing_event_at timestamptz;

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
       OR NEW.stripe_billing_event_at IS DISTINCT FROM OLD.stripe_billing_event_at
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
  subscription_current_period_end,
  stripe_billing_event_at
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
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;
COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency store for Stripe webhook event ids (edge stripe-webhook, service_role).';

-- Pure access rule. Keep identical to hasActiveAccess in supabase/functions/_shared/billing.ts.
CREATE OR REPLACE FUNCTION public.billing_has_access(
  p_status text,
  p_trial_ends_at timestamptz,
  p_period_end timestamptz,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE COALESCE(p_status, 'trial')
    WHEN 'active' THEN true
    WHEN 'subscriber' THEN true
    WHEN 'paid' THEN true
    WHEN 'trial' THEN COALESCE(p_trial_ends_at > p_now, false)
    WHEN 'past_due' THEN COALESCE(p_period_end > p_now, false)
    ELSE false
  END;
$function$;

-- Caller's tenant access: staff inherit the owner's (company_id) subscription.
CREATE OR REPLACE FUNCTION public.get_my_billing_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := auth.uid()::text;
  v_owner public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'not_authenticated');
  END IF;

  SELECT o.* INTO v_owner
  FROM public.profiles me
  JOIN public.profiles o
    ON o.id::text = COALESCE(NULLIF(me.company_id::text, ''), me.id::text)
  WHERE me.id::text = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'profile_not_found');
  END IF;

  RETURN jsonb_build_object(
    'has_access', public.billing_has_access(
      v_owner.subscription_status, v_owner.trial_ends_at, v_owner.subscription_current_period_end),
    'subscription_status', COALESCE(v_owner.subscription_status, 'trial'),
    'trial_ends_at', v_owner.trial_ends_at,
    'current_period_end', v_owner.subscription_current_period_end
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.tenant_has_active_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((public.get_my_billing_access() ->> 'has_access')::boolean, false);
$function$;

REVOKE ALL ON FUNCTION public.billing_has_access(text, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_billing_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_has_active_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.billing_has_access(text, timestamptz, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_billing_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_has_active_access() TO authenticated, service_role;

-- NOTE: enforcement via RESTRICTIVE RLS policies (e.g. appointments INSERT
-- WITH CHECK (public.tenant_has_active_access())) is intentionally NOT included;
-- see docs/audit/billing-front1.md for the proposed, opt-in follow-up.
