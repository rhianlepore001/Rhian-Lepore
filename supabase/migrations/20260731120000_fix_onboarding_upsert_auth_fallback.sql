-- Fix: upsert_onboarding_progress negava donos novos quando get_auth_company_id()
-- retornava NULL (profile ainda nao visivel / race no cadastro), gerando 403 e
-- travando "Começar configuração" / "Fazer depois" no wizard.
--
-- Alinha ao padrao das demais RPCs: COALESCE(get_auth_company_id(), auth.uid()).

CREATE OR REPLACE FUNCTION public.upsert_onboarding_progress(
  p_company_id text,
  p_current_step smallint,
  p_completed_steps smallint[],
  p_step_data jsonb DEFAULT '{}'::jsonb
)
RETURNS onboarding_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result           onboarding_progress;
  v_caller_company   TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_caller_company := COALESCE(get_auth_company_id(), auth.uid()::TEXT);

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Acesso negado: company_id nao corresponde ao usuario autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO onboarding_progress (
    company_id,
    current_step,
    completed_steps,
    step_data,
    last_activity
  )
  VALUES (
    p_company_id,
    p_current_step,
    p_completed_steps,
    p_step_data,
    NOW()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    current_step    = EXCLUDED.current_step,
    completed_steps = EXCLUDED.completed_steps,
    step_data       = onboarding_progress.step_data || EXCLUDED.step_data,
    last_activity   = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_onboarding_progress(text, smallint, smallint[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_onboarding_progress(text, smallint, smallint[], jsonb) TO authenticated;
