# Task: schema-onboarding-state
> Agent: data-engineer | Phase: 1 | elicit: false

## Objetivo

Criar migration SQL completa para persistência do progresso do onboarding wizard,
com RLS policies para isolamento multi-tenant.

## Output

Criar arquivo: `supabase/migrations/20260320_onboarding_wizard.sql`

## SQL Completo

```sql
-- ============================================================
-- Migration: 20260320_onboarding_wizard.sql
-- Feature: Onboarding Wizard — Persistência de Progresso
-- Squad: onboarding-wizard-squad
-- ============================================================

-- Tabela: onboarding_progress
-- Armazena progresso do wizard por empresa (1 registro por empresa)
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Progresso
  current_step    SMALLINT NOT NULL DEFAULT 1
                  CONSTRAINT step_range CHECK (current_step BETWEEN 1 AND 5),
  completed_steps SMALLINT[] NOT NULL DEFAULT '{}',

  -- Status
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  is_skipped      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Dados por step (flexível)
  step_data       JSONB NOT NULL DEFAULT '{}',

  -- Garantia: apenas 1 registro por empresa
  UNIQUE(company_id)
);

-- Index para queries rápidas por company_id
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company_id
  ON onboarding_progress(company_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_active
  ON onboarding_progress(company_id, is_completed)
  WHERE is_completed = FALSE;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- SELECT: empresa vê apenas seu progresso
CREATE POLICY "onboarding_select_own_company"
  ON onboarding_progress
  FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- INSERT: empresa só insere para si mesma
CREATE POLICY "onboarding_insert_own_company"
  ON onboarding_progress
  FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- UPDATE: empresa só atualiza seu próprio registro
CREATE POLICY "onboarding_update_own_company"
  ON onboarding_progress
  FOR UPDATE
  USING (
    company_id = (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================================
-- Helper Function: Upsert de progresso
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_onboarding_progress(
  p_company_id UUID,
  p_current_step SMALLINT,
  p_completed_steps SMALLINT[],
  p_step_data JSONB DEFAULT '{}'
)
RETURNS onboarding_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result onboarding_progress;
BEGIN
  INSERT INTO onboarding_progress (
    company_id, current_step, completed_steps, step_data, last_activity
  )
  VALUES (
    p_company_id, p_current_step, p_completed_steps, p_step_data, NOW()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    current_step    = EXCLUDED.current_step,
    completed_steps = EXCLUDED.completed_steps,
    step_data       = onboarding_progress.step_data || EXCLUDED.step_data,
    last_activity   = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;
```

## Instruções de Aplicação

1. Salvar o SQL em `supabase/migrations/20260320_onboarding_wizard.sql`
2. Aplicar no Supabase Dashboard → SQL Editor, ou via CLI:
   ```bash
   supabase db push
   ```

## Verificação Pós-Migração

```sql
-- Verificar tabela criada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'onboarding_progress';

-- Verificar RLS ativa
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'onboarding_progress';

-- Verificar policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'onboarding_progress';
```
