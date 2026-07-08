-- ============================================================================
-- Code Review — Consenso A1+A2+A3 (2026-07-08)
-- 1) C1/A2-F01: get_commissions_due sem p_user_id (tenant deriva de auth.uid())
-- 2) A1-F01: delete_finance_transaction Caminho 1 — inverter ordem dos DELETEs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) get_commissions_due: remover parametro p_user_id
--    Qualquer usuario autenticado podia passar UUID de outro tenant (SECURITY
--    DEFINER bypassa RLS, WHERE usava o parametro cliente como unico filtro).
--    Fix: derivar tenant de auth.uid() / get_auth_company_id() server-side.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_commissions_due(UUID);

CREATE OR REPLACE FUNCTION public.get_commissions_due()
RETURNS TABLE (
  professional_id   UUID,
  professional_name TEXT,
  photo_url         TEXT,
  total_due         DECIMAL(10,2),
  total_earnings_month DECIMAL(10,2),
  total_pending_records BIGINT,
  is_owner          BOOLEAN
) AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    tm.id                AS professional_id,
    tm.name              AS professional_name,
    tm.photo_url,
    COALESCE(SUM(CASE WHEN fr.commission_paid = false THEN fr.commission_value ELSE 0 END), 0) AS total_due,
    COALESCE(SUM(CASE WHEN date_trunc('month', fr.created_at) = date_trunc('month', CURRENT_DATE) THEN fr.commission_value ELSE 0 END), 0) AS total_earnings_month,
    COUNT(CASE WHEN fr.commission_paid = false THEN 1 END)   AS total_pending_records,
    COALESCE(tm.is_owner, false)                             AS is_owner
  FROM public.team_members tm
  LEFT JOIN public.finance_records fr
         ON tm.id = fr.professional_id
        AND fr.user_id = v_auth_company_id
        AND fr.commission_value > 0
  WHERE tm.user_id = v_auth_company_id
    AND tm.active = true
  GROUP BY tm.id, tm.name, tm.photo_url, tm.is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.get_commissions_due() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commissions_due() TO authenticated;

COMMENT ON FUNCTION public.get_commissions_due() IS
  'Code-review fix: tenant derivado de auth.uid() server-side (A2-F01 — eliminado cross-tenant leak).';

-- ----------------------------------------------------------------------------
-- 2) delete_finance_transaction: Caminho 1 — finance_records antes de appointments
--    A1-F01: DELETE appointments antes de finance_records violava FK
--    finance_records.appointment_id -> appointments.id (se sem ON DELETE CASCADE).
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
  v_appointment_id  UUID;
  v_deleted_records      INTEGER := 0;
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
    -- finance_records PRIMEIRO (respeita FK -> appointments)
    DELETE FROM public.finance_records
    WHERE id = p_record_id AND user_id = v_auth_company_id;
    GET DIAGNOSTICS v_deleted_records = ROW_COUNT;

    IF v_appointment_id IS NOT NULL THEN
      DELETE FROM public.appointments
      WHERE id = v_appointment_id AND user_id = v_auth_company_id;
      GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;
    END IF;
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
    'record_id',              p_record_id,
    'deleted_finance_records', v_deleted_records,
    'deleted_appointments',    v_deleted_appointments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_finance_transaction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_finance_transaction(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_finance_transaction(UUID) IS
  'Code-review fix: Caminho 1 deleta finance_records antes de appointments (A1-F01 — evita violacao de FK).';
