-- RAG 2.0 — Fix: Políticas explícitas de escrita para service_role
-- Contexto: PGRST204 indicou que PostgREST cache está desatualizado e RLS bloqueou writes.
-- Fix: Políticas explícitas FOR ALL TO service_role em todas as 4 tabelas RAG.
-- Nota: service_role já tem BYPASSRLS em PostgreSQL, mas políticas explícitas evitam
--       edge cases em certas versões do PostgREST/supabase-py.

-- ─────────────────────────────────────────────────────────────
-- rag_context_strategic
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "rag_service_role_write_strategic" ON rag_context_strategic;
CREATE POLICY "rag_service_role_write_strategic"
  ON rag_context_strategic
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- rag_context_architecture
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "rag_service_role_write_architecture" ON rag_context_architecture;
CREATE POLICY "rag_service_role_write_architecture"
  ON rag_context_architecture
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- rag_context_operational
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "rag_service_role_write_operational" ON rag_context_operational;
CREATE POLICY "rag_service_role_write_operational"
  ON rag_context_operational
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- rag_context_conversational (tabela específica com problema)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "rag_service_role_write_conversational" ON rag_context_conversational;
CREATE POLICY "rag_service_role_write_conversational"
  ON rag_context_conversational
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- RELOAD DO SCHEMA CACHE DO POSTGREST
-- Execute esta linha APÓS aplicar a migration acima.
-- Dispara NOTIFY para que PostgREST recarregue o schema imediatamente.
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';