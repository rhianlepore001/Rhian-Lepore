-- Rollback 20261013210000_stripe_webhook_billing
-- Restores protect_profile_identity to post-C-02 body (without new billing cols).

DROP TABLE IF EXISTS public.stripe_webhook_events;

DROP INDEX IF EXISTS public.profiles_stripe_subscription_id_uidx;
-- keep profiles_stripe_customer_id_idx? drop if we created it
DROP INDEX IF EXISTS public.profiles_stripe_customer_id_idx;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS subscription_current_period_end;

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

REVOKE UPDATE (
  subscription_status,
  subscription_plan,
  trial_ends_at,
  stripe_customer_id
) ON TABLE public.profiles FROM anon, authenticated, PUBLIC;
