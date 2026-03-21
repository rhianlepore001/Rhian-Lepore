-- ============================================================================
-- US-0302: Remover politica RLS permissiva "Public profiles visible"
-- Epic: EPIC-003-S1 | Prioridade: P0 | Autor: Dara (@data-engineer) | 2026-03-20
-- ============================================================================
--
-- PROBLEMA: Politica permissiva expoe PII de perfis publicamente (LGPD/GDPR).
-- SOLUCAO: Remover politicas permissivas; manter apenas 1 politica SELECT
--          restritiva com isolamento por company_id.
--
-- ROLLBACK (apenas emergencia):
--   DROP POLICY IF EXISTS "Profiles: company isolation" ON profiles;
-- ============================================================================

-- PASSO 1: Remover variantes de politicas permissivas em profiles
DROP POLICY IF EXISTS "Public profiles visible" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read on profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;

-- PASSO 2: Unica politica SELECT restritiva por empresa (AC1, AC2)
DROP POLICY IF EXISTS "Profiles: company isolation" ON profiles;
CREATE POLICY "Profiles: company isolation"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Usuario ve o proprio perfil
    id = auth.uid()
    OR
    -- Usuario ve apenas membros da mesma empresa (isolamento multi-tenant)
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- PASSO 3: Politicas de escrita corretamente configuradas
DROP POLICY IF EXISTS "Profiles: own update" ON profiles;
CREATE POLICY "Profiles: own update"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Profiles: users cant insert" ON profiles;
CREATE POLICY "Profiles: users cant insert"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Profiles: users cant delete" ON profiles;
CREATE POLICY "Profiles: users cant delete"
  ON profiles FOR DELETE TO authenticated
  USING (false);

COMMENT ON TABLE profiles IS
  'RLS ativo. Politica permissiva "Public profiles visible" removida em US-0302 '
  '(2026-03-20). Acesso restrito ao proprio usuario e membros da mesma empresa.';

-- VERIFICACAO:
-- SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND policyname ILIKE '%public%';
-- -> Deve retornar 0 linhas (AC1 e AC2 verificados)
-- SELECT count(*) FROM profiles WHERE company_id != (SELECT company_id FROM profiles WHERE id = auth.uid());
-- -> Deve retornar 0 (isolamento multi-tenant funcionando)
