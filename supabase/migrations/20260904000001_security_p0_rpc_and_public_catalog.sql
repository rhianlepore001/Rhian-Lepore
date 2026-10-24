-- ============================================================================
-- SECURITY P0/P1 — Fecha IDOR restante + enxuga catálogo público
-- ============================================================================
-- Auditoria set/2026: get_dashboard_actions e get_aios_diagnostic ainda aceitam
-- tenant via parâmetro do cliente. Catálogo público devolvia linha inteira
-- (CPF, comissão, chaves Pix). Mesmo padrão wrapper de 20260709000001.
-- ============================================================================

-- Garante coluna usada por get_dashboard_actions (ausente em finance_records)
ALTER TABLE public.finance_records
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 1) get_dashboard_actions(UUID)
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_dashboard_actions(UUID)
  RENAME TO get_dashboard_actions__tenant_unsafe;
ALTER FUNCTION public.get_dashboard_actions__tenant_unsafe(UUID)
  SET search_path = public;
REVOKE ALL ON FUNCTION public.get_dashboard_actions__tenant_unsafe(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_actions(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id          TEXT,
  title       TEXT,
  description TEXT,
  priority    TEXT,
  action_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT * FROM public.get_dashboard_actions__tenant_unsafe(v_auth_company_id::UUID);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_actions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_actions(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_dashboard_actions(UUID) IS
  'Security fix: tenant derivado de auth server-side; p_user_id do cliente e ignorado.';

-- ----------------------------------------------------------------------------
-- 2) get_aios_diagnostic(UUID)
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_aios_diagnostic(UUID)
  RENAME TO get_aios_diagnostic__tenant_unsafe;
ALTER FUNCTION public.get_aios_diagnostic__tenant_unsafe(UUID)
  SET search_path = public;
REVOKE ALL ON FUNCTION public.get_aios_diagnostic__tenant_unsafe(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_aios_diagnostic(p_establishment_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_aios_diagnostic__tenant_unsafe(v_auth_company_id::UUID);
END;
$$;

REVOKE ALL ON FUNCTION public.get_aios_diagnostic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_aios_diagnostic(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_aios_diagnostic(UUID) IS
  'Security fix: tenant derivado de auth server-side; p_establishment_id do cliente e ignorado.';

-- ----------------------------------------------------------------------------
-- 3) get_marketing_opportunities(UUID)
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_marketing_opportunities(UUID)
  RENAME TO get_marketing_opportunities__tenant_unsafe;
ALTER FUNCTION public.get_marketing_opportunities__tenant_unsafe(UUID)
  SET search_path = public;
REVOKE ALL ON FUNCTION public.get_marketing_opportunities__tenant_unsafe(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_marketing_opportunities(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_marketing_opportunities__tenant_unsafe(v_auth_company_id::UUID);
END;
$$;

REVOKE ALL ON FUNCTION public.get_marketing_opportunities(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_marketing_opportunities(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4) mark_expense_as_paid(TEXT, TEXT) — valida tenant na sessão
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_expense_as_paid(
  p_record_id TEXT,
  p_user_id   TEXT
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

  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);

  IF p_user_id IS DISTINCT FROM v_auth_company_id THEN
    RAISE EXCEPTION 'Acesso negado ao financeiro do tenant informado.';
  END IF;

  UPDATE finance_records
  SET
    commission_paid    = TRUE,
    commission_paid_at = NOW(),
    status             = 'paid'
  WHERE id      = p_record_id::UUID
    AND user_id = v_auth_company_id
    AND type    = 'expense';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão: %', p_record_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_expense_as_paid(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_expense_as_paid(TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5) Catálogo público — DTO mínimo (sem CPF, comissão, Pix interno)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_team_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', tm.id,
        'name', tm.name,
        'role', tm.role,
        'bio', tm.bio,
        'photo_url', tm.photo_url,
        'display_order', tm.display_order,
        'slug', tm.slug
      )
      ORDER BY tm.display_order
    ),
    '[]'::json
  )
  FROM team_members tm
  WHERE tm.user_id::text = p_business_id::text
    AND tm.active = true
    AND (tm.deleted_at IS NULL);
$$;

CREATE OR REPLACE FUNCTION public.get_public_business_settings_json(p_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'business_hours', bs.business_hours,
    'cancellation_policy', bs.cancellation_policy,
    'enable_self_rescheduling', bs.enable_self_rescheduling,
    'public_products_enabled', bs.public_products_enabled
  )
  INTO v_result
  FROM business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6) RAG / KB interna — remove leitura aberta para authenticated/anon
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rag_select_all" ON public.rag_context_strategic;
DROP POLICY IF EXISTS "rag_select_all" ON public.rag_context_architecture;
DROP POLICY IF EXISTS "rag_select_all" ON public.rag_context_operational;
DROP POLICY IF EXISTS "rag_select_all" ON public.rag_context_conversational;

REVOKE SELECT ON public.rag_context_strategic FROM anon, authenticated;
REVOKE SELECT ON public.rag_context_architecture FROM anon, authenticated;
REVOKE SELECT ON public.rag_context_operational FROM anon, authenticated;
REVOKE SELECT ON public.rag_context_conversational FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7) get_monthly_finance_history(TEXT, INTEGER) — valida tenant na sessão
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_finance_history(
  p_user_id      TEXT,
  p_months_count INTEGER DEFAULT 12
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_auth_company_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);

  IF p_user_id IS DISTINCT FROM v_auth_company_id THEN
    RAISE EXCEPTION 'Acesso negado ao financeiro do tenant informado.';
  END IF;

  SELECT json_agg(row_to_json(t) ORDER BY (row_to_json(t)->>'year_num'), (row_to_json(t)->>'month_num'))
  INTO v_result
  FROM (
    SELECT
      TO_CHAR(month_start, 'TMMonth') AS month_name,
      EXTRACT(YEAR  FROM month_start)::INTEGER AS year_num,
      EXTRACT(MONTH FROM month_start)::INTEGER AS month_num,
      COALESCE((
        SELECT SUM(price)
        FROM appointments
        WHERE user_id = v_auth_company_id
          AND status = 'Completed'
          AND DATE_TRUNC('month', appointment_time) = month_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(COALESCE(revenue, 0))
        FROM finance_records
        WHERE user_id = v_auth_company_id
          AND type = 'revenue'
          AND appointment_id IS NULL
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS revenue,
      COALESCE((
        SELECT SUM(COALESCE(commission_value, 0))
        FROM finance_records
        WHERE user_id = v_auth_company_id
          AND type = 'expense'
          AND (commission_paid IS TRUE OR status = 'paid')
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS expenses,
      COALESCE((
        SELECT SUM(price)
        FROM appointments
        WHERE user_id = v_auth_company_id
          AND status = 'Completed'
          AND DATE_TRUNC('month', appointment_time) = month_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(COALESCE(revenue, 0))
        FROM finance_records
        WHERE user_id = v_auth_company_id
          AND type = 'revenue'
          AND appointment_id IS NULL
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0)
      -
      COALESCE((
        SELECT SUM(COALESCE(commission_value, 0))
        FROM finance_records
        WHERE user_id = v_auth_company_id
          AND type = 'expense'
          AND (commission_paid IS TRUE OR status = 'paid')
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS profit
    FROM (
      SELECT generate_series(
        DATE_TRUNC('month', NOW()) - ((p_months_count - 1) * INTERVAL '1 month'),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      ) AS month_start
    ) months
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_finance_history(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_finance_history(TEXT, INTEGER) TO authenticated;
