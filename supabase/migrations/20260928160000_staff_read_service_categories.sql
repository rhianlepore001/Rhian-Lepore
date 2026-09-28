-- =============================================================================
-- Equipe (staff) lê as categorias de serviço da PRÓPRIA empresa
-- =============================================================================
-- Causa raiz: service_categories só tem policies do dono (user_id = auth.uid()).
-- Para o colaborador a leitura volta vazia e o assistente "Novo Atendimento"
-- mostrava "Serviços" em todos os grupos.
--
-- Mudança ADITIVA: uma policy SELECT extra, no mesmo padrão já usado em
-- business_settings ("Settings: company read") e services ("Services: company
-- isolation"). Nenhuma policy existente é alterada; escrita continua só do dono.
-- anon não é afetado (TO authenticated) e get_auth_company_id() devolve NULL
-- para quem não tem perfil. Rollback: docs/rollbacks/20260928160000_staff_read_service_categories_rollback.sql
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Categories: company read" ON public.service_categories;

CREATE POLICY "Categories: company read" ON public.service_categories FOR SELECT TO authenticated USING (user_id = public.get_auth_company_id());

COMMIT;
