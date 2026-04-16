-- Fase 3: Checkout de Atendimento + Forma de Pagamento
-- Adiciona campos de checkout em appointments e configurações de taxa em business_settings
-- D-04 e D-05 do CONTEXT.md

-- ============================================================
-- appointments: novos campos de checkout
-- NOTA: payment_method TEXT já existe (20260218_add_payment_method.sql)
-- ============================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_fee_applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS machine_fee_percent DECIMAL(5,2);

-- ============================================================
-- business_settings: configurações de taxa de maquininha
-- Padrão upsert com onConflict: 'user_id' já está em uso
-- ============================================================
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS machine_fee_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS debit_fee_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_fee_percent DECIMAL(5,2) DEFAULT 0;

-- ============================================================
-- RLS: NÃO é necessário criar nova policy
-- A policy "Appointments: company isolation" em 20260307_us015b_multi_user_rls.sql
-- usa FOR ALL com get_auth_company_id() — já cobre UPDATE de received_by e machine_fee_*
-- A policy de UPDATE em business_settings já restringe por user_id
-- ============================================================
