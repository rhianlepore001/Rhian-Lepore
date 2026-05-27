---
schemaVersion: 1
generatedAt: 2026-05-17T17:56:00Z
updatedAt: 2026-05-17T18:36:00Z
reversa:
  version: "1.0.0"
kind: cutover_plan
producedBy: strategist
updatedBy: orchestrator
---

# Cutover Plan

> Plano de cutover para Strangler Fig por dominio.
> Atualizado com criterios de avanco aprovados e pipeline de skills auxiliares.

---

## Modelo de cutover

Nao ha cutover unico. Cada fase e um micro-cutover com deploy automatico via Vercel.

---

## Pre-requisitos gerais (antes da Fase 0)

**Hard gate**: nenhuma migration de banco, RPC nova ou alteracao de RLS deve ser aplicada antes de concluir os itens abaixo. Fase 0 pode iniciar apenas em arquivos de design/tipos/componentes sem impacto em dados; Fase 1+ exige todos os pre-requisitos completos.

| Pre-requisito | Owner | Status |
|---|---|---|
| Backup completo Supabase (dados + schema) | Dev principal | Pendente |
| Snapshot das RPCs e policies atuais | Dev principal | Pendente |
| Branch `pre-migration` criado como checkpoint | Dev principal | Pendente |
| Stripe test mode validado | Dev principal | Pendente |
| Playwright configurado para fluxos criticos | Dev principal | Pendente |

---

## Criterios de avanco entre fases (aprovados)

Cada fase so avanca para a proxima quando **todos** os criterios forem atendidos:

| # | Criterio | Obrigatorio |
|---|---|---|
| 1 | Fluxo principal da fase funciona end-to-end | Sim |
| 2 | `npm run typecheck` sem erros | Sim |
| 3 | `npm run lint` sem erros | Sim |
| 4 | `npm run build` sem erros | Sim |
| 5 | `npm test` sem falhas | Sim |
| 6 | Sem regressao multi-tenant (RLS testada com owner + staff + publico) | Sim |
| 7 | UI segue design system (contrato visual) | Sim |
| 8 | Comportamento critico documentado | Sim |
| 9 | Rollback/fallback possivel quando aplicavel | Sim |
| 10 | Responsividade mobile validada (telas criticas) | Sim |
| 11 | Sem secrets expostos no frontend | Sim |
| 12 | Performance < 2s desktop (telas criticas) | Recomendado |

---

## Cutover por fase

### Fase 0: Design System + Tipos Base

- **Escopo enxuto** (nao criar design system perfeito):
  - Primitive/semantic/component tokens + CSS variables
  - Componentes: Button, Input, Select, Card, Modal, Table, Tabs, Badge, EmptyState, Skeleton/Loading, ErrorState
  - Estados: hover/focus/active/disabled
  - Mobile-first
  - Tipos canonicos / Supabase types gerados
  - Padroes de service/hook documentados
- **Skills auxiliares**: `design-system`/`design-md`, `impeccable shape`, `react-components`
- **Janela**: sem impacto em usuarios (adicao)
- **Rollback**: reverter commits
- **Go/No-go**: build passa, nenhum componente existente quebra

### Fase 1: Auth + Onboarding

- **Correcoes**: G1 (dual onboarding -- source of truth = `onboarding_progress.is_completed`)
- **Skills auxiliares**: `architecture` (ADR onboarding), `vulnerability-scanner` (auth security)
- **Go/No-go**: login/registro/onboarding funcionam; staff herda corretamente

### Fase 2: Agenda + Checkout

- **Correcoes**: G3 (atomicidade checkout)
- **Parallel run**: manter fallback legado por 1-2 sprints
- **Skills auxiliares**: `database-design` (RPC atomica), `impeccable critique` (UI agenda)
- **Go/No-go**: CRUD agendamentos, checkout atomico, real-time funciona

### Fase 3: Booking Publico

- **Skills auxiliares**: `impeccable shape` (UX cliente final), `ui-ux-pro-max` (mobile)
- **Go/No-go**: booking end-to-end funciona, links publicos preservados

### Fase 4: Fila Digital

- **Correcoes**: G2 (atomicidade fila), G14 (duplicata por telefone), G15 (timeout calling 5min -> waiting)
- **Parallel run**: manter RPC legada como fallback
- **Skills auxiliares**: `database-design` (RPC atomica), `vulnerability-scanner` (permissoes fila)
- **Go/No-go**: fila end-to-end atomica, sem duplicatas, timeout funcionando

### Fase 5: Financeiro + Comissoes

- **Correcoes**: G4 (filtro por professional_id)
- **Parallel run**: comparar comportamento antigo vs novo
- **Skills auxiliares**: `database-design` (modelo financeiro), `vulnerability-scanner` (staff permissions), `impeccable critique` (UI financeiro)
- **Go/No-go**: staff ve apenas seus dados, comissoes calculadas corretamente, atomicidade

### Fase 6: CRM/Clientes

- **Skills auxiliares**: `impeccable shape` (UI clientes)
- **Go/No-go**: historico, tier, deduplicacao funcionam

### Fase 7: Dashboard

- **Skills auxiliares**: `impeccable critique` (hierarquia visual), `ui-ux-pro-max` (charts/KPIs)
- **Go/No-go**: KPIs corretos, pilares comunicados, sem ruido visual

### Fase 8: Configuracoes + Assinatura

- **Go/No-go**: todas as sub-paginas funcionam, Stripe intacto

### Fase 9: Produtos (paralelo a partir de Fase 5)

- **Escopo simples**: cadastro, preco venda/custo, estoque/minimo, venda avulsa ou vinculada, impacto financeiro
- **Sem ERP avancado**
- **Skills auxiliares**: `database-design` (schema produtos), `architecture` (ADR produtos)
- **Go/No-go**: CRUD produtos, venda reflete no financeiro

### Fase 10: Polish + QA + Lancamento

- **Skills auxiliares**:
  - `impeccable polish/audit` (passe final premium)
  - `vulnerability-scanner` / `security-auditor` (auditoria completa)
  - `reversa-inspector` + `testing-patterns` + `playwright-skill` (testes paridade)
  - `ui-ux-pro-max` (checklist completo)
- **Passos**:
  1. Testes E2E completos
  2. Revisao responsividade mobile
  3. Revisao design system (consistencia)
  4. Performance audit (< 2s desktop)
  5. Seguranca audit (secrets, RLS, RPCs)
  6. Beta testers reais
  7. Fix bugs
  8. Tag release v1
- **Go/No-go**: metricas do brief atendidas, beta testers validaram, sem bugs criticos, produto apresentavel

---

## Plano de rollback geral

| Situacao | Acao |
|---|---|
| Bug em fase recem-deployada | Revert PR no GitHub; Vercel redeploy automatico |
| Problema dados/RLS | Corrigir policy; migration de fix se necessario |
| Problema Stripe | Reverter Edge Function |
| Problema generalizado | Reverter para tag `pre-migration` + restaurar backup Supabase |

> Regra: RLS nunca deve ser aberta em modo fail-open como contingencia. Em falha de RLS, usar rollback de policy/migration, hotfix restrito ou desabilitar temporariamente a feature afetada.
