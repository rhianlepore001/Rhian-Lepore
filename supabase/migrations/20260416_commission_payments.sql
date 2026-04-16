-- Fase 3: Comissões e Pagamento da Equipe
-- Spec: specs/active/01-colaboradores-comissoes-pagamentos.md — Feature 3
--
-- Mudanças:
--   1. team_members: +commission_percent, +cpf
--   2. business_settings: +payment_day
--   3. Nova tabela commission_payments com RLS

-- ============================================================
-- 1. team_members: percentual de comissão e CPF do colaborador
-- ============================================================
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS cpf TEXT;

-- ============================================================
-- 2. business_settings: dia de pagamento das comissões
-- ============================================================
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 28);

-- ============================================================
-- 3. Tabela commission_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      TEXT NOT NULL,                           -- owner user_id (tenant key)
  collaborator_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  gross_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  fee_deducted    DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  net_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at         TIMESTAMP WITH TIME ZONE,
  paid_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. RLS — commission_payments
-- ============================================================
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Owner vê todos os registros da empresa
CREATE POLICY "Commissions: owner select"
  ON public.commission_payments
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_auth_company_id()
    AND get_auth_role() = 'owner'
  );

-- Staff vê apenas os próprios registros
CREATE POLICY "Commissions: staff select own"
  ON public.commission_payments
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_auth_company_id()
    AND collaborator_id IN (
      SELECT id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Apenas owner pode inserir/atualizar/deletar
CREATE POLICY "Commissions: owner write"
  ON public.commission_payments
  FOR ALL
  TO authenticated
  USING (
    company_id = get_auth_company_id()
    AND get_auth_role() = 'owner'
  )
  WITH CHECK (
    company_id = get_auth_company_id()
    AND get_auth_role() = 'owner'
  );

-- ============================================================
-- 5. Index para buscas por período e colaborador
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_commission_payments_company_period
  ON public.commission_payments (company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_commission_payments_collaborator
  ON public.commission_payments (collaborator_id);
