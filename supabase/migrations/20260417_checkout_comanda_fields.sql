-- F2: Checkout de Comanda — campos complementares
-- Complementa 20260413_checkout_fields.sql com campos faltantes do spec

-- ============================================================
-- appointments: campos de checkout adicionais
-- machine_fee_amount, completed_by, completed_at
-- ============================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS machine_fee_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- finance_records: campos de comissão e taxa maquininha
-- ============================================================
ALTER TABLE public.finance_records
  ADD COLUMN IF NOT EXISTS machine_fee_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_base DECIMAL(10,2);

-- ============================================================
-- business_settings: dia de acerto de comissões (coluna órfã)
-- Já usada em CommissionsSettings.tsx mas sem migration
-- ============================================================
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS commission_settlement_day_of_month INTEGER DEFAULT 5;

-- ============================================================
-- Normalizar formas de pagamento: 'Cartão' → 'Débito'
-- Para consistência com os novos botões de Débito/Crédito
-- ============================================================
UPDATE public.appointments
  SET payment_method = 'Débito'
  WHERE payment_method = 'Cartão';

UPDATE public.finance_records
  SET payment_method = 'Débito'
  WHERE payment_method = 'Cartão';

-- ============================================================
-- RLS: colunas novas são cobertas pelas policies existentes
-- (SECURITY DEFINER functions + RLS FOR ALL em appointments/finance_records)
-- ============================================================
