# Technical Debt Draft — Beauty OS / AgenX AIOX

**Documento:** technical-debt-DRAFT.md
**Criado em:** 14 Mar 2026
**Fase:** 4.4 (Technical Debt Consolidation)
**Agent:** @architect (Aria)
**Status:** DRAFT — Aguardando revisão US-020 (DB), US-021 (UX), US-022 (QA Gate)

**Fontes canônicas:**
- `docs/architecture/system-architecture.md` (US-016 — @architect)
- `docs/architecture/SCHEMA.md` (US-017a — @data-engineer)
- `docs/architecture/DB-AUDIT.md` (US-017b — @data-engineer)
- `docs/architecture/frontend-spec.md` (US-018 — @ux-design-expert)

---

## Índice

1. [Executive Summary](#1-executive-summary)
2. [P0 Issues — CRITICAL](#2-p0-issues--critical)
3. [P1 Issues — HIGH](#3-p1-issues--high)
4. [P2 Issues — MEDIUM](#4-p2-issues--medium)
5. [P3 Issues — LOW](#5-p3-issues--low)
6. [Roadmap 12 Semanas](#6-roadmap-12-semanas)
7. [Health Metrics](#7-health-metrics)
8. [Dependencies e Blockers](#8-dependencies-e-blockers)

---

## 1. Executive Summary

### Visão Geral do Sistema

Beauty OS / AgenX AIOX é uma plataforma SaaS para gestão de salões e barbearias. Construída sobre React 19 + TypeScript 5.8 + Vite 6 no frontend e Supabase (PostgreSQL 15+) no backend, a aplicação implementa multi-tenancy via Row Level Security (RLS), autenticação via Supabase Auth, e funcionalidades de IA via Google Gemini API.

O sistema está funcional em produção com:
- 20+ páginas lazy-loaded
- 50+ componentes reutilizáveis
- 27 tabelas (19 core + 8 audit/system)
- 41+ RPC functions (SECURITY DEFINER)
- 6 storage buckets
- pgvector para busca semântica (768 dimensões)
- 64 migrations aplicadas

### Score Geral de Saúde

```
Score Composto: 68/100

Dimensões:
├── Segurança:        72/100  ⚠️  (1 bug crítico ativo: RLS client_semantic_memory)
├── Performance:      65/100  ⚠️  (bundle size, N+1 queries, 5 índices faltando)
├── Qualidade Código: 70/100  ⚠️  (cobertura de testes < 50%, tipos any)
├── Acessibilidade:   65/100  ⚠️  (WCAG AA gaps: contraste, ARIA, keyboard nav)
├── Manutenibilidade: 68/100  ⚠️  (código duplicado, acoplamento Supabase)
└── Resiliência:      70/100  ⚠️  (sem error boundary em todas páginas, Stripe incompleto)
```

### Distribuição de Issues

| Prioridade | Count | Esforço Total Estimado |
|------------|-------|------------------------|
| P0 — Critical | 4 | ~12h |
| P1 — High | 8 | ~36h |
| P2 — Medium | 9 | ~28h |
| P3 — Low | 7 | ~16h |
| **TOTAL** | **28** | **~92h** |

### Quick Wins (< 1 dia de esforço)

Os seguintes itens oferecem alto impacto com baixo esforço e devem ser priorizados:

1. **RLS client_semantic_memory** — 30 min, elimina security gap crítico
2. **5 missing indexes** — 1h, melhora 20-30% das queries de filtro
3. **Alt text em imagens** — 2h, melhora acessibilidade e SEO
4. **ARIA labels em formulários** — 2h, melhora WCAG compliance
5. **Remover `any` types óbvios** — 2h, melhora type safety

### Situação das Integrações

| Integração | Status | Débito |
|-----------|--------|--------|
| Supabase Auth | ✅ Funcional | Nenhum |
| Supabase DB + RLS | ⚠️ 1 bug crítico | Fix RLS (P0) |
| Supabase Storage | ✅ Funcional | Validação de tipo (P2) |
| Google Gemini | ⚠️ API key exposta | Confirmar domain restriction (P1) |
| Stripe | ❌ Incompleto | Finalizar integração (P1) |
| Vercel | ✅ Funcional | Nenhum |

### Decisões Arquiteturais com Impacto em Dívida

**ADR-001 (Supabase Auth vs Clerk):** Decisão correta — nenhuma dívida gerada.
**ADR-002 (HashRouter):** Trade-off deliberado — não é dívida, é feature.
**ADR-003 (Direct Supabase calls):** Gera acoplamento e dificulta testes. Maior fonte de dívida de manutenibilidade.

---

## 2. P0 Issues — CRITICAL

> Issues P0 devem ser resolvidas ANTES de qualquer novo deploy em produção.
> Fonte: DB-AUDIT.md (seção 1, 8) + system-architecture.md (seção 10)

---

### P0-001: RLS Bug em `client_semantic_memory`

**Categoria:** Segurança — Multi-Tenant Isolation
**Fonte:** `DB-AUDIT.md` → Seção 1 (RLS Policy Completeness)

**Descrição:**
A tabela `client_semantic_memory` não possui filtro de `user_id` na sua política RLS. A policy atual usa `FOR ALL USING (true)` ou equivalente sem cláusula de isolamento, permitindo que qualquer usuário autenticado leia memórias semânticas de clientes de outros negócios.

**Impacto:**
- Qualquer usuário autenticado pode consultar memórias de clientes de outros tenants
- Expõe dados sensíveis de comportamento e preferências de clientes
- Viola a promessa core de multi-tenant isolation do sistema
- Afeta 100% dos registros da tabela `client_semantic_memory`
- Risco GDPR/LGPD: dados pessoais expostos cross-tenant

**Evidência:**
```sql
-- SCHEMA.md linha 461: "RLS: ALL for authenticated (todo: filter by user_id)"
-- DB-AUDIT.md linha 58: "client_semantic_memory — NO FILTER (BUG!)"
```

**Fix:**
```sql
-- Remover policy existente permissiva
DROP POLICY IF EXISTS "Allow authenticated" ON client_semantic_memory;

-- Criar policy correta com isolamento por user_id via client_id
CREATE POLICY "User isolation on client_semantic_memory"
ON client_semantic_memory
FOR ALL
USING (
  EXISTS(
    SELECT 1 FROM clients c
    WHERE c.id = client_id
      AND c.user_id = auth.uid()
  )
);
```

**Esforço:** 30 minutos
**Arquivos:** `supabase/migrations/[next].sql`
**Bloqueador para:** Nenhum (fix standalone)
**Urgência:** IMEDIATA — não aguardar próximo sprint

---

### P0-002: Ausência de Error Boundaries em Páginas Críticas

**Categoria:** Resiliência — Frontend
**Fonte:** `frontend-spec.md` → Seção 2 (Component Architecture) + `system-architecture.md` → Seção 10

**Descrição:**
Páginas críticas como Finance.tsx, Agenda.tsx, Dashboard.tsx não possuem Error Boundaries individuais. Um erro não tratado em qualquer um desses componentes derruba toda a aplicação (React 19 propaga erros para o root sem captura). O componente `ErrorBoundary.tsx` existe mas não está aplicado por página.

**Impacto:**
- Um erro de runtime em Finance derruba Dashboard e Agenda para o mesmo usuário
- Usuários perdem contexto de navegação em crash
- Sem degradação graceful: tudo cai ou tudo funciona
- Afeta 100% dos usuários quando qualquer página crítica falha
- Frustra UX e pode causar churn em produção

**Evidência:**
```
frontend-spec.md → "ErrorBoundary.tsx — error fallback" existe mas uso não sistematizado
system-architecture.md → Seção 10: "Error handling in critical paths (TBD in Phase 4.2)"
```

**Fix:**
```tsx
// Envolver cada lazy-loaded page com ErrorBoundary + Suspense
<ErrorBoundary fallback={<PageErrorFallback pageName="Finance" />}>
  <Suspense fallback={<LoadingSpinner />}>
    <Finance />
  </Suspense>
</ErrorBoundary>
```

**Esforço:** 4 horas (aplicar em todas as 20+ páginas + criar PageErrorFallback)
**Arquivos:** `App.tsx`, `components/ErrorBoundary.tsx`, novo `components/PageErrorFallback.tsx`
**Bloqueador para:** P1-005 (Melhorar error handling)

---

### P0-003: Stripe Integration Incompleta em Produção

**Categoria:** Funcionalidade Core — Pagamentos
**Fonte:** `system-architecture.md` → Seção 3 (Integration Points — Stripe)

**Descrição:**
A integração com Stripe está declarada como "not yet fully integrated in codebase" e "likely in pages/settings/Subscriptions.tsx (in progress)". Em produção, isso significa que a coleta e gestão de pagamentos de subscription do SaaS está potencialmente não funcional ou incompleta, impedindo monetização real do produto.

**Impacto:**
- Impossibilidade de cobrar subscriptions via Stripe (funcionalidade core do SaaS)
- Risco de receber usuários sem capacidade de cobrar
- Sem webhooks de Stripe configurados: cancelamentos não processados
- Afeta 100% do revenue stream da plataforma
- Bloqueador para crescimento comercial

**Evidência:**
```
system-architecture.md linha 310: "Not yet fully integrated in codebase"
system-architecture.md linha 311: "Likely in pages/settings/Subscriptions.tsx (in progress)"
```

**Ações requeridas:**
1. Auditar estado atual de `pages/settings/Subscriptions.tsx`
2. Verificar se Stripe webhook handler existe
3. Confirmar se checkout flow está operacional
4. Validar que planos de subscription estão criados no Stripe dashboard

**Esforço:** 8–16 horas (depende do estado atual — requer auditoria)
**Arquivos:** `pages/settings/Subscriptions.tsx`, `lib/stripe.ts` (criar se não existe)
**Bloqueador para:** Revenue do produto

---

### P0-004: Ausência de Validação de Ownership em Alguns RPCs

**Categoria:** Segurança — Authorization
**Fonte:** `DB-AUDIT.md` → Seção 2 (Parameter Validation)

**Descrição:**
Dois RPCs — `get_available_slots` e `mark_commissions_as_paid` — aceitam `p_professional_id` como parâmetro sem validar que o professional pertence ao business do usuário autenticado. Um atacante autenticado pode fornecer IDs de professionals de outros negócios para obter informações ou executar ações cross-tenant.

**Impacto:**
- Leakage de disponibilidade de agenda de outros negócios via `get_available_slots`
- Possível marcação de comissões como pagas em outros negócios via `mark_commissions_as_paid`
- Afeta os 5 RPCs identificados como "⚠️ Depends on input"
- Viola multi-tenant isolation em nível de função

**Evidência:**
```sql
-- DB-AUDIT.md linha 102-108
-- get_available_slots: p_business_id, p_professional_id — "Depends on input"
-- mark_commissions_as_paid: p_professional_id — "Needs validation"
```

**Fix padrão:**
```sql
-- Adicionar validation block no início de cada RPC suspeito:
DECLARE
  v_owner_id UUID;
BEGIN
  -- Validate ownership before proceeding
  SELECT user_id INTO v_owner_id
  FROM team_members
  WHERE id = p_professional_id;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: professional does not belong to this business';
  END IF;
  -- ... resto da função
END;
```

**Esforço:** 3 horas (revisar e corrigir 5 RPCs suspeitos)
**Arquivos:** `supabase/migrations/[next].sql` (patch functions)
**Bloqueador para:** Nenhum (fix standalone)

---

## 3. P1 Issues — HIGH

> Issues P1 devem ser resolvidas em até 3 meses.
> Impacto direto em performance, qualidade de código, e experiência do usuário.

---

### P1-001: 5 Índices Críticos Faltando no Banco de Dados

**Categoria:** Performance — Database
**Fonte:** `DB-AUDIT.md` → Seção 3 (Index Performance Audit)

**Descrição:**
Cinco índices de alta frequência estão faltando nas tabelas mais consultadas do sistema. As queries de filtragem por status, tipo, tier de fidelidade e time-range estão executando full table scans em vez de index scans.

**Impacto estimado:**
- 20-30% de melhora nas queries de filtragem ao adicionar os 5 índices
- Queries de `appointments` por status afetam a Agenda e Dashboard (load diário)
- Queries de `finance_records` por tipo/status afetam Finance page (crítico para decisões)
- Queries de `public_bookings` por tempo afetam o portal de agendamento público
- Afeta todas as queries de filtragem: ~60-70% das queries do sistema

**Índices faltando:**
```sql
-- 1. Agenda page filter por status
CREATE INDEX idx_appointments_status
ON appointments(user_id, status);
-- Impacto: queries com WHERE status = 'Pending' / 'Confirmed'

-- 2. Finance page filter por tipo + status
CREATE INDEX idx_finance_type_status
ON finance_records(user_id, type, status);
-- Impacto: separação receita/despesa + pendentes

-- 3. Public booking portal por tempo
CREATE INDEX idx_public_bookings_time
ON public_bookings(business_id, appointment_time);
-- Impacto: get_available_slots (crítico para booking público)

-- 4. CRM filter por tier de fidelidade
CREATE INDEX idx_clients_tier
ON clients(user_id, loyalty_tier);
-- Impacto: segmentação Bronze/Silver/Gold em ClientCRM

-- 5. Settings/Team filter por status ativo
CREATE INDEX idx_team_active
ON team_members(user_id, active);
-- Impacto: dropdown de profissionais em formulários
```

**Esforço:** 1 hora
**Arquivos:** `supabase/migrations/[next]_add_missing_indexes.sql`
**Bloqueador para:** P1-002 (N+1 queries) — índices devem existir antes de refatorar queries

---

### P1-002: Padrões N+1 no Frontend

**Categoria:** Performance — Query Patterns
**Fonte:** `DB-AUDIT.md` → Seção 6 (Query Performance Analysis) + `frontend-spec.md` → Seções Dashboard, Agenda

**Descrição:**
Diversas páginas executam loops que fazem queries individuais ao Supabase para cada item de uma lista, em vez de usar JOINs ou RPCs. O padrão anti-N+1 foi detectado em pelo menos Dashboard.tsx e potencialmente em ClientCRM.tsx e Reports.tsx.

**Impacto:**
- Para 50 clientes: 51 queries ao banco (1 lista + 50 individuais)
- Para 100 appointments: 101 queries potenciais
- Latência additive: 50ms por query = 5 segundos de espera
- Afeta especialmente usuários com histórico grande (power users)
- Aumenta custo de uso do Supabase (egress e compute)

**Anti-pattern detectado:**
```typescript
// DB-AUDIT.md linhas 214-222 — ANTI-PATTERN identificado
const clients = await supabase.from('clients').select();
for (const client of clients) {
  const record = await supabase.from('appointments')
    .select()
    .eq('client_id', client.id);  // ❌ N queries em loop
}
```

**Solução:**
```typescript
// Usar RPC com JOIN ou select com embedded relation
const data = await supabase
  .from('clients')
  .select(`
    *,
    appointments(id, appointment_time, status, service)
  `)
  .eq('user_id', userId);
// OU criar RPC get_clients_with_recent_appointments
```

**Esforço:** 6–8 horas (identificar todos os N+1 + refatorar)
**Arquivos:** `pages/Dashboard.tsx`, `pages/ClientCRM.tsx`, `pages/Reports.tsx`, possíveis outros
**Bloqueador para:** P2-003 (caching layer)

---

### P1-003: Cobertura de Testes Inferior a 50%

**Categoria:** Qualidade de Código — Testing
**Fonte:** `system-architecture.md` → Seção 10 (Known Issues — High)

**Descrição:**
A cobertura de testes está abaixo de 50%, deixando mais da metade do código de produção sem cobertura de testes automatizados. O projeto usa Vitest + React Testing Library, com infraestrutura de teste configurada em `test/setup.ts`, mas os testes existentes são insuficientes para garantir estabilidade em refactorings e novas features.

**Áreas sem cobertura identificadas:**
- RPCs críticos (complete_appointment, create_secure_booking, get_finance_stats)
- Fluxo de autenticação (login, logout, session management)
- Cálculo de comissões (CommissionsManagement.tsx)
- Multi-tenant isolation (verificação de company_id em queries)
- Fluxo de booking público end-to-end

**Impacto:**
- Risco de regressões em features críticas (Finance, Booking, Auth)
- Refactorings perigosos sem rede de segurança
- Dificulta onboarding de novos devs
- Bloqueia implementação confiante de novas features
- CI/CD sem gate de qualidade automatizado efetivo

**Metas de cobertura:**
```
Atual:   < 50%  (estimado)
Meta 3m: 70%    (crítico coberto)
Meta 6m: 80%    (padrão da indústria)

Prioridade de cobertura:
1. Auth flows (login, logout, session)
2. Finance calculations (RPCs + frontend)
3. Booking flow (public + internal)
4. Multi-tenant queries (company_id filtering)
5. Component unit tests (modais, formulários)
```

**Esforço:** 16 horas (para atingir 70% em áreas críticas)
**Arquivos:** `*.test.tsx` ao lado de cada componente/página, `test/setup.ts`
**Bloqueador para:** Refactorings seguros (P1-002, P2-001)

---

### P1-004: Uso de `any` Types no TypeScript

**Categoria:** Qualidade de Código — Type Safety
**Fonte:** `system-architecture.md` → Seção 10 (High — Missing TypeScript types)

**Descrição:**
Vários componentes e hooks utilizam o tipo `any` do TypeScript, desativando efetivamente a verificação de tipos nessas áreas. Isso é especialmente problemático em interfaces de dados do Supabase onde estruturas de resposta podem mudar sem que o compilador avise.

**Localidades prováveis de `any`:**
- Respostas de RPC não tipadas (`data: any`)
- Props de componentes não definidas (`props: any`)
- Handlers de eventos sem tipagem (`e: any`)
- Dados de contexto sem interface (`value: any`)

**Impacto:**
- Erros de tipo em runtime que TypeScript deveria detectar
- Refactorings de RPC não detectados pelo compilador
- Falsa sensação de type safety (lint passa, mas runtime falha)
- Dificulta autocompletion e navegação de código
- Aumenta tempo de debugging

**Solução:**
```typescript
// ANTES (any)
const { data, error } = await supabase.rpc('get_finance_stats', params);
const stats: any = data;

// DEPOIS (tipado)
interface FinanceStats {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  period: string;
}

const { data, error } = await supabase.rpc('get_finance_stats', params);
const stats = data as FinanceStats;
// Ou idealmente: gerado automaticamente pelo Supabase type generator
```

**Ação recomendada:**
```bash
# Gerar tipos automaticamente do schema Supabase
supabase gen types typescript --project-id [id] > types/supabase.ts
```

**Esforço:** 4 horas (remover any óbvios + gerar tipos do Supabase)
**Arquivos:** Múltiplos — rodar `npm run typecheck` para identificar todos
**Bloqueador para:** P1-003 (testes tipados)

---

### P1-005: Dashboard Load com 3 Queries Separadas (~1200ms)

**Categoria:** Performance — Frontend Load Time
**Fonte:** `frontend-spec.md` → Seção 9 (Database Query Performance)

**Descrição:**
O Dashboard executa 3 queries separadas ao carregar: `get_dashboard_stats`, `get_dashboard_insights`, e uma real-time subscription. Cada query tem latência independente, resultando em ~1200ms de espera total para o usuário ver os dados do dashboard.

**Impacto:**
- Dashboard demora ~1200ms para carregar dados (medido)
- Usuários veem skeleton/loading state por mais de 1 segundo
- 3 round-trips ao banco = 3x o overhead de latência de rede
- FCP atual: ~2.1s (target: < 1.8s) — este issue contribui diretamente
- Piora experiência especialmente em conexões móveis lentas

**Solução:**
```sql
-- Criar RPC unificado que retorna tudo em uma única chamada
CREATE OR REPLACE FUNCTION get_dashboard_all(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'stats',    (SELECT * FROM get_dashboard_stats(p_user_id)),
    'insights', (SELECT * FROM get_dashboard_insights(p_user_id)),
    'upcoming', (SELECT json_agg(a) FROM appointments a WHERE ...)
  );
END;
$$;
```

**Redução estimada:** 1200ms → ~450ms (uma única query otimizada)
**Esforço:** 3 horas (criar RPC + atualizar Dashboard.tsx + testes)
**Arquivos:** `pages/Dashboard.tsx`, `supabase/migrations/[next].sql`
**Bloqueador para:** P2-003 (caching)

---

### P1-006: Ausência de Paginação em Listas Grandes

**Categoria:** Performance + UX — Frontend
**Fonte:** `frontend-spec.md` → Seção 3 (Finance.tsx) + `system-architecture.md` → Seção 7

**Descrição:**
Múltiplas páginas carregam todos os registros sem paginação: Finance.tsx (todos os finance_records), ClientCRM.tsx (todos os clientes), possivelmente Agenda.tsx (todos os appointments do mês). Com crescimento, isso resulta em cargas de centenas ou milhares de registros no frontend.

**Impacto:**
- Finance com 1000+ registros: ~50KB de payload desnecessário
- ClientCRM com 500+ clientes: rendering lento e scroll infinito
- Queries sem LIMIT: full table scan potencial
- Memória do browser aumenta com datasets grandes
- Tempo de renderização React aumenta linearmente com registros

**Solução:**
```typescript
// Implementar paginação com Supabase range()
const PAGE_SIZE = 20;
const { data, count } = await supabase
  .from('finance_records')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });
```

**Esforço:** 6 horas (implementar em Finance, ClientCRM, Agenda)
**Arquivos:** `pages/Finance.tsx`, `pages/ClientCRM.tsx`, `pages/Agenda.tsx`
**Bloqueador para:** P2-003 (caching — paginação precisa existir antes)

---

### P1-007: Gemini API Key — Confirmar Restrição de Domínio

**Categoria:** Segurança — API Keys
**Fonte:** `system-architecture.md` → Seção 3 (Gemini API) + Seção 5 (Secrets Management)

**Descrição:**
A chave da API do Google Gemini está exposta no frontend (VITE_GEMINI_API_KEY). O sistema-architecture.md documenta que "Google restricts by domain/origin (security)", mas não há evidência verificada de que esta restrição está de fato configurada no Google Cloud Console. Uma chave não restrita pode ser usada por qualquer site para consumir a quota da aplicação.

**Impacto:**
- Se restrição não configurada: qualquer pessoa com acesso ao bundle JS pode usar a API key
- Consumo não autorizado da quota do Gemini (custos e rate limiting)
- Possível uso malicioso (spam, conteúdo inapropriado)
- Custo financeiro inesperado se quota excedida

**Ação requerida:**
1. Acessar Google Cloud Console → API & Services → Credentials
2. Verificar se a key tem "Application restrictions" → HTTP referrers configurado
3. Adicionar restrições: `https://[dominio-producao.vercel.app]/*` + `http://localhost:3000/*` (dev)
4. Documentar a restrição no `.env.example`

**Esforço:** 1 hora (verificação + configuração no Google Cloud Console)
**Arquivos:** Configuração externa (Google Cloud Console), `.env.example` (documentação)
**Bloqueador para:** Nenhum (verificação de segurança independente)

---

### P1-008: Bundle Size Acima do Target (~150KB gzipped)

**Categoria:** Performance — Frontend Build
**Fonte:** `frontend-spec.md` → Seção 9 (Bundle Size)

**Descrição:**
O app bundle principal está em ~150KB gzipped (500KB não comprimido), excedendo os targets típicos para aplicações React (< 100KB gzipped para o chunk principal). O target do projeto não está documentado, mas o LCP atual de ~2.8s indica impacto real.

**Principais contribuidores prováveis:**
- Recharts importado completamente (pode usar tree-shaking)
- Lucide Icons potencialmente importando mais icons do que necessário
- Tailwind CSS não totalmente purgado em dev
- Possíveis dependências duplicadas ou não utilizadas

**Impacto:**
- LCP ~2.8s (target: < 2.5s) — diretamente relacionado ao bundle
- TTI ~3.8s (target: < 3.5s)
- Usuários mobile em 4G sentem o peso maior
- Core Web Vitals impactam ranking no Google (futuro SEO do portal de booking público)

**Ações:**
```bash
# Analisar bundle
npm run build -- --report

# Verificar dependências pesadas
npx bundlephobia recharts lucide-react
```

**Esforço:** 4 horas (análise + quick wins de tree-shaking)
**Arquivos:** `vite.config.ts`, `package.json`, componentes que importam libraries pesadas
**Bloqueador para:** P2-002 (otimização de imagens — parte da estratégia de performance)

---

## 4. P2 Issues — MEDIUM

> Issues P2 devem ser endereçadas em até 6 meses.
> Melhorias de qualidade, UX e manutenibilidade que não bloqueiam operação.

---

### P2-001: Código Duplicado entre Componentes

**Categoria:** Manutenibilidade — DRY
**Fonte:** `system-architecture.md` → Seção 10 (Medium — Code duplication)

**Descrição:**
Lógica de data formatting, currency formatting, e patterns de loading/error state estão duplicados em múltiplos componentes. Com 50+ componentes, o risco de inconsistência cresce a cada novo componente.

**Padrões duplicados identificados:**
- Formatação de moeda (R$ formatting) em Finance.tsx, Dashboard.tsx, CommissionsManagement.tsx
- Loading state pattern (isLoading + spinner) em cada página individualmente
- Error handling pattern (try/catch + alert) repetido em ~15 componentes
- Date formatting em Agenda.tsx, Dashboard.tsx, Reports.tsx

**Ação:**
- Centralizar em `utils/formatters.ts` (já existe — verificar se coverage é completa)
- Criar `hooks/useAsyncOperation()` para padronizar loading/error handling
- Criar `components/AsyncBoundary.tsx` para substituir patterns repetitivos

**Esforço:** 4 horas
**Arquivos:** `utils/formatters.ts`, novos hooks/components
**Bloqueador para:** Nenhum

---

### P2-002: Imagens Sem Otimização (WebP, Lazy Loading)

**Categoria:** Performance — Assets
**Fonte:** `frontend-spec.md` → Seção 9 + Seção 10 (Mobile)

**Descrição:**
As 6 buckets do Supabase Storage armazenam imagens sem transformação automática. Fotos de clientes, serviços, e marketing podem estar sendo servidas em formato original (JPEG/PNG) sem compressão WebP e sem lazy loading nativo, aumentando o tempo de carregamento.

**Impacto:**
- Fotos de clientes: ~500KB-1MB em JPEG vs ~100-200KB em WebP
- Fotos de serviços: ~1-3MB originais para gallery views
- Mobile data usage elevado para usuários em 4G
- CLS (Cumulative Layout Shift) sem dimensões definidas nas imagens

**Solução:**
```tsx
// Adicionar loading="lazy" + dimensões explícitas em todas as imagens
<img
  src={client.photo_url}
  alt={`Foto de ${client.name}`}
  loading="lazy"
  width={48}
  height={48}
  className="rounded-full object-cover"
/>
```

**Esforço:** 3 horas
**Arquivos:** Componentes que renderizam imagens do Storage
**Bloqueador para:** Nenhum

---

### P2-003: Ausência de Cache Layer para Dados Estáticos

**Categoria:** Performance — Data Fetching
**Fonte:** `system-architecture.md` → Seção 7 (Scaling Path) + `frontend-spec.md` → Seção 9

**Descrição:**
Dados que raramente mudam — lista de serviços, team members, configurações de negócio — são re-fetchados a cada mount de componente. Não há cache local (React Query, SWR, ou mesmo localStorage) para evitar re-fetches desnecessários.

**Dados candidatos para cache (TTL 5-60 min):**
- `services` (muda raramente — TTL 30 min)
- `team_members` (muda raramente — TTL 30 min)
- `business_settings` (muda raramente — TTL 60 min)
- `get_dashboard_stats` (pode usar TTL 2-5 min)

**Esforço:** 6 horas (instalar React Query ou implementar cache simples)
**Pré-requisito:** P1-001 (índices), P1-002 (N+1 fix), P1-006 (paginação)
**Arquivos:** Novos hooks ou setup de React Query

---

### P2-004: Gaps de Acessibilidade WCAG 2.1

**Categoria:** Acessibilidade — Compliance
**Fonte:** `frontend-spec.md` → Seção 8 (Accessibility Audit)

**Descrição:**
O audit de acessibilidade identificou compliance parcial: ~85% no nível A e ~70% no nível AA (target: 80%+ AA). Os principais gaps são contraste de cores insuficiente, alt text faltando, falta de ARIA labels em formulários, e modais sem gerenciamento de foco via teclado.

**Issues específicas:**
```
❌ Color contrast < 4.5:1 em alguns textos (WCAG 1.4.3)
⚠️ Alt text faltando em imagens de clientes e serviços (WCAG 1.1.1)
⚠️ Modais não-acessíveis via teclado (WCAG 2.1.1)
⚠️ ARIA labels faltando em formulários (WCAG 1.3.1)
⚠️ Focus management ausente ao abrir/fechar modais (WCAG 2.4.3)
```

**Impacto:**
- Usuários com deficiências visuais não conseguem usar a aplicação
- Risco legal em alguns mercados (ADA compliance, Lei Brasileira de Inclusão)
- Portal de booking público especialmente crítico (face pública do produto)

**Esforço:** 8 horas
**Arquivos:** Múltiplos — especialmente `components/` de modais e formulários
**Bloqueador para:** Nenhum

---

### P2-005: Responsividade Mobile Incompleta

**Categoria:** UX — Mobile Experience
**Fonte:** `frontend-spec.md` → Seção 10 (Mobile Responsiveness)

**Descrição:**
Quatro issues de mobile foram identificadas no audit: modais não otimizados para pequenas telas, tooltips de charts que transbordam, inputs de data/hora sem UI mobile adequada, e sidebar que colapsa mas sem hamburger menu responsivo.

**Impacto:**
- ~40-60% dos usuários finais (salões/barbearias) usam mobile
- Portal de booking público (cliente final) é principalmente mobile
- Frustração de uso reduz NPS e aumenta abandono no booking flow
- PWA mode (app instalável) piora experiência se layout não for mobile-first

**Esforço:** 6 horas
**Arquivos:** `components/Sidebar.tsx`, modais de appointment e booking, `pages/PublicBooking.tsx`

---

### P2-006: Falta de Soft Delete nos RPCs de Finance

**Categoria:** Integridade de Dados
**Fonte:** `docs/architecture/SCHEMA.md` → finance_records + `DB-AUDIT.md` → Seção 4

**Descrição:**
A tabela `finance_records` tem coluna `deleted_at` para soft delete, mas não há constraint de foreign key hard entre `appointments` e `finance_records`. Conforme DB-AUDIT documenta: "finance_records.appointment_id doesn't have a hard constraint, but soft deletes prevent orphans." Isso cria dependência de comportamento de aplicação para garantir integridade.

**Risco:**
- Se soft delete de appointment falhar silenciosamente, finance_record fica órfão
- Relatórios financeiros podem incluir receitas de appointments "deletados"
- Inconsistência silenciosa difícil de detectar

**Esforço:** 2 horas (criar migration com constraint + trigger de proteção)

---

### P2-007: Múltiplos `company_id` / `user_id` / `business_id` — Inconsistência de Naming

**Categoria:** Manutenibilidade — Schema
**Fonte:** `SCHEMA.md` análise geral

**Descrição:**
O schema usa três formas diferentes para referenciar o tenant owner: `user_id` (na maioria das tabelas core), `business_id` (em public_bookings, queue_entries, team_members), e `company_id` (referenciado no CLAUDE.md e documentação geral). Essa inconsistência aumenta a carga cognitiva e é fonte potencial de bugs em novos RPCs.

**Impacto:**
- Confusão para novos desenvolvedores ao escrever queries
- ADR-003 documenta "tight coupling to Supabase" — este naming irregular piora isso
- Cada novo feature requer verificação de qual coluna usar por tabela

**Esforço:** 2 horas (documentar mapeamento canônico + criar guia de contribuição)
**Ação:** Não renomear colunas (breaking change) — documentar mapeamento

---

### P2-008: Ausência de Rate Limiting no Frontend para Ações Críticas

**Categoria:** Segurança — UX
**Fonte:** `system-architecture.md` → Seção 5 (Rate Limiting)

**Descrição:**
O rate limiting existe no banco via RPCs `check_login_rate_limit` e `check_rate_limit`, mas ações de frontend como "salvar configurações", "criar agendamento", e "enviar marketing" não têm debounce ou throttle. Duplo-clique em botões críticos pode criar registros duplicados.

**Impacto:**
- Agendamentos duplicados por double-click
- Registros financeiros duplicados
- Envio duplicado de campanhas de marketing

**Esforço:** 2 horas (adicionar debounce em botões críticos)

---

### P2-009: Backup/Restore não Testado

**Categoria:** Resiliência — Operacional
**Fonte:** `DB-AUDIT.md` → Seção 10 (Backup & Recovery)

**Descrição:**
O DB-AUDIT documenta "Last tested: ?" para recovery testing. Backups automáticos do Supabase (diários, 7 dias de retenção) estão configurados, mas o procedimento de restore nunca foi validado. Um backup não testado pode ser inútil em caso de desastre.

**Ação:**
1. Documentar procedimento de restore
2. Testar restore em ambiente staging
3. Agendar teste trimestral

**Esforço:** 3 horas (teste + documentação)

---

## 5. P3 Issues — LOW

> Issues P3 são melhorias desejáveis no horizonte de 12+ meses.
> Não blocam operação, mas melhoram qualidade a longo prazo.

---

### P3-001: Tight Coupling com Supabase (ADR-003)

**Categoria:** Arquitetura — Manutenibilidade
**Fonte:** `system-architecture.md` → ADR-003, Seção 10

**Descrição:**
Todas as páginas chamam Supabase diretamente sem uma camada de abstração (repository pattern, API layer). Isso torna impossível mockar dados em testes de integração, dificulta migração de banco de dados, e aumenta o risco de vazamento de lógica de negócio para o frontend.

**Solução futura:**
```typescript
// Criar API layer (repository pattern)
class AppointmentRepository {
  async getByMonth(userId: string, month: Date) {
    return supabase.from('appointments').select()...
  }
}
```

**Esforço:** 20+ horas (extração gradual para API layer)
**Prioridade:** 12+ meses — aguardar crescimento do time

---

### P3-002: Context API pode Causar Re-renders Excessivos

**Categoria:** Performance — React
**Fonte:** `system-architecture.md` → Seção 7 (Current Bottlenecks)

**Descrição:**
AlertsContext atualiza com frequência (cada toast) e pode causar re-render de toda a árvore de componentes que consomem o contexto. Com a escala atual (< 1000 DAU) isso não é perceptível, mas pode se tornar issue acima de 5000 DAU.

**Solução futura:** Migrar para Zustand ou dividir contextos em granularidade menor.
**Esforço:** 8 horas (migração gradual)
**Prioridade:** 12+ meses — não crítico no scale atual

---

### P3-003: Consistência de Mensagens de Erro para o Usuário

**Categoria:** UX — Error Messages
**Fonte:** `system-architecture.md` → Seção 10 (Medium — Inconsistent error messages)

**Descrição:**
Mensagens de erro variam em estilo, linguagem e nível de detalhe entre componentes. Algumas mostram erros técnicos do Supabase diretamente ao usuário (ex: "duplicate key value violates unique constraint"). Uniformizar para mensagens amigáveis em português.

**Esforço:** 4 horas
**Prioridade:** 12+ meses

---

### P3-004: Internacionalização (i18n) Ausente

**Categoria:** Expansão — Funcionalidade
**Fonte:** `SCHEMA.md` → profiles.region (`'BR'` ou `'PT'`)

**Descrição:**
O campo `region` em `profiles` indica que Portugal (PT) é um mercado alvo, mas toda a UI está hardcoded em português do Brasil. Strings de UI não estão externalizadas em arquivos de tradução. Suporte real a PT-PT exigiria i18n completo.

**Esforço:** 16+ horas
**Prioridade:** Depende de roadmap de expansão para Portugal

---

### P3-005: Logs de Sistema não Monitorados

**Categoria:** Operações — Observabilidade
**Fonte:** `SCHEMA.md` → system_errors table

**Descrição:**
A tabela `system_errors` registra erros do frontend, mas não há dashboard de monitoramento ou alertas configurados. Erros críticos em produção passam despercebidos até que um usuário reporte manualmente.

**Solução futura:** Integrar Sentry ou Datadog para alertas em tempo real.
**Esforço:** 4 horas (integração básica)

---

### P3-006: Dependências com Potencial de Desatualização

**Categoria:** Manutenibilidade — Dependencies
**Fonte:** `system-architecture.md` → Seção 10 (High — Outdated dependencies)

**Descrição:**
Com React 19, TypeScript 5.8, e Vite 6 (versões mais recentes), o risco de breaking changes em updates futuros é alto se dependências não forem gerenciadas proativamente. Não há processo documentado de update de dependências.

**Ação:**
```bash
npm outdated   # Verificar dependências desatualizadas
npm audit      # Verificar vulnerabilidades
```

**Esforço:** 2 horas (audit + setup de Dependabot)

---

### P3-007: Semantic Memory Subutilizada

**Categoria:** Produto — AI Features
**Fonte:** `system-architecture.md` → Seção 10 (Medium — Limited semantic memory usage)

**Descrição:**
As tabelas `ai_knowledge_base` e `client_semantic_memory` com HNSW indexes estão implementadas e os RPCs `match_kb_content` e `match_client_memories` existem, mas a integração com features de produto é limitada. O sistema de memória semântica não está sendo aproveitado ao máximo para personalização e recomendações.

**Oportunidade:** Usar memórias semânticas em:
- Sugestão de serviços no booking (baseado no histórico do cliente)
- Recomendações proativas no CRM
- Geração de conteúdo personalizado de marketing

**Esforço:** 12+ horas (cada nova feature de IA)

---

## 6. Roadmap 12 Semanas

> Roadmap baseado em esforço total estimado de ~92h, assumindo 2 devs x 20h/semana disponível = 40h/semana útil.
> Ajustar conforme disponibilidade real do time.

---

### Sprint 1 (Semanas 1-2): Critical Security + Quick Wins

**Objetivo:** Eliminar todos os P0s de segurança e aplicar quick wins.

**Semana 1:**
- [ ] P0-001: Fix RLS client_semantic_memory (0.5h)
- [ ] P0-004: Fix RPC parameter validation — 5 funções (3h)
- [ ] P1-007: Verificar e configurar Gemini API key restriction (1h)
- [ ] P1-001: Criar 5 missing indexes (1h)
- [ ] P1-004: Remover `any` types + gerar tipos Supabase (4h)
- **Total semana 1:** ~9.5h

**Semana 2:**
- [ ] P0-002: Implementar Error Boundaries em todas as páginas (4h)
- [ ] P0-003: Audit e fix da integração Stripe (8h)
- **Total semana 2:** ~12h

---

### Sprint 2 (Semanas 3-4): Performance Foundation

**Objetivo:** Estabelecer base de performance com N+1 fix e paginação.

**Semana 3:**
- [ ] P1-002: Identificar e corrigir N+1 queries em Dashboard + ClientCRM (4h)
- [ ] P1-006: Implementar paginação em Finance + ClientCRM (4h)
- **Total semana 3:** ~8h

**Semana 4:**
- [ ] P1-002: Continuar N+1 fix em Agenda + Reports (4h)
- [ ] P1-006: Paginação em Agenda (2h)
- [ ] P1-005: Criar RPC get_dashboard_all unificado (3h)
- **Total semana 4:** ~9h

---

### Sprint 3 (Semanas 5-6): Quality + Testing Foundation

**Objetivo:** Atingir 70% de cobertura de testes nas áreas críticas.

**Semana 5:**
- [ ] P1-003: Testes para Auth flow (login, logout, session) (4h)
- [ ] P1-003: Testes para Finance calculations (4h)
- **Total semana 5:** ~8h

**Semana 6:**
- [ ] P1-003: Testes para Booking flow (public + internal) (4h)
- [ ] P1-003: Testes para multi-tenant query validation (4h)
- **Total semana 6:** ~8h

---

### Sprint 4 (Semanas 7-8): Accessibility + Mobile

**Objetivo:** Atingir WCAG AA compliance e corrigir mobile issues.

**Semana 7:**
- [ ] P2-004: Adicionar alt text em todas as imagens (2h)
- [ ] P2-004: Corrigir ARIA labels em formulários (2h)
- [ ] P2-004: Fix color contrast issues (2h)
- [ ] P2-004: Keyboard navigation em modais (2h)
- **Total semana 7:** ~8h

**Semana 8:**
- [ ] P2-005: Responsividade de modais para mobile (3h)
- [ ] P2-005: Fix chart tooltips mobile overflow (1h)
- [ ] P2-005: Hamburger menu para sidebar mobile (2h)
- **Total semana 8:** ~6h

---

### Sprint 5 (Semanas 9-10): Performance Optimization

**Objetivo:** Atingir targets de Core Web Vitals (LCP < 2.5s, TTI < 3.5s).

**Semana 9:**
- [ ] P1-008: Bundle analysis + tree-shaking quick wins (4h)
- [ ] P2-002: Adicionar lazy loading + WebP para imagens (3h)
- **Total semana 9:** ~7h

**Semana 10:**
- [ ] P2-003: Implementar cache layer (React Query ou equivalente) (6h)
- [ ] P2-008: Debounce em botões críticos (2h)
- **Total semana 10:** ~8h

---

### Sprint 6 (Semanas 11-12): Maintenance Debt + Documentation

**Objetivo:** Reduzir dívida de manutenibilidade e documentar decisões.

**Semana 11:**
- [ ] P2-001: Extrair código duplicado para utils/hooks centralizados (4h)
- [ ] P2-006: Criar constraint de FK + trigger para finance_records (2h)
- [ ] P2-007: Documentar mapeamento de naming (user_id vs business_id) (2h)
- **Total semana 11:** ~8h

**Semana 12:**
- [ ] P2-009: Testar e documentar procedimento de backup/restore (3h)
- [ ] P3-005: Setup básico de monitoramento de erros (Sentry) (4h)
- [ ] P3-006: Configurar Dependabot + rodar npm audit (1h)
- **Revisão final e atualização do roadmap (2h)**
- **Total semana 12:** ~10h

---

### Resumo do Roadmap

| Sprint | Semanas | Focus | Esforço |
|--------|---------|-------|---------|
| 1 | 1-2 | Security Critical | ~21.5h |
| 2 | 3-4 | Performance Foundation | ~17h |
| 3 | 5-6 | Testing Quality | ~16h |
| 4 | 7-8 | Accessibility + Mobile | ~14h |
| 5 | 9-10 | Performance Optimization | ~15h |
| 6 | 11-12 | Maintenance Debt | ~21h |
| **Total** | **12 semanas** | — | **~104.5h** |

---

## 7. Health Metrics

> Métricas quantificadas para acompanhar evolução da saúde do sistema.
> Medições actuais baseadas nos documentos de audit (14 Mar 2026).

---

### 7.1 Segurança

| Métrica | Atual | Target 3m | Target 6m | Status |
|---------|-------|-----------|-----------|--------|
| RLS policies sem gaps | 26/27 (96%) | 27/27 (100%) | 27/27 (100%) | ⚠️ |
| RPCs com SECURITY DEFINER | 41/41 (100%) | 41/41 (100%) | 100% | ✅ |
| RPCs com validação de ownership | ~36/41 (88%) | 41/41 (100%) | 100% | ⚠️ |
| API keys com restrições | Não verificado | ✅ Verificado | ✅ Documentado | ❓ |
| Vulnerabilidades npm críticas | Não auditado | 0 críticas | 0 médias | ❓ |

**Score de Segurança Atual: 72/100**

---

### 7.2 Performance

| Métrica | Atual | Target 3m | Target 6m | Status |
|---------|-------|-----------|-----------|--------|
| FCP (First Contentful Paint) | ~2.1s | < 1.8s | < 1.5s | ⚠️ |
| LCP (Largest Contentful Paint) | ~2.8s | < 2.5s | < 2.0s | ⚠️ |
| CLS (Cumulative Layout Shift) | ~0.15 | < 0.1 | < 0.05 | ⚠️ |
| TTI (Time to Interactive) | ~3.8s | < 3.5s | < 3.0s | ⚠️ |
| Dashboard load time | ~1200ms | < 600ms | < 400ms | ⚠️ |
| Bundle size (main, gzipped) | ~150KB | < 120KB | < 100KB | ⚠️ |
| Índices de banco | 22/27 (81%) | 27/27 (100%) | 100% | ⚠️ |

**Score de Performance Atual: 65/100**

---

### 7.3 Cobertura de Testes

| Área | Atual | Target 3m | Target 6m | Status |
|------|-------|-----------|-----------|--------|
| Cobertura global | < 50% | 70% | 80% | ❌ |
| Auth flow coverage | Não medido | 90% | 95% | ❌ |
| Finance calculations | Não medido | 85% | 90% | ❌ |
| Booking flow (public) | Não medido | 85% | 90% | ❌ |
| Multi-tenant isolation | Não medido | 95% | 95% | ❌ |
| Component tests | Não medido | 60% | 75% | ❌ |

**Score de Qualidade/Testes Atual: 48/100**

---

### 7.4 Acessibilidade

| Nível WCAG | Atual | Target 3m | Target 6m | Status |
|------------|-------|-----------|-----------|--------|
| WCAG A | ~85% | 100% | 100% | ⚠️ |
| WCAG AA | ~70% | 85% | 90% | ⚠️ |
| WCAG AAA | ~40% | 50% | 60% | ❌ |
| Alt text em imagens | Parcial | 100% | 100% | ⚠️ |
| Keyboard nav em modais | Parcial | 100% | 100% | ⚠️ |
| ARIA labels em forms | Parcial | 100% | 100% | ⚠️ |

**Score de Acessibilidade Atual: 65/100**

---

### 7.5 Banco de Dados

| Métrica | Atual | Target 3m | Target 6m | Status |
|---------|-------|-----------|-----------|--------|
| Tabelas com RLS | 27/27 | 27/27 | 27/27 | ✅ |
| Tabelas com índices completos | 22/27 (81%) | 27/27 | 27/27 | ⚠️ |
| RPCs com parâmetros validados | ~36/41 (88%) | 41/41 | 41/41 | ⚠️ |
| Uso de storage (free tier 1GB) | ~70MB (7%) | < 200MB | < 500MB | ✅ |
| Migrations aplicadas | 64 | — | — | ✅ |
| Foreign keys com cascade correto | 26/27 (96%) | 27/27 | 27/27 | ⚠️ |

**Score de Banco de Dados Atual: 78/100**

---

### 7.6 Manutenibilidade

| Métrica | Atual | Target 3m | Target 6m | Status |
|---------|-------|-----------|-----------|--------|
| Uso de `any` types | Alto (estimado > 20 ocorrências) | < 5 | 0 | ❌ |
| Código duplicado | Médio (formatters, loading) | Reduzido 50% | Reduzido 80% | ⚠️ |
| Acoplamento Supabase | Alto (ADR-003) | Documentado | API layer parcial | ⚠️ |
| Dependências desatualizadas | Não auditado | Auditado | Dependabot ativo | ❓ |
| Lint passes | ✅ | ✅ | ✅ | ✅ |
| TypeScript strict mode | Parcial | ✅ | ✅ | ⚠️ |

**Score de Manutenibilidade Atual: 62/100**

---

### 7.7 Score Composto ao Longo do Tempo

| Dimensão | Atual | Target 3m | Target 6m | Target 12m |
|----------|-------|-----------|-----------|------------|
| Segurança | 72 | 92 | 95 | 98 |
| Performance | 65 | 80 | 88 | 92 |
| Qualidade/Testes | 48 | 72 | 80 | 85 |
| Acessibilidade | 65 | 82 | 88 | 92 |
| Banco de Dados | 78 | 92 | 95 | 97 |
| Manutenibilidade | 62 | 72 | 80 | 85 |
| **COMPOSTO** | **68** | **82** | **88** | **92** |

---

## 8. Dependencies e Blockers

> Mapa de dependências entre issues — o que bloqueia o que.
> Usar para ordenar execução correta no roadmap.

---

### 8.1 Grafo de Dependências

```
P0-001 (RLS fix)              ─── sem bloqueadores ───► EXECUTAR IMEDIATAMENTE
P0-004 (RPC validation)       ─── sem bloqueadores ───► EXECUTAR IMEDIATAMENTE
P0-002 (Error Boundaries)     ─── sem bloqueadores ───► Sprint 1 Semana 2
P0-003 (Stripe audit)         ─── sem bloqueadores ───► Sprint 1 Semana 2

P1-001 (5 missing indexes)    ─── sem bloqueadores ───► Sprint 1 Semana 1 (quick win)
P1-007 (Gemini key)           ─── sem bloqueadores ───► Sprint 1 Semana 1
P1-004 (any types)            ─── sem bloqueadores ───► Sprint 1 Semana 1

P1-002 (N+1 queries)          ─── depende de P1-001 (índices primeiro)
P1-006 (paginação)            ─── depende de P1-001 (índices primeiro)
P1-005 (dashboard RPC)        ─── depende de P1-001 (índices para RPC unificado)

P1-003 (testes 70%)           ─── depende de P1-004 (tipos corretos = testes tipados)
                              ─── parcialmente depende de P1-002 (código estável)

P1-008 (bundle size)          ─── sem bloqueadores (análise independente)
P2-002 (imagens)              ─── complementa P1-008 (estratégia de performance)
P2-003 (cache layer)          ─── depende de P1-002, P1-006 (queries estabilizadas)

P2-004 (WCAG)                 ─── sem bloqueadores técnicos
P2-005 (mobile)               ─── sem bloqueadores técnicos

P2-001 (DRY)                  ─── depende de P1-003 (testes existem para refactor seguro)
P2-006 (finance FK)           ─── sem bloqueadores
P2-007 (naming docs)          ─── sem bloqueadores
P2-008 (debounce)             ─── sem bloqueadores
P2-009 (backup test)          ─── sem bloqueadores
```

---

### 8.2 Ordem Crítica de Execução

```
MUST be first:
  P0-001 (RLS) → único P0 de segurança com fix standalone de 30min

MUST be done before refactoring:
  P1-001 (indexes) → antes de P1-002 (N+1 fix)
  P1-004 (types) → antes de P1-003 (testes)

MUST be done before caching:
  P1-002 (N+1 fix) → antes de P2-003 (cache)
  P1-006 (pagination) → antes de P2-003 (cache)

CAN be parallel:
  P0-003 (Stripe) pode rodar em paralelo com qualquer P1
  P2-004 (WCAG) pode rodar em paralelo com P1s de performance
  P2-005 (mobile) pode rodar em paralelo com P1s de performance
```

---

### 8.3 Blockers Externos

| Issue | Blocker Externo | Ação Necessária |
|-------|----------------|-----------------|
| P0-003 (Stripe) | Credenciais do Stripe dashboard | Acessar conta Stripe da empresa |
| P1-007 (Gemini key) | Acesso ao Google Cloud Console | Verificar conta GCP do projeto |
| P2-009 (Backup test) | Ambiente staging disponível | Criar ambiente staging no Supabase |
| P3-005 (Sentry) | Conta Sentry + orçamento | Criar conta Sentry Free tier |

---

### 8.4 Riscos de Execução

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Stripe integration mais complexa que estimado | MÉDIA | ALTO | Reservar sprint extra; auditar antes de estimar |
| N+1 fix causa regressões | BAIXA | ALTO | P1-003 (testes) deve preceder refactors grandes |
| Cache layer introduz bugs de stale data | MÉDIA | MÉDIO | Implementar TTLs conservadores + invalidation explícita |
| Fix RLS causa performance regression (subquery) | BAIXA | MÉDIO | Testar performance após fix; adicionar index se necessário |
| Bundle size analysis revela dependências críticas para remover | MÉDIA | MÉDIO | Testar bem antes de remover; verificar usage em toda app |

---

*Documento gerado por @architect (Aria) — Fase 4.4 do Brownfield Assessment*
*Próximos documentos: US-020 (Database Specialist Review), US-021 (UX Specialist Review)*
*Gate final: US-022 (QA Gate) — @qa (Quinn)*
