-- ============================================
-- SCRIPT PARA TORNAR rhianlepore@gmail.com PREMIUM
-- ============================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Passo 1: Adicionar colunas de assinatura (se não existirem)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Passo 2: Atualizar a conta para premium
UPDATE profiles
SET 
  subscription_status = 'subscriber',
  trial_ends_at = NULL,
  updated_at = NOW()
WHERE email = 'rhianlepore@gmail.com';

-- Passo 3: Verificar a atualização
SELECT 
  id,
  email,
  full_name,
  business_name,
  subscription_status,
  trial_ends_at,
  created_at,
  updated_at
FROM profiles
WHERE email = 'rhianlepore@gmail.com';

-- ============================================
-- RESULTADO ESPERADO:
-- A conta rhianlepore@gmail.com deve aparecer com:
-- - subscription_status: 'subscriber'
-- - trial_ends_at: NULL
-- ============================================
