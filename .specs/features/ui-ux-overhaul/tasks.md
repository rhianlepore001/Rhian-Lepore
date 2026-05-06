# UI/UX Overhaul — Tasks

**Spec**: `.specs/features/ui-ux-overhaul/spec.md`
**Status**: In Progress — Sessão pausada em 2026-04-26

## Checkpoint de Progresso

| Task | Arquivo | Status |
|------|---------|--------|
| T01 DashboardHero | `components/dashboard/DashboardHero.tsx` | ✅ Done |
| T02 ProfitMetrics | `components/dashboard/ProfitMetrics.tsx` | ✅ Done |
| T03 ActionCenter | `components/dashboard/ActionCenter.tsx` | ✅ Done |
| T04 BusinessHealthCard | `components/dashboard/BusinessHealthCard.tsx` | ✅ Done |
| T05 MeuDiaWidget | `components/dashboard/MeuDiaWidget.tsx` | ✅ Done |
| T06 SetupCopilot | `components/dashboard/SetupCopilot.tsx` | ✅ Done |
| T07 Sidebar | `components/Sidebar.tsx` | ✅ Done |
| T08 Header | `components/Header.tsx` | ✅ Done |
| T09 AppointmentWizard | `components/AppointmentWizard.tsx` | ✅ Done |
| T10 CheckoutModal | `components/CheckoutModal.tsx` | ✅ Done |
| T11 AppointmentEditModal | `components/AppointmentEditModal.tsx` | ✅ Done |
| T12 QuickActionsModal | `components/QuickActionsModal.tsx` | ✅ Done |
| T13 ClientBookingCard | `components/ClientBookingCard.tsx` | ✅ Done |
| T14 TeamMemberCard | `components/TeamMemberCard.tsx` | ⏳ Pendente — ring do avatar ✅ feito; comissão `text-lg font-bold font-mono` + label `text-[9px] uppercase tracking-widest` ainda falta |
| T15 StaffEarningsCard | `components/StaffEarningsCard.tsx` | ⏳ Pendente |
| T16 Finance summary | `pages/Finance.tsx` | ⏳ Pendente |
| T17 Finance transactions | `pages/Finance.tsx` | ⏳ Pendente |
| T18 Finance tabs | `pages/Finance.tsx` | ⏳ Pendente |
| T19 BrutalCard | `components/BrutalCard.tsx` | ⏳ Pendente |
| T20 Modal | `components/Modal.tsx` | ⏳ Pendente |
| T21 OnboardingLayout | `components/OnboardingLayout.tsx` | ⏳ Pendente |
| T22 Gate final | — | ⏳ Pendente |

**Para retomar:** `claude continue a partir de @.specs/features/ui-ux-overhaul\` — começa pelo T14 comissão e vai até T22.

---

## Gate Check Commands

| Level | Command | When |
|-------|---------|------|
| quick | `npm run typecheck` | Mudanças somente visuais |
| build | `npm run typecheck && npm run lint && npm run build` | Última tarefa de cada fase |

**Nota**: Todas as tarefas são puramente visuais (JSX/CSS). Nenhuma altera lógica de negócio ou queries. Tests field = `none` em todas (sem alteração de comportamento testável por Vitest). Gate = `quick` por tarefa, `build` na verificação final.

---

## Execution Plan

### Fase 1 — Paralela Total (todos os arquivos independentes)

```
┌── T01: DashboardHero        [P]
├── T02: ProfitMetrics         [P]
├── T03: ActionCenter          [P]
├── T04: BusinessHealthCard    [P]
├── T05: MeuDiaWidget          [P]
├── T06: SetupCopilot          [P]
├── T07: Sidebar               [P]
├── T08: Header                [P]
├── T09: AppointmentWizard     [P]
├── T10: CheckoutModal         [P]
├── T11: AppointmentEditModal  [P]
├── T12: QuickActionsModal     [P]
├── T13: ClientBookingCard     [P]
├── T14: TeamMemberCard        [P]
├── T15: StaffEarningsCard     [P]
├── T16: Finance summary cards [P]
├── T17: Finance transactions  [P]
├── T18: Finance tabs          [P]
├── T19: BrutalCard base       [P]
├── T20: Modal base            [P]
└── T21: OnboardingLayout      [P]
```

### Fase 2 — Sequencial (gate final)

```
[Todos T01-T21 completos] → T22: Build Gate Final
```

---

## Task Breakdown

### T01: DashboardHero — Linha de acento + hierarquia tipográfica [P]

**What**: Adicionar linha de acento lateral colorida e melhorar hierarquia do greeting
**Where**: `components/dashboard/DashboardHero.tsx`
**Depends on**: None
**Reuses**: tokens `accent-gold`, `beauty-neon`, `font-heading`, padrão de `animate-in` já no codebase
**Requirement**: UX-02

**Done when**:
- [ ] Saudação usa `font-heading text-2xl md:text-3xl`
- [ ] Subtexto usa `font-mono text-xs uppercase tracking-widest text-neutral-500`
- [ ] Linha de acento lateral: `w-1 h-8 rounded-full` com cor do tema à esquerda do texto
- [ ] Animação de entrada: `animate-in fade-in slide-in-from-bottom-2 duration-500`
- [ ] Gate: `npm run typecheck` passa sem erros

**Tests**: none
**Gate**: quick
**Commit**: `style(dashboard): add accent line and typography hierarchy to DashboardHero`

---

### T02: ProfitMetrics — Números dominantes + hover com shadow [P]

**What**: Elevar tipografia dos valores e ativar hover states com sombra
**Where**: `components/dashboard/ProfitMetrics.tsx`
**Depends on**: None
**Reuses**: `shadow-gold`, `shadow-neon`, `bg-accent-gold/10`, `bg-beauty-neon/10`
**Requirement**: UX-01

**Done when**:
- [ ] Número principal: `text-3xl md:text-4xl font-bold font-mono`
- [ ] Label: `text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-500`
- [ ] Ícone de métrica em container: `p-2.5 rounded-xl bg-accent-gold/10` (barber) ou `bg-beauty-neon/10` (beauty)
- [ ] Trend badge com TrendingUp/TrendingDown `size={12}` em `text-emerald-400` ou `text-red-400`
- [ ] Hover: `hover:border-accent-gold/30 hover:shadow-gold` (barber) / `hover:border-beauty-neon/30 hover:shadow-neon` (beauty)
- [ ] `transition-all duration-300` em cada card
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(dashboard): elevate ProfitMetrics number hierarchy and hover states`

---

### T03: ActionCenter — Item hover + prioridade com borda lateral [P]

**What**: Adicionar hover expressivo e indicador visual de prioridade em cada item
**Where**: `components/dashboard/ActionCenter.tsx`
**Depends on**: None
**Reuses**: padrão `border-l-2 border-l-accent-gold`, `hover:bg-white/[0.03]`
**Requirement**: UX-16

**Done when**:
- [ ] Cada item: `p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all cursor-pointer`
- [ ] Item de prioridade alta: `border-l-2 border-l-accent-gold|beauty-neon` conforme tema
- [ ] Ícone em container: `p-2 rounded-lg bg-white/[0.04]`
- [ ] Título: `text-sm font-semibold text-white`, subtexto: `text-xs text-neutral-500`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(dashboard): add item hover and priority indicator to ActionCenter`

---

### T04: BusinessHealthCard — Score visual + sombra condicional [P]

**What**: Adicionar representação visual do score (barra de segmentos) e sombra condicional por saúde
**Where**: `components/dashboard/BusinessHealthCard.tsx`
**Depends on**: None
**Reuses**: tokens emerald/red, padrão de barra de progresso via inline style
**Requirement**: UX-17

**Done when**:
- [ ] Score: `text-5xl font-bold font-mono` centrado no card
- [ ] Barra de progresso: 5 segmentos inline `w-full h-1.5 rounded-full` com fill proporcional ao score
- [ ] Score alto (>=70): `border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.1)]`
- [ ] Score baixo (<40): `border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]`
- [ ] Cada critério: ícone `Check|AlertTriangle|X` colorido por status
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(dashboard): add score visualization and conditional shadow to BusinessHealthCard`

---

### T05: MeuDiaWidget — Próximo agendamento em destaque [P]

**What**: Diferenciar visualmente o próximo agendamento dos demais
**Where**: `components/dashboard/MeuDiaWidget.tsx`
**Depends on**: None
**Reuses**: `border-l-2 border-l-accent-gold bg-accent-gold/5 rounded-r-xl`
**Requirement**: UX-03

**Done when**:
- [ ] Próximo agendamento: `border-l-2 border-l-accent-gold|beauty-neon bg-accent-gold/5|beauty-neon/5 rounded-r-xl p-3`
- [ ] Label "PRÓXIMO": `text-[9px] font-mono uppercase tracking-widest text-accent-gold|beauty-neon`
- [ ] Demais agendamentos: `opacity-75 text-sm`
- [ ] Dot de horário: `w-1.5 h-1.5 rounded-full` colorido por status (emerald=confirmado, yellow=pendente)
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(dashboard): highlight next appointment in MeuDiaWidget`

---

### T06: SetupCopilot — Progress bar + estados de item [P]

**What**: Adicionar barra de progresso global e diferenciar estados dos items (concluído/ativo/pendente)
**Where**: `components/dashboard/SetupCopilot.tsx`
**Depends on**: None
**Reuses**: padrão de progress bar `h-1 rounded-full`, `transition-all duration-700`
**Requirement**: UX-18

**Done when**:
- [ ] Barra de progresso no topo: `h-1 bg-accent-gold/20 rounded-full` com fill `h-1 bg-accent-gold transition-all duration-700`
- [ ] Percentual: `font-mono text-xs text-accent-gold|beauty-neon`
- [ ] Item concluído: `line-through text-neutral-600` + check `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
- [ ] Item ativo: `border-l-2 border-accent-gold|beauty-neon bg-accent-gold/5|beauty-neon/5`
- [ ] Item pendente: `opacity-60`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(dashboard): add progress bar and item states to SetupCopilot`

---

### T07: Sidebar — Indicador lateral + logout hover [P]

**What**: Adicionar barra lateral como indicador de página ativa e refinar hover do logout
**Where**: `components/Sidebar.tsx`
**Depends on**: None
**Reuses**: `before:` pseudo-element via Tailwind, `transition-all duration-200`
**Requirement**: UX-04

**Done when**:
- [ ] Link ativo: adicionar `relative` e pseudo-elemento `before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-accent-gold|beauty-neon`
- [ ] Todos os links: `transition-all duration-200`
- [ ] Logout button: `text-neutral-600 hover:text-red-400 hover:bg-red-500/5 transition-all` — neutro em repouso
- [ ] Separador antes do logout: `border-t border-white/5 pt-3 mt-3`
- [ ] Logo: `filter drop-shadow` sutil via className se barber
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(nav): add lateral position indicator and refine logout hover in Sidebar`

---

### T08: Header — Badge animado + avatar com inicial + business status dot [P]

**What**: Animar badge de notificação, melhorar avatar sem foto, adicionar dot de status do negócio
**Where**: `components/Header.tsx`
**Depends on**: None
**Reuses**: `animate-pulse`, padrão de avatar com inicial já em TeamMemberCard
**Requirement**: UX-15

**Done when**:
- [ ] Badge de notificação: `animate-pulse` quando count > 0, exibe número se count ≤ 9
- [ ] Avatar sem foto: inicial do nome com `bg-gradient-to-br from-accent-gold/20 to-accent-gold/5 text-accent-gold font-bold`
- [ ] Business name: dot de status `w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse` inline
- [ ] Dropdown notifications: item com alta prioridade = `border-l-2 border-l-red-500 pl-2`
- [ ] Dropdown backdrop: `shadow-promax-glass ring-1 ring-white/5`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(header): animate notification badge and improve avatar fallback`

---

### T09: AppointmentWizard — Steps com labels + animação entre passos [P]

**What**: Melhorar progress steps com labels e adicionar animação de transição entre passos
**Where**: `components/AppointmentWizard.tsx`
**Depends on**: None
**Reuses**: `animate-in fade-in slide-in-from-right-4 duration-300`, `ring-2 ring-offset-2`
**Requirement**: UX-06

**Done when**:
- [ ] Step ativo: `ring-2 ring-accent-gold|beauty-neon ring-offset-2 ring-offset-brutal-main|beauty-dark`
- [ ] Step concluído: background sólido `bg-accent-gold|beauty-neon` + ícone `Check size={12}` branco
- [ ] Label abaixo de cada step: `text-[9px] uppercase tracking-wider` (oculto em < sm)
- [ ] Transição entre steps: wrapper de conteúdo com `animate-in fade-in slide-in-from-right-4 duration-300` ao avançar
- [ ] Thin accent line no header: `h-[2px] bg-accent-gold/40|beauty-neon/40`
- [ ] Footer: `border-t border-white/5 bg-white/[0.02]`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(wizard): add step labels, ring focus, and transition animation to AppointmentWizard`

---

### T10: CheckoutModal — Ícones de pagamento + valor líquido em destaque [P]

**What**: Adicionar ícones por método de pagamento e destacar valor líquido após taxa em verde
**Where**: `components/CheckoutModal.tsx`
**Depends on**: None
**Reuses**: `Banknote`, `CreditCard`, `Smartphone` (Lucide — já instalado), `bg-emerald-500/5 border-emerald-500/20`
**Requirement**: UX-05

**Done when**:
- [ ] Método dinheiro: ícone `Banknote size={16}` antes do label
- [ ] Método cartão (débito/crédito): ícone `CreditCard size={16}`
- [ ] Método Pix/MBWay: ícone `Smartphone size={16}`
- [ ] Método selecionado: `shadow-[0_0_12px_rgba(194,155,64,0.15)]` (barber) / `shadow-[0_0_12px_rgba(167,139,250,0.15)]` (beauty)
- [ ] Box valor líquido: `p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20` com label "Valor que você recebe" e valor em `text-emerald-400 font-bold`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(checkout): add payment method icons and highlight net value in CheckoutModal`

---

### T11: AppointmentEditModal — Section dividers + desconto preview [P]

**What**: Adicionar cabeçalhos de seção entre grupos de campos e preview do desconto em tempo real
**Where**: `components/AppointmentEditModal.tsx`
**Depends on**: None
**Reuses**: `border-t border-white/5 pt-4`, `text-[10px] font-mono uppercase tracking-widest text-neutral-500`
**Requirement**: UX-19

**Done when**:
- [ ] Section dividers: `<div className="pt-4 border-t border-white/5">` entre grupos (cliente, serviço, horário, preço)
- [ ] Labels de seção: `text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3`
- [ ] Desconto preview: quando há desconto, mostrar `text-xs text-emerald-400` com valor final e desconto calculado em tempo real
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(appointment): add section dividers and discount preview to AppointmentEditModal`

---

### T12: QuickActionsModal — Subtexto + hover scale + stagger [P]

**What**: Adicionar subtexto descritivo a cada botão e melhorar hover com scale e stagger de entrada
**Where**: `components/QuickActionsModal.tsx`
**Depends on**: None
**Reuses**: `hover:scale-[1.02] hover:shadow-gold|neon`, `text-[10px] font-mono text-neutral-500 uppercase`
**Requirement**: UX-07

**Done when**:
- [ ] Cada botão: subtexto `text-[10px] font-mono text-neutral-500 uppercase` abaixo do nome principal
- [ ] Hover: `hover:scale-[1.02] transition-all duration-200` + sombra de tema
- [ ] Stagger de entrada: cada botão com `delay-[0ms|50ms|100ms|150ms]` usando `animate-in fade-in`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(modal): add subtexts, hover scale, and stagger to QuickActionsModal`

---

### T13: ClientBookingCard — Status bar lateral + hover elevação [P]

**What**: Mudar status bar de topo para lateral esquerda e adicionar hover com elevação
**Where**: `components/ClientBookingCard.tsx`
**Depends on**: None
**Reuses**: padrão de `w-1` lateral, `hover:translate-y-[-2px] hover:shadow-promax-glass`
**Requirement**: UX-09

**Done when**:
- [ ] Status bar: `w-1 min-h-full absolute left-0 top-0 bottom-0 rounded-l-2xl` com cor por status (remover `h-1` do topo)
- [ ] Card wrapper: `relative pl-3` para acomodar a barra lateral
- [ ] Data + hora: `font-mono text-sm font-bold` + `text-xs text-neutral-500` na mesma linha
- [ ] Hover: `hover:translate-y-[-2px] hover:shadow-promax-glass transition-all duration-300`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(booking): move status bar to left edge and add elevation hover to ClientBookingCard`

---

### T14: TeamMemberCard — Ring de status no avatar + comissão em destaque [P]

**What**: Adicionar ring colorido no avatar por status e destacar número de comissão
**Where**: `components/TeamMemberCard.tsx`
**Depends on**: None
**Reuses**: `ring-2 ring-emerald-400/60`, `ring-2 ring-red-500/30`, `text-lg font-bold font-mono`
**Requirement**: UX-08

**Done when**:
- [ ] Avatar ativo: `ring-2 ring-emerald-400/60 ring-offset-1 ring-offset-brutal-card`
- [ ] Avatar inativo: `ring-2 ring-red-500/30 ring-offset-1 ring-offset-brutal-card`
- [ ] Comissão %: `text-lg font-bold font-mono text-accent-gold|beauty-neon`
- [ ] Label "comissão": `text-[9px] uppercase tracking-widest text-neutral-500` abaixo
- [ ] Delete button: `hover:bg-red-500/10 rounded-lg p-2 transition-all`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(team): add status ring to avatar and highlight commission in TeamMemberCard`

---

### T15: StaffEarningsCard — Valor maior + mini progress bar [P]

**What**: Aumentar tipografia do valor de comissão e adicionar mini barra de comparação com mês anterior
**Where**: `components/StaffEarningsCard.tsx`
**Depends on**: None
**Reuses**: `text-3xl font-bold font-mono`, `shadow-gold|neon`, barra de progresso inline
**Requirement**: UX-10

**Done when**:
- [ ] Valor: `text-3xl font-bold font-mono text-accent-gold|beauty-neon`
- [ ] Ícone container: `shadow-gold|neon` sutil + `bg-accent-gold/10|beauty-neon/10`
- [ ] Mini progress bar: `h-1 rounded-full bg-white/10` com fill `bg-accent-gold|beauty-neon` proporcional ao % vs mês anterior
- [ ] Label mês: `text-[10px] font-mono uppercase tracking-wider`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(staff): elevate earnings value and add monthly progress bar to StaffEarningsCard`

---

### T16: Finance — Summary cards com ícones em containers coloridos [P]

**What**: Adicionar ícones de métrica em containers coloridos e `animate-pulse` em A Pagar quando há pendências
**Where**: `pages/Finance.tsx` (seção summary cards)
**Depends on**: None
**Reuses**: `p-3 rounded-xl`, cores por métrica (emerald=receita, red=despesa, gold=lucro, yellow=pendente)
**Requirement**: UX-11

**Done when**:
- [ ] Cada card: ícone em container `p-3 rounded-xl` com cor específica da métrica
- [ ] Valor: `text-2xl md:text-3xl font-bold font-mono`
- [ ] Label: `text-[10px] uppercase tracking-widest` separado do valor
- [ ] Card A Pagar/Pendente: ícone `Clock` com `animate-pulse` se há valor > 0
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(finance): add colored icon containers and pulse to Finance summary cards`

---

### T17: Finance — Transactions table com cores de valor e pending highlight [P]

**What**: Colorir valores por tipo (receita/despesa) e identificar pending rows com borda lateral
**Where**: `pages/Finance.tsx` (seção transactions table)
**Depends on**: None
**Reuses**: `text-emerald-400 font-mono font-bold`, `text-red-400`, `border-l-2 border-l-yellow-500/60`
**Requirement**: UX-12

**Done when**:
- [ ] Valor receita: `text-emerald-400 font-mono font-bold`
- [ ] Valor despesa: `text-red-400 font-mono font-bold`
- [ ] Linha pending (a pagar): `border-l-2 border-l-yellow-500/60`
- [ ] Row hover: `hover:bg-white/[0.04] transition-colors duration-150`
- [ ] Tipo badge: `px-2 py-0.5 rounded-full text-xs` colorido por tipo
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(finance): colorize transaction values and highlight pending rows`

---

### T18: Finance — Tabs com border-bottom ativa e peso maior [P]

**What**: Adicionar border-bottom na tab ativa e reforçar peso tipográfico
**Where**: `pages/Finance.tsx` (seção tabs)
**Depends on**: None
**Reuses**: `border-b-2 border-accent-gold|beauty-neon`, `font-semibold`
**Requirement**: UX-21

**Done when**:
- [ ] Tab ativa: `border-b-2 border-accent-gold|beauty-neon font-semibold`
- [ ] Tab hover: `hover:text-white transition-colors duration-150`
- [ ] Transição suave ao trocar tab: `transition-colors duration-150`
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(finance): add active tab border-bottom and weight emphasis`

---

### T19: BrutalCard — Prop `animate` opcional [P]

**What**: Adicionar prop opcional `animate` que aplica entrada suave
**Where**: `components/BrutalCard.tsx`
**Depends on**: None
**Reuses**: `animate-in fade-in zoom-in-[99%] duration-300` (já nos tokens)
**Requirement**: UX-14

**Done when**:
- [ ] Interface: `animate?: boolean` (default false)
- [ ] Quando `animate={true}`: adicionar `animate-in fade-in zoom-in-[99%] duration-300` ao className do wrapper
- [ ] Todos os usos existentes sem `animate` continuam idênticos (backwards compatible)
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `feat(card): add optional animate prop to BrutalCard`

---

### T20: Modal — Close button com rotação no hover [P]

**What**: Adicionar micro-interação de rotação 90° ao fechar botão do modal
**Where**: `components/Modal.tsx`
**Depends on**: None
**Reuses**: `hover:rotate-90 transition-transform duration-200`
**Requirement**: UX-13

**Done when**:
- [ ] Close button (X): adicionar `hover:rotate-90 transition-transform duration-200` ao className
- [ ] Comportamento de fechar inalterado
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(modal): add rotate-90 hover micro-interaction to Modal close button`

---

### T21: OnboardingLayout — Noise overlay + radial gradient [P]

**What**: Adicionar textura noise e radial gradient de acento ao layout de onboarding
**Where**: `components/OnboardingLayout.tsx`
**Depends on**: None
**Reuses**: `bg-noise opacity-[0.03]`, `bg-accent-gold/[0.04] rounded-full blur-[100px]` (padrão do Register)
**Requirement**: UX-20

**Done when**:
- [ ] Overlay noise: `absolute inset-0 bg-noise opacity-[0.03] pointer-events-none`
- [ ] Radial gradient: `absolute top-0 right-0 w-[400px] h-[400px] bg-accent-gold/[0.04]|beauty-neon/[0.04] rounded-full blur-[100px] pointer-events-none`
- [ ] Layout existente inalterado funcionalmente
- [ ] Gate: `npm run typecheck` passa

**Tests**: none
**Gate**: quick
**Commit**: `style(onboarding): add noise texture and accent radial gradient to OnboardingLayout`

---

### T22: Gate Final — Build completo (sequencial, após todos os T01-T21)

**What**: Rodar build completo para confirmar que nenhuma mudança visual quebrou TypeScript, lint ou build
**Where**: N/A (apenas comandos)
**Depends on**: T01, T02, T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20, T21

**Done when**:
- [ ] `npm run typecheck` passa — 0 erros novos
- [ ] `npm run lint` passa — 0 warnings novos
- [ ] `npm run build` passa — bundle gerado com sucesso

**Tests**: none
**Gate**: build
**Commit**: N/A (não gera commit — é verificação)

---

## Parallel Execution Map

```
Fase 1 — TODOS PARALELOS (arquivos independentes):

  T01 (DashboardHero)        [P] ─┐
  T02 (ProfitMetrics)        [P] ─┤
  T03 (ActionCenter)         [P] ─┤
  T04 (BusinessHealthCard)   [P] ─┤
  T05 (MeuDiaWidget)         [P] ─┤
  T06 (SetupCopilot)         [P] ─┤
  T07 (Sidebar)              [P] ─┤
  T08 (Header)               [P] ─┤
  T09 (AppointmentWizard)    [P] ─┤──→ T22 (Gate Final)
  T10 (CheckoutModal)        [P] ─┤
  T11 (AppointmentEditModal) [P] ─┤
  T12 (QuickActionsModal)    [P] ─┤
  T13 (ClientBookingCard)    [P] ─┤
  T14 (TeamMemberCard)       [P] ─┤
  T15 (StaffEarningsCard)    [P] ─┤
  T16 (Finance summary)      [P] ─┤
  T17 (Finance transactions) [P] ─┤
  T18 (Finance tabs)         [P] ─┤
  T19 (BrutalCard)           [P] ─┤
  T20 (Modal)                [P] ─┤
  T21 (OnboardingLayout)     [P] ─┘

Fase 2 — SEQUENCIAL:
  T22 (Gate Final)
```

---

## Task Granularity Check

| Task | Escopo | Status |
|------|--------|--------|
| T01: DashboardHero | 1 arquivo, visual only | ✅ |
| T02: ProfitMetrics | 1 arquivo, visual only | ✅ |
| T03: ActionCenter | 1 arquivo, visual only | ✅ |
| T04: BusinessHealthCard | 1 arquivo, visual only | ✅ |
| T05: MeuDiaWidget | 1 arquivo, visual only | ✅ |
| T06: SetupCopilot | 1 arquivo, visual only | ✅ |
| T07: Sidebar | 1 arquivo, visual only | ✅ |
| T08: Header | 1 arquivo, visual only | ✅ |
| T09: AppointmentWizard | 1 arquivo, visual only | ✅ |
| T10: CheckoutModal | 1 arquivo, visual only | ✅ |
| T11: AppointmentEditModal | 1 arquivo, visual only | ✅ |
| T12: QuickActionsModal | 1 arquivo, visual only | ✅ |
| T13: ClientBookingCard | 1 arquivo, visual only | ✅ |
| T14: TeamMemberCard | 1 arquivo, visual only | ✅ |
| T15: StaffEarningsCard | 1 arquivo, visual only | ✅ |
| T16: Finance summary | 1 arquivo, seção específica | ✅ |
| T17: Finance transactions | 1 arquivo, seção específica | ✅ |
| T18: Finance tabs | 1 arquivo, seção específica | ✅ |
| T19: BrutalCard | 1 arquivo, 1 nova prop | ✅ |
| T20: Modal | 1 arquivo, 1 className | ✅ |
| T21: OnboardingLayout | 1 arquivo, 2 overlays | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|------|-------------------|---------------|--------|
| T01-T21 | None | Paralelos no início | ✅ |
| T22 | T01-T21 | Após todos os paralelos | ✅ |

## Test Co-location Validation

| Task | Camada modificada | Matrix Requer | Task Diz | Status |
|------|-------------------|---------------|----------|--------|
| T01-T21 | JSX/CSS visual only | none | none | ✅ |
| T22 | Verificação build | none | none | ✅ |
