-- ============================================================================
-- G1: Onboarding dual sync
-- Fonte canonica: public.onboarding_progress.is_completed
-- Compatibilidade: public.business_settings.onboarding_completed/onboarding_step
-- ============================================================================

-- 1) Preserva conclusoes existentes do legado criando/atualizando o progresso novo.
INSERT INTO public.onboarding_progress (
  company_id,
  current_step,
  completed_steps,
  is_completed,
  completed_at,
  last_activity,
  step_data
)
SELECT
  bs.user_id,
  CASE
    WHEN COALESCE(bs.onboarding_completed, FALSE) THEN 5
    ELSE LEAST(GREATEST(COALESCE(bs.onboarding_step, 1), 1), 5)
  END::SMALLINT,
  CASE
    WHEN COALESCE(bs.onboarding_completed, FALSE) THEN ARRAY[1, 2, 3, 4, 5]::SMALLINT[]
    ELSE ARRAY[]::SMALLINT[]
  END,
  COALESCE(bs.onboarding_completed, FALSE),
  CASE WHEN COALESCE(bs.onboarding_completed, FALSE) THEN NOW() ELSE NULL END,
  NOW(),
  '{}'::JSONB
FROM public.business_settings bs
WHERE bs.user_id IS NOT NULL
ON CONFLICT (company_id) DO UPDATE SET
  current_step = CASE
    WHEN public.onboarding_progress.is_completed OR EXCLUDED.is_completed THEN 5
    ELSE GREATEST(public.onboarding_progress.current_step, EXCLUDED.current_step)
  END,
  completed_steps = CASE
    WHEN public.onboarding_progress.is_completed OR EXCLUDED.is_completed THEN ARRAY[1, 2, 3, 4, 5]::SMALLINT[]
    ELSE public.onboarding_progress.completed_steps
  END,
  is_completed = public.onboarding_progress.is_completed OR EXCLUDED.is_completed,
  completed_at = CASE
    WHEN public.onboarding_progress.is_completed OR EXCLUDED.is_completed
      THEN COALESCE(public.onboarding_progress.completed_at, EXCLUDED.completed_at, NOW())
    ELSE public.onboarding_progress.completed_at
  END,
  last_activity = NOW();

-- 2) Espelha a fonte canonica para a flag legada apos o backfill.
UPDATE public.business_settings bs
SET
  onboarding_completed = op.is_completed,
  onboarding_step = CASE
    WHEN op.is_completed THEN 5
    ELSE GREATEST(COALESCE(bs.onboarding_step, 1), op.current_step::INTEGER)
  END,
  updated_at = NOW()
FROM public.onboarding_progress op
WHERE op.company_id = bs.user_id
  AND (
    COALESCE(bs.onboarding_completed, FALSE) IS DISTINCT FROM op.is_completed
    OR COALESCE(bs.onboarding_step, 1) IS DISTINCT FROM CASE
      WHEN op.is_completed THEN 5
      ELSE GREATEST(COALESCE(bs.onboarding_step, 1), op.current_step::INTEGER)
    END
  );

-- 3) Mantem business_settings como espelho temporario quando onboarding_progress mudar.
CREATE OR REPLACE FUNCTION public.sync_business_settings_from_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_settings (
    user_id,
    onboarding_step,
    onboarding_completed,
    updated_at
  )
  VALUES (
    NEW.company_id,
    CASE WHEN NEW.is_completed THEN 5 ELSE NEW.current_step::INTEGER END,
    NEW.is_completed,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    onboarding_step = CASE
      WHEN EXCLUDED.onboarding_completed THEN 5
      ELSE GREATEST(COALESCE(public.business_settings.onboarding_step, 1), EXCLUDED.onboarding_step)
    END,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_business_settings_from_onboarding
  ON public.onboarding_progress;

CREATE TRIGGER trg_sync_business_settings_from_onboarding
AFTER INSERT OR UPDATE OF current_step, is_completed
ON public.onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.sync_business_settings_from_onboarding();

REVOKE ALL ON FUNCTION public.sync_business_settings_from_onboarding() FROM PUBLIC;

-- 4) Mantem a RPC legada segura e sincronizada com onboarding_progress.
CREATE OR REPLACE FUNCTION public.update_onboarding_step(
  p_user_id UUID,
  p_step INTEGER,
  p_completed BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
  v_step SMALLINT;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL OR v_company_id <> p_user_id::TEXT THEN
    RAISE EXCEPTION 'Acesso negado: tenant invalido para onboarding.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_step := LEAST(GREATEST(COALESCE(p_step, 1), 1), 5)::SMALLINT;

  INSERT INTO public.business_settings (
    user_id,
    onboarding_step,
    onboarding_completed,
    updated_at
  )
  VALUES (
    p_user_id::TEXT,
    CASE WHEN p_completed THEN 5 ELSE v_step::INTEGER END,
    COALESCE(p_completed, FALSE),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    onboarding_step = CASE
      WHEN COALESCE(p_completed, FALSE) THEN 5
      ELSE GREATEST(COALESCE(public.business_settings.onboarding_step, 1), v_step::INTEGER)
    END,
    onboarding_completed = CASE
      WHEN COALESCE(p_completed, FALSE) THEN TRUE
      ELSE public.business_settings.onboarding_completed
    END,
    updated_at = NOW();

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
    p_user_id::TEXT,
    CASE WHEN COALESCE(p_completed, FALSE) THEN 5 ELSE v_step END,
    CASE
      WHEN COALESCE(p_completed, FALSE) THEN ARRAY[1, 2, 3, 4, 5]::SMALLINT[]
      ELSE ARRAY[]::SMALLINT[]
    END,
    COALESCE(p_completed, FALSE),
    CASE WHEN COALESCE(p_completed, FALSE) THEN NOW() ELSE NULL END,
    NOW(),
    '{}'::JSONB
  )
  ON CONFLICT (company_id) DO UPDATE SET
    current_step = CASE
      WHEN COALESCE(p_completed, FALSE) THEN 5
      ELSE GREATEST(public.onboarding_progress.current_step, v_step)
    END,
    completed_steps = CASE
      WHEN COALESCE(p_completed, FALSE) THEN ARRAY[1, 2, 3, 4, 5]::SMALLINT[]
      ELSE public.onboarding_progress.completed_steps
    END,
    is_completed = public.onboarding_progress.is_completed OR COALESCE(p_completed, FALSE),
    completed_at = CASE
      WHEN public.onboarding_progress.is_completed OR COALESCE(p_completed, FALSE)
        THEN COALESCE(public.onboarding_progress.completed_at, NOW())
      ELSE public.onboarding_progress.completed_at
    END,
    last_activity = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.update_onboarding_step(UUID, INTEGER, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_onboarding_step(UUID, INTEGER, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.sync_business_settings_from_onboarding() IS
  'G1 v1: espelha onboarding_progress para business_settings enquanto a flag legada existir.';

COMMENT ON FUNCTION public.update_onboarding_step(UUID, INTEGER, BOOLEAN) IS
  'RPC legada do onboarding. Valida tenant autenticado e sincroniza onboarding_progress.';
