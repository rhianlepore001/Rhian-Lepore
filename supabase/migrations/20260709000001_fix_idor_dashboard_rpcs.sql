-- ============================================================================
-- SECURITY P0 — Fecha IDOR cross-tenant em 5 RPCs SECURITY DEFINER
-- ============================================================================
-- Achado da auditoria 360 (A2-P0-01 / A2-P0-02):
--   get_dashboard_stats, get_client_insights, get_professional_commission_details,
--   get_professional_finance_summary e get_dashboard_insights sao SECURITY DEFINER
--   (bypassam RLS) e usavam o parametro `p_user_id` vindo do CLIENTE como unico
--   filtro de tenant. Qualquer usuario autenticado podia chamar a RPC passando o
--   UUID de outro tenant e ler receita, comissoes, clientes e metricas alheias.
--
-- ESTRATEGIA (preserva o corpo testado, zero mudanca de assinatura/front-end):
--   1) Renomeia a funcao vulneravel para <nome>__tenant_unsafe e REVOGA todo
--      acesso de PUBLIC/anon/authenticated (so o owner, via SECURITY DEFINER,
--      consegue chama-la).
--   2) Cria um WRAPPER com a MESMA assinatura publica que:
--        - deriva o tenant SEMPRE de get_auth_company_id()/auth.uid() (server-side);
--        - ignora o valor de p_user_id enviado pelo cliente;
--        - repassa o tenant seguro para a funcao interna.
--   Resultado: o front-end continua chamando identico (p_user_id agora inocuo),
--   e o filtro de tenant passa a ser inforjavel.
--
-- Padrao de derivacao identico ao ja aprovado em 20260708000001 (get_commissions_due).
--
-- NAO incluida aqui: get_dashboard_actions — o corpo referencia `deleted_at`
-- (coluna que a v6 de get_dashboard_stats documenta como inexistente). Exige
-- verificacao do schema vivo antes de reescrever; tratada como pendencia P1.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) get_dashboard_stats(TEXT) RETURNS JSON
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_dashboard_stats(TEXT) RENAME TO get_dashboard_stats__tenant_unsafe;
ALTER FUNCTION public.get_dashboard_stats__tenant_unsafe(TEXT) SET search_path = public;
REVOKE ALL ON FUNCTION public.get_dashboard_stats__tenant_unsafe(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id TEXT DEFAULT NULL)
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
  RETURN public.get_dashboard_stats__tenant_unsafe(v_auth_company_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(TEXT) TO authenticated;
COMMENT ON FUNCTION public.get_dashboard_stats(TEXT) IS
  'Security fix (A2-P0): tenant derivado de auth server-side; p_user_id do cliente e ignorado.';

-- ----------------------------------------------------------------------------
-- 2) get_client_insights(uuid, integer) RETURNS json
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_client_insights(uuid, integer) RENAME TO get_client_insights__tenant_unsafe;
ALTER FUNCTION public.get_client_insights__tenant_unsafe(uuid, integer) SET search_path = public;
REVOKE ALL ON FUNCTION public.get_client_insights__tenant_unsafe(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_client_insights(p_user_id uuid DEFAULT NULL, p_months integer DEFAULT 6)
RETURNS json
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
  RETURN public.get_client_insights__tenant_unsafe(v_auth_company_id::uuid, p_months);
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_insights(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_insights(uuid, integer) TO authenticated;
COMMENT ON FUNCTION public.get_client_insights(uuid, integer) IS
  'Security fix (A2-P0): tenant derivado de auth server-side; p_user_id do cliente e ignorado.';

-- ----------------------------------------------------------------------------
-- 3) get_professional_commission_details(uuid, uuid, date, date) RETURNS json
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_professional_commission_details(uuid, uuid, date, date) RENAME TO get_professional_commission_details__tenant_unsafe;
ALTER FUNCTION public.get_professional_commission_details__tenant_unsafe(uuid, uuid, date, date) SET search_path = public;
REVOKE ALL ON FUNCTION public.get_professional_commission_details__tenant_unsafe(uuid, uuid, date, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_professional_commission_details(p_user_id uuid, p_professional_id uuid, p_start_date date, p_end_date date)
RETURNS json
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
  RETURN public.get_professional_commission_details__tenant_unsafe(v_auth_company_id::uuid, p_professional_id, p_start_date, p_end_date);
END;
$$;

REVOKE ALL ON FUNCTION public.get_professional_commission_details(uuid, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_professional_commission_details(uuid, uuid, date, date) TO authenticated;
COMMENT ON FUNCTION public.get_professional_commission_details(uuid, uuid, date, date) IS
  'Security fix (A2-P0): tenant derivado de auth server-side; p_user_id do cliente e ignorado.';

-- ----------------------------------------------------------------------------
-- 4) get_professional_finance_summary(uuid, uuid, date, date) RETURNS json
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_professional_finance_summary(uuid, uuid, date, date) RENAME TO get_professional_finance_summary__tenant_unsafe;
ALTER FUNCTION public.get_professional_finance_summary__tenant_unsafe(uuid, uuid, date, date) SET search_path = public;
REVOKE ALL ON FUNCTION public.get_professional_finance_summary__tenant_unsafe(uuid, uuid, date, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_professional_finance_summary(p_user_id uuid, p_professional_id uuid, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS json
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
  RETURN public.get_professional_finance_summary__tenant_unsafe(v_auth_company_id::uuid, p_professional_id, p_start_date, p_end_date);
END;
$$;

REVOKE ALL ON FUNCTION public.get_professional_finance_summary(uuid, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_professional_finance_summary(uuid, uuid, date, date) TO authenticated;
COMMENT ON FUNCTION public.get_professional_finance_summary(uuid, uuid, date, date) IS
  'Security fix (A2-P0): tenant derivado de auth server-side; p_user_id do cliente e ignorado.';

-- ----------------------------------------------------------------------------
-- 5) get_dashboard_insights(uuid, date, date) RETURNS json
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.get_dashboard_insights(uuid, date, date) RENAME TO get_dashboard_insights__tenant_unsafe;
ALTER FUNCTION public.get_dashboard_insights__tenant_unsafe(uuid, date, date) SET search_path = public;
REVOKE ALL ON FUNCTION public.get_dashboard_insights__tenant_unsafe(uuid, date, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_insights(p_user_id uuid, p_start_date date, p_end_date date)
RETURNS json
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
  RETURN public.get_dashboard_insights__tenant_unsafe(v_auth_company_id::uuid, p_start_date, p_end_date);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_insights(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_insights(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION public.get_dashboard_insights(uuid, date, date) IS
  'Security fix (A2-P0): tenant derivado de auth server-side; p_user_id do cliente e ignorado.';
