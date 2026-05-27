# Spec: Dashboard Redesign

## Objetivo

Elevar a experiência do Dashboard de nota 6/10 para 9/10, transformando-o no cockpit premium do gestor de barbearia/salão. Foco em cards com mini-gráficos, tipografia refinada, onboarding não-intrusivo e empty states elegantes.

---

## Scope

### In
- `pages/Dashboard.tsx` — estrutura, grid, banners.
- `components/dashboard/DashboardHero.tsx` — saudação, CTA.
- `components/dashboard/ProfitMetrics.tsx` — métricas de receita/lucro.
- `components/dashboard/ActionCenter.tsx` — ações rápidas.
- `components/dashboard/BusinessHealthCard.tsx` — saúde do negócio.
- `components/dashboard/MeuDiaWidget.tsx` — visão do profissional (staff).
- `components/dashboard/SetupCopilot.tsx` — onboarding/guia.
- Modais do dashboard (`GoalSettingsModal`, `AllAppointmentsModal`, etc.).

### Out
- Hooks de dados (`useDashboardData`) — manter lógica existente.
- Backend / Supabase queries.

---

## Technical Approach

1. **Grid Mobile-First**
   - Mobile: 1 coluna, cards empilhados com `gap-4`.
   - Tablet+: 2 colunas para KPIs e health card.
   - Desktop: layout assimétrico com hero em full width e cards em grid 2–3 colunas.

2. **KPI Cards com Mini-Gráficos**
   - Criar `DashboardKpiCard` que encapsula: título, valor principal, variação percentual e sparkline.
   - Sparkline via `recharts` (já no projeto) — componente `MiniSparkline` reutilizável.
   - Cores: verde para crescimento, vermelho para queda, usando tokens do `useBrutalTheme`.

3. **Onboarding Não-Intrusivo**
   - Substituir o banner fixo do `SetupCopilot` por um card colapsável ou tour contextual (tooltips sequenciais).
   - Quando todas as etapas estiverem completas, ocultar automaticamente.

4. **Empty States**
   - Criar `EmptyState` reutilizável: ícone ilustrativo (Lucide), mensagem amigável, CTA primário.
   - Aplicar na lista de agendamentos do dia e no centro de ações quando vazio.

5. **Tipografia Refinada**
   - Títulos: `font-heading` com `tracking-tight`, tamanho responsivo (`text-2xl md:text-3xl`).
   - Valores monetários: `font-mono` com `tabular-nums` para alinhamento.
   - Labels: `font-sans` com `text-xs uppercase tracking-wider`.

6. **Animações**
   - `animate-in fade-in slide-in-from-bottom-4` nos cards (já usado, manter).
   - Hover sutil nos cards: `hover:translateY(-2px)` + `shadow-promax-depth`.

---

## Component List

| Componente | Descrição |
|------------|-----------|
| `DashboardKpiCard` | Card de KPI com título, valor, variação e sparkline |
| `MiniSparkline` | Gráfico de linha minimalista (Recharts) |
| `EmptyState` | Ilustração + mensagem + CTA para estados vazios |
| `OnboardingBanner` | Versão colapsável do SetupCopilot |
| `DashboardGrid` | Wrapper responsivo do layout |

---

## Data Requirements

- Mesmas do `useDashboardData` hook: `appointments`, `currentMonthRevenue`, `monthlyGoal`, `profitMetrics`, `financialDoctor`, `actionItems`.
- Nenhuma query nova no Supabase.

---

## Acceptance Criteria

- [ ] Dashboard renderiza sem erros em mobile (390px) e desktop (1440px).
- [ ] KPIs exibem sparklines animadas ao carregar.
- [ ] Onboarding não ocupa espaço vertical fixo após dismiss.
- [ ] Empty states aparecem quando não há agendamentos ou ações.
- [ ] Testes existentes (`useDashboardData.test.ts`, `ProfitMetrics.test.tsx`) passam.
- [ ] `npm run typecheck` e `npm run lint` limpos.
- [ ] Dark/Light mode funcionam para ambos os temas.

---

## Estimativa

**Tamanho:** L (1 sprint)  
**Justificativa:** Muitos componentes filhos e integração com dados existentes. Requer refinamento visual iterativo.
