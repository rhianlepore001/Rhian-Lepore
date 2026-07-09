-- ============================================================================
-- SECURITY P1 — Escopa por tenant o SELECT publico de team_members e service_upsells
-- ============================================================================
-- Achado da auditoria 360 (A2-P1-03 / A2-P2-02):
--   As policies "Public can view active team members" (USING active = true) e
--   "Public can view upsells" (USING true) expunham profissionais e upsells de
--   TODOS os tenants para qualquer request (inclusive anon) via API REST direta.
--
-- Por que e seguro restringir:
--   O fluxo de agendamento publico NAO faz SELECT direto nessas tabelas — ele
--   usa RPCs SECURITY DEFINER dedicados (get_public_team_catalog,
--   get_public_services_catalog, ...), que bypassam RLS e ja recebem o
--   business_id especifico. O codigo autenticado sempre le com
--   .eq('user_id', companyId). Nenhum caminho anon depende do SELECT direto.
--
-- Fix: trocar o predicado publico por escopo de tenant via get_auth_company_id()
--   (resolve para o id do dono tanto para owner quanto para staff; retorna NULL
--   para anon, que passa a nao ler linha alguma diretamente).
-- ============================================================================

-- team_members ---------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active team members" ON public.team_members;

CREATE POLICY "Tenant can view team members"
    ON public.team_members
    FOR SELECT
    USING (user_id = get_auth_company_id());

-- service_upsells ------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view upsells" ON public.service_upsells;

CREATE POLICY "Tenant can view upsells"
    ON public.service_upsells
    FOR SELECT
    USING (user_id = get_auth_company_id());
