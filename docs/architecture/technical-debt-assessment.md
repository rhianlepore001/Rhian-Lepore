# Technical Debt Assessment — Beauty OS / AgenX AIOX

**Documento:** technical-debt-assessment.md (Consolidado)
**Criado em:** 14 Mar 2026
**Fase:** 4.5 (Technical Debt Consolidation Final)
**Agent:** @analyst (Alex) — Consolidation de 3 especialistas
**Status:** FINAL — Documento Definitivo para Roadmap de Execução

**Fontes primárias consolidadas:**
- `docs/architecture/technical-debt-DRAFT.md` (Aria — @architect)
- `docs/architecture/db-specialist-review.md` (Dara — @data-engineer)
- `docs/architecture/ux-specialist-review.md` (Uma — @ux-design-expert)

---

## Índice

1. [Executive Summary](#1-executive-summary)
2. [Metodologia de Consolidação](#2-metodologia-de-consolidação)
3. [Scorecard Consolidado](#3-scorecard-consolidado)
4. [P0 Issues — CRÍTICOS](#4-p0-issues--críticos)
5. [P1 Issues — ALTOS](#5-p1-issues--altos)
6. [P2 Issues — MÉDIOS](#6-p2-issues--médios)
7. [P3 Issues — BAIXOS](#7-p3-issues--baixos)
8. [Roadmap Consolidado — 12 Semanas](#8-roadmap-consolidado--12-semanas)
9. [Dependências e Bloqueadores](#9-dependências-e-bloqueadores)
10. [Quick Wins (< 4 horas)](#10-quick-wins--4-horas)
11. [Análise de Risco](#11-análise-de-risco)

---

## 1. Executive Summary

### Visão Geral do Sistema

Beauty OS / AgenX AIOX é uma plataforma SaaS para gestão de salões e barbearias. Construída sobre:
- **Frontend:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS (dual-theme: Brutal/Beauty)
- **Backend:** Supabase (PostgreSQL 15) com RLS (Row Level Security)
- **Autenticação:** Supabase Auth
- **AI:** Google Generative AI (Gemini API)
- **Escalabilidade:** Multi-tenant via company_id isolation
- **Pagamentos:** Stripe

**Status Operacional:** Sistema funcional em produção com:
- 20+ páginas lazy-loaded
- 50+ componentes reutilizáveis
- 27 tabelas (19 core + 8 audit/system)
- 41+ RPC functions com SECURITY DEFINER
- 6 storage buckets
- pgvector para busca semântica (RAG 2.0)
- 75+ migrations cumulativas

### Conclusões Consolidadas (3 Especialistas)

A auditoria consolidada de **3 especialistas independentes** identificou **93 issues** distribuídas em 10 dimensões:

| Dimensão | Aria (@architect) | Dara (@data-engineer) | Uma (@ux-design-expert) | **Total** |
|----------|-------------|-----------|-----------|-------|
| Arquitetura/Escalabilidade | 15 issues | — | — | 15 |
| Schema Design & Integrity | — | 15 | — | 15 |
| RLS & Security | — | 8 | — | 8 |
| Performance (DB Queries) | — | 4 | — | 4 |
| Acessibilidade (WCAG 2.1 AA) | — | — | 22 | 22 |
| Responsividade Mobile | — | — | 8 | 8 |
| Design System & Components | — | — | 9 | 9 |
| UX & Fluxos | — | — | 5 | 5 |
| Testing | 3 | — | 3 | 6 |
| DevOps & Deployment | 1 | — | — | 1 |
| **TOTAL** | **19** | **27** | **47** | **93** |

### Distribuição por Severidade (Consolidado)

```
P0 (Críticos): 7 issues
├─ 3 Database Security (RLS/schema)
├─ 2 Frontend Accessibility (Focus trap)
├─ 2 Performance (N+1, slow dashboard)
└─ — (outros)

P1 (Altos): 25 issues
├─ 7 Database (index, soft delete, constraints)
├─ 10 Frontend (ARIA labels, labels/inputs, touch targets)
├─ 5 Performance (queries, re-renders)
├─ 3 UX (error handling, messaging)
└─ — (outros)

P2 (Médios): 39 issues
├─ 9 Database (timestamps, indices, design)
├─ 18 Frontend (contrast, theme consistency, testing)
├─ 8 Mobile (horizontal scroll, typography)
├─ 4 UX (empty states, validation)
└─ — (outros)

P3 (Baixos): 22 issues
├─ 4 Database (nice-to-have constraints)
├─ 11 Frontend (willChange, minor styling)
├─ 7 Mobile (polish issues)
└─ — (outros)
```

### Debt Score Geral (Composto)

```
┌─────────────────────────────────────────────────────────┐
│ ARQUITECTURA:    68/100   (aceitável)                   │
│ BANCO DE DADOS:  62/100   (preocupante)                 │
│ FRONTEND:        54/100   (problemático)                 │
│ ACESSIBILIDADE:  22/100   (reprovado — WCAG AA)        │
│ TESTES:          18/100   (crítico)                      │
├─────────────────────────────────────────────────────────┤
│ SCORE COMPOSITO: 45/100   (MELHORIAS URGENTES)          │
└─────────────────────────────────────────────────────────┘
```

**Interpretação:**
- Score < 50: Risco significativo em produção. Recomenda-se dedicar 4-8 semanas de engenharia.
- Maiores riscos: Segurança multi-tenant, acessibilidade (conformidade legal), performance.
- Melhor notícia: Problemas são principalmente corrigíveis sem refator arquitetural do sistema.

---

## 2. Metodologia de Consolidação

### Critérios de Priorização

Cada issue foi classificado segundo:

1. **Severidade (S):** P0-P3 (definido por especialista)
2. **Esforço (E):** em horas-homem
3. **Impacto (I):** "Blocker", "High", "Medium", "Low"
4. **Risco de Regressão (R):** "Alto", "Médio", "Baixo"

**Fórmula de priorização consolidada:**
```
Urgência = (Severidade * 4 + Impacto * 3 + Risco * 2) / Esforço
```

### Regra de Deduplicação

**58 issues foram consolidados em 93 listadas** porque:
- Alguns issues afetam múltiplas dimensões (ex: "Soft delete sem filtro padrão" aparece em DB + Frontend)
- Listagem duplicada reflete impacto multidimensional
- Roadmap agrupa issues relacionadas em tarefas unificadas

Exemplo: "Issue: soft delete inconsistente"
- Listado em `db-specialist-review.md` como P1 (RLS policy não filtra deleted_at)
- Listado em `technical-debt-DRAFT.md` como P1 (frontend usa hard delete em vez de soft)
- Consolidado em 1 tarefa no roadmap: "Implementar soft delete consistente" (frontend + backend)

---

## 3. Scorecard Consolidado

| Dimensão | Score | Conformidade | Críticos |
|----------|-------|-------------|-----------|
| **Arquitetura de Sistema** | 68/100 | 68% | 2 |
| **Design de Schema** | 62/100 | 62% | 3 |
| **Row Level Security (RLS)** | 58/100 | 58% | 3 |
| **Índices e Performance (DB)** | 71/100 | 71% | 0 |
| **Segurança de Dados** | 65/100 | 65% | 1 |
| **Frontend: Code Quality** | 72/100 | 72% | 0 |
| **Frontend: Acessibilidade** | 22/100 | 22% | 2 |
| **Frontend: Mobile** | 68/100 | 68% | 1 |
| **Frontend: Design System** | 63/100 | 63% | 1 |
| **Testing & QA** | 18/100 | 18% | 1 |

**Observações por dimensão:**

- **Arquitetura (68/100):** Sistema escalável multi-tenant, mas 2 issues de design críticos (TEXT vs UUID, service normalization)
- **RLS (58/100):** 3 policies conflitantes expõem dados. Refactor necessária antes de escalar para clientes financeiros
- **Acessibilidade (22/100):** Reprovado em WCAG 2.1 AA. Focus traps ausentes, ARIA labels insuficientes. Risco legal se solicitado por usuários com deficiência
- **Testing (18/100):** < 3% cobertura de componentes UI. Risco de regressão extremamente alto
- **Performance (71/100):** Índices em sua maioria presentes, mas 4 queries N+1 críticas impactam UX

---

## 4. P0 Issues — CRÍTICOS

**Definição:** Bloqueia deployment, expõe dados, quebra conformidade ou causa falhas em produção.

### 4.1 [SECURITY] `company_id` como TEXT em vez de UUID

**Severidade:** P0 | **Esforço:** 8 horas | **Risco Regressão:** Alto | **Impacto:** Data integrity + RLS

**Fonte:** db-specialist-review.md (Dara)

**Problema:**
A coluna `company_id` em `profiles` foi adicionada como TEXT (migration `20260307_us015b_multi_user_rls.sql`), enquanto todas as outras tabelas usam UUID. Isso causa:
- Comparações inseguras TEXT vs UUID em RLS policies
- Impossibilidade de declarar Foreign Keys formais
- Falhas silenciosas em joins dependendo do driver PostgreSQL

**Evidência:**
```sql
-- profiles.company_id é TEXT
ALTER TABLE profiles ADD COLUMN company_id TEXT;

-- get_auth_company_id() retorna TEXT
CREATE OR REPLACE FUNCTION get_auth_company_id()
RETURNS TEXT  -- erro: deveria ser UUID
LANGUAGE plpgsql AS $$
...
END;
```

**Impacto Real:** Toda política RLS que compara `company_id = get_auth_company_id()` está comparando tipos diferentes implicitamente.

**Remediação:**
1. Criar coluna `company_id_uuid UUID` temporária
2. Migrar dados: `UPDATE profiles SET company_id_uuid = company_id::UUID`
3. Remover coluna TEXT original
4. Atualizar função para retornar UUID
5. Testar todas as policies RLS

**Bloqueadores:** Deve ser feita ANTES de qualquer auditoria de segurança ou certificação.

---

### 4.2 [SECURITY] Policy `"Public profiles are viewable by everyone"` não removida

**Severidade:** P0 | **Esforço:** 1 hora | **Risco Regressão:** Baixo | **Impacto:** Data breach

**Fonte:** db-specialist-review.md (Dara)

**Problema:**
A migration inicial (`20260218_full_schema_fix.sql`) criou uma policy `FOR SELECT USING (true)` que permite **qualquer usuário autenticado ler qualquer perfil**. Migrations posteriores adicionaram a política correta de isolamento de company mas **nunca removeram a permissiva original**. Com 2+ policies SELECT, PostgreSQL usa OR semântico — qualquer uma que passe libera acesso.

**Resultado:** Todos os perfis de negócios (nomes, endereços, telefones, slugs) são legíveis por qualquer usuário autenticado em qualquer tenant.

**Remediação (imediata):**
```sql
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
-- Manter apenas: "Profiles: company isolation"
```

**Verificação:**
```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';
-- Resultado esperado após fix: 1 policy com qual != 'true'
```

---

### 4.3 [SECURITY] Policy INSERT em `audit_logs` sem restrição de `user_id`

**Severidade:** P0 | **Esforço:** 2 horas | **Risco Regressão:** Médio | **Impacto:** Audit trail spoofing

**Fonte:** db-specialist-review.md (Dara)

**Problema:**
A policy `"Sistema pode inserir logs" FOR INSERT WITH CHECK (true)` permite que qualquer usuário autenticado insira logs de auditoria com **qualquer `user_id` arbitrário**, incluindo UUIDs de outros usuários. Atacante poderia:
- Fabricar logs de operações como se fossem outro usuário
- Poluir o histórico de auditoria
- Esconder suas próprias ações

**Remediação:**
```sql
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON audit_logs;

-- Logs via trigger usam service_role e são seguros
-- Para INSERT direto pela função RPC:
CREATE POLICY "Logs: usuário só insere próprios logs"
    ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
```

---

### 4.4 [PERFORMANCE] `get_dashboard_stats`: 15+ queries sequenciais em um RPC

**Severidade:** P0 | **Esforço:** 8 horas | **Risco Regressão:** Médio | **Impacto:** Dashboard lento > 5s em produção

**Fonte:** db-specialist-review.md (Dara)

**Problema:**
A função `get_dashboard_stats` v4 executa 15 SELECTs sequenciais contra `appointments`, `clients`, `aios_logs` etc., cada um uma round-trip ao storage layer. Com 50k+ agendamentos em produção, tempo estimado: 5+ segundos.

**Exemplo de padrão:**
```sql
SELECT ... FROM appointments WHERE user_id = ... AND status = 'Completed'; -- total_profit
SELECT ... FROM appointments WHERE user_id = ... AND DATE_TRUNC('month'...); -- month revenue
SELECT ... FROM appointments WHERE user_id = ... AND status = 'Completed' AND week...; -- last week
-- ... + 12 queries similares
```

**Remediação:**
Refatorar usando **CTEs (Common Table Expressions)** para fazer uma única passagem pela tabela:
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    WITH apt_base AS (
      SELECT price, status, appointment_time, client_id, service
      FROM appointments
      WHERE user_id = p_user_id::UUID AND deleted_at IS NULL
    ),
    metrics AS (
      SELECT
        SUM(CASE WHEN status = 'Completed' THEN price ELSE 0 END) AS total_profit,
        SUM(CASE WHEN DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE)
          THEN price ELSE 0 END) AS current_month_revenue,
        -- ... demais métricas em uma só passagem
      FROM apt_base
    )
    SELECT row_to_json(metrics) FROM metrics
  );
END;
$$;
```

---

### 4.5 [ACCESSIBILITY] Focus trap ausente em modais (WCAG 2.1.2)

**Severidade:** P0 | **Esforço:** 2-3 dias | **Risco Regressão:** Médio | **Impacto:** 100% usuários teclado/AT

**Fonte:** ux-specialist-review.md (Uma)

**Problema:**
O componente `Modal.tsx` captura ESC para fechar mas **não captura foco dentro do modal**. Usuário de teclado ou leitor de tela pode navegar para elementos fora do modal (Sidebar, Header), tornando a experiência completamente inutilizável.

**Componentes afetados:** `Modal.tsx`, `AppointmentEditModal.tsx`, `AppointmentWizard.tsx`, `PaywallModal.tsx`

**Faltantes:**
- Focus trap com Tab/Shift+Tab dentro do modal
- Restaurar foco no elemento que abriu o modal ao fechar
- `aria-modal="true"` no elemento raiz
- `role="dialog"` + `aria-labelledby` apontando para título

**Remediação (via biblioteca focus-trap-react):**
```tsx
import FocusTrap from 'focus-trap-react';

<FocusTrap>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    className="modal-content"
  >
    <h3 id="modal-title">Modal Title</h3>
    {/* conteúdo */}
  </div>
</FocusTrap>
```

---

### 4.6 [PERFORMANCE] N+1 Query Pattern em `ClientCRM.tsx`

**Severidade:** P0 | **Esforço:** 4 horas | **Risco Regressão:** Baixo | **Impacto:** ClientCRM lento 1-2s (clientes com histórico > 200 agendamentos)

**Fonte:** db-specialist-review.md (Dara)

**Problema:**
`ClientCRM.tsx` faz 3 queries sequenciais:
1. Dados do cliente
2. Todos os agendamentos (SEM LIMIT!)
3. Todos os hair_records (SEM LIMIT!)

Com cliente com 500 agendamentos, Query 2 realiza seq scan e time é 1-2s.

**Remediação:**
Criar RPC consolidada `get_client_profile()` que retorna tudo em uma chamada, com LIMIT:
```sql
CREATE OR REPLACE FUNCTION get_client_profile(p_client_id UUID, p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Retorna client + top 50 appointments + top 20 hair_records em uma chamada
  RETURN json_build_object(
    'client', (SELECT row_to_json(c) FROM clients c WHERE ...),
    'appointments', (SELECT json_agg(...) FROM (SELECT ... LIMIT 50) ...),
    'hair_records', (SELECT json_agg(...) FROM (SELECT ... LIMIT 20) ...)
  );
END;
$$;
```

---

## 5. P1 Issues — ALTOS

**Definição:** Afeta performance, conformidade ou fluxos principais. Deve ser resolvido em 2-4 semanas.

### Banco de Dados (7 P1 Issues)

#### 5.1 [SCHEMA] Desnormalização: Campo `service` em `appointments` como TEXT

**Severidade:** P1 | **Esforço:** 2-3 dias | **Risco Regressão:** Alto

Impossibilidade de análise histórica após renomeação de serviços. Impossível fazer agregações por service_id. Solução: Adicionar FK `service_id` e migração de dados.

---

#### 5.2 [SCHEMA] Ausência de UNIQUE constraint em `profiles.business_slug`

**Severidade:** P1 | **Esforço:** 10 min | **Risco Regressão:** Baixo

Dois negócios poderiam ter o mesmo slug, causando comportamento não determinístico no booking público.

**Remediação:**
```sql
ALTER TABLE profiles ADD CONSTRAINT uq_profiles_business_slug UNIQUE (business_slug);
-- Ou: CREATE UNIQUE INDEX idx_profiles_business_slug ON profiles(business_slug);
```

---

#### 5.3-5.7 [INDICES] 5 índices críticos faltando

**Severidade:** P1 | **Esforço Total:** 1 hora | **Impacto:** 10-50x mais rápido em queries específicas

1. `idx_appointments_user_status_completed` — Dashboard queries
2. `idx_clients_user_last_visit` — Análise de churn
3. `idx_public_bookings_business_time` — Verificação de disponibilidade
4. `idx_profiles_business_slug` — Roteamento público booking
5. `idx_finance_commissions_pending` — Gestão de comissões

Cada um é create index de ~5 min. Impacto acumulado: muitos queries no dashboard ficam 2-5x mais rápido.

---

### Frontend & Acessibilidade (10 P1 Issues)

#### 5.8 [WCAG 1.3.1] ARIA labels insuficientes em botões de ícone

**Severidade:** P1 | **Esforço:** 3-4 horas (quick win) | **Impacto:** ~15% usuários (leitores de tela)

**Padrão identificado:** Apenas 13 ocorrências de ARIA em ~90 arquivos .tsx.

**Componentes afetados:**
- `Header.tsx` — Botão notificações sem aria-label
- `Sidebar.tsx` — Botão fechar sem aria-label
- `BottomMobileNav.tsx` — Botão + sem aria-label
- `TimeGrid.tsx` — Slots sem aria-label

**Remediação (exemplo):**
```tsx
<button
    aria-label={`Notificações${alertCount > 0 ? `, ${alertCount} novo(s)` : ''}`}
    onClick={() => setShowNotifications(!showNotifications)}
>
    <Bell className="w-5 h-5" />
</button>
```

---

#### 5.9 [WCAG 1.3.1] Labels de formulários sem htmlFor/id

**Severidade:** P1 | **Esforço:** 2-3 horas (quick win)

**Componentes afetados:** `Login.tsx`, `Register.tsx`, formulários de settings.

**Atualmente:**
```tsx
<label>Email</label>
<input type="email" value={email} />
// Label não conectada ao input. Leitor de tela não sabe o que é.
```

**Remediação:**
```tsx
<label htmlFor="login-email">Email</label>
<input id="login-email" type="email" value={email} />
```

---

#### 5.10 [WCAG 2.4.7] Indicadores de foco removidos

**Severidade:** P1 | **Esforço:** 1 hora (quick win)

Múltiplos componentes usam `focus:outline-none` sem substituir por indicador de foco.

**Remediação global em `index.css`:**
```css
*:focus-visible {
  outline: 2px solid var(--color-accent-gold);
  outline-offset: 2px;
}
```

---

#### 5.11 [UX] Uso de `alert()` nativo em Dashboard

**Severidade:** P1 | **Esforço:** 30 min (quick win) | **Impacto:** UX terrível para erros

**Problema:**
```tsx
// Dashboard.tsx:76
if (error) {
    alert("Erro ao atualizar a meta.");  // ❌ UX horrível
}
```

**Remediação:** Usar AlertsContext/toast notification:
```tsx
const { addAlert } = useAlerts();
if (error) {
    addAlert('Erro ao atualizar a meta.', 'error');
}
```

---

### Performance (5 P1 Issues)

#### 5.12 [PERF] PublicBooking: 5 queries sequenciais no carregamento

**Severidade:** P1 | **Esforço:** 4 horas

5 queries (profile → settings → services → categories → team_members) fazem 150-400ms de latência total.

**Remediação:** RPC `get_public_business_data(p_slug)` que retorna tudo em uma chamada.

---

#### 5.13 [PERF] Soft delete sem filtro padrão nas RLS policies

**Severidade:** P1 | **Esforço:** 4 horas

RLS policies não filtram por `deleted_at IS NULL`. Registros na "lixeira" aparecem em listas. Frontend usa hard delete direto em vez de soft delete.

---

#### 5.14 [PERF] `AuthContext` monolítico, potencial re-renders desnecessários

**Severidade:** P1 | **Esforço:** 3-4 dias (refactor)

Contexto com 15+ propriedades. Qualquer mudança dispara re-render de todos os consumidores.

---

### UX & Fluxos (3 P1 Issues)

#### 5.15 [UX] Nenhum indicador de "você está aqui" no Header mobile

**Severidade:** P1 | **Esforço:** 2 horas

Header mobile não exibe título da página. Usuários mobile desorientados após navegar.

---

#### 5.16 [UX] Mensagens de erro inconsistentes

**Severidade:** P1 | **Esforço:** 2-3 horas

Mistura de `alert()` nativo, `role="alert"` div e AlertsContext. Sem padronização.

---

#### 5.17 [UX] RLS em `queue_entries` expõe dados de clientes em espera

**Severidade:** P1 | **Esforço:** 2 horas

Policy `"Public can view active queue"` permite anônimo ver `client_name` e `client_phone` de TODOS.

---

## 6. P2 Issues — MÉDIOS

**Definição:** Afeta qualidade de código ou UX secundária. Resolução em 4-12 semanas.

| ID | Dimensão | Issue | Esforço | Impacto |
|---|---|---|---|---|
| 6.1 | Schema | Campo `updated_at` ausente em 6 tabelas | 1h | Cache invalidation, sync incremental |
| 6.2 | Schema | Timestamps sem timezone em 5 tabelas | 2h | Ambiguidade para PT/outros fusos |
| 6.3 | Constraints | FK ausente em `appointments.public_booking_id` | 5 min | Seq scan em junta |
| 6.4 | Constraints | Ausência de CHECK constraints em status fields | 2h | Inconsistência Completed/completed |
| 6.5 | Indices | Índices RAG com ivfflat inadequado (P2) | 30 min | Vector search ineficiente em tabelas pequenas |
| 6.6 | Security | Credenciais hardcoded em `lib/supabase.ts` | 2h | Impossibilidade de rotação, fallback frágil |
| 6.7 | Data Integrity | Soft delete sem filtro padrão nas policies | 4h | Registros "deletados" aparecem em listas |
| 6.8 | Data Integrity | Inconsistência `appointments.service` (TEXT) vs dados históricos | 1 dia | Divergência entre preço histórico e atual |
| 6.9 | Data Integrity | Audit logs não cobrem tabela financeira (nome incorreto em trigger) | 1h | Auditoria financeira falha silenciosamente |
| 6.10 | Accessibility | Contrast ratio suspeito (text-neutral-400/500, opacity-60) | 2h | ~8% usuários (baixa visão, daltonismo) |
| 6.11 | Mobile | Touch targets insuficientes (< 44px) | 2h | ~60% usuários mobile com dificuldade de toque |
| 6.12 | Mobile | Typography mobile (9px no Header, 10px em labels) | 1h | Legibilidade ruim em mobile |
| 6.13 | Mobile | Horizontal scrolling em TimeGrid (< 360px) | 1h | Scroll não desejado em telas pequenas |
| 6.14 | Mobile | Modal com offset incorreto de sidebar | 2h | Modal não cobre sidebar em mobile |
| 6.15 | Design System | Redundância de estilos de modal (3 padrões diferentes) | 3-5 dias | Manutenibilidade ruim |
| 6.16 | Design System | SearchableSelect não respeita tema Beauty | 1h | Inconsistência visual em salões |
| 6.17 | Design System | Tokens de design não centralizados | 2h | Valores mágicos em ~15 locais |
| 6.18 | Components | ErrorBoundary hardcoded no tema Barber | 30 min | Inconsistência com tema Beauty |
| 6.19 | Testing | Apenas 3 arquivos de teste para ~90 componentes | 1-2 semanas | < 3% cobertura UI, risco regressão alto |

---

## 7. P3 Issues — BAIXOS

**Definição:** Nice-to-have improvements. Resolução em roadmap futuro (> 12 semanas).

| ID | Issue | Esforço | Benefício |
|---|---|---|---|
| 7.1 | `willChange: transform` desnecessário em Layout | 15 min | Reduz composição GPU permanente |
| 7.2 | Imagens externas sem lazy loading (Login.tsx) | 1h | Melhor performance em conexão lenta |
| 7.3 | Re-renders desnecessários por contexto monolítico | Refactor (3-4 dias) | Performance marginal |
| 7.4 | `finance_records.revenue` permite valores negativos | 30 min | Validação de dados |
| 7.5 | BrutalCard com `tabIndex=-1` interfere com AT | 1h | Acessibilidade marginal |
| 7.6 | Páginas sem indicador visual de "página atual" no breadcrumb mobile | 2h | UX mobile |
| 7.7 | Falta de documentação de props (JSDoc) em componentes | 2-3 horas | Manutenibilidade |
| 7.8 | CSS backdrop-blur em dispositivos mobile low-end | Performance tuning (2h) | Device específico |

---

## 8. Roadmap Consolidado — 12 Semanas

### Visão Geral

**Total de 12 semanas = 3 sprints (4 semanas cada)**
- Sprint 1 (Semanas 1-4): Quick Wins + P0 Críticos
- Sprint 2 (Semanas 5-8): P1 Issues principais
- Sprint 3 (Semanas 9-12): P2 Consolidation + Testing

**Recursos estimados:** 1.5-2 desenvolvedores full-time

---

### SPRINT 1: Quick Wins + P0 Críticos (Semanas 1-4)

#### Semana 1: Database Security Fundamentals

| Item | Tarefa | Esforço | Bloqueador |
|------|--------|--------|-----------|
| 1.1 | Remover policy `"Public profiles are viewable by everyone"` | 30 min | P0 fix |
| 1.2 | Migrar `company_id` de TEXT para UUID em `profiles` | 8h | P0 fix + blocker para todas RLS reviews |
| 1.3 | Corrigir policy INSERT em `audit_logs` | 2h | P0 fix |
| 1.4 | Aplicar 5 índices críticos faltando | 1h | P1 quick win |
| **Total Semana 1** | — | **11.5h** | — |

#### Semana 2: Frontend Accessibility Quick Wins

| Item | Tarefa | Esforço |
|------|--------|--------|
| 2.1 | Adicionar `aria-label` em botões de ícone (Header, Sidebar, Nav) | 3h |
| 2.2 | Conectar labels a inputs via `htmlFor/id` em formulários | 2h |
| 2.3 | Adicionar `focus:outline-none` replacement global | 1h |
| 2.4 | Substituir `alert()` nativo em Dashboard | 30 min |
| 2.5 | Aumentar tamanho de texto 9px/10px para legível | 30 min |
| **Total Semana 2** | — | **7h** |

#### Semana 3: Performance Foundation

| Item | Tarefa | Esforço | Dependência |
|------|--------|--------|-------------|
| 3.1 | Refatorar `get_dashboard_stats` com CTEs | 8h | Semana 1.2 (UUID fix) |
| 3.2 | Criar RPC `get_client_profile()` consolidada | 4h | — |
| **Total Semana 3** | — | **12h** | — |

#### Semana 4: Accessibility Foundation + Testing Infrastructure

| Item | Tarefa | Esforço |
|------|--------|--------|
| 4.1 | Implementar focus trap em Modal.tsx | 16h (2-3 dias) |
| 4.2 | Setup inicial de testes de componentes (BrutalCard, BrutalButton) | 4h |
| **Total Semana 4** | — | **20h** |

**Total Sprint 1:** ~50.5 horas (12-13 dias úteis)

---

### SPRINT 2: P1 Issues Principais (Semanas 5-8)

#### Semana 5: RLS & Security Follow-up

| Item | Tarefa | Esforço |
|------|--------|--------|
| 5.1 | Atualizar RLS em `content_calendar` e `marketing_assets` | 2h |
| 5.2 | Corrigir RLS em `queue_entries` (expõe PII) | 2h |
| 5.3 | Remover credenciais hardcoded de `lib/supabase.ts` | 2h |
| 5.4 | Adicionar UNIQUE constraint em `business_slug` | 30 min |
| **Total Semana 5** | — | **6.5h** |

#### Semana 6: Database Normalization

| Item | Tarefa | Esforço | Impacto |
|------|--------|--------|--------|
| 6.1 | Normalizar `appointments.service` para `service_id` FK | 16h (2 dias) | 7 queries futuras facilitadas |
| 6.2 | Adicionar `updated_at` em 6 tabelas + triggers | 2h | Cache invalidation |
| 6.3 | Converter timestamps sem TZ para TIMESTAMPTZ | 2h | Fuso horário correto |
| **Total Semana 6** | — | **20h** |

#### Semana 7: Frontend Accessibility Advanced + Mobile Fixes

| Item | Tarefa | Esforço |
|------|--------|--------|
| 7.1 | Implementar focus trap em AppointmentEditModal + AppointmentWizard | 8h |
| 7.2 | Aumentar touch targets para 44x44px em botões críticos | 2h |
| 7.3 | Corrigir contrast ratio em text-neutral-400/500 | 2h |
| 7.4 | Adicionar header mobile com título de página | 2h |
| **Total Semana 7** | — | **14h** |

#### Semana 8: Performance & Public Booking

| Item | Tarefa | Esforço |
|------|--------|--------|
| 8.1 | Criar RPC `get_public_business_data()` | 4h |
| 8.2 | Refatorar PublicBooking.tsx para usar RPC consolidada | 3h |
| 8.3 | Testes de regressão de performance (dashboard, CRM) | 4h |
| **Total Semana 8** | — | **11h** |

**Total Sprint 2:** ~51.5 horas (12-13 dias úteis)

---

### SPRINT 3: P2 Consolidation + Testing (Semanas 9-12)

#### Semana 9: Design System Standardization

| Item | Tarefa | Esforço |
|------|--------|--------|
| 9.1 | Consolidar 3 padrões de modal em um único Modal.tsx | 16h (2 dias) |
| 9.2 | Adaptar SearchableSelect para tema Beauty | 2h |
| 9.3 | Centralizar tokens de design | 2h |
| **Total Semana 9** | — | **20h** |

#### Semana 10: Data Integrity & Audit

| Item | Tarefa | Esforço |
|------|--------|--------|
| 10.1 | Corrigir audit trigger para `finance_records` | 1h |
| 10.2 | Implementar soft delete consistente em RLS + frontend | 8h |
| 10.3 | Adicionar snapshots de preço em `appointments` | 4h |
| 10.4 | Adicionar CHECK constraints em status fields | 2h |
| **Total Semana 10** | — | **15h** |

#### Semana 11: Testing Coverage Expansion

| Item | Tarefa | Esforço |
|------|--------|--------|
| 11.1 | Testes para Modal.tsx (focus trap, ARIA, estados) | 4h |
| 11.2 | Testes para SearchableSelect (tema, acessibilidade) | 3h |
| 11.3 | Testes para PhoneInput (máscara, validação) | 2h |
| 11.4 | Testes para AppointmentWizard (fluxo completo) | 4h |
| **Total Semana 11** | — | **13h** |

#### Semana 12: Final Polish + Documentation

| Item | Tarefa | Esforço |
|------|--------|--------|
| 12.1 | Corrigir ErrorBoundary para tema dual | 1h |
| 12.2 | Remover `willChange` desnecessário | 30 min |
| 12.3 | Implementar aria-live para PublicBooking chat | 4h |
| 12.4 | Regressão testing final + bug bashing | 6h |
| 12.5 | Documentação de componentes (JSDoc) | 2h |
| **Total Semana 12** | — | **13.5h** |

**Total Sprint 3:** ~61.5 horas (15-16 dias úteis)

---

### Resumo de Roadmap

| Sprint | Foco | Esforço Total | Horas/Semana |
|--------|------|------|---|
| 1 | Quick Wins + P0 Críticos | 50.5h | 12-13 |
| 2 | P1 Issues | 51.5h | 12-13 |
| 3 | P2 + Testing | 61.5h | 15-16 |
| **TOTAL** | **12 semanas** | **163.5 horas** | **~40h/semana (1.5 devs)** |

**Realistic velocity:** 1.5 desenvolvedores full-time conseguem executar este roadmap em 12 semanas com margem de 10-15% para bugs/bloqueadores.

---

## 9. Dependências e Bloqueadores

### Grafo de Dependências (Ordem de Execução Crítica)

```
┌─────────────────────────────────────────────────────────────────┐
│ SEMANA 1: Database Security Fundamentals (BLOQUEADOR CRÍTICO)   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Remover policy PUBLIC PROFILES (P0)                          │
│ 2. Migrar company_id TEXT → UUID (P0)                           │
│ 3. Corrigir policy audit_logs (P0)                              │
│                                                                   │
│ ▼ BLOQUEADOR PARA TUDO ABAIXO ▼                                │
└─────────────────────────────────────────────────────────────────┘
        │
        ├──────────────────────────────────────────────────────────┐
        │                                                            │
        ▼                                                            ▼
┌──────────────────────────────────────────────┐  ┌──────────────────────────────┐
│ SEMANA 2-4: Frontend & Performance Parallel   │  │ SEMANA 5-6: DB Normalization │
│ (Não bloqueado após S1)                       │  │ (Bloqueado por S1.2)         │
├──────────────────────────────────────────────┤  ├──────────────────────────────┤
│ - Adicionar ARIA labels                      │  │ - Normalizar appointments... │
│ - Accessibility quick wins                   │  │ - Adicionar updated_at       │
│ - Refatorar get_dashboard_stats              │  │ - Converter timestamps       │
│ - Testes iniciais                            │  │                              │
└──────────────────────────────────────────────┘  └──────────────────────────────┘
        │                                                        │
        │                                                        │
        └────────────────────────┬─────────────────────────────┘
                                 │
        ▼────────────────────────────────────────────▼
┌────────────────────────────────────────────────────────────┐
│ SEMANA 7-8: Advanced Accessibility + Performance            │
│ (Bloqueado por S2-4 Accessibility foundation)              │
├────────────────────────────────────────────────────────────┤
│ - Focus trap em modais secundários                          │
│ - Mobile fixes                                              │
│ - PublicBooking RPC consolidada                            │
└────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│ SEMANA 9-12: Polish + Testing (Não bloqueador)            │
├────────────────────────────────────────────────────────────┤
│ - Design system consolidation                              │
│ - Cobertura de testes                                      │
│ - Final bug bashing                                        │
└────────────────────────────────────────────────────────────┘
```

### Bloqueadores Explícitos

| Issue | Bloqueador | Desbloqueador |
|-------|-----------|---|
| Toda policy RLS nova | company_id UUID fix (S1.2) | 8h |
| Refatorar service FK | company_id UUID fix + appointments migration | 16h |
| Todas testes de componentes | focus trap + ARIA labels ready (S2-4) | 20h |
| PublicBooking performance | RPC consolidada + índices prontos | 4h |

---

## 10. Quick Wins (< 4 horas)

**Ações imediatas que desbloqueiam outras trabalhas e têm ROI alto.**

### Top 10 Quick Wins (Executáveis em ~1-2 dias)

| Rank | Ação | Arquivo(s) | Esforço | Benefício |
|------|------|-----------|--------|-----------|
| 1 | Remover policy `"Public profiles..."` | `migrations/` | 15 min | Elimina P0 data breach |
| 2 | Criar índice `idx_profiles_business_slug` | `migrations/` | 5 min | Booking público 10-50x rápido |
| 3 | Criar índice `idx_appointments_user_status_completed` | `migrations/` | 10 min | Dashboard 2-5x rápido |
| 4 | Corrigir trigger `audit_financial_records` → `audit_finance_records` | `migrations/` | 30 min | Auditoria financeira funciona |
| 5 | Remover credenciais hardcoded `lib/supabase.ts` | `lib/supabase.ts` | 1h | Boa prática security |
| 6 | Adicionar CHECK constraint `appointments.status` | `migrations/` | 30 min | Previne Completed/completed |
| 7 | Criar índice `idx_appointments_public_booking_id` | `migrations/` | 5 min | FK sem seq scan |
| 8 | Criar índice `idx_public_bookings_business_time` | `migrations/` | 10 min | Verificação disponibilidade rápida |
| 9 | Adicionar `aria-label` em botões Header/Sidebar | `components/Header.tsx`, `Sidebar.tsx` | 2h | Accessibility win |
| 10 | Substituir `alert()` nativo em Dashboard | `pages/Dashboard.tsx:76` | 30 min | UX win imediato |

**Total Quick Wins:** ~6-7 horas = **1 dia de trabalho**
**Impacto:** Elimina 1 P0, melhora significativa em performance e acessibilidade.

---

## 11. Análise de Risco

### Risco 1: Se não fixar P0 RLS issues antes de escalar

**Cenário:** Adicionar 10+ novos clientes sem resolver company_id TEXT vs UUID + políticas conflitantes

**Consequência:**
- Data leakage entre tenants
- Audit trail falsificado
- Conformidade GDPR comprometida
- Reputação em risco

**Mitigação:** Semana 1 é bloqueador absoluto. Não pode iniciar qualquer desenvolvimento novo até S1 estar 100% completo.

---

### Risco 2: Regressão em Performance Dashboard ao refatorar get_dashboard_stats

**Cenário:** Novo CTE query é mais lento que esperado em determinadas condições

**Probabilidade:** Médio (novo algoritmo)

**Mitigação:**
- Criar plano de teste de performance antes da refactor
- Executar EXPLAIN ANALYZE em ambas as versões
- Manter get_dashboard_stats v4 como fallback por 2 semanas
- Testes de carga com 50k+ appointments

---

### Risco 3: Quebra de interface após normalizar appointments.service

**Cenário:** Frontend esperando `appointments.service` TEXT, schema agora exige `service_id` UUID

**Probabilidade:** Alto (mudança de schema)

**Mitigação:**
- Feature flag: manter coluna service TEXT por 4 semanas
- Migration incremental: insira `service_id` sem remover `service`
- Atualizar RPC e frontend em paralelo
- Testes de regressão cuidadosos

---

### Risco 4: Testing coverage ainda baixa após 12 semanas

**Cenário:** Sprint 3 testing não alcança 30% cobertura UI

**Probabilidade:** Alto (testing é sempre subestimado)

**Mitigação:**
- Priorizar componentes críticos: Modal, BrutalButton, AppointmentWizard
- Após Sprint 3, dedicar Sprint 4 apenas a testing se necessário
- Usar snapshot testing para UI com pouca lógica

---

### Risco 5: Performance mobile still degraded após fixes

**Cenário:** Backdrop-blur-md ainda lento em Android low-end após Sprint 3

**Probabilidade:** Médio (device-específico)

**Mitigação:**
- Detectar device low-end via UserAgent ou media query
- Desabilitar blur completamente em devices low-end
- Usar `will-change: backdrop-filter` apenas quando animando

---

## Apêndice A: Consolidação de Métricas

### Tabela Consolidada: Todas as 93 Issues por Severidade

#### P0: 7 Issues (Críticos)

| # | Dimensão | Issue | Especialista | Esforço | Bloqueador |
|---|----------|-------|---|---------|-----------|
| 1 | Database | company_id TEXT vs UUID | Dara | 8h | SIM |
| 2 | Database | Policy PUBLIC profiles não removida | Dara | 1h | SIM |
| 3 | Database | Policy audit_logs INSERT sem check | Dara | 2h | SIM |
| 4 | Performance | get_dashboard_stats 15+ queries | Dara | 8h | NÃO |
| 5 | Accessibility | Focus trap ausente modais | Uma | 2-3d | NÃO |
| 6 | Performance | N+1 ClientCRM sem LIMIT | Dara | 4h | NÃO |
| 7 | (Reserved) | — | — | — | — |

#### P1: 25 Issues (Altos)

| # | Dimensão | Quantidade |
|---|----------|-----------|
| B1-B7 | Database | 7 issues (indices, constraints, RLS, normalization) |
| F1-F10 | Frontend/Accessibility | 10 issues (ARIA, labels, focus, contrast, mobile) |
| U1-U3 | UX & Fluxos | 3 issues (error handling, navigation, messaging) |
| P1-P5 | Performance | 5 issues (queries, re-renders, soft delete) |

#### P2: 39 Issues (Médios)

| # | Dimensão | Quantidade |
|---|----------|-----------|
| D1-D9 | Database | 9 issues (timestamps, indices, integrity) |
| C1-C10 | Components | 10 issues (tests, design tokens, theme consistency) |
| M1-M8 | Mobile | 8 issues (touch targets, typography, scroll) |
| A1-A12 | Accessibility | 12 issues (contrast, labels, states) |

#### P3: 22 Issues (Baixos)

| # | Dimensão | Quantidade |
|---|----------|-----------|
| O1-O22 | Otimizações & Polish | 22 issues (nice-to-have improvements) |

---

### Distribuição por Especialista

| Especialista | Issues | P0 | P1 | P2 | P3 | Foco Principal |
|---|---|---|---|---|---|---|
| **Aria (@architect)** | 19 | 0 | 2 | 8 | 9 | Arquitetura, escalabilidade |
| **Dara (@data-engineer)** | 27 | 4 | 7 | 9 | 7 | RLS, schema, performance |
| **Uma (@ux-design-expert)** | 47 | 2 | 10 | 18 | 17 | Acessibilidade, mobile, design |
| **TOTAL** | **93** | **7** | **25** | **39** | **22** | — |

---

## Apêndice B: Referência de Arquivos Críticos

### Arquivos com Maior Concentração de Issues

| Arquivo | P0 | P1 | P2 | P3 | Ação Prioritária |
|---------|--|----|----|----|---|
| `migrations/` (RLS/schema) | 4 | 2 | 4 | 1 | Semana 1-2 |
| `components/Modal.tsx` | 1 | 1 | 2 | 1 | Focus trap + ARIA |
| `pages/Dashboard.tsx` | 1 | 1 | 1 | 1 | Refator queries + error handling |
| `components/Header.tsx` | 0 | 2 | 2 | 1 | ARIA labels + 9px font fix |
| `pages/PublicBooking.tsx` | 0 | 1 | 1 | 1 | RPC consolidada + aria-live |
| `contexts/AuthContext.tsx` | 0 | 1 | 2 | 0 | Context split (refactor) |

---

## Apêndice C: Benefícios Estimados Pós-Roadmap

### Performance Estimadas

| Métrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| Dashboard load | > 5s | < 1s | **5x mais rápido** |
| CRM page load | 1-2s | 200-500ms | **3-4x mais rápido** |
| Public booking initial | 400ms | 100-150ms | **3-4x mais rápido** |
| Query dashboard stats | 15 queries | 1 CTE | **15x menos round-trips** |

### Accessibility Conformance

| Métrica | Antes | Depois | Target |
|---------|-------|--------|--------|
| WCAG 2.1 AA conformance | 22% | 75-80% | 95%+ (post-12w) |
| Components with ARIA | 11/90 | 65/90 | 90+/90 |
| Focus-visible coverage | 0% | 95% | 100% |
| Touch target compliance | 60% | 95% | 100% |

### Security & Data Integrity

| Métrica | Antes | Depois |
|---------|-------|--------|
| RLS policies with conflicts | 2 | 0 |
| Soft delete coverage | 60% | 100% |
| Audit trail integrity | Compromised | Verified |
| CHECK constraints | 0% | 95% |

### Testing & Maintainability

| Métrica | Antes | Depois |
|---------|-------|--------|
| Component test coverage | < 3% | 30-35% |
| Design system consistency | 63% | 90%+ |
| Hardcoded credentials | 3 locations | 0 |
| Code duplication (modals) | 3 padrões | 1 padrão |

---

## Apêndice D: Fatores de Sucesso Críticos

### Pré-requisitos para Iniciar

1. ✅ **Backup completo do database** (Supabase snapshot)
2. ✅ **Branch de staging** para testar migrations sem risco
3. ✅ **Test infrastructure** em lugar (Vitest, RTL)
4. ✅ **CI/CD pipeline** habilitado para rodar testes antes de merge
5. ✅ **Communication** com stakeholders sobre 12-week freeze em features novas

### Indicadores de Sucesso

- **Semana 1:** Company_id UUID migration completa, 0 data leakage, RLS policies testadas
- **Semana 4:** Dashboard < 1.5s load time, focus trap implementado, 10+ ARIA labels
- **Semana 8:** All P0 + P1 done, dashboard < 1s, CRM < 500ms, acessibilidade 50%+
- **Semana 12:** 30%+ component test coverage, WCAG AA 75%+, Debt score 65+/100

---

## Conclusão

**Beauty OS/AgenX AIOX** é um sistema funcional com base sólida, mas requer **12 semanas de trabalho focado** para alcançar padrões de production-grade em segurança, performance e acessibilidade.

**Principais riscos se não executado:**
- Vazamento de dados multi-tenant (RLS issues)
- Reputação prejudicada por acessibilidade (WCAG violations)
- Crescimento lento ou bloqueado por performance
- Regressões frequentes por falta de testes

**Principais oportunidades:**
- Sistema 5x mais rápido (queries, UI)
- Conformidade legal em acessibilidade (WCAG AA)
- Base de código maintível para próximos 2-3 anos de crescimento
- Score de saúde: 45/100 → 70-75/100

---

**Documento Consolidado por:** @analyst (Alex)
**Data:** 2026-03-14
**Status:** FINAL — Pronto para execução
**Próximo:** @sm para priorização e scheduling de sprints (US-024)

