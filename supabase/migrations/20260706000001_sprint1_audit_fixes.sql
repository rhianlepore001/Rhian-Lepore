-- ============================================================================
-- Sprint 1 — Auditoria 360 (2026-07-05): correcoes de dominio e atomicidade
-- 1) R-06: constraint do onboarding aceita o passo 6 (StepSuccess)
-- 2) R-05: get_commissions_due retorna is_owner (dono fora das comissoes)
-- 3) P0-03: delete_finance_transaction atomico (substitui 2 deletes client-side)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) R-06: wizard tem 6 passos; CHECK antigo (1..5) travava goToStep(6)
-- ----------------------------------------------------------------------------
ALTER TABLE public.onboarding_progress
  DROP CONSTRAINT IF EXISTS chk_step_range;

ALTER TABLE public.onboarding_progress
  ADD CONSTRAINT chk_step_range CHECK (current_step BETWEEN 1 AND 6);

COMMENT ON COLUMN public.onboarding_progress.current_step IS
  'Passo atual do wizard (1..6). Passo 6 = StepSuccess.';

-- ----------------------------------------------------------------------------
-- 2) R-05: expor is_owner para o filtro client-side funcionar
--    (tipo de retorno muda -> DROP antes de CREATE)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_commissions_due(UUID);

CREATE OR REPLACE FUNCTION public.get_commissions_due(p_user_id UUID)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  photo_url TEXT,
  total_due DECIMAL(10,2),
  total_earnings_month DECIMAL(10,2),
  total_pending_records BIGINT,
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id as professional_id,
    tm.name as professional_name,
    tm.photo_url,
    COALESCE(SUM(CASE WHEN fr.commission_paid = false THEN fr.commission_value ELSE 0 END), 0) as total_due,
    COALESCE(SUM(CASE WHEN date_trunc('month', fr.created_at) = date_trunc('month', CURRENT_DATE) THEN fr.commission_value ELSE 0 END), 0) as total_earnings_month,
    COUNT(CASE WHEN fr.commission_paid = false THEN 1 END) as total_pending_records,
    COALESCE(tm.is_owner, false) as is_owner
  FROM team_members tm
  LEFT JOIN finance_records fr ON tm.id = fr.professional_id AND fr.user_id = p_user_id AND fr.commission_value > 0
  WHERE tm.user_id = p_user_id AND tm.active = true
  GROUP BY tm.id, tm.name, tm.photo_url, tm.is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.get_commissions_due(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commissions_due(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) P0-03: delete atomico de transacao financeira
--    Semantica identica ao client-side antigo (services/finance.ts):
--    - se p_record_id e um finance_record: apaga appointment vinculado + record
--    - senao, se e um appointment: apaga o appointment (+ records vinculados)
--    Tenant: get_auth_company_id() com fallback auth.uid()
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_finance_transaction(UUID);

CREATE OR REPLACE FUNCTION public.delete_finance_transaction(
  p_record_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
  v_appointment_id UUID;
  v_deleted_records INTEGER := 0;
  v_deleted_appointments INTEGER := 0;
BEGIN
  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Caminho 1: p_record_id e um finance_record do tenant
  SELECT fr.appointment_id INTO v_appointment_id
  FROM public.finance_records fr
  WHERE fr.id = p_record_id AND fr.user_id = v_auth_company_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_appointment_id IS NOT NULL THEN
      DELETE FROM public.appointments
      WHERE id = v_appointment_id AND user_id = v_auth_company_id;
      GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;
    END IF;

    DELETE FROM public.finance_records
    WHERE id = p_record_id AND user_id = v_auth_company_id;
    GET DIAGNOSTICS v_deleted_records = ROW_COUNT;
  ELSE
    -- Caminho 2 (fallback legado): p_record_id e um appointment do tenant
    PERFORM 1 FROM public.appointments
    WHERE id = p_record_id AND user_id = v_auth_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transacao nao encontrada. Pode ja ter sido excluida.'
        USING ERRCODE = 'no_data_found';
    END IF;

    DELETE FROM public.finance_records
    WHERE appointment_id = p_record_id AND user_id = v_auth_company_id;
    GET DIAGNOSTICS v_deleted_records = ROW_COUNT;

    DELETE FROM public.appointments
    WHERE id = p_record_id AND user_id = v_auth_company_id;
    GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'record_id', p_record_id,
    'deleted_finance_records', v_deleted_records,
    'deleted_appointments', v_deleted_appointments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_finance_transaction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_finance_transaction(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_finance_transaction(UUID) IS
  'Sprint1 P0-03: exclui atomicamente finance_record + appointment vinculado (ou appointment legado) do tenant autenticado.';
