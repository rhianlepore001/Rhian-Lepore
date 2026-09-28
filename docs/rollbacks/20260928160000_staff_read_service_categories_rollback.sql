-- =============================================================================
-- ROLLBACK de 20260928160000_staff_read_service_categories
-- =============================================================================
-- A migration só ADICIONA a policy "Categories: company read". Voltar ao estado
-- atual de prod = remover essa policy. Nenhuma linha é tocada.
--
-- Estado de prod lido em 2026-09-28 (pg_policies), que continua válido após
-- este rollback porque a migration não o modifica:
--
--   service_categories (RLS habilitado):
--     "Users can view their own categories"    SELECT  {public}  USING (user_id = (auth.uid())::text)
--     "Users can manage their own categories"  ALL     {public}  USING (user_id = (auth.uid())::text)  WITH CHECK (user_id = (auth.uid())::text)
--
--   Função usada (inalterada, SECURITY DEFINER, search_path public):
--     public.get_auth_company_id() RETURNS text:
--       SELECT COALESCE(NULLIF(btrim(company_id), ''), id) FROM public.profiles WHERE id = auth.uid()::text
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Categories: company read" ON public.service_categories;

COMMIT;
