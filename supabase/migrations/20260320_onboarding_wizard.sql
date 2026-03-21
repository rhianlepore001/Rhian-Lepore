-- ============================================================================
-- Migration: 20260320_onboarding_wizard.sql
-- Feature: Onboarding Wizard — Persistencia de Progresso
-- Squad: onboarding-wizard-squad
-- Epic: EPIC-003-S1 | Autor: Dara (@data-engineer) | 2026-03-20
-- ============================================================================
--
-- OBJETIVO: Criar tabela dedicada para persistencia do progresso do
--           onboarding wizard, com isolamento multi-tenant via RLS.
--
-- PROBLEMA: Colunas de onboarding em business_settings nao suportam
--           multiplos steps, completed_steps[] ou step_data JSONB flexivel.
--
-- SOLUCAO: Tabela `onboarding_progress` — 1 registro por empresa (UNIQUE),
--          com RLS policies que garantem isolamento completo por company_id.
--
-- ROLLBACK (apenas emergencia):
--   DROP FUNCTION IF EXISTS upsert_onboarding_progress;
--   DROP TABLE IF EXISTS onboarding_progress;
-- ============================================================================


-- ============================================================================
-- PASSO 1: Criar tabela onboarding_progress
-- ============================================================================
-- Armazena progresso do wizard por empresa.
-- UNIQUE(company_id) garante no maximo 1 registro por tenant.

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Progresso: step atual (1-5) com validacao de intervalo
  current_step    SMALLINT NOT NULL DEFAULT 1
                  CONSTRAINT chk_step_range CHECK (current_step BETWEEN 1 AND 5),

  -- Array de steps concluidos (ex: '{1,2,3}')
  completed_steps SMALLINT[] NOT NULL DEFAULT '{}',

  -- Status do wizard
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  is_skipped      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps de ciclo de vida
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,                          -- NULL enquanto nao finalizado
  last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Dados flexiveis por step (ex: {"1": {"business_name": "Barbearia Silva"}})
  step_data       JSONB NOT NULL DEFAULT '{}',

  -- Garante isolamento: exatamente 1 registro por empresa
  UNIQUE (company_id)
);

COMMENT ON TABLE onboarding_progress IS
  'Persistencia do progresso do onboarding wizard por empresa (1 registro por tenant). '
  'RLS ativo. Criado em onboarding-wizard-squad (2026-03-20).';

COMMENT ON COLUMN onboarding_progress.current_step IS
  'Step atual do wizard (1-5). Validado por chk_step_range.';
COMMENT ON COLUMN onboarding_progress.completed_steps IS
  'Array de IDs de steps concluidos. Ex: ''{1,2,3}''.';
COMMENT ON COLUMN onboarding_progress.step_data IS
  'Dados capturados por step no formato JSONB. Chave = step_id (string). '
  'Ex: {"1": {"business_name": "Barbearia"}, "2": {"services": [...]}}';
COMMENT ON COLUMN onboarding_progress.completed_at IS
  'Preenchido apenas quando is_completed = TRUE.';


-- ============================================================================
-- PASSO 2: Indices de performance
-- ============================================================================

-- Indice principal: lookup por company_id (usado em todas as queries RLS)
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company_id
  ON onboarding_progress (company_id);

COMMENT ON INDEX idx_onboarding_progress_company_id IS
  'Indice em onboarding_progress.company_id para lookup direto por tenant. '
  'Criado em onboarding-wizard-squad (2026-03-20).';

-- Indice parcial: otimiza busca de wizards ainda nao concluidos
-- (caso de uso mais frequente: verificar se onboarding esta em aberto)
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_active
  ON onboarding_progress (company_id, is_completed)
  WHERE is_completed = FALSE;

COMMENT ON INDEX idx_onboarding_progress_active IS
  'Indice parcial em onboarding_progress(company_id, is_completed) WHERE is_completed = FALSE. '
  'Otimiza queries de wizards em aberto. Criado em onboarding-wizard-squad (2026-03-20).';


-- ============================================================================
-- PASSO 3: Habilitar Row Level Security
-- ============================================================================

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- PASSO 4: RLS Policies — isolamento multi-tenant por company_id
-- ============================================================================
-- Padrao do projeto: company_id extraido de profiles WHERE id = auth.uid()
-- NUNCA aceitar company_id de input externo (URL, form, etc).

-- Limpar policies anteriores (idempotente)
DROP POLICY IF EXISTS "onboarding_select_own_company" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_insert_own_company" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_update_own_company" ON onboarding_progress;

-- SELECT: empresa ve apenas o proprio progresso
CREATE POLICY "onboarding_select_own_company"
  ON onboarding_progress
  FOR SELECT
  TO authenticated
  USING (
    company_id = (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- INSERT: empresa so pode inserir registro para si mesma
CREATE POLICY "onboarding_insert_own_company"
  ON onboarding_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- UPDATE: empresa so pode atualizar o proprio registro
-- USING: qual linha pode ser lida para update
-- WITH CHECK: o novo valor de company_id tambem deve pertencer ao tenant
CREATE POLICY "onboarding_update_own_company"
  ON onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (
    company_id = (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );


-- ============================================================================
-- PASSO 5: Grants de acesso
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON onboarding_progress TO authenticated;


-- ============================================================================
-- PASSO 6: Funcao helper — upsert_onboarding_progress
-- ============================================================================
-- SECURITY DEFINER: executa com privilegios do owner (bypassa RLS),
-- mas valida company_id via parametro (chamador deve fornecer o company_id
-- correto do proprio tenant — nunca confiar em input nao validado no frontend).
--
-- Logica de merge do step_data: usa || (merge JSONB) para preservar
-- dados de steps anteriores e atualizar apenas o step atual.

CREATE OR REPLACE FUNCTION upsert_onboarding_progress(
  p_company_id     UUID,
  p_current_step   SMALLINT,
  p_completed_steps SMALLINT[],
  p_step_data      JSONB DEFAULT '{}'
)
RETURNS onboarding_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result onboarding_progress;
  v_caller_company_id UUID;
BEGIN
  -- Validacao de seguranca: garantir que o chamador pertence ao company_id informado
  SELECT company_id INTO v_caller_company_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_caller_company_id IS NULL OR v_caller_company_id != p_company_id THEN
    RAISE EXCEPTION 'Acesso negado: company_id nao corresponde ao usuario autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Upsert: insere novo registro ou atualiza o existente para o tenant
  INSERT INTO onboarding_progress (
    company_id,
    current_step,
    completed_steps,
    step_data,
    last_activity
  )
  VALUES (
    p_company_id,
    p_current_step,
    p_completed_steps,
    p_step_data,
    NOW()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    current_step    = EXCLUDED.current_step,
    completed_steps = EXCLUDED.completed_steps,
    -- Merge JSONB: preserva dados de steps anteriores, atualiza o step atual
    step_data       = onboarding_progress.step_data || EXCLUDED.step_data,
    last_activity   = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION upsert_onboarding_progress IS
  'Upsert do progresso do onboarding wizard para o tenant autenticado. '
  'SECURITY DEFINER com validacao de company_id. '
  'Merge JSONB preserva dados de steps anteriores. '
  'Criado em onboarding-wizard-squad (2026-03-20).';

-- Garantir que apenas usuarios autenticados podem chamar a funcao
REVOKE ALL ON FUNCTION upsert_onboarding_progress FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_onboarding_progress TO authenticated;


-- ============================================================================
-- VERIFICACAO POS-MIGRACAO (executar apos aplicar para validar)
-- ============================================================================

-- 1. Verificar colunas da tabela criada
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'onboarding_progress'
-- ORDER BY ordinal_position;
-- -> Deve retornar 11 colunas (id, company_id, current_step, completed_steps,
--    is_completed, is_skipped, started_at, completed_at, last_activity, step_data, UNIQUE)

-- 2. Verificar RLS habilitado
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'onboarding_progress';
-- -> rowsecurity deve ser TRUE

-- 3. Verificar policies criadas (deve retornar 3 linhas)
-- SELECT policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename = 'onboarding_progress'
-- ORDER BY cmd;
-- -> onboarding_insert_own_company (INSERT)
-- -> onboarding_select_own_company (SELECT)
-- -> onboarding_update_own_company (UPDATE)

-- 4. Verificar indices criados (deve retornar 2 linhas)
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'onboarding_progress'
--   AND indexname NOT LIKE '%_pkey'
-- ORDER BY indexname;
-- -> idx_onboarding_progress_active
-- -> idx_onboarding_progress_company_id

-- 5. Verificar funcao criada
-- SELECT routine_name, security_type
-- FROM information_schema.routines
-- WHERE routine_name = 'upsert_onboarding_progress';
-- -> Deve retornar 1 linha com security_type = 'DEFINER'

-- 6. Verificar constraint de step_range
-- SELECT conname, consrc
-- FROM pg_constraint
-- WHERE conrelid = 'onboarding_progress'::regclass AND contype = 'c';
-- -> chk_step_range: (current_step >= 1 AND current_step <= 5)
