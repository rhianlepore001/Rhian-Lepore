# Agent Allocation Matrix — UI/UX Premium Redesign

Este documento define quais agentes são responsáveis por cada tarefa, quando usar paralelismo vs. sequencialidade e os pontos de handoff entre agentes.

---

## Legenda

- **P = Paralelo** — agentes podem trabalhar simultaneamente.
- **S = Sequencial** — agente B só começa após entregável do agente A.
- **H = Handoff** — ponto de transferência de contexto.

---

## Tabela de Alocação por Sprint

### Sprint 1 — Design System

| Tarefa | Agente Principal | Skills | Modo | Handoff Para | Quando |
|--------|------------------|--------|------|--------------|--------|
| Definir PRODUCT.md + DESIGN.md | @ux-design-expert | `impeccable teach` | S | @dev | Início Sprint 1 |
| Extrair tokens do legado | @dev | `impeccable extract` | S | @dev | Início Sprint 1 |
| Arquitetura de tokens (3 camadas) | @architect + @dev | `design-system` | S | @dev | Início Sprint 1 |
| Protótipos hi-fi Dashboard & Agenda | @ux-design-expert | `interface-design` + `ui-ux-pro-max` | S | @dev (Sprint 2–3) | Ao final do Sprint 1 |
| Refatoração `BrutalCard`, `BrutalButton`, `Modal` | @dev | `ui-styling` + `impeccable craft` | S | @dev | — |
| Revisão de CSS global (`index.html`) | @dev | `impeccable document` + `impeccable polish` | P com tarefa acima | @dev | — |
| Revisão arquitetural e aprovação | @architect | — | S | @pm | Ao final do Sprint 1 |
| QA regressão + a11y | @qa | `impeccable audit` | S | @architect | Ao final do Sprint 1 |

**Observação:** @ux-design-expert trabalha em protótipos enquanto @dev implementa tokens. Isso é paralelo, mas o handoff dos protótipos só ocorre ao final do sprint.

---

### Sprint 2 — Dashboard + Layout

| Tarefa | Agente Principal | Skills | Modo | Handoff Para | Quando |
|--------|------------------|--------|------|--------------|--------|
| Spec do Dashboard | @pm + @dev | `tlc-spec-driven` | S | @ux-design-expert | Dia 1–2 |
| Design KPI cards, sparklines, empty states | @ux-design-expert | `interface-design` + `ui-ux-pro-max` | S | @dev | Dia 3–5 |
| Shape do Dashboard | @ux-design-expert | `impeccable shape Dashboard` | S | @dev | Dia 5 |
| Implementação Dashboard redesign | @dev | `ui-styling` + `impeccable craft` | S | @qa | Ao final do Sprint 2 |
| Criação de componentes `DashboardKpiCard`, `MiniSparkline`, `EmptyState` | @dev | `ui-styling` + `impeccable craft` | P com tarefa acima | @dev | — |
| Refinamento `Header.tsx`, `Sidebar.tsx` | @dev | `impeccable layout` | P com tarefa acima | @dev | — |
| Onboarding redesenhado | @ux-design-expert | `impeccable onboard` | S | @dev | Meio Sprint 2 |
| Revisão visual de consistência | @ux-design-expert | `impeccable critique` | S | @dev | Meio e final do Sprint 2 |
| QA funcional, regressão + a11y | @qa | `impeccable audit` | S | @pm | Ao final do Sprint 2 |

**Observação:** @ux-design-expert já pode iniciar protótipos da Agenda (Sprint 3) em paralelo no final do Sprint 2, adiantando o trabalho.

---

### Sprint 3 — Agenda

| Tarefa | Agente Principal | Skills | Modo | Handoff Para | Quando |
|--------|------------------|--------|------|--------------|--------|
| Spec da Agenda | @pm + @dev | `tlc-spec-driven` | S | @ux-design-expert | Dia 1–2 |
| Design grid de horários, cards de agendamento | @ux-design-expert | `interface-design` + `impeccable shape` | S | @dev | Dia 3–5 |
| Empty state elegante | @ux-design-expert | `impeccable onboard` | S | @dev | Dia 5 |
| Implementação Agenda redesign | @dev | `ui-styling` + `impeccable craft` | S | @qa | Ao final do Sprint 3 |
| Componentes `AgendaListItem`, `ProfessionalFilter`, `EmptyAgendaState` | @dev | `ui-styling` + `impeccable craft` | P com tarefa acima | @dev | — |
| Refinamento `AppointmentWizard` / `EditModal` | @dev | `impeccable distill` | P com tarefa acima | @dev | — |
| Revisão UX e acessibilidade | @ux-design-expert | `impeccable critique` + `ui-ux-pro-max --domain ux` | S | @dev | Meio do Sprint 3 |
| QA funcional + a11y + mobile | @qa | `impeccable audit` | S | @pm | Ao final do Sprint 3 |

**Observação:** Recomenda-se spawnar um sub-agente `@dev-wizard` se o escopo do `AppointmentWizard` crescer além do esperado, mantendo o agente principal focado na lista/filtros.

---

### Sprint 4 — Financeiro

| Tarefa | Agente Principal | Skills | Modo | Handoff Para | Quando |
|--------|------------------|--------|------|--------------|--------|
| Spec do Financeiro | @pm + @dev | `tlc-spec-driven` | S | @ux-design-expert | Dia 1–2 |
| Design KPIs financeiros, gráficos, tabelas | @ux-design-expert | `interface-design` + `ui-ux-pro-max --domain chart` | S | @dev | Dia 3–5 |
| Implementação Financeiro redesign | @dev | `ui-styling` + `impeccable craft` | S | @qa | Ao final do Sprint 4 |
| Componentes `FinanceKpiCard`, `TrendIndicator`, `ZebraTable`, `TransactionCardMobile` | @dev | `ui-styling` + `ui-ux-pro-max` | P com tarefa acima | @dev | — |
| Gráficos Recharts refinados | @dev | `ui-ux-pro-max --domain chart` | P com tarefa acima | @dev | — |
| Revisão visual + data viz | @ux-design-expert | `impeccable critique` + `ui-ux-pro-max` | S | @dev | Meio do Sprint 4 |
| QA funcional, regressão + a11y tabelas | @qa | `impeccable audit` | S | @pm | Ao final do Sprint 4 |

**Observação:** @dev pode ser o mesmo agente do Sprint 3 ou um novo agente especialista em dados/visualizações, conforme disponibilidade.

---

### Sprint 5 — Ajustes + Booking Público

| Tarefa | Agente Principal | Skills | Modo | Handoff Para | Quando |
|--------|------------------|--------|------|--------------|--------|
| Spec de Ajustes | @pm + @dev | `tlc-spec-driven` | S | @ux-design-expert | Dia 1–2 |
| Design Settings em cards temáticos | @ux-design-expert | `interface-design` + `impeccable shape` | S | @dev | Dia 3–4 |
| Construtor de horários visual | @ux-design-expert + @dev | `ui-styling` + `impeccable craft` | S | @dev | Dia 4–6 |
| Implementação Settings redesign | @dev | `ui-styling` + `impeccable craft` | P com Booking | @qa | Ao final do Sprint 5 |
| Componentes `SettingsSectionCard`, `ToggleSwitch`, `VisualHoursBuilder`, `ImageUploadZone` | @dev | `ui-styling` | P com tarefa acima | @dev | — |
| Spec do Booking Público | @pm + @dev-public | `tlc-spec-driven` | S | @ux-design-expert | Dia 1–2 |
| Design Booking Público (hero, fluxo direto) | @ux-design-expert | `frontend-design` + `impeccable shape` | S | @dev-public | Dia 3–4 |
| Implementação Booking Público redesign | @dev-public | `frontend-design` + `impeccable craft` | P com Settings | @qa | Ao final do Sprint 5 |
| Componentes `PublicHeroV2`, `QuickBookingFlow`, `BookingStepper` | @dev-public | `frontend-design` + `ui-styling` | P com tarefa acima | @dev-public | — |
| Header premium do booking | @dev-public | `impeccable bolder` | P com tarefa acima | @dev-public | — |
| Revisão UX mobile do fluxo público | @ux-design-expert | `impeccable critique` + `ui-ux-pro-max --domain ux` | S | @dev-public | Meio do Sprint 5 |
| QA funcional cross-browser + a11y + LCP | @qa | `impeccable audit` + `impeccable optimize` | S | @pm | Ao final do Sprint 5 |

**Observação:** Este sprint é o único com trabalho pesado em paralelo. Recomenda-se **spawnar um sub-agente `@dev-public`** para isolar o fluxo público do admin, evitando conflitos de contexto. O handoff entre `@dev` e `@dev-public` é mínimo (compartilham apenas os tokens do Design System).

---

### Sprint 6 — QA, Performance, Release

| Tarefa | Agente Principal | Skills | Modo | Handoff Para | Quando |
|--------|------------------|--------|------|--------------|--------|
| Regressão visual completa (barber/beauty, dark/light) | @qa + @ux-design-expert | `impeccable critique` (cada módulo) | S | @architect | Semana 1 |
| Bundle analysis | @dev | `impeccable optimize` | S | @architect | Semana 1 |
| RLS audit | @dev | — | S | @architect | Semana 1 |
| Audit de acessibilidade | @qa | `impeccable audit` + `ui-ux-pro-max --domain ux` | S | @architect | Semana 1 |
| Testes em dispositivos reais/emuladores | @qa | `impeccable audit` (responsive) | S | @architect | Semana 2 |
| Documentação do Design System final | @architect | `design-system` | S | @pm | Semana 2 |
| Documentação final e release notes | @architect | — | S | @pm | Semana 2 |
| Aprovação de release candidate | @pm | — | S | — | Final do Sprint 6 |

**Observação:** Sprint 6 é 100% sequencial e de integração. Nenhum desenvolvimento de feature ocorre aqui.

---

## Regras de Spawn de Sub-Agentes

| Situação | Sub-Agente Sugerido | Motivo |
|----------|---------------------|--------|
| Booking Público (Sprint 5) | `@dev-public` | Isola o contexto do cliente final (tema obsidian/silk) do admin, reduzindo conflitos de estado. |
| CSS Global massivo (Sprint 1) | `@dev-css` | Foco exclusivo no bloco `<style>` do `index.html` e tokens Tailwind, evitando poluir o raciocínio do dev de componentes. |
| QA intensivo em mobile (Sprint 6) | `@qa-mobile` | Foco em testes em emuladores iOS/Android e validação de touch targets. |
| Protótipos de múltiplos módulos (Sprint 1–2) | `@ux-junior` | Apoio ao @ux-design-expert na geração de protótipos HTML/figma para módulos não críticos. |

---

## Pontos de Handoff Críticos

1. **Sprint 1 → Sprint 2 (H1)**
   - **De:** @ux-design-expert + @dev
   - **Para:** @dev (Dashboard)
   - **Entregável:** Tokens congelados + protótipos hi-fi do Dashboard aprovados por @architect.

2. **Sprint 2 → Sprint 3 (H2)**
   - **De:** @dev (Dashboard)
   - **Para:** @dev (Agenda)
   - **Entregável:** Dashboard mergeado em `develop`, testado por @qa.

3. **Sprint 5 → Sprint 6 (H3)**
   - **De:** @dev + @dev-public
   - **Para:** @qa + @architect
   - **Entregável:** Todos os módulos redesign mergeados em `develop`, congelados para QA.

4. **Sprint 6 → Release (H4)**
   - **De:** @qa + @architect
   - **Para:** @pm
   - **Entregável:** Release Candidate com checklist de QA assinado, bundle audit e RLS audit.

---

## Resumo de Paralelismo

```
Sprint 1:  UX-proto  ||  Dev-tokens
Sprint 2:  Dev-dashboard  ||  UX-proto-agenda
Sprint 3:  Dev-agenda     ||  UX-proto-finance
Sprint 4:  Dev-finance    ||  UX-proto-settings+booking
Sprint 5:  Dev-settings   ||  Dev-public-booking  ||  UX-review
Sprint 6:  QA + Audit (sequencial)
```

**Regra de ouro:** Nunca mais de 2 trilhos de desenvolvimento em paralelo para não degradar a qualidade do review.
