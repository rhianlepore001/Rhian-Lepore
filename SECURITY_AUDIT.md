# 🔒 AUDITORIA DE SEGURANÇA - ISOLAMENTO DE DADOS

## ⚠️ PROBLEMA IDENTIFICADO
As mensagens de "Avisos Importantes" estão aparecendo de forma inconsistente, o que pode indicar um problema de isolamento de dados entre diferentes usuários/negócios.

## ✅ VERIFICAÇÕES REALIZADAS

### 1. **Dashboard.tsx** - ✅ CORRETO
```typescript
// Linha 68 - Agendamentos
.eq('user_id', user.id)

// Linha 52 - Profile
.eq('id', user.id)

// Linha 122 - Services
.eq('user_id', user.id)

// Linha 127 - Team Members
.eq('user_id', user.id)

// Linha 87 - RPC Stats
.rpc('get_dashboard_stats', { p_user_id: user.id })
```

### 2. **Agenda.tsx** - ✅ CORRETO
Todas as queries filtram por `user.id`:
- team_members (linha 74)
- appointments (linha 96)
- public_bookings (linha 121)
- clients (linha 132)
- services (linha 142)

### 3. **ClientCRM.tsx** - ✅ CORRETO
- clients (linha 24)
- hair_records (linha 35)

### 4. **Clients.tsx** - ✅ CORRETO
- clients (linha 30)

## 🚨 PONTOS CRÍTICOS A VERIFICAR NO SUPABASE

### **Função RPC: `get_dashboard_stats`**
⚠️ **AÇÃO NECESSÁRIA**: Verificar se esta função está filtrando corretamente por `p_user_id`

**SQL Esperado:**
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_profit', COALESCE(SUM(price), 0),
    'current_month_revenue', COALESCE(SUM(CASE 
      WHEN DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE) 
      THEN price ELSE 0 END), 0),
    'weekly_growth', 0
  ) INTO result
  FROM appointments
  WHERE user_id = p_user_id  -- ⚠️ CRÍTICO: Deve ter este filtro!
    AND status IN ('Confirmed', 'Completed');
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Row Level Security (RLS)**
⚠️ **AÇÃO NECESSÁRIA**: Verificar se RLS está habilitado em TODAS as tabelas

**Tabelas que DEVEM ter RLS:**
1. ✅ `appointments` - WHERE user_id = auth.uid()
2. ✅ `clients` - WHERE user_id = auth.uid()
3. ✅ `services` - WHERE user_id = auth.uid()
4. ✅ `service_categories` - WHERE user_id = auth.uid()
5. ✅ `team_members` - WHERE user_id = auth.uid()
6. ✅ `business_settings` - WHERE user_id = auth.uid()
7. ✅ `profiles` - WHERE id = auth.uid()
8. ✅ `public_bookings` - WHERE business_id = auth.uid()
9. ✅ `campaigns` - WHERE user_id = auth.uid()
10. ✅ `hair_records` - WHERE user_id = auth.uid()

## 🔧 COMANDOS SQL PARA VERIFICAR/CORRIGIR

### 1. Verificar se RLS está habilitado
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'appointments', 'clients', 'services', 'service_categories',
    'team_members', 'business_settings', 'profiles', 'public_bookings',
    'campaigns', 'hair_records'
  );
```

### 2. Habilitar RLS em todas as tabelas
```sql
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
```

### 3. Criar políticas RLS corretas
```sql
-- APPOINTMENTS
DROP POLICY IF EXISTS "Users can only see their own appointments" ON appointments;
CREATE POLICY "Users can only see their own appointments" ON appointments
  FOR ALL USING (user_id = auth.uid());

-- CLIENTS
DROP POLICY IF EXISTS "Users can only see their own clients" ON clients;
CREATE POLICY "Users can only see their own clients" ON clients
  FOR ALL USING (user_id = auth.uid());

-- SERVICES
DROP POLICY IF EXISTS "Users can only see their own services" ON services;
CREATE POLICY "Users can only see their own services" ON services
  FOR ALL USING (user_id = auth.uid());

-- SERVICE_CATEGORIES
DROP POLICY IF EXISTS "Users can only see their own categories" ON service_categories;
CREATE POLICY "Users can only see their own categories" ON service_categories
  FOR ALL USING (user_id = auth.uid());

-- TEAM_MEMBERS
DROP POLICY IF EXISTS "Users can only see their own team" ON team_members;
CREATE POLICY "Users can only see their own team" ON team_members
  FOR ALL USING (user_id = auth.uid());

-- BUSINESS_SETTINGS
DROP POLICY IF EXISTS "Users can only see their own settings" ON business_settings;
CREATE POLICY "Users can only see their own settings" ON business_settings
  FOR ALL USING (user_id = auth.uid());

-- PROFILES
DROP POLICY IF EXISTS "Users can only see their own profile" ON profiles;
CREATE POLICY "Users can only see their own profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- PUBLIC_BOOKINGS
DROP POLICY IF EXISTS "Businesses can see their bookings" ON public_bookings;
CREATE POLICY "Businesses can see their bookings" ON public_bookings
  FOR ALL USING (business_id = auth.uid());

-- PUBLIC_BOOKINGS - Permitir inserção pública
DROP POLICY IF EXISTS "Anyone can create bookings" ON public_bookings;
CREATE POLICY "Anyone can create bookings" ON public_bookings
  FOR INSERT WITH CHECK (true);

-- CAMPAIGNS
DROP POLICY IF EXISTS "Users can only see their own campaigns" ON campaigns;
CREATE POLICY "Users can only see their own campaigns" ON campaigns
  FOR ALL USING (user_id = auth.uid());

-- HAIR_RECORDS
DROP POLICY IF EXISTS "Users can only see their own records" ON hair_records;
CREATE POLICY "Users can only see their own records" ON hair_records
  FOR ALL USING (user_id = auth.uid());
```

### 4. Corrigir função get_dashboard_stats
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_profit NUMERIC;
  v_current_month_revenue NUMERIC;
  v_weekly_growth NUMERIC;
  v_monthly_goal NUMERIC;
BEGIN
  -- Total de lucro (todos os agendamentos concluídos)
  SELECT COALESCE(SUM(price), 0) INTO v_total_profit
  FROM appointments
  WHERE user_id = p_user_id  -- ⚠️ FILTRO CRÍTICO
    AND status = 'Completed';

  -- Receita do mês atual
  SELECT COALESCE(SUM(price), 0) INTO v_current_month_revenue
  FROM appointments
  WHERE user_id = p_user_id  -- ⚠️ FILTRO CRÍTICO
    AND status IN ('Confirmed', 'Completed')
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- Crescimento semanal (simplificado)
  v_weekly_growth := 0;

  -- Meta mensal
  SELECT COALESCE(monthly_goal, 15000) INTO v_monthly_goal
  FROM profiles
  WHERE id = p_user_id;  -- ⚠️ FILTRO CRÍTICO

  RETURN json_build_object(
    'total_profit', v_total_profit,
    'current_month_revenue', v_current_month_revenue,
    'weekly_growth', v_weekly_growth,
    'monthly_goal', v_monthly_goal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📋 CHECKLIST DE SEGURANÇA

- [ ] Verificar se RLS está habilitado em todas as tabelas
- [ ] Verificar se todas as políticas RLS estão corretas
- [ ] Verificar se a função `get_dashboard_stats` filtra por `p_user_id`
- [ ] Testar com dois usuários diferentes para garantir isolamento
- [ ] Verificar logs do Supabase para queries sem filtro
- [ ] Revisar todas as queries no código para garantir `.eq('user_id', user.id)`

## 🎯 PRÓXIMOS PASSOS

1. **URGENTE**: Executar os comandos SQL acima no Supabase
2. **URGENTE**: Verificar a função `get_dashboard_stats`
3. Testar com dois usuários diferentes
4. Monitorar logs do Supabase

## ⚠️ NOTA IMPORTANTE

**NUNCA** fazer queries sem filtro de `user_id` ou `auth.uid()`. Isso pode expor dados de outros negócios!

**Sempre usar:**
- `.eq('user_id', user.id)` no código
- `WHERE user_id = auth.uid()` nas políticas RLS
- `WHERE user_id = p_user_id` nas funções RPC
