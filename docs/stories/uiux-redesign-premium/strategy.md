# Estratégia de Implementação — UI/UX Premium AgendiX

## 1. Executive Summary

O AgendiX será elevado de uma plataforma funcional para uma experiência SaaS premium, mantendo a identidade dos temas `barber` (dark industrial) e `beauty` (light elegante). O redesign é guiado pelo relatório de auditoria UI/UX (notas 4–6/10) e prioriza mobile-first, já que barbeiros e profissionais de beleza operam majoritariamente via celular.

**Objetivos-chave:**
- Unificar e modernizar o Design System (tokens, tipografia, sombras, radius).
- Elevar as notas de UX dos módulos críticos: Dashboard, Agenda, Financeiro, Ajustes e Booking Público.
- **Dark-first premium:** Elevar o dark mode para estética profissional. Light mode permanece funcional (MVP) — não quebrar, mas não aprimorar.
- Manter 100% dos testes existentes passando.
- Preservar RLS, multi-tenant (`company_id`) e auth Supabase.

**Duração estimada total:** 12 semanas (6 sprints de 2 semanas).

---

## 2. Fases & Timeline

| Fase | Sprint | Foco | Entregável Principal |
|------|--------|------|---------------------|
| **Fase 1 — Foundation** | Sprint 1 | Design System & Tokens | Tokens refinados, BrutalCard/BrutalButton/Modal atualizados, CSS global revisado |
| **Fase 2 — Core Experience** | Sprint 2 | Dashboard + Layout/Header/Sidebar | Dashboard redesign, navegação premium, empty states |
| **Fase 3 — Operações** | Sprint 3 | Agenda | Agenda redesign, wizard otimizado, filtros visuais |
| **Fase 4 — Controle** | Sprint 4 | Financeiro | KPIs com tendência, gráficos refinados, tabelas zebra mobile |
| **Fase 5 — Configuração & Público** | Sprint 5 | Ajustes + Booking Público | Settings em cards temáticos, fluxo de agendamento direto, header premium |
| **Fase 6 — Consolidação** | Sprint 6 | QA, Performance, Release Candidate | Regressão visual, bundle audit, RLS audit, docs atualizadas |

**Velocidade máxima sustentável:** 6 sprints de 2 semanas. Após o Sprint 1 (que é sequencial e bloqueante), Sprints 2–5 podem ter trilhos paralelos (ex: UX design de um módulo enquanto Dev implementa outro), mas cada módulo individual demanda ~1 sprint de dev focado.

**Arsenal de Skills:** Cada sprint utiliza skills especializadas (`impeccable`, `ui-ux-pro-max`, `interface-design`, `ui-styling`, `design-system`, `tlc-spec-driven`) conforme detalhado em `skill-matrix.md`. Isso eleva a qualidade do output e reduz retrabalho.

---

## 3. Agent/Team Allocation

| Agente | Responsabilidade | Sprints Ativos |
|--------|------------------|----------------|
| **@ux-design-expert** | Protótipos hi-fi, design tokens visuais, revisão de consistência cross-module | 1–5 (spike à frente do dev) |
| **@dev (senior)** | Design System + Dashboard + Layout | 1–2 |
| **@dev (feature)** | Agenda + Financeiro | 3–4 |
| **@dev (feature)** | Ajustes + Booking Público | 4–5 |
| **@qa** | Testes de regressão, mobile testing, acessibilidade | 1, 6 (contínuo a partir do Sprint 2) |
| **@pm** | Coordenação de handoffs, aprovação de critérios de aceitação | 1–6 |
| **@architect (Aria)** | Revisão técnica de specs, aprovação de arquitetura, unblocking | 1–6 |

**Sub-agentes sugeridos:**
- Durante o Sprint 1, spawnar um sub-agente `@dev-css` para o bloco `<style>` do `index.html` e tokens Tailwind.
- Durante o Sprint 5, spawnar um sub-agente `@dev-public` para o fluxo de booking público (isolado do admin).

---

## 4. Dependency Graph

```
Sprint 1: Design System
    │
    ├──> Sprint 2: Dashboard (depende de BrutalCard, BrutalButton, tokens)
    │       └──> Sprint 6: QA Dashboard
    │
    ├──> Sprint 3: Agenda (depende de tokens, Modal, Input)
    │       └──> Sprint 6: QA Agenda
    │
    ├──> Sprint 4: Financeiro (depende de tokens, tabela zebra, KPI cards)
    │       └──> Sprint 6: QA Financeiro
    │
    ├──> Sprint 5: Ajustes (depende de tokens, toggle switches, upload)
    │       └──> Sprint 6: QA Ajustes
    │
    └──> Sprint 5: Booking Público (depende de tokens, temas obsidian/silk)
            └──> Sprint 6: QA Booking
```

**Regra de ouro:** Nenhuma alteração de CSS global ou token pode ser feita após o Sprint 2 sem revisão do @architect, para evitar regressões cross-module.

---

## 5. Risk Register

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Quebra de testes existentes (BrutalCard, BrutalButton, Modal, useBrutalTheme) | Alta | Alto | Manter classes CSS esperadas nos testes (`rounded-2xl`, `bg-brutal-card`, `bg-accent-gold`). Executar `npm test` a cada PR. |
| Regressão visual no tema Beauty | Média | Alto | Toda mudança no tema Barber deve ser validada com `forceTheme="beauty"` em storybook/screenshot. |
| Aumento de bundle size com novos gráficos/ícones | Média | Médio | Audit de bundle no Sprint 6. Usar lazy loading para modais pesados (padrão já existente). Recharts já está no projeto. |
| RLS inadvertidamente desabilitado em novas queries | Baixa | Crítico | Revisão obrigatória de todo código que toca Supabase. Checklist de RLS em cada PR. |
| Mobile layout quebrado em telas < 390px | Média | Alto | Mobile-first em todos os protótipos. Teste em Chrome DevTools 390px antes de merge. |
| Delay no Design System bloqueia módulos subsequentes | Baixa | Alto | Congelar tokens no final do Sprint 1. Não aceitar "só mais um ajuste" no DS após o Sprint 2. |

---

## 6. Definition of Done (por fase)

### Fase 1 — Design System
- [ ] `npm run typecheck` passa sem erros.
- [ ] `npm run lint` passa sem erros.
- [ ] `npm test` passa — todos os testes de `BrutalCard`, `BrutalButton`, `Modal`, `useBrutalTheme` permanecem verdes.
- [ ] **Light mode funcional:** Todos os componentes renderizam corretamente no light mode (não precisa estar premium, mas não pode quebrar).
- [ ] **Regra técnica validada:** Zero hardcode de cor em componentes. Todos usam tokens do `useBrutalTheme`.
- [ ] Tokens documentados em `docs/stories/uiux-redesign-premium/specs/design-system-spec.md`.
- [ ] Handoff escrito para @dev dos módulos seguintes.

### Fase 2 — Dashboard
- [ ] Dashboard renderiza corretamente em mobile (390px) e desktop.
- [ ] Onboarding não ocupa espaço vertical permanente (banner colapsável ou tour contextual).
- [ ] Novos componentes de KPI possuem testes unitários.
- [ ] Nenhum `alert()` nativo remanescente em fluxos críticos.
- [ ] Handoff para @qa.

### Fase 3 — Agenda
- [ ] Agenda com empty state elegante e animado.
- [ ] Grid de horários com respiro visual e avatares circulares.
- [ ] Wizard de agendamento mantém todos os passos funcionais.
- [ ] Testes existentes de `AppointmentReview` e `CheckoutModal` passam.

### Fase 4 — Financeiro
- [ ] Tabela desktop com zebra-striping e hover states.
- [ ] Visão mobile em cards de transação premium (sem perda de informação).
- [ ] Gráficos de tendência renderizados via Recharts.
- [ ] Testes existentes de `FinancialSettings.test.tsx` passam.

### Fase 5 — Ajustes + Booking
- [ ] Settings com cards temáticos e navegação clara.
- [ ] Construtor de horários visual funcional.
- [ ] Booking público com fluxo direto alternativo ao chat.
- [ ] Header do booking com logo/banner premium e LCP < 3s.

### Fase 6 — QA & Release
- [ ] Regressão visual completa em ambos os temas.
- [ ] Bundle size auditado — sem aumento > 15%.
- [ ] RLS auditado em todas as queries novas/modificadas.
- [ ] Checklist de acessibilidade (contrastes, focus rings, aria-labels).
- [ ] Documentação de handoff final para @pm.
