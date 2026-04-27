# UI/UX Overhaul — Specification

## Problem Statement

O AgendiX está funcional e com design system dual-tema bem definido (barber/beauty). Porém a maioria dos componentes vive no território "correto" — grids alinham, cores não conflitam — mas falta presença em métricas financeiras, hierarquia visual em cards de dados, micro-interações que dão vida a transições, e profundidade consistente. O barbeiro/dono de salão usa o sistema no celular entre atendimentos e precisa ler os números do dia em 2 segundos.

## Goals

- [ ] Elevar cada componente de "correto" para "refinado" com mudanças cirúrgicas de CSS/JSX
- [ ] Melhorar hierarquia tipográfica em cards de métricas (números dominam, labels recuam)
- [ ] Ativar tokens de sombra, animação e profundidade que já existem mas não são usados
- [ ] Adicionar micro-interações (hover states, animações de entrada, indicadores de status)
- [ ] Preservar 100% da lógica de negócio e dual-tema barber/beauty

## Out of Scope

| Feature | Razão |
|---------|-------|
| Criar novos tokens Tailwind | Design system existente é suficiente |
| Alterar lógica de negócio ou queries | Fora do escopo visual |
| Adicionar novas páginas ou rotas | Só refinamento do existente |
| Alterar testes existentes | Mudanças são somente visuais |
| Migrar componentes de library | Sem introduzir shadcn/ui ou outros |

---

## User Stories

### P1: Dashboard — Métricas com Hierarquia Clara ⭐ MVP

**User Story**: Como barbeiro consultando o dashboard no celular, quero ver meu faturamento do dia de relance, sem precisar escanear texto de mesmo tamanho.

**Acceptance Criteria**:
1. WHEN ProfitMetrics renderiza THEN números SHALL usar `text-3xl md:text-4xl font-bold font-mono`
2. WHEN ProfitMetrics renderiza THEN labels SHALL usar `text-[10px] uppercase tracking-[0.15em] text-neutral-500`
3. WHEN usuário hover em card de métrica THEN card SHALL mostrar `hover:border-accent-gold/30 hover:shadow-gold` (barber)
4. WHEN DashboardHero renderiza THEN saudação SHALL ter linha de acento lateral colorida
5. WHEN MeuDiaWidget renderiza THEN próximo agendamento SHALL ter destaque visual distinto dos demais

**Independent Test**: Abrir dashboard em 375px — número principal legível sem zoom, label claramente secundário.

**Requirement**: UX-01, UX-02, UX-03

---

### P1: Sidebar — Indicador de Posição Lateral ⭐ MVP

**User Story**: Como usuário navegando, quero saber exatamente em qual página estou sem precisar comparar títulos de texto.

**Acceptance Criteria**:
1. WHEN item de nav está ativo THEN SHALL exibir barra lateral `w-0.5 h-5 bg-accent-gold rounded-full` à esquerda
2. WHEN usuário hover em item inativo THEN SHALL haver `transition-all duration-200`
3. WHEN usuário hover em Logout THEN SHALL mudar para vermelho só no hover, neutro em repouso

**Independent Test**: Navegar entre Agenda e Finance — barra lateral pisca de posição para posição.

**Requirement**: UX-04

---

### P1: Modais — Experiência Coesa de Pagamento ⭐ MVP

**User Story**: Como dono do salão finalizando um atendimento, quero que as opções de pagamento sejam visualmente distintas e o valor líquido apareça em destaque verde.

**Acceptance Criteria**:
1. WHEN CheckoutModal abre THEN cada método de pagamento SHALL ter ícone representativo
2. WHEN método selecionado THEN SHALL exibir `shadow-[0_0_12px_rgba(194,155,64,0.15)]` sutil
3. WHEN há taxa THEN valor líquido SHALL aparecer em box `bg-emerald-500/5 border-emerald-500/20` com valor em `text-emerald-400 font-bold`
4. WHEN AppointmentWizard avança entre steps THEN SHALL ter animação `slide-in-from-right-4 duration-300`
5. WHEN QuickActionsModal abre THEN botões SHALL ter subtexto descritivo em `text-[10px] font-mono`

**Independent Test**: Finalizar pagamento com taxa de cartão — valor líquido visível em verde imediatamente.

**Requirement**: UX-05, UX-06, UX-07

---

### P2: Cards de Dados — Status Visual Imediato

**User Story**: Como dono do salão vendo a lista de equipe, quero identificar profissionais ativos/inativos sem ler texto.

**Acceptance Criteria**:
1. WHEN TeamMemberCard renderiza ativo THEN SHALL ter `ring-2 ring-emerald-400/60` no avatar
2. WHEN TeamMemberCard renderiza inativo THEN SHALL ter `ring-2 ring-red-500/30`
3. WHEN ClientBookingCard renderiza THEN status bar SHALL ser lateral esquerda `w-1 h-full`
4. WHEN StaffEarningsCard renderiza THEN valor SHALL usar `text-3xl font-bold font-mono`

**Independent Test**: Lista de equipe — identificar quem está ativo/inativo em menos de 1 segundo.

**Requirement**: UX-08, UX-09, UX-10

---

### P2: Finance — Summary Cards com Protagonismo do Lucro

**User Story**: Como dono do salão, quero que o lucro líquido seja o número mais importante visualmente na página de finanças.

**Acceptance Criteria**:
1. WHEN Finance renderiza summary THEN ícones de métrica SHALL estar em containers coloridos `p-3 rounded-xl`
2. WHEN há despesas pendentes THEN card A Pagar SHALL ter ícone `Clock` com `animate-pulse`
3. WHEN transação é receita THEN valor SHALL usar `text-emerald-400 font-mono font-bold`
4. WHEN transação é despesa THEN valor SHALL usar `text-red-400 font-mono font-bold`

**Independent Test**: Abrir Finance — identificar lucro do mês em menos de 2 segundos.

**Requirement**: UX-11, UX-12

---

### P3: Componentes Base — Micro-interações Globais

**User Story**: Como usuário do sistema, quero que interações pareçam responsivas e vivas.

**Acceptance Criteria**:
1. WHEN Modal fecha button é hovered THEN SHALL ter `hover:rotate-90 transition-transform duration-200`
2. WHEN BrutalCard tem prop `animate` THEN SHALL aplicar `animate-in fade-in zoom-in-[99%] duration-300`
3. WHEN Header notification badge count > 0 THEN SHALL ter `animate-pulse`
4. WHEN BusinessHealthCard renderiza THEN score SHALL ter representação visual (barra de progresso)
5. WHEN ActionCenter item tem prioridade alta THEN SHALL ter `border-l-2 border-l-accent-gold`

**Independent Test**: Abrir e fechar modal — X gira 90°. Abrir dashboard com notificações — bell pulsa.

**Requirement**: UX-13, UX-14, UX-15

---

## Edge Cases

- WHEN componente renderiza em mobile (< 375px) THEN animações SHALL não causar layout shift
- WHEN tema é `beauty` THEN todos os accents SHALL usar `beauty-neon` ao invés de `accent-gold`
- WHEN dados estão carregando THEN skeleton/spinner existente SHALL ser preservado (não remover)
- WHEN staff view (role === 'staff') THEN componentes específicos SHALL continuar funcionando

---

## Requirement Traceability

| ID | Story | Componente | Status |
|----|-------|-----------|--------|
| UX-01 | P1: Dashboard Métricas | ProfitMetrics.tsx | Pending |
| UX-02 | P1: Dashboard Hero | DashboardHero.tsx | Pending |
| UX-03 | P1: Meu Dia | MeuDiaWidget.tsx | Pending |
| UX-04 | P1: Sidebar | Sidebar.tsx | Pending |
| UX-05 | P1: Checkout | CheckoutModal.tsx | Pending |
| UX-06 | P1: Wizard | AppointmentWizard.tsx | Pending |
| UX-07 | P1: Quick Actions | QuickActionsModal.tsx | Pending |
| UX-08 | P2: Team Card | TeamMemberCard.tsx | Pending |
| UX-09 | P2: Booking Card | ClientBookingCard.tsx | Pending |
| UX-10 | P2: Staff Earnings | StaffEarningsCard.tsx | Pending |
| UX-11 | P2: Finance Summary | Finance.tsx | Pending |
| UX-12 | P2: Finance Table | Finance.tsx | Pending |
| UX-13 | P3: Modal base | Modal.tsx | Pending |
| UX-14 | P3: BrutalCard | BrutalCard.tsx | Pending |
| UX-15 | P3: Header | Header.tsx | Pending |
| UX-16 | P3: Action Center | ActionCenter.tsx | Pending |
| UX-17 | P3: Business Health | BusinessHealthCard.tsx | Pending |
| UX-18 | P3: Setup Copilot | SetupCopilot.tsx | Pending |
| UX-19 | P3: Edit Modal | AppointmentEditModal.tsx | Pending |
| UX-20 | P3: Onboarding | OnboardingLayout.tsx | Pending |
| UX-21 | P3: Finance Tabs | Finance.tsx | Pending |

**Coverage**: 21 requirements, 21 mapped to tasks, 0 unmapped ✅

---

## Success Criteria

- [ ] Dashboard: número de faturamento legível em 375px sem zoom
- [ ] Sidebar: indicador lateral de página ativo visível
- [ ] CheckoutModal: valor líquido em verde quando há taxa
- [ ] TeamMemberCard: status ativo/inativo legível por cor sem texto
- [ ] `npm run typecheck && npm run lint && npm run build` passam sem erros novos
- [ ] Ambos os temas (barber/beauty) funcionam visualmente após mudanças
