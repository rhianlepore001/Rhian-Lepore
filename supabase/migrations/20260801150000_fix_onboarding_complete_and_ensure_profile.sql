-- Fix onboarding skip + add-service FK failures when profiles row is missing
-- or get_auth_company_id() returns NULL (race / orphan auth user).
--
-- 1) ensure_caller_profile: cria perfil mínimo do caller (SECURITY DEFINER)
-- 2) complete_onboarding_for_caller: completa onboarding + tutorial atomicamente
-- 3) RLS onboarding_progress: COALESCE(get_auth_company_id(), auth.uid()::text)

CREATE OR REPLACE FUNCTION public.ensure_caller_profile()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid TEXT := auth.uid()::TEXT;
  v_company TEXT;
  v_meta JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(company_id, id)
    INTO v_company
  FROM public.profiles
  WHERE id = v_uid;

  IF v_company IS NOT NULL THEN
    RETURN v_company;
  END IF;

  SELECT raw_user_meta_data
    INTO v_meta
  FROM auth.users
  WHERE id = auth.uid();

  INSERT INTO public.profiles (
    id,
    company_id,
    role,
    full_name,
    business_name,
    user_type,
    region,
    tutorial_completed,
    subscription_status,
    trial_ends_at,
    aios_enabled
  )
  VALUES (
    v_uid,
    v_uid,
    'owner',
    NULLIF(COALESCE(v_meta->>'full_name', ''), ''),
    NULLIF(COALESCE(v_meta->>'business_name', ''), ''),
    COALESCE(NULLIF(v_meta->>'user_type', ''), 'barber'),
    COALESCE(NULLIF(v_meta->>'region', ''), 'BR'),
    FALSE,
    'trial',
    NOW() + INTERVAL '10 days',
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id);

  RETURN v_uid;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_caller_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_caller_profile() TO authenticated;

COMMENT ON FUNCTION public.ensure_caller_profile() IS
  'Garante profiles do caller (cria minimo se orfao). Retorna company_id efetivo.';

CREATE OR REPLACE FUNCTION public.complete_onboarding_for_caller()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid TEXT := auth.uid()::TEXT;
  v_company TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_company := public.ensure_caller_profile();

  INSERT INTO public.onboarding_progress (
    company_id,
    current_step,
    completed_steps,
    is_completed,
    completed_at,
    last_activity,
    step_data
  )
  VALUES (
    v_company,
    5,
    ARRAY[1, 2, 3, 4, 5]::SMALLINT[],
    TRUE,
    NOW(),
    NOW(),
    '{}'::JSONB
  )
  ON CONFLICT (company_id) DO UPDATE SET
    current_step = 5,
    completed_steps = ARRAY[1, 2, 3, 4, 5]::SMALLINT[],
    is_completed = TRUE,
    completed_at = COALESCE(public.onboarding_progress.completed_at, NOW()),
    last_activity = NOW();

  UPDATE public.profiles
  SET tutorial_completed = TRUE,
      updated_at = NOW()
  WHERE id = v_uid;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_onboarding_for_caller() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_for_caller() TO authenticated;

COMMENT ON FUNCTION public.complete_onboarding_for_caller() IS
  'Completa onboarding_progress + profiles.tutorial_completed do caller (skip/finish).';

-- RLS: fallback auth.uid() quando get_auth_company_id() ainda e NULL
DROP POLICY IF EXISTS onboarding_select_own_company ON public.onboarding_progress;
CREATE POLICY onboarding_select_own_company ON public.onboarding_progress
  FOR SELECT
  USING (company_id = COALESCE(public.get_auth_company_id(), auth.uid()::text));

DROP POLICY IF EXISTS onboarding_insert_own_company ON public.onboarding_progress;
CREATE POLICY onboarding_insert_own_company ON public.onboarding_progress
  FOR INSERT
  WITH CHECK (company_id = COALESCE(public.get_auth_company_id(), auth.uid()::text));

DROP POLICY IF EXISTS onboarding_update_own_company ON public.onboarding_progress;
CREATE POLICY onboarding_update_own_company ON public.onboarding_progress
  FOR UPDATE
  USING (company_id = COALESCE(public.get_auth_company_id(), auth.uid()::text))
  WITH CHECK (company_id = COALESCE(public.get_auth_company_id(), auth.uid()::text));
