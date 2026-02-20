-- ============================================
-- 🔒 SCRIPT DE SEGURANÇA COMPLETO
-- ============================================
-- Execute este script no Supabase SQL Editor
-- para garantir isolamento total de dados
-- ============================================

-- 1️⃣ HABILITAR ROW LEVEL SECURITY EM TODAS AS TABELAS
-- ============================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hair_records ENABLE ROW LEVEL SECURITY;

-- 2️⃣ REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
-- ============================================

DROP POLICY IF EXISTS "Users can only see their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can only see their own clients" ON clients;
DROP POLICY IF EXISTS "Users can only see their own services" ON services;
DROP POLICY IF EXISTS "Users can only see their own categories" ON service_categories;
DROP POLICY IF EXISTS "Users can only see their own team" ON team_members;
DROP POLICY IF EXISTS "Users can only see their own settings" ON business_settings;
DROP POLICY IF EXISTS "Users can only see their own profile" ON profiles;
DROP POLICY IF EXISTS "Businesses can see their bookings" ON public_bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public_bookings;
DROP POLICY IF EXISTS "Public can read business info" ON public_bookings;
DROP POLICY IF EXISTS "Users can only see their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can only see their own records" ON hair_records;

-- 3️⃣ CRIAR POLÍTICAS RLS SEGURAS
-- ============================================

-- APPOINTMENTS - Apenas o dono vê seus agendamentos
CREATE POLICY "Users can only see their own appointments" ON appointments
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CLIENTS - Apenas o dono vê seus clientes
CREATE POLICY "Users can only see their own clients" ON clients
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SERVICES - Apenas o dono vê seus serviços
CREATE POLICY "Users can only see their own services" ON services
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SERVICE_CATEGORIES - Apenas o dono vê suas categorias
CREATE POLICY "Users can only see their own categories" ON service_categories
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- TEAM_MEMBERS - Apenas o dono vê sua equipe
CREATE POLICY "Users can only see their own team" ON team_members
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- BUSINESS_SETTINGS - Apenas o dono vê suas configurações
CREATE POLICY "Users can only see their own settings" ON business_settings
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PROFILES - Apenas o dono vê seu perfil
CREATE POLICY "Users can only see their own profile" ON profiles
  FOR ALL 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- PUBLIC_BOOKINGS - Negócio vê apenas suas solicitações
CREATE POLICY "Businesses can see their bookings" ON public_bookings
  FOR SELECT 
  USING (business_id = auth.uid());

CREATE POLICY "Businesses can update their bookings" ON public_bookings
  FOR UPDATE 
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- PUBLIC_BOOKINGS - Qualquer um pode criar (página pública)
CREATE POLICY "Anyone can create bookings" ON public_bookings
  FOR INSERT 
  WITH CHECK (true);

-- CAMPAIGNS - Apenas o dono vê suas campanhas
CREATE POLICY "Users can only see their own campaigns" ON campaigns
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- HAIR_RECORDS - Apenas o dono vê seus registros
CREATE POLICY "Users can only see their own records" ON hair_records
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4️⃣ CORRIGIR FUNÇÃO get_dashboard_stats
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_profit NUMERIC;
  v_current_month_revenue NUMERIC;
  v_weekly_growth NUMERIC;
  v_monthly_goal NUMERIC;
  v_last_week_revenue NUMERIC;
  v_this_week_revenue NUMERIC;
BEGIN
  -- ⚠️ CRÍTICO: Todos os SELECTs DEVEM filtrar por p_user_id
  
  -- Total de lucro (apenas agendamentos concluídos do usuário)
  SELECT COALESCE(SUM(price), 0) INTO v_total_profit
  FROM appointments
  WHERE user_id = p_user_id  -- ⚠️ FILTRO OBRIGATÓRIO
    AND status = 'Completed';

  -- Receita do mês atual (apenas do usuário)
  SELECT COALESCE(SUM(price), 0) INTO v_current_month_revenue
  FROM appointments
  WHERE user_id = p_user_id  -- ⚠️ FILTRO OBRIGATÓRIO
    AND status IN ('Confirmed', 'Completed')
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Receita da semana passada (apenas do usuário)
  SELECT COALESCE(SUM(price), 0) INTO v_last_week_revenue
  FROM appointments
  WHERE user_id = p_user_id  -- ⚠️ FILTRO OBRIGATÓRIO
    AND status = 'Completed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
    AND appointment_time < DATE_TRUNC('week', CURRENT_DATE);

  -- Receita desta semana (apenas do usuário)
  SELECT COALESCE(SUM(price), 0) INTO v_this_week_revenue
  FROM appointments
  WHERE user_id = p_user_id  -- ⚠️ FILTRO OBRIGATÓRIO
    AND status = 'Completed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  -- Calcular crescimento semanal
  IF v_last_week_revenue > 0 THEN
    v_weekly_growth := ((v_this_week_revenue - v_last_week_revenue) / v_last_week_revenue) * 100;
  ELSE
    v_weekly_growth := 0;
  END IF;

  -- Meta mensal (apenas do usuário)
  SELECT COALESCE(monthly_goal, 15000) INTO v_monthly_goal
  FROM profiles
  WHERE id = p_user_id;  -- ⚠️ FILTRO OBRIGATÓRIO

  RETURN json_build_object(
    'total_profit', v_total_profit,
    'current_month_revenue', v_current_month_revenue,
    'weekly_growth', v_weekly_growth,
    'monthly_goal', v_monthly_goal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5️⃣ VERIFICAR SE TUDO ESTÁ CORRETO
-- ============================================

-- Verificar se RLS está habilitado
SELECT 
  tablename, 
  rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'appointments', 'clients', 'services', 'service_categories',
    'team_members', 'business_settings', 'profiles', 'public_bookings',
    'campaigns', 'hair_records'
  )
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- ✅ SCRIPT CONCLUÍDO
-- ============================================
-- Após executar este script:
-- 1. Verifique os resultados das queries de verificação
-- 2. Teste com dois usuários diferentes
-- 3. Confirme que cada usuário vê apenas seus próprios dados
-- ============================================
