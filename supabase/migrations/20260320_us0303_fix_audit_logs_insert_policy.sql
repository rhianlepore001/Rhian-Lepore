-- ============================================================================
-- US-0303: Corrigir politica INSERT em audit_logs com verificacao de user_id
-- Epic: EPIC-003-S1 | Prioridade: P0 | Autor: Dara (@data-engineer) | 2026-03-20
-- ============================================================================
--
-- PROBLEMA: Politica INSERT em audit_logs nao valida user_id.
--           Usuarios podem falsificar trilha de auditoria com user_id de outros.
--
-- SOLUCAO: Adicionar WITH CHECK (user_id = auth.uid()) na politica INSERT
--          para usuarios autenticados que precisam inserir seus proprios logs.
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
-- ============================================================================

-- PASSO 1: Remover politicas INSERT existentes para recriar corretamente
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

-- PASSO 2: Criar politica INSERT com validacao de user_id (AC1)
-- Impede que usuario insira logs com user_id diferente do seu (anti-spoofing)
CREATE POLICY "audit_logs_insert_policy"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Garante que o user_id do log corresponde ao usuario autenticado
    user_id = auth.uid()
    AND
    -- Garante que o company_id corresponde a empresa do usuario autenticado
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

COMMENT ON TABLE audit_logs IS
  'Trilha de auditoria com integridade garantida por RLS. '
  'Politica INSERT corrigida em US-0303 (2026-03-20): '
  'WITH CHECK (user_id = auth.uid()) previne falsificacao de logs.';

-- VERIFICACAO:
-- 1. Policy criada com WITH CHECK correto:
--    SELECT policyname, with_check FROM pg_policies
--    WHERE tablename = 'audit_logs' AND cmd = 'INSERT';
--    -> Deve mostrar: audit_logs_insert_policy com with_check contendo auth.uid()
--
-- 2. Teste de seguranca (AC2 - deve falhar com PGRST403):
--    INSERT INTO audit_logs (user_id, company_id, action)
--    VALUES ('outro-user-id', 'company-id', 'teste');
--    -> Deve falhar com violacao de politica RLS
--
-- 3. Teste de sucesso (AC3 - deve funcionar):
--    INSERT INTO audit_logs (user_id, company_id, action)
--    VALUES (auth.uid(), (SELECT company_id FROM profiles WHERE id = auth.uid()), 'teste');
--    -> Deve inserir com sucesso
