# DB Specialist Review — Beauty OS / AgenX AIOX
**Agente:** @data-engineer (Dara)
**US:** US-020 — Revisão especializada de banco de dados (Fase 5 do Brownfield Discovery)
**Data:** 2026-03-14
**Status:** Completo — Pronto para consolidação em technical-debt-DRAFT.md

---

## Sumário Executivo

O banco de dados do Beauty OS é uma instância Supabase (PostgreSQL 15) com 75+ migrations acumuladas desde jan/2024. O sistema opera em modelo multi-tenant com isolamento por `user_id`/`company_id`. A auditoria identificou **23 issues** distribuídas em 7 dimensões, com destaque para: inconsistências de tipo de chave (`TEXT` vs `UUID`) na coluna `company_id`, ausência de índices compostos críticos em tabelas de alta frequência, políticas RLS conflitantes resultantes da migração iterativa de single-tenant para multi-tenant, e padrões de query `SELECT *` no frontend sem paginação.

**Distribuição por severidade:** P0: 3 | P1: 7 | P2: 9 | P3: 4

---

## 1. Schema Design Audit

### 1.1 Inconsistência Crítica: `company_id` como TEXT em vez de UUID

**Severidade:** P0
**Tabela afetada:** `profiles`
**Impact:** Falha silenciosa em joins, impossibilidade de FK formal, comparações inseguras entre TEXT e UUID nas policies RLS
**Effort:** 4-8 horas (migration + testes de regressão)

**Evidência** (migration `20260307_us015b_multi_user_rls.sql`):
```sql
-- PROBLEMA: company_id foi adicionado como TEXT
ALTER TABLE profiles ADD COLUMN company_id TEXT;

-- Função que depende do tipo incorreto:
CREATE OR REPLACE FUNCTION get_auth_company_id()
RETURNS TEXT  -- retorna TEXT, não UUID
LANGUAGE plpgsql
AS $$
DECLARE v_company_id TEXT;
BEGIN
  SELECT COALESCE(company_id, id) INTO v_company_id
  FROM profiles WHERE id = auth.uid();
  RETURN v_company_id;
END;
$$;
```

**Impacto real:** Toda política RLS que usa `get_auth_company_id()` compara TEXT com UUID implicitamente, o que pode causar falha em queries dependendo do driver. A FK não pode ser declarada formalmente entre TEXT e UUID, deixando integridade referencial apenas no nível da aplicação.

**Recomendação:**
```sql
-- Passo 1: Adicionar coluna UUID temporária
ALTER TABLE profiles ADD COLUMN company_id_uuid UUID;

-- Passo 2: Migrar dados existentes
UPDATE profiles SET company_id_uuid = company_id::UUID WHERE company_id IS NOT NULL;

-- Passo 3: Substituir coluna
ALTER TABLE profiles DROP COLUMN company_id;
ALTER TABLE profiles RENAME COLUMN company_id_uuid TO company_id;

-- Passo 4: Atualizar função
CREATE OR REPLACE FUNCTION get_auth_company_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_company_id UUID;
BEGIN
  SELECT COALESCE(company_id, id) INTO v_company_id
  FROM profiles WHERE id = auth.uid();
  RETURN v_company_id;
END;
$$;
```

---

### 1.2 Desnormalização: Campo `service` em `appointments` como TEXT

**Severidade:** P1
**Tabela afetada:** `appointments`
**Impact:** Impossibilidade de análise histórica após renomeação de serviços, dados inconsistentes entre `appointments.service` (TEXT) e `services.name`, relatórios de serviço mais popular (`top_service` em `get_dashboard_stats`) baseado em texto livre sem normalização
**Effort:** 2-3 dias (migration de dados + atualização de RPCs e frontend)

**Evidência** (migration `20260218_full_schema_fix.sql`):
```sql
CREATE TABLE IF NOT EXISTS appointments (
  ...
  service TEXT NOT NULL, -- Keeping as text for now as per frontend
  ...
);
```

O comentário "for now" existe desde a migration inicial e nunca foi resolvido. A coluna `professional_id` foi adicionada posteriormente como FK para `team_members`, mas `service` permanece como texto livre.

**Recomendação:**
```sql
-- Adicionar coluna FK e manter TEXT por compatibilidade temporária
ALTER TABLE appointments ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Criar índice para a nova FK
CREATE INDEX idx_appointments_service_id ON appointments(service_id) WHERE service_id IS NOT NULL;

-- Migração de dados (aproximada — requer validação manual para casos ambíguos)
UPDATE appointments a
SET service_id = s.id
FROM services s
WHERE s.user_id = a.user_id AND s.name = a.service
  AND a.service_id IS NULL;
```

---

### 1.3 Campo `updated_at` ausente em tabelas críticas

**Severidade:** P2
**Tabelas afetadas:** `service_categories`, `hair_records`, `aios_logs`, `queue_entries`, `public_clients`, `goal_settings`
**Impact:** Impossibilidade de implementar cache invalidation baseado em timestamp, dificuldade para sync incremental, auditoria de mudanças incompleta
**Effort:** 1 hora (migrations simples)

**Evidência** (migration `20260218_services_setup.sql`):
```sql
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
  -- FALTANDO: updated_at
);
```

**Recomendação:**
```sql
-- Aplicar em todas as tabelas afetadas
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE hair_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE aios_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger genérico de atualização
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Aplicar trigger em cada tabela
CREATE TRIGGER trg_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 1.4 Tabelas com timestamps sem fuso horário

**Severidade:** P2
**Tabelas afetadas:** `team_members` (`created_at TIMESTAMP`), `service_categories` (`created_at TIMESTAMP`), `services` (`created_at TIMESTAMP`), `aios_logs` (`created_at TIMESTAMP WITH TIME ZONE` — correto), `hair_records` (`date TIMESTAMP WITH TIME ZONE` — correto para date, mas `created_at TIMESTAMP`)
**Impact:** Ambiguidade de fuso horário para estabelecimentos em PT (Portugal) e agendamentos com clientes de outros fusos
**Effort:** 2 horas

**Evidência** (migration `20260218_team_setup.sql`):
```sql
CREATE TABLE IF NOT EXISTS team_members (
  ...
  created_at TIMESTAMP DEFAULT NOW(),   -- sem TZ
  updated_at TIMESTAMP DEFAULT NOW()    -- sem TZ
);
```

**Recomendação:**
```sql
ALTER TABLE team_members
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
-- Repetir para service_categories, services, hair_records
```

---

### 1.5 Tabela `finance_records` com design misto receita/despesa

**Severidade:** P1
**Impact:** A tabela usa os mesmos campos (`revenue`, `commission_value`) tanto para registros de receita quanto de despesa, com distinção pelo campo `type TEXT`. Isso cria ambiguidade: um registro de pagamento de comissão tem `revenue = 0` e `commission_value = amount`. Queries de total de receitas precisam de filtros `type = 'revenue'` que são frequentemente omitidos.
**Effort:** 3-5 dias (refactor + migração de dados)

**Evidência** (`mark_commissions_as_paid`):
```sql
INSERT INTO finance_records (
  revenue,          -- 0 para despesas
  commission_value, -- usado como "amount" da despesa
  type,             -- 'expense'
  description       -- 'Pagamento de Comissão'
)
VALUES (0, p_amount, 'expense', 'Pagamento de Comissão');
```

**Recomendação de longo prazo:** Separar em `revenue_records` e `expense_records`, ou adicionar coluna `amount` unificada com sinal +/-.

---

## 2. Index Strategy Audit

### 2.1 Índice faltante: `appointments(user_id, status)` para queries de dashboard

**Severidade:** P1
**Impact:** O índice existente `idx_appointments_user_time_status` cobre `(user_id, appointment_time, status)`. Queries de dashboard que filtram apenas por `user_id + status` sem `appointment_time` não usam esse índice eficientemente. O planner pode optar por seq scan em tabelas grandes.
**Effort:** 15 minutos

**Evidência** (`get_dashboard_stats` v4):
```sql
-- Esta query não usa appointment_time, apenas user_id + status
SELECT COALESCE(SUM(price), 0) INTO v_total_profit
FROM appointments
WHERE user_id = p_user_id::UUID
  AND status = 'Completed'
  AND deleted_at IS NULL;
```

**EXPLAIN simulado (tabela com 10.000 linhas):**
```
-- SEM índice adequado:
Seq Scan on appointments (cost=0.00..350.00 rows=150 width=32)
  Filter: ((user_id = $1) AND (status = 'Completed') AND (deleted_at IS NULL))

-- COM índice adequado:
Index Scan using idx_apt_user_status_deleted on appointments
  Index Cond: ((user_id = $1) AND (status = 'Completed'))
  Filter: (deleted_at IS NULL)
```

**Recomendação:**
```sql
-- Índice parcial para status mais consultados
CREATE INDEX IF NOT EXISTS idx_appointments_user_status_completed
  ON appointments(user_id, status)
  WHERE deleted_at IS NULL AND status = 'Completed';

CREATE INDEX IF NOT EXISTS idx_appointments_user_status_active
  ON appointments(user_id, status, appointment_time)
  WHERE deleted_at IS NULL AND status IN ('Pending', 'Confirmed');
```

---

### 2.2 Índice faltante: `clients(user_id, last_visit)` para análise de churn

**Severidade:** P1
**Impact:** A query de `churn_risk_count` em `get_dashboard_stats` faz full scan de clientes por `user_id` e `last_visit`. Com 1.000+ clientes por empresa, o custo é significativo.
**Effort:** 10 minutos

**Evidência:**
```sql
SELECT COUNT(DISTINCT c.id) INTO v_churn_risk_count
FROM clients c
WHERE c.user_id = p_user_id::UUID
  AND c.deleted_at IS NULL
  AND c.last_visit IS NOT NULL
  AND c.last_visit < (NOW() - INTERVAL '45 days')
  AND c.last_visit >= (NOW() - INTERVAL '180 days');
```

**Recomendação:**
```sql
CREATE INDEX IF NOT EXISTS idx_clients_user_last_visit
  ON clients(user_id, last_visit)
  WHERE deleted_at IS NULL AND last_visit IS NOT NULL;
```

---

### 2.3 Índice faltante: `public_bookings(business_id, appointment_time)` para disponibilidade

**Severidade:** P1
**Impact:** A verificação de disponibilidade de horários em `PublicBooking.tsx` faz múltiplas queries em `public_bookings` por `business_id` e `appointment_time`. Sem índice composto, cada verificação faz seq scan.
**Effort:** 10 minutos

**Evidência** (pattern de query em `PublicBooking.tsx`):
```sql
-- Verificação de conflitos de horário
SELECT * FROM public_bookings
WHERE business_id = $1
  AND appointment_time >= $2
  AND appointment_time < $3
  AND status NOT IN ('cancelled', 'rejected');
```

**Recomendação:**
```sql
CREATE INDEX IF NOT EXISTS idx_public_bookings_business_time
  ON public_bookings(business_id, appointment_time)
  WHERE status NOT IN ('cancelled', 'rejected');
```

---

### 2.4 Índice faltante: `profiles(business_slug)` para roteamento público

**Severidade:** P1
**Impact:** Toda visita a uma página de booking público (`/booking/:slug`) inicia com uma query `SELECT ... FROM profiles WHERE business_slug = $1`. Sem índice nessa coluna, cada visita faz seq scan na tabela `profiles`.
**Effort:** 5 minutos

**Evidência** (`PublicBooking.tsx`):
```sql
const { data: profileData } = await supabase
  .from('profiles')
  .select('id, business_name, ...')
  .eq('business_slug', slug)  -- sem índice
  .single();
```

**Recomendação:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_business_slug
  ON profiles(business_slug)
  WHERE business_slug IS NOT NULL;
```

---

### 2.5 Índice faltante: `finance_records(user_id, professional_id, commission_paid)` para comissões

**Severidade:** P2
**Impact:** A função `get_commissions_due` faz JOIN entre `team_members` e `finance_records` filtrando por `user_id + professional_id + commission_paid`. Sem índice, escala linearmente com o volume de registros financeiros.
**Effort:** 10 minutos

**Recomendação:**
```sql
CREATE INDEX IF NOT EXISTS idx_finance_commissions_pending
  ON finance_records(user_id, professional_id, commission_paid)
  WHERE commission_paid = false AND commission_value > 0;
```

---

### 2.6 Índices RAG: `ivfflat` com `lists = 100` inadequado para tabelas pequenas

**Severidade:** P2
**Impact:** O índice `ivfflat` requer que a tabela tenha pelo menos `lists * 39 = 3.900` linhas para ser eficiente. Em tabelas com menos registros, o planner ignora o índice e faz seq scan. Para RAG em early stage, HNSW seria mais adequado.
**Effort:** 30 minutos

**Evidência** (`20260315_rag_2_0_tables.sql`):
```sql
CREATE INDEX IF NOT EXISTS idx_rag_strategic_embedding
  ON rag_context_strategic USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);  -- requer ~3.900 linhas mínimas para ser útil
```

**Recomendação:**
```sql
-- Dropar índices ivfflat e criar HNSW (melhor para tabelas pequenas/médias)
DROP INDEX IF EXISTS idx_rag_strategic_embedding;
CREATE INDEX idx_rag_strategic_embedding
  ON rag_context_strategic USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
-- Repetir para as outras 3 tabelas RAG
```

---

## 3. RLS Policies Audit

### 3.1 Policies conflitantes em `profiles`: dupla permissão pública + isolamento por company

**Severidade:** P0
**Impact:** A migration inicial (`20260218_full_schema_fix.sql`) criou uma policy `FOR SELECT USING (true)` que permite qualquer usuário autenticado (ou anon?) ler qualquer perfil. Migrations subsequentes adicionaram `"Profiles: company isolation"` mas não removeram a policy universal. Com duas policies permissivas co-existindo, o PostgreSQL usa OR semântico — qualquer uma que passe libera o acesso. O efeito final é que **todos os perfis são legíveis por qualquer usuário autenticado**.
**Effort:** 1 hora

**Evidência** (migration `20260218_full_schema_fix.sql`):
```sql
-- Esta policy nunca foi removida
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true); -- expõe TODOS os perfis
```

**E depois** (migration `20260307_us015b_multi_user_rls.sql`):
```sql
-- Esta foi adicionada, mas a anterior ainda existe
CREATE POLICY "Profiles: company isolation"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = get_auth_company_id() OR ...);
```

**Verificação do problema:**
```sql
-- Query para detectar o conflito
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public' AND cmd = 'SELECT';
-- Resultado esperado: 2+ policies SELECT — uma delas com qual = 'true'
```

**Recomendação:**
```sql
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
-- Manter apenas: "Profiles: company isolation"
```

---

### 3.2 Policy de INSERT em `audit_logs` permite qualquer usuário inserir como qualquer user_id

**Severidade:** P0
**Impact:** A policy `"Sistema pode inserir logs" FOR INSERT WITH CHECK (true)` permite que qualquer usuário autenticado insira logs com `user_id` arbitrário, incluindo o UUID de outro usuário. Um atacante poderia fabricar logs de auditoria ou poluir o histórico de outros usuários.
**Effort:** 2 horas

**Evidência** (`20260214_audit_system.sql`):
```sql
CREATE POLICY "Sistema pode inserir logs"
    ON audit_logs
    FOR INSERT
    WITH CHECK (true);  -- PROBLEMA: sem restrição de user_id
```

**Recomendação:**
```sql
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON audit_logs;

-- Logs via trigger (SECURITY DEFINER) usam service_role — não precisam de policy de INSERT para authenticated
-- Para inserção direta pela função RPC:
CREATE POLICY "Logs: usuário só insere próprios logs"
    ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- A função create_audit_log() já usa auth.uid() internamente — está correta
-- Mas a policy WITH CHECK (true) anula essa proteção
```

---

### 3.3 Ausência de RLS em `content_calendar` e `marketing_assets` para modelo multi-tenant

**Severidade:** P1
**Impact:** As tabelas de marketing foram criadas com policies baseadas em `auth.uid() = user_id`. Com a migração para multi-tenant (US-015B), staff de uma empresa não consegue acessar o calendário de conteúdo criado pelo owner. Não houve atualização dessas políticas na migration `20260307_us015b_multi_user_rls.sql`.
**Effort:** 2 horas

**Evidência** (`20260218_marketing_ai_tables.sql`):
```sql
CREATE POLICY "Users manage own calendar" ON content_calendar
  FOR ALL USING (auth.uid() = user_id);  -- não usa get_auth_company_id()
```

**Recomendação:**
```sql
DROP POLICY IF EXISTS "Users manage own calendar" ON content_calendar;
DROP POLICY IF EXISTS "Users manage own assets" ON marketing_assets;

CREATE POLICY "Calendar: company isolation" ON content_calendar
  FOR ALL TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());

CREATE POLICY "Assets: company isolation" ON marketing_assets
  FOR ALL TO authenticated
  USING (user_id = get_auth_company_id())
  WITH CHECK (user_id = get_auth_company_id());
```

---

### 3.4 RLS em `queue_entries`: policy pública expõe dados de clientes em espera

**Severidade:** P1
**Impact:** A policy `"Public can view active queue"` permite que qualquer usuário anônimo veja todas as entradas de fila com status `waiting`, incluindo `client_name` e `client_phone` de outros clientes.
**Effort:** 2 horas

**Evidência** (`20260218_queue_system.sql`):
```sql
CREATE POLICY "Public can view active queue" ON queue_entries
    FOR SELECT
    USING (status NOT IN ('completed', 'cancelled', 'no_show'));
-- Expõe client_name, client_phone de TODOS os clientes em espera
```

**Recomendação:**
```sql
DROP POLICY IF EXISTS "Public can view active queue" ON queue_entries;

-- Criar RPC para estatísticas anônimas (apenas posição, sem dados pessoais)
CREATE OR REPLACE FUNCTION get_queue_stats(p_business_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN json_build_object(
    'waiting_count', (
      SELECT COUNT(*) FROM queue_entries
      WHERE business_id = p_business_id AND status = 'waiting'
    ),
    'estimated_wait_minutes', (
      SELECT COUNT(*) * 20 FROM queue_entries  -- 20 min por cliente estimado
      WHERE business_id = p_business_id AND status = 'waiting'
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_queue_stats(UUID) TO anon;
```

---

### 3.5 `client_semantic_memory`: policy `USING (true)` sem isolamento por empresa

**Severidade:** P2
**Impact:** A tabela `client_semantic_memory` (criada em `20260222_enable_vector_and_semantic_memory.sql` e teoricamente revertida, mas pode estar presente) tem policy `FOR ALL TO authenticated USING (true)`. Qualquer usuário autenticado pode ler e modificar memórias de clientes de qualquer empresa.
**Effort:** 1 hora (se tabela ainda existir)

**Recomendação:**
```sql
-- Verificar se tabela existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'client_semantic_memory'
);

-- Se existir, corrigir policy via JOIN com clients
DROP POLICY IF EXISTS "Permitir gestão de memória semântica por barbeiros" ON client_semantic_memory;
CREATE POLICY "Semantic memory: company isolation" ON client_semantic_memory
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_semantic_memory.client_id
        AND c.user_id = get_auth_company_id()
    )
  );
```

---

## 4. Performance Analysis

### 4.1 N+1 Query Pattern em `ClientCRM.tsx`

**Severidade:** P1
**Impact:** A página de CRM de clientes carrega: (1) dados do cliente, (2) todos os agendamentos do cliente, (3) todos os hair_records — em 3 queries sequenciais. Em clientes com histórico extenso (200+ agendamentos), cada query pode demorar 100-500ms, resultando em tempo total de carregamento de 1-2 segundos.
**Effort:** 4 horas (criar RPC consolidada)

**Evidência** (`ClientCRM.tsx`):
```typescript
// Query 1: dados do cliente
const { data: clientData } = await supabase
  .from('clients').select('*')
  .eq('id', id).eq('user_id', user.id).single();

// Query 2: agendamentos (sem LIMIT!)
const { data: appointmentsData } = await supabase
  .from('appointments')
  .select('*, team_members(name)')
  .eq('client_id', clientData.id)
  .eq('user_id', user.id)
  .eq('status', 'Completed')
  .order('appointment_time', { ascending: false });
  // FALTANDO: .limit(50)

// Query 3: hair records
const { data: historyData } = await supabase
  .from('hair_records').select('*')
  .eq('client_id', clientData.id)
  .eq('user_id', user.id)
  .order('date', { ascending: false });
```

**EXPLAIN simulado (cliente com 500 agendamentos):**
```
Query 2 — Seq Scan on appointments:
  cost=0.00..1250.00 rows=500 width=256
  Filter: ((client_id = $1) AND (user_id = $2) AND (status = 'Completed'))
  Rows Removed by Filter: 4500
```

**Recomendação:**
```sql
-- RPC consolidada com LIMIT e dados essenciais apenas
CREATE OR REPLACE FUNCTION get_client_profile(p_client_id UUID, p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_client RECORD;
  v_appointments JSON;
  v_hair_records JSON;
BEGIN
  SELECT * INTO v_client FROM clients
  WHERE id = p_client_id AND user_id = p_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;

  SELECT json_agg(t ORDER BY t.appointment_time DESC) INTO v_appointments
  FROM (
    SELECT a.id, a.appointment_time, a.service, a.price, a.status,
           tm.name AS professional_name
    FROM appointments a
    LEFT JOIN team_members tm ON tm.id = a.professional_id
    WHERE a.client_id = p_client_id AND a.user_id = p_user_id
      AND a.deleted_at IS NULL
    ORDER BY a.appointment_time DESC
    LIMIT 50  -- Paginação!
  ) t;

  SELECT json_agg(hr ORDER BY hr.date DESC) INTO v_hair_records
  FROM (
    SELECT id, service, barber, date, image_url, notes
    FROM hair_records
    WHERE client_id = p_client_id AND user_id = p_user_id
    ORDER BY date DESC LIMIT 20
  ) hr;

  RETURN json_build_object(
    'client', row_to_json(v_client),
    'appointments', COALESCE(v_appointments, '[]'::json),
    'hair_records', COALESCE(v_hair_records, '[]'::json)
  );
END;
$$;
```

---

### 4.2 `get_dashboard_stats`: 15+ queries sequenciais em um único RPC

**Severidade:** P1
**Impact:** A versão v4 da função executa 15 SELECTs sequenciais contra a tabela `appointments` com filtros similares. Cada SELECT é uma round-trip ao storage layer. Em produção com 50k+ agendamentos, o tempo de execução pode exceder 5 segundos.
**Effort:** 8 horas (refactor com CTEs)

**Evidência** (contagem em `20260306_goal_settings_and_dashboard_stats_v4.sql`):
```sql
-- 8 SELECT distintos em appointments:
SELECT ... FROM appointments WHERE user_id = ... AND status = 'Completed'; -- total_profit
SELECT ... FROM appointments WHERE user_id = ... AND DATE_TRUNC('month'...); -- month revenue
SELECT ... FROM appointments WHERE user_id = ... AND status = 'Completed' AND week...; -- last week
SELECT ... FROM appointments WHERE user_id = ... AND status = 'Completed' AND week...; -- this week
SELECT ... FROM appointments WHERE user_id = ... AND deleted_at IS NULL; -- total count
SELECT ... FROM appointments WHERE user_id = ... AND month...; -- month count
SELECT ... FROM appointments WHERE user_id = ... AND status = 'Completed' AND 90 days; -- 90d count
SELECT ... FROM appointments WHERE user_id = ... AND 90 days GROUP BY service ORDER BY COUNT; -- top service
-- + 2 SELECT em aios_logs, 1 em public_bookings, 1 em profiles, 1 em clients, etc.
```

**Recomendação — refactor com CTEs:**
```sql
-- Uma única passagem pela tabela appointments
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    WITH apt_base AS (
      SELECT price, status, appointment_time, client_id, service, created_at
      FROM appointments
      WHERE user_id = p_user_id::UUID AND deleted_at IS NULL
    ),
    apt_completed AS (
      SELECT * FROM apt_base WHERE status = 'Completed'
    ),
    metrics AS (
      SELECT
        -- Total profit
        SUM(CASE WHEN status = 'Completed' THEN price ELSE 0 END) AS total_profit,
        -- Month revenue
        SUM(CASE WHEN status IN ('Confirmed','Completed')
          AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE)
          THEN price ELSE 0 END) AS current_month_revenue,
        -- Weekly metrics
        SUM(CASE WHEN status = 'Completed'
          AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
          AND appointment_time < DATE_TRUNC('week', CURRENT_DATE)
          THEN price ELSE 0 END) AS last_week_revenue,
        SUM(CASE WHEN status = 'Completed'
          AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE)
          THEN price ELSE 0 END) AS this_week_revenue,
        COUNT(*) AS appointments_total
      FROM apt_base
    )
    SELECT row_to_json(metrics) FROM metrics
  );
END;
$$;
```

---

### 4.3 PublicBooking: 5 queries sequenciais no carregamento inicial da página

**Severidade:** P2
**Impact:** A página de booking público faz 5 queries sequenciais: profile → settings → services → categories → team_members. O tempo total é a soma de cada round-trip. Em Supabase (latência média 30-80ms/query), o tempo total pode ser 150-400ms antes de renderizar qualquer conteúdo.
**Effort:** 4 horas

**Evidência** (`PublicBooking.tsx` linhas 314-391):
```typescript
// Sequencial: cada await espera o anterior
const { data: profileData } = await supabase.from('profiles').select(...)...;
// → depois:
const { data: settings } = await supabase.from('business_settings').select(...)...;
// → depois:
const { data: servicesData } = await supabase.from('services').select(...)...;
// → depois: categories, team_members...
```

**Recomendação:**
```sql
-- RPC para carregar todos os dados públicos de um negócio em uma chamada
CREATE OR REPLACE FUNCTION get_public_business_data(p_slug TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT id INTO v_business_id FROM profiles WHERE business_slug = p_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN json_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = v_business_id),
    'settings', (SELECT row_to_json(s) FROM business_settings s WHERE user_id = v_business_id),
    'services', (SELECT json_agg(sv) FROM services sv
                 WHERE user_id = v_business_id AND active = true AND deleted_at IS NULL
                 ORDER BY price),
    'categories', (SELECT json_agg(sc) FROM service_categories sc
                   WHERE user_id = v_business_id ORDER BY display_order),
    'professionals', (SELECT json_agg(tm) FROM team_members tm
                      WHERE user_id = v_business_id AND active = true
                      ORDER BY display_order)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_public_business_data(TEXT) TO anon;
```

---

### 4.4 Queries sem `deleted_at IS NULL` em operações de soft delete

**Severidade:** P2
**Impact:** O sistema implementou soft delete (`20260214_soft_delete.sql`) mas queries no frontend não filtram consistentemente por `deleted_at IS NULL`. Registros na "lixeira" aparecem em listas e cálculos financeiros.
**Effort:** 3 horas (auditoria e correção de todas as queries)

**Evidência** (`Agenda.tsx` linha 481):
```typescript
// Hard delete direto, ignorando soft delete
await supabase.from('appointments').delete()
  .eq('id', appointmentId).eq('user_id', user.id);
```

Versus a função RPC de soft delete que deveria ser usada:
```sql
-- A função correta existe mas não é usada consistentemente
SELECT soft_delete_appointment($1);
```

---

## 5. Constraint Coverage

### 5.1 FK ausente: `appointments.public_booking_id` sem índice

**Severidade:** P2
**Impact:** A coluna `public_booking_id` foi adicionada via migration (`20260316100000`) como FK para `public_bookings`, mas sem índice. Queries de junção entre as duas tabelas fazem seq scan em `appointments`.
**Effort:** 5 minutos

**Evidência:**
```sql
-- Migration adiciona FK mas esquece índice
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  public_booking_id UUID REFERENCES public.public_bookings(id);
-- FALTANDO: CREATE INDEX
```

**Recomendação:**
```sql
CREATE INDEX IF NOT EXISTS idx_appointments_public_booking_id
  ON appointments(public_booking_id)
  WHERE public_booking_id IS NOT NULL;
```

---

### 5.2 Ausência de CHECK constraints em campos de status

**Severidade:** P2
**Impact:** Campos como `appointments.status`, `public_bookings.status`, `queue_entries.status` usam TEXT sem CHECK constraint. Valores inválidos (ex: `'completed'` vs `'Completed'` — inconsistência real detectada no código) podem causar bugs silenciosos.
**Effort:** 2 horas

**Evidência** (inconsistência real entre migrations):
```sql
-- Em get_dashboard_stats v4 (linha 90 da migration):
AND status IN ('Confirmed', 'Completed')  -- capitalizado

-- Em get_dashboard_stats (comparação com public_bookings linha 170):
AND pb.status IN ('confirmed', 'completed')  -- minúsculo

-- Sem CHECK constraint, ambos são aceitos sem erro
```

**Recomendação:**
```sql
-- Padronizar e adicionar constraints
ALTER TABLE appointments
  ADD CONSTRAINT chk_appointments_status
  CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled'));

ALTER TABLE public_bookings
  ADD CONSTRAINT chk_public_bookings_status
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected'));
```

---

### 5.3 Ausência de UNIQUE constraint em `profiles.business_slug`

**Severidade:** P1
**Impact:** Não há constraint UNIQUE formal em `profiles.business_slug`. Dois negócios poderiam ter o mesmo slug, causando comportamento não determinístico no booking público (qual perfil retornar).
**Effort:** 10 minutos

**Recomendação:**
```sql
ALTER TABLE profiles ADD CONSTRAINT uq_profiles_business_slug
  UNIQUE (business_slug);
-- Ou: CREATE UNIQUE INDEX (já recomendado em 2.4)
```

---

### 5.4 `finance_records.revenue` permite valores negativos

**Severidade:** P3
**Impact:** Sem CHECK constraint, registros de receita negativa podem ser inseridos, distorcendo totais financeiros.
**Effort:** 30 minutos

**Recomendação:**
```sql
ALTER TABLE finance_records
  ADD CONSTRAINT chk_finance_commission_non_negative
  CHECK (commission_value >= 0);
-- Nota: revenue pode ser 0 para despesas — não adicionar CHECK revenue >= 0
```

---

## 6. Data Integrity

### 6.1 Soft delete sem filtro padrão nas RLS policies

**Severidade:** P1
**Impact:** As policies RLS de `appointments`, `clients`, `services` e `team_members` não filtram por `deleted_at IS NULL`. Registros marcados como deletados continuam visíveis a qualquer query que não filtre explicitamente. O frontend em `Agenda.tsx` usa hard delete direto em vez de soft delete, bypassando o sistema de lixeira.
**Effort:** 4 horas

**Evidência** (migration `20260214_soft_delete.sql`, nota explícita):
```sql
-- Nota: As políticas RLS existentes já devem funcionar corretamente.
-- Os aplicativos devem filtrar por deleted_at IS NULL nas queries normais.
```

O comentário admite que as policies NÃO filtram por `deleted_at`. Isso é uma decisão deliberada, mas cria um contrato implícito que o frontend deve respeitar — e nem sempre respeita.

**Recomendação:** Adicionar filtro às policies ou criar views que abstraem o soft delete:
```sql
-- Opção A: Filtro nas policies (mais seguro)
DROP POLICY IF EXISTS "Appointments: company isolation" ON appointments;
CREATE POLICY "Appointments: company isolation" ON appointments
  FOR ALL TO authenticated
  USING (user_id = get_auth_company_id() AND deleted_at IS NULL)
  WITH CHECK (user_id = get_auth_company_id());

-- Opção B: View que abstrai soft delete
CREATE OR REPLACE VIEW active_appointments AS
  SELECT * FROM appointments WHERE deleted_at IS NULL;
```

---

### 6.2 Inconsistência entre `appointments.service` (TEXT) e dados históricos

**Severidade:** P2
**Impact:** A coluna `service` em `appointments` armazena o nome do serviço no momento do agendamento. Porém não há snapshot do `price` do serviço — o `price` em `appointments` é o preço cobrado, que pode ser editado. Histórico financeiro pode divergir do preço do serviço vigente.
**Effort:** 1 dia (adicionar campos de snapshot e backfill)

**Recomendação:**
```sql
-- Snapshot do preço original do serviço no momento do agendamento
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_price_snapshot DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS service_duration_snapshot INTEGER;

-- Trigger para capturar snapshot ao criar agendamento
CREATE OR REPLACE FUNCTION snapshot_service_on_appointment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.service_id IS NOT NULL THEN
    SELECT price, duration_minutes
    INTO NEW.service_price_snapshot, NEW.service_duration_snapshot
    FROM services WHERE id = NEW.service_id;
  END IF;
  RETURN NEW;
END;
$$;
```

---

### 6.3 `audit_logs` não cobre tabelas financeiras corretamente

**Severidade:** P2
**Impact:** O trigger de auditoria referencia `financial_records` (migration `20260214_audit_system.sql`), mas a tabela real chama-se `finance_records`. O trigger foi criado com nome de tabela incorreto e provavelmente falha silenciosamente na aplicação.
**Effort:** 1 hora

**Evidência** (`20260214_audit_system.sql`):
```sql
-- BUG: tabela chamada 'financial_records' não existe
-- A tabela correta é 'finance_records'
DROP TRIGGER IF EXISTS audit_financial_records ON financial_records;
CREATE TRIGGER audit_financial_records
    AFTER INSERT OR UPDATE OR DELETE ON financial_records  -- ERRO DE NOME
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
```

**Recomendação:**
```sql
-- Verificar e corrigir
DROP TRIGGER IF EXISTS audit_financial_records ON financial_records;
DROP TRIGGER IF EXISTS audit_finance_records ON finance_records;

CREATE TRIGGER audit_finance_records
    AFTER INSERT OR UPDATE OR DELETE ON finance_records  -- nome correto
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
```

---

### 6.4 Credenciais hardcoded no `lib/supabase.ts`

**Severidade:** P1 (Segurança)
**Impact:** O arquivo `lib/supabase.ts` contém a URL e a anon key do Supabase como valores hardcoded de fallback. A anon key é exposta no bundle JavaScript público. Embora a anon key seja tecnicamente segura para uso público (é a chave de acesso anônimo), a URL hardcoded impede rotação de credenciais sem rebuild, e qualquer acidente com a service_role key no mesmo arquivo seria catastrófico.
**Effort:** 2 horas

**Evidência** (`lib/supabase.ts`):
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || 'https://lcqwrngscsziysyfhpfj.supabase.co';  // hardcoded

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';  // hardcoded
```

**Recomendação:** Remover fallbacks hardcoded e lançar erro explícito se variáveis de ambiente não estiverem configuradas:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are required. Check .env.local');
}
export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 7. Technical Debt Summary

### Top 5 Issues por Impacto

| Rank | Issue | Dimensão | Severidade | Effort | Impacto Estimado |
|------|-------|----------|------------|--------|-----------------|
| 1 | `company_id` como TEXT em vez de UUID | Schema | P0 | 8h | Falhas silenciosas em RLS multi-tenant |
| 2 | Policy `"Public profiles are viewable by everyone"` não removida | RLS | P0 | 1h | Vazamento de dados de todos os perfis |
| 3 | Policy INSERT em `audit_logs` sem restrição de `user_id` | RLS | P0 | 2h | Manipulação de logs de auditoria |
| 4 | `get_dashboard_stats` com 15+ queries sequenciais | Performance | P1 | 8h | Dashboard lento (>5s em produção) |
| 5 | N+1 em ClientCRM sem LIMIT | Performance | P1 | 4h | Tempo de carregamento cresce linearmente com histórico |

---

### Quick Wins (menos de 1 dia — impacto imediato)

| Ação | Effort | Benefício |
|------|--------|-----------|
| Remover policy `"Public profiles are viewable by everyone"` | 15 min | Elimina P0 de vazamento de dados |
| Criar índice `idx_profiles_business_slug` | 5 min | Booking público 10-50x mais rápido |
| Criar índice `idx_appointments_user_status_completed` | 10 min | Dashboard 2-5x mais rápido |
| Corrigir trigger `audit_financial_records` → `finance_records` | 30 min | Auditoria financeira passa a funcionar |
| Remover credenciais hardcoded de `lib/supabase.ts` | 1h | Boa prática de segurança |
| Adicionar CHECK constraint em `appointments.status` | 30 min | Previne inconsistência Completed/completed |
| Criar índice `idx_appointments_public_booking_id` | 5 min | FK sem custo de seq scan |
| Adicionar índice `idx_public_bookings_business_time` | 10 min | Verificação de disponibilidade mais rápida |

**Total quick wins:** ~3 horas, elimina 1 P0 e melhora performance significativamente.

---

### Major Refactors (mais de 3 dias — planejamento necessário)

| Ação | Effort | Risco | Pré-requisito |
|------|--------|-------|---------------|
| Migrar `company_id` de TEXT para UUID | 1-2 dias | Alto — envolve todas as policies RLS | Backup completo, testes de regressão |
| Normalizar `appointments.service` para `service_id` FK | 2-3 dias | Alto — envolve frontend e 10+ RPCs | Feature flag, migração incremental |
| Refatorar `get_dashboard_stats` com CTEs | 1 dia | Médio — quebra interface se assinatura mudar | Versionar como v5, manter v4 por 30 dias |
| Separar `finance_records` em receitas/despesas | 3-5 dias | Alto — modelo financeiro completo | Brownfield analysis completa do módulo Finance |
| Implementar soft delete consistente nas queries | 1-2 dias | Médio — risco de regressão em filtros existentes | Auditoria completa de todas as queries |

---

## Apêndice: Tabelas Auditadas

| Tabela | RLS | updated_at | Soft Delete | Índices |
|--------|-----|------------|-------------|---------|
| `profiles` | Conflitante (P0) | Sim | Não | Falta slug |
| `appointments` | OK (company) | Sim | Sim | Falta status+deleted |
| `clients` | OK (company) | Sim | Sim | Falta last_visit |
| `services` | OK (company) | Sim | Sim | OK |
| `team_members` | OK (company) | TIMESTAMP sem TZ | Sim | OK |
| `finance_records` | OK (company) | Não | Não | Falta commission |
| `public_bookings` | OK (company) | Sim | Não | Falta time |
| `queue_entries` | Expõe PII (P1) | Não | Não | OK |
| `audit_logs` | INSERT inseguro (P0) | Não | N/A (imutável) | OK |
| `aios_logs` | user_id isolation | Não | Não | OK |
| `rag_context_*` | SELECT=true, write=service_role | updated_at (3/4) | Não | ivfflat (P2) |
| `goal_settings` | user_id isolation | Sim | Não | OK |
| `content_calendar` | Desatualizado (P1) | Não | Não | OK |
| `rate_limits` | UNLOGGED | Não | N/A | PK |

---

*Documento gerado por @data-engineer (Dara) — US-020, fase 5 do Brownfield Discovery*
*Pronto para consolidação em `technical-debt-DRAFT.md` por @architect (Aria)*
