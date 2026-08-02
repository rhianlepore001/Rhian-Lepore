-- Fix Comissões vazias: app chama get_commissions_due() sem args,
-- mas o remoto ainda exige p_user_id text → RPC falha e a UI fica vazia.
-- Tenant deriva de auth; mantém colunas ricas (rate, total_paid, is_owner).

DROP FUNCTION IF EXISTS public.get_commissions_due();
DROP FUNCTION IF EXISTS public.get_commissions_due(UUID);
DROP FUNCTION IF EXISTS public.get_commissions_due(TEXT);

CREATE OR REPLACE FUNCTION public.get_commissions_due()
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  photo_url TEXT,
  is_owner BOOLEAN,
  total_due NUMERIC,
  total_earnings_month NUMERIC,
  total_paid NUMERIC,
  total_pending_records BIGINT,
  commission_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
  v_start_date TIMESTAMP;
  v_end_date TIMESTAMP;
BEGIN
  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_start_date := DATE_TRUNC('month', NOW());
  v_end_date := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 millisecond');

  RETURN QUERY
  SELECT
    tm.id AS professional_id,
    tm.name::TEXT AS professional_name,
    tm.photo_url,
    COALESCE(tm.is_owner, FALSE) AS is_owner,
    COALESCE(
      SUM(CASE WHEN fr.commission_paid = FALSE THEN fr.commission_value ELSE 0 END),
      0
    )::NUMERIC AS total_due,
    COALESCE(
      SUM(
        CASE
          WHEN fr.created_at >= v_start_date AND fr.created_at <= v_end_date
          THEN fr.commission_value
          ELSE 0
        END
      ),
      0
    )::NUMERIC AS total_earnings_month,
    COALESCE(
      SUM(
        CASE
          WHEN fr.commission_paid = TRUE
           AND fr.created_at >= v_start_date
           AND fr.created_at <= v_end_date
          THEN fr.commission_value
          ELSE 0
        END
      ),
      0
    )::NUMERIC AS total_paid,
    COUNT(fr.id) FILTER (WHERE fr.commission_paid = FALSE AND fr.commission_value > 0)
      AS total_pending_records,
    COALESCE(tm.commission_rate, tm.commission_percent, 0)::NUMERIC AS commission_rate
  FROM public.team_members tm
  LEFT JOIN public.finance_records fr
    ON tm.id = fr.professional_id
   AND fr.user_id::TEXT = v_auth_company_id
   AND COALESCE(fr.commission_value, 0) > 0
  WHERE tm.user_id::TEXT = v_auth_company_id
    AND tm.active = TRUE
  GROUP BY tm.id, tm.name, tm.photo_url, tm.is_owner, tm.commission_rate, tm.commission_percent
  ORDER BY tm.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_commissions_due() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commissions_due() TO authenticated;

COMMENT ON FUNCTION public.get_commissions_due() IS
  'Comissoes por profissional do tenant autenticado (sem p_user_id — anti-IDOR). Inclui rate/total_paid.';
