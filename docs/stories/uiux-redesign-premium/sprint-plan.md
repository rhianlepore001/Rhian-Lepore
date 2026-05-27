# Sprint Plan — UI/UX Premium Redesign

**Duração do sprint:** 2 semanas  
**Total de sprints:** 6  
**Início sugerido:** Imediatamente após aprovação deste plano.

---

## Sprint 1 — Foundation: Design System
**Sprint Goal:** Estabelecer a base visual premium que desbloqueia todos os módulos seguintes.

| # | Story / Task | Assignee | Tamanho | Dependências |
|---|--------------|----------|---------|--------------|
| 1.1 | Refinar tokens de cor, radius, sombra e tipografia em `useBrutalTheme.ts` | @dev | M | — |
| 1.2 | Atualizar `BrutalCard` (remover Screw, ajustar header/title, manter glass) | @dev | M | 1.1 |
| 1.3 | Atualizar `BrutalButton` (font-sans, hover brightness, active scale, outline premium) | @dev | M | 1.1 |
| 1.4 | Atualizar `Modal` (borda sutil, shadow-promax-depth, remover dots/tracejado) | @dev | M | 1.1 |
| 1.5 | Revisar bloco `<style>` do `index.html` (classes `.brutal-*`, `.input-brutal`, scrollbar) | @dev | M | 1.1 |
| 1.6 | Garantir que testes de `BrutalCard`, `BrutalButton`, `Modal`, `useBrutalTheme` passem | @dev | M | 1.2–1.4 |
| 1.7 | Protótipos hi-fi do Dashboard e Agenda (para adiantar Sprints 2–3) | @ux-design-expert | L | — |
| 1.8 | Revisão de arquitetura e aprovação dos tokens por @architect | @architect | S | 1.1–1.5 |

**Milestone:** Design System v2.0 congelado.

---

## Sprint 2 — Core Experience: Dashboard + Layout
**Sprint Goal:** Entregar a nova cara do produto com Dashboard premium e navegação refinada.

| # | Story / Task | Assignee | Tamanho | Dependências |
|---|--------------|----------|---------|--------------|
| 2.1 | Redesign `Dashboard.tsx` — grid mobile-first, KPI cards com mini-gráficos | @dev | L | Sprint 1 |
| 2.2 | Criar componentes `DashboardKpiCard`, `MiniSparkline`, `EmptyState` | @dev | M | 2.1 |
| 2.3 | Redesign `DashboardHero` — tipografia refinada, CTA consistente | @dev | M | 2.1 |
| 2.4 | Otimizar `Header.tsx` e `Sidebar.tsx` — mobile nav, blur, transições | @dev | M | Sprint 1 |
| 2.5 | Revisar `SetupCopilot` / onboarding — tornar colapsável ou contextual | @dev | M | 2.1 |
| 2.6 | Escrever testes para novos componentes de Dashboard | @dev | S | 2.2 |
| 2.7 | Revisão visual de consistência cross-page | @ux-design-expert | M | 2.1–2.4 |
| 2.8 | QA funcional e regressão dos testes existentes | @qa | M | 2.1–2.6 |

**Milestone:** Dashboard e Layout redesenhados e estáveis.

---

## Sprint 3 — Operações: Agenda
**Sprint Goal:** Transformar a Agenda na ferramenta mais rápida e agradável de usar no celular.

| # | Story / Task | Assignee | Tamanho | Dependências |
|---|--------------|----------|---------|--------------|
| 3.1 | Redesign da lista de agendamentos (`Agenda.tsx`) — cards com respiro | @dev | L | Sprint 1 |
| 3.2 | Criar `AgendaListItem` com avatar circular, glass sutil, badges de status | @dev | M | 3.1 |
| 3.3 | Criar `ProfessionalFilter` visual com chips e fotos | @dev | M | 3.1 |
| 3.4 | Empty state elegante para dias sem agendamentos | @dev | S | 3.1 |
| 3.5 | Refinar `AppointmentWizard` e `AppointmentEditModal` com novos tokens | @dev | M | 3.1 |
| 3.6 | Mobile: otimizar touch targets e scroll do grid de horários | @dev | M | 3.1 |
| 3.7 | Revisão de UX e acessibilidade | @ux-design-expert | M | 3.1–3.5 |
| 3.8 | QA funcional, testes de regressão | @qa | M | 3.1–3.6 |

**Milestone:** Agenda redesenhada, mobile-first validada.

---

## Sprint 4 — Controle: Financeiro
**Sprint Goal:** Dar ao financeiro a cara de uma fintech premium com dados claros e visualizações ricas.

| # | Story / Task | Assignee | Tamanho | Dependências |
|---|--------------|----------|---------|--------------|
| 4.1 | Redesign dos cards de resumo (`Finance.tsx`) — KPIs com indicador de tendência | @dev | L | Sprint 1 |
| 4.2 | Criar `TrendIndicator`, `FinanceKpiCard` | @dev | M | 4.1 |
| 4.3 | Zebra-striping e hover states na tabela desktop de transações | @dev | M | 4.1 |
| 4.4 | Mobile: `TransactionCardMobile` com layout premium e ações swipe-friendly | @dev | L | 4.1 |
| 4.5 | Gráficos refinados (area/bar/pie) com cores dos tokens | @dev | M | 4.1 |
| 4.6 | Reduzir botões "AJUDA" excessivos; manter apenas onde há complexidade real | @dev | S | 4.1 |
| 4.7 | Revisão visual e consistência de dados | @ux-design-expert | M | 4.1–4.5 |
| 4.8 | QA funcional, regressão de `FinancialSettings.test.tsx` | @qa | M | 4.1–4.6 |

**Milestone:** Financeiro redesenhado, tabelas e gráficos validados.

---

## Sprint 5 — Configuração & Público: Ajustes + Booking
**Sprint Goal:** Simplificar a configuração e elevar a primeira impressão do cliente final.

| # | Story / Task | Assignee | Tamanho | Dependências |
|---|--------------|----------|---------|--------------|
| 5.1 | Redesign de Settings — cards temáticos por seção (`GeneralSettings`, etc.) | @dev | L | Sprint 1 |
| 5.2 | Criar `SettingsSectionCard`, `ToggleSwitch`, `ImageUploadZone` | @dev | M | 5.1 |
| 5.3 | Construtor de horários visual (`BusinessHoursEditor`) — grid intuitivo | @dev | L | 5.1 |
| 5.4 | Redesign `PublicBooking.tsx` — header premium (logo, cover, rating) | @dev | L | Sprint 1 |
| 5.5 | Criar fluxo direto alternativo ao chat (`QuickBookingFlow`) | @dev | L | 5.4 |
| 5.6 | Otimizar LCP do booking público (< 3s) — lazy load de imagens | @dev | M | 5.4 |
| 5.7 | Revisão de UX mobile do fluxo público | @ux-design-expert | M | 5.4–5.5 |
| 5.8 | QA funcional cross-browser e regressão | @qa | L | 5.1–5.6 |

**Milestone:** Ajustes simplificados e Booking Público premium entregues.

---

## Sprint 6 — Consolidação: QA, Performance, Release
**Sprint Goal:** Garantir que o produto inteiro esteja coeso, rápido e sem regressões.

| # | Story / Task | Assignee | Tamanho | Dependências |
|---|--------------|----------|---------|--------------|
| 6.1 | Regressão visual completa (tema barber + beauty, dark + light) | @qa | L | Sprints 2–5 |
| 6.2 | Bundle analysis — identificar e splitar chunks se > 15% de aumento | @dev | M | 6.1 |
| 6.3 | RLS audit — verificar `company_id` em todas as queries novas/modificadas | @dev | M | Sprints 2–5 |
| 6.4 | Audit de acessibilidade (contrastes, focus rings, aria-labels, tab order) | @qa | M | 6.1 |
| 6.5 | Testes em dispositivos reais / emuladores (iPhone SE, Pixel 5) | @qa | M | 6.1 |
| 6.6 | Documentação final de handoff para @pm e release notes | @architect | S | 6.1–6.5 |
| 6.7 | Aprovação de release candidate e merge para `main` | @pm | S | 6.6 |

**Milestone:** Release Candidate aprovado.

---

## Resumo de Velocidade

- **Sprint 1:** 100% sequencial (fundação).
- **Sprints 2–5:** Paralelismo entre UX design (sprint à frente) e Dev implementation. Dev pode trabalhar em 1 módulo por sprint.
- **Sprint 6:** 100% sequencial (integração e QA).

**Duração total:** 12 semanas (~3 meses) com velocidade máxima sustentável e qualidade garantida.
