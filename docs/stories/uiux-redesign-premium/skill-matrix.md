# Skill Matrix — UI/UX Premium Redesign

Este documento mapeia cada fase e tarefa do redesign para as skills especializadas disponíveis no arsenal da AgendiX. O objetivo é elevar a qualidade do output, reduzir retrabalho e garantir consistência cross-module.

---

## Arsenal de Skills Disponíveis

| Skill | Escopo | Quando Usar | Comando de Ativação |
|-------|--------|-------------|---------------------|
| **`impeccable`** | Frontend design, UI/UX, motion, tokens, a11y, performance | Toda tarefa que envolve interface visual, componente ou página | `/impeccable <command> [target]` |
| **`ui-ux-pro-max`** | 50+ estilos, 161 paletas, 57 font pairings, 25 chart types, 99 UX guidelines | Decisões de estilo, paleta, tipografia, layout, análise heurística | `skill: ui-ux-pro-max` |
| **`interface-design`** | Dashboards, admin panels, SaaS apps, settings, data interfaces | Design de dashboards, tabelas, KPIs, formulários complexos | `skill: interface-design` |
| **`frontend-design`** | Landing pages, marketing sites, campaigns, web components | Booking público (é a porta de entrada do cliente — precisa de impacto) | `skill: frontend-design` |
| **`ui-styling`** | shadcn/ui, Tailwind CSS, Radix UI, componentes acessíveis | Implementação de componentes com Tailwind + shadcn | `skill: ui-styling` |
| **`design-system`** | Tokens (primitive→semantic→component), CSS variables, spacing/typography scales, component specs | Sprint 1 — Foundation. Também revisitado em cada sprint para novos tokens | `skill: design-system` |
| **`tlc-spec-driven`** | Spec-driven development: Specify → Design → Tasks → Execute | Criar specs de cada módulo, quebrar em tasks atômicas, rastreabilidade | `skill: tlc-spec-driven` |

---

## Skill Allocation por Sprint

### Sprint 1 — Design System (Foundation)

| Tarefa | Agentes | Skills | Comandos / Uso |
|--------|---------|--------|----------------|
| Definir PRODUCT.md + DESIGN.md do projeto | @ux-design-expert | `impeccable` | `/impeccable teach` — gera PRODUCT.md e DESIGN.md baseados no contexto da AgendiX |
| Extrair tokens do código existente | @dev | `impeccable` | `/impeccable extract` — pull reusable tokens e components into design system |
| Definir arquitetura de tokens (3 camadas) | @architect + @dev | `design-system` | `skill: design-system` — primitive → semantic → component tokens |
| Refatorar BrutalCard, BrutalButton, Modal | @dev | `ui-styling` + `impeccable` | `skill: ui-styling` para implementação com shadcn/ui; `/impeccable craft` para o shape final |
| Revisar CSS global (index.html) | @dev | `impeccable` | `/impeccable document` — gera DESIGN.md do código existente; depois `/impeccable polish` |
| **Quality Gate** | @qa | `impeccable` | `/impeccable audit` — technical quality checks (a11y, perf, responsive) |

**Observação:** `impeccable` é a skill mestre do Sprint 1. Seu comando `teach` estabelece o contexto de marca; `extract` puxa tokens do legado; `document` gera DESIGN.md. Isso evita que devs "inventem" tokens do zero.

---

### Sprint 2 — Dashboard + Layout

| Tarefa | Agentes | Skills | Comandos / Uso |
|--------|---------|--------|----------------|
| Design de KPI cards, sparklines, empty states | @ux-design-expert | `interface-design` + `ui-ux-pro-max` | `skill: interface-design` para o dashboard craft; `skill: ui-ux-pro-max` para escolher estilo e paleta |
| Escolher estilo visual do Dashboard | @ux-design-expert | `ui-ux-pro-max` | `--design-system` query para recomendação de estilo baseado em "salon management SaaS" |
| Implementar DashboardKpiCard, MiniSparkline | @dev | `ui-styling` + `impeccable` | `skill: ui-styling` para componentes com Tailwind; `/impeccable craft DashboardKpiCard` |
| Refinar Header.tsx, Sidebar.tsx | @dev | `impeccable` | `/impeccable layout Header` — fix spacing, rhythm, visual hierarchy |
| Onboarding redesenhado | @ux-design-expert | `impeccable` | `/impeccable onboard Dashboard` — design first-run flows, empty states, activation |
| **Quality Gate** | @qa | `impeccable` | `/impeccable audit Dashboard` — a11y, perf, responsive; `/impeccable critique Dashboard` — heuristic scoring |

---

### Sprint 3 — Agenda

| Tarefa | Agentes | Skills | Comandos / Uso |
|--------|---------|--------|----------------|
| Design de grid de horários, cards de agendamento | @ux-design-expert | `interface-design` + `impeccable` | `skill: interface-design` para o domínio "appointment scheduling"; `/impeccable shape Agenda` |
| Empty state elegante | @ux-design-expert | `impeccable` | `/impeccable onboard Agenda` — empty states com ilustrações e mensagens encorajadoras |
| Implementar AgendaListItem, ProfessionalFilter | @dev | `ui-styling` + `impeccable` | `/impeccable craft AgendaListItem` — shape + build end-to-end |
| Avatares circulares, indicadores de status | @dev | `ui-ux-pro-max` | `--domain ux` para touch targets, spacing, hit areas |
| Wizard de agendamento otimizado | @dev | `impeccable` | `/impeccable distill AppointmentWizard` — strip to essence, remove complexity |
| **Quality Gate** | @qa | `impeccable` | `/impeccable audit Agenda` — a11y, mobile layout, touch targets |

---

### Sprint 4 — Financeiro

| Tarefa | Agentes | Skills | Comandos / Uso |
|--------|---------|--------|----------------|
| Design de KPIs financeiros, gráficos, tabelas | @ux-design-expert | `interface-design` + `ui-ux-pro-max` | `skill: interface-design` para data density; `skill: ui-ux-pro-max` para charts (25 tipos) |
| Escolher tipos de gráfico (Recharts) | @ux-design-expert | `ui-ux-pro-max` | `--domain chart` para legends, tooltips, accessible colors |
| Implementar FinanceKpiCard, TrendIndicator | @dev | `ui-styling` + `impeccable` | `/impeccable craft FinanceKpiCard` |
| Tabela zebra com hover states | @dev | `ui-styling` + `ui-ux-pro-max` | `skill: ui-ux-pro-max` para zebra-striping, hover states, form feedback |
| Cards de transação mobile | @dev | `impeccable` | `/impeccable adapt Financeiro` — adapt for different devices and screen sizes |
| **Quality Gate** | @qa | `impeccable` | `/impeccable audit Financeiro` — contrastes em tabelas, focus rings |

---

### Sprint 5 — Ajustes + Booking Público

| Tarefa | Agentes | Skills | Comandos / Uso |
|--------|---------|--------|----------------|
| Design de Settings em cards temáticos | @ux-design-expert | `interface-design` + `impeccable` | `skill: interface-design` para settings pages; `/impeccable shape Settings` |
| Construtor de horários visual | @ux-design-expert + @dev | `ui-styling` + `impeccable` | `/impeccable craft VisualHoursBuilder` — componente interativo complexo |
| Toggle switches, steppers | @dev | `ui-styling` | `skill: ui-styling` — shadcn/ui Switch, Stepper components |
| Booking público — fluxo direto | @dev-public | `frontend-design` + `impeccable` | `skill: frontend-design` para landing/flow impact; `/impeccable craft QuickBookingFlow` |
| Personalização de banner/logo no booking | @dev-public | `frontend-design` | `skill: frontend-design` — hero sections, brand expression |
| Header premium do booking | @dev-public | `impeccable` | `/impeccable bolder PublicHero` — amplify safe or bland designs |
| **Quality Gate** | @qa | `impeccable` | `/impeccable audit Booking` — mobile-first, LCP < 3s, a11y |

---

### Sprint 6 — QA, Performance, Release

| Tarefa | Agentes | Skills | Comandos / Uso |
|--------|---------|--------|----------------|
| Regressão visual (barber/beauty, dark/light) | @qa + @ux-design-expert | `impeccable` | `/impeccable critique` — UX design review with heuristic scoring em cada módulo |
| Bundle analysis | @dev | `impeccable` | `/impeccable optimize` — diagnose and fix UI performance, bundle size |
| Acessibilidade audit | @qa | `impeccable` + `ui-ux-pro-max` | `/impeccable audit` (a11y); `skill: ui-ux-pro-max` (contrast 4.5:1, focus rings, aria-labels) |
| Polish final antes do release | @dev + @ux-design-expert | `impeccable` | `/impeccable polish` — final quality pass before shipping em cada módulo |
| Documentação do Design System final | @architect | `design-system` | `skill: design-system` — documentar tokens, component specs, slide generation |

---

## Regras de Uso das Skills

### 1. `impeccable` é a skill mestre
Toda tarefa de UI/UX DEVE passar por `impeccable` antes da implementação final. Seus comandos são:
- **`/impeccable teach`** → Sprint 1 apenas (gera PRODUCT.md + DESIGN.md)
- **`/impeccable shape [feature]`** → Antes de codar qualquer módulo (planeja UX/UI)
- **`/impeccable craft [feature]`** → Implementação end-to-end do componente/página
- **`/impeccable audit [target]`** → Quality gate técnico (a11y, perf, responsive)
- **`/impeccable critique [target]`** → Review heurístico de UX
- **`/impeccable polish [target]`** → Passada final antes de merge
- **`/impeccable layout [target]`** → Fix spacing, rhythm, visual hierarchy
- **`/impeccable onboard [target]`** → Empty states, first-run flows
- **`/impeccable adapt [target]`** → Responsive behavior
- **`/impeccable optimize [target]`** → UI performance
- **`/impeccable extract [target]`** → Pull tokens/components into design system
- **`/impeccable document`** → Gera DESIGN.md do código existente

### 2. `ui-ux-pro-max` é a skill de decisão
Usada para escolher estilos, paletas, font pairings, chart types e validar guidelines UX. Ative com `skill: ui-ux-pro-max` quando:
- Escolher estilo visual de um módulo
- Definir paleta de cores ou tipografia
- Criar/revisar gráficos e data viz
- Validar acessibilidade (contrastes, touch targets)

### 3. `interface-design` é a skill de domínio
Especializada em dashboards, admin panels, SaaS apps. Ative com `skill: interface-design` quando:
- Projetar o Dashboard
- Projetar tabelas de dados densas (Financeiro)
- Projetar formulários complexos (Ajustes)
- Projetar empty states e onboarding

### 4. `frontend-design` é para o Booking Público
O booking é a "landing page" do cliente final — precisa de impacto visual. Ative com `skill: frontend-design` para:
- Hero sections
- Fluxos de conversão
- Brand expression

### 5. `ui-styling` é a skill de implementação
Usada na camada de código. Ative com `skill: ui-styling` quando:
- Implementar componentes com Tailwind CSS
- Usar shadcn/ui (Dialog, Dropdown, Form, Table)
- Customizar temas e cores
- Implementar dark mode

### 6. `design-system` é a skill de tokens
Ative com `skill: design-system` quando:
- Criar ou revisar tokens (primitive → semantic → component)
- Definir CSS variables
- Criar specs de componentes
- Gerar apresentações/documentação do DS

### 7. `tlc-spec-driven` é a skill de planejamento
Ative com `skill: tlc-spec-driven` quando:
- Criar specs de features (Specify phase)
- Quebrar specs em tasks atômicas (Tasks phase)
- Rastrear progresso e decisions

---

## Workflow Recomendado por Módulo

Para cada módulo (Dashboard, Agenda, Financeiro, Ajustes, Booking), siga este workflow:

```
1. SPECIFY (tlc-spec-driven)
   └─> skill: tlc-spec-driven → Define requisitos, critérios de aceitação

2. DESIGN (interface-design / frontend-design + ui-ux-pro-max)
   └─> skill: interface-design → Explore domínio, defina signature
   └─> skill: ui-ux-pro-max → Escolha estilo, paleta, font pairing
   └─> /impeccable shape [modulo] → Planeje UX/UI antes de codar

3. IMPLEMENT (ui-styling + impeccable)
   └─> skill: ui-styling → Implemente com Tailwind + shadcn/ui
   └─> /impeccable craft [componente] → Build end-to-end

4. QUALITY (impeccable + ui-ux-pro-max)
   └─> /impeccable audit [modulo] → a11y, perf, responsive
   └─> /impeccable critique [modulo] → heuristic scoring
   └─> skill: ui-ux-pro-max → Valide contrastes, touch targets

5. POLISH (impeccable)
   └─> /impeccable polish [modulo] → Final quality pass before shipping
```

---

## Exemplo Prático: Dashboard

```
# Sprint 2 — Dashboard

# Fase 1: Spec
skill: tlc-spec-driven
→ Cria spec do Dashboard redesign com acceptance criteria

# Fase 2: Design
skill: interface-design
→ Define domínio: "salon owner checking daily revenue at 8am on phone"
→ Signature: "Warm metric cards with micro-trend sparklines"

skill: ui-ux-pro-max --design-system
→ Recomenda estilo: "minimalismo com toques de brutalismo suave"
→ Paleta: mantém roxo/violeta, adiciona warm neutrals

/impeccable shape Dashboard
→ Gera shape.md com: layout, componentes, estados, micro-interactions

# Fase 3: Implement
skill: ui-styling
→ Implementa DashboardKpiCard com Tailwind + shadcn/ui

/impeccable craft DashboardKpiCard
→ Shape + build end-to-end do componente

/impeccable layout Dashboard
→ Fix spacing, rhythm, visual hierarchy

# Fase 4: Quality
/impeccable audit Dashboard
→ Contrastes, focus rings, mobile layout, perf

/impeccable critique Dashboard
→ Heuristic scoring UX

skill: ui-ux-pro-max --domain ux
→ Valida touch targets ≥ 44px, spacing 8px+, loading feedback

# Fase 5: Polish
/impeccable polish Dashboard
→ Final quality pass
```

---

## Notas para o Time

- **Nunca pule o `shape`**: `/impeccable shape` é obrigatório antes de `/impeccable craft`. Shape evita retrabalho.
- **Nunca pule o `audit`**: `/impeccable audit` é obrigatório antes de merge. Audit evita regressões de a11y e perf.
- **`ui-ux-pro-max` é consultiva**: Use para tomar decisões, não para gerar código. Ela é a "biblioteca de referência".
- **`impeccable` é executora**: Use para gerar código, revisar, polir. Ela é a "ferramenta de trabalho".
- **Combine skills**: Um mesmo módulo pode usar 3–4 skills em sequência. Isso é esperado e desejável.

---

*Skill Matrix v1.0 — Atualizado pelo CEO (Cadu) após identificação do arsenal completo de skills.*
