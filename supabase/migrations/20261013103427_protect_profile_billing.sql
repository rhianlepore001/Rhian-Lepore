-- =============================================================================
-- profiles: impede auto-upgrade de billing/entitlement pelo cliente autenticado
-- Spec: docs/specs/crit-public-clients-billing-SPEC.md
-- Rollback: docs/rollbacks/20261013103427_protect_profile_billing.rollback.sql
--
-- ANTES (prod, 2026-10-13): protect_profile_identity só trava id/role/company_id.
--   authenticated pode UPDATE subscription_status, subscription_plan, trial_ends_at,
--   stripe_customer_id no próprio perfil (prova em auditoria com rollback).
--
-- AGORA:
--   1. protect_profile_identity também bloqueia colunas de billing/entitlement
--      salvo GUC agendix.allow_profile_identity / agendix.allow_billing_update,
--      auth.role() = service_role, ou current_user postgres/supabase_admin.
--   2. REVOKE de UPDATE nas colunas de billing para anon/authenticated.
--   3. RPC set_stripe_customer_id_for_caller (DEFINER) para o checkout gravar
--      cus_* no próprio perfil (substitui UPDATE direto da edge function).
--
-- INSERT (handle_new_user / ensure_owner_profile / apply_signup_trial_promotion)
-- não passa por este BEFORE UPDATE. Flows que setam allow_profile_identity=on
-- em UPDATE continuam ok.
-- =============================================================================

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

-- Colunas de billing: authenticated/anon não podem UPDATE mesmo se a policy passar.
REVOKE UPDATE (
  subscription_status,
  subscription_plan,
  trial_ends_at,
  stripe_customer_id
) ON TABLE public.profiles FROM anon, authenticated, PUBLIC;

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

  SELECT stripe_customer_id INTO v_current
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_current IS NOT NULL AND v_current IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'stripe_customer_id_already_set';
  END IF;

  IF v_current IS NOT DISTINCT FROM p_customer_id THEN
    RETURN v_current;
  END IF;

  PERFORM set_config('agendix.allow_billing_update', 'on', true);

  UPDATE public.profiles
  SET stripe_customer_id = p_customer_id,
      updated_at = now()
  WHERE id = v_uid
    AND stripe_customer_id IS NULL;

  RETURN p_customer_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_stripe_customer_id_for_caller(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_stripe_customer_id_for_caller(text) TO authenticated, service_role;
