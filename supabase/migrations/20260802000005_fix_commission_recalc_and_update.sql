-- Comissoes: recalculo e update seguros (tenant via auth; ignora vendas de produto).

-- ---------------------------------------------------------------------------
-- 1. recalculate_pending_commissions
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.recalculate_pending_commissions(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.recalculate_pending_commissions(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.recalculate_pending_commissions(
  p_professional_id UUID,
  p_new_rate DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  IF p_new_rate < 0 OR p_new_rate > 100 THEN
    RAISE EXCEPTION 'Taxa de comissao invalida.';
  END IF;

  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id::TEXT = v_auth_company_id
  ) THEN
    RAISE EXCEPTION 'Profissional nao encontrado no tenant autenticado.';
  END IF;

  UPDATE public.finance_records fr
  SET
    commission_rate = p_new_rate,
    commission_value = ROUND((COALESCE(fr.revenue, 0) * p_new_rate / 100)::NUMERIC, 2)
  WHERE fr.professional_id = p_professional_id
    AND fr.commission_paid = FALSE
    AND fr.type = 'revenue'
    AND fr.user_id::TEXT = v_auth_company_id
    AND (fr.deleted_at IS NULL)
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_sales ps
      WHERE ps.finance_record_id = fr.id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_pending_commissions(UUID, DECIMAL) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. update_commission_record (tenant via auth, nao auth.uid = user_id cego)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_commission_record(UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS public.update_commission_record(UUID, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_commission_record(
  p_record_id UUID,
  p_new_value DECIMAL(10,2),
  p_new_rate DECIMAL(5,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
  v_record_user_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  SELECT fr.user_id::TEXT INTO v_record_user_id
  FROM public.finance_records fr
  WHERE fr.id = p_record_id;

  IF v_record_user_id IS NULL THEN
    RAISE EXCEPTION 'Registro nao encontrado.';
  END IF;

  IF v_record_user_id <> v_auth_company_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = p_record_id
  ) THEN
    RAISE EXCEPTION 'Comissao de produto deve ser alterada pela venda do produto.';
  END IF;

  UPDATE public.finance_records
  SET
    commission_value = p_new_value,
    commission_rate = p_new_rate
  WHERE id = p_record_id
    AND user_id::TEXT = v_auth_company_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_commission_record(UUID, DECIMAL, DECIMAL) TO authenticated;
