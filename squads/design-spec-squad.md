# 📐 Design Spec Squad — AgenX AIOS
# Squad ID: design-spec-v1
# Versão: 1.0 | Data: 09/03/2026
# Formato: AIOS Squad 2.1

## Metadados do Squad

```yaml
squad:
  id: design-spec-v1
  name: "Design Spec Squad"
  description: >
    Squad de tradução entre diagnóstico e construção no AgenX (Beauty OS).
    Recebe o relatório do UX Audit Squad e transforma achados em especificações
    técnicas acionáveis para o agente de frontend: quais componentes React
    criar ou modificar, com critérios de aceite humanizados prontos para o
    Build Validation Squad, ordenados por impacto real no produto.
  version: "1.0.0"
  domain: product-spec
  created_at: "2026-03-09"
  status: active
  author: squad-creator-agent
  target_product: "AgenX / Beauty OS — React 19 + TypeScript + Tailwind"
  upstream_squad: ux-audit-v1      # Consome relatório do UX Audit Squad
  downstream_squad: build-validation-v1  # Alimenta o Build Validation Squad
```

---

## Posição no Pipeline

```
UX Audit Squad
      │
      │  ux-audit-report.md
      ▼
Design Spec Squad          ← ESTE SQUAD
      │
      │  design-spec.md
      │  acceptance-criteria.md
      │  priority-list.md
      ▼
Build Validation Squad
      │
      ▼
@dev (Dex) — Implementação
```

---

## Agentes do Squad

### 1. 🎛️ Orchestrator Agent
```yaml
agent:
  id: spec-orchestrator
  role: "Recebe o relatório do UX Audit, parseia os issues por frente e coordena os demais agentes"
  skill: spec-orchestration
  rpc: orchestrate_design_spec
  trigger: ux_audit_report_received | manual
  input:
    - ux_audit_report: object      # Output do UX Audit Squad (report-agent)
    - audit_score: number          # Score geral 0-100 do AgenX
    - filter_severity: "critical_only" | "critical_and_important" | "all"
    - output_format: "story" | "github_issue" | "spec_doc"
  output:
    - issues_parsed: number        # Total de issues extraídos do relatório
    - issues_by_category:
        navigation: list
        consistency: list
        mobile: list
        benchmark_gaps: list
    - spec_plan: list              # O que cada agente vai especificar
    - agents_dispatched: list
    - final_spec_path: string      # design-spec.md gerado
    - criteria_path: string        # acceptance-criteria.md gerado
    - priority_list_path: string   # priority-list.md gerado
```

**Lógica de Parsing do Relatório UX:**
```yaml
parsing_rules:
  extract_from_report:
    critical_issues:
      target: Component Agent + Criteria Agent (urgência máxima)
      auto_promote_to_sprint: true
    important_issues:
      target: Component Agent + Criteria Agent
      auto_promote_to_sprint: false
    improvement_issues:
      target: Priority Agent (avaliar ROI antes de especificar)
      auto_promote_to_sprint: false
    quick_wins:
      target: Component Agent direto (esforço < 2h, spec mínima)
      fast_track: true

  categorize_by_file:
    components_affected: "Mapear issues → arquivos .tsx existentes"
    new_components_needed: "Issues sem componente existente → criar novo"
    theme_specific: "Separar issues Brutal vs Beauty vs ambos"
```

**Prompt Template:**
```
Receba o relatório do UX Audit Squad:
{ux_audit_report}

Parse todos os issues classificados como {filter_severity}.
Agrupe por categoria: navegação, consistência, mobile, gaps de benchmark.
Para cada issue, identifique:
  1. Componente React afetado (arquivo .tsx existente ou nome do novo)
  2. Tema afetado: brutal | beauty | ambos
  3. Urgência: crítico | importante | melhoria
  4. Quick win: sim (esforço < 2h) | não

Despache Component Agent para definir a spec técnica de cada item.
Despache Criteria Agent para escrever os critérios de aceite.
Despache Priority Agent para ordenar o backlog final.
Consolide os outputs em: design-spec.md, acceptance-criteria.md, priority-list.md.
```

---

### 2. ⚛️ Component Agent
```yaml
agent:
  id: component-agent
  role: "Define exatamente quais componentes React criar ou modificar, com spec técnica completa"
  skill: frontend-spec-writing
  rpc: spec_component_changes
  trigger: orchestrator_call
  input:
    - issues: list                 # Issues parseados pelo Orchestrator
    - existing_components: list    # Mapa de componentes atuais do AgenX
    - theme_scope: "brutal" | "beauty" | "both"
    - tech_constraints: object     # React 19, Tailwind, TypeScript strict
  output:
    - components_to_modify: list   # Componentes existentes com o que muda
    - components_to_create: list   # Novos componentes necessários
    - props_changes: object        # Props adicionadas/removidas/alteradas
    - css_changes: object          # Classes Tailwind ou CSS vars a alterar
    - file_map: object             # issue_id → arquivo(s) afetado(s)
    - breaking_changes: list       # O que pode quebrar outros componentes
    - test_files_needed: list      # Testes a criar/atualizar
```

**Mapa de Componentes do AgenX (referência):**
```yaml
component_registry:
  layout:
    - Layout.tsx           # App shell — sidebar + header
    - Sidebar.tsx          # Navegação lateral
    - Header.tsx           # Top bar
    - BottomMobileNav.tsx  # Navegação mobile
    - SettingsLayout.tsx   # Wrapper das configurações

  styled_brutal:
    - BrutalCard.tsx       # Card principal do tema barbershop
    - BrutalButton.tsx     # Botão do tema barbershop
    - BrutalBackground.tsx # Background glassmorphism
    - Screw.tsx            # Elemento decorativo

  modals:
    - Modal.tsx                  # Base genérica
    - AppointmentEditModal.tsx   # Edição de agendamento
    - AppointmentWizard.tsx      # Criação de agendamento
    - ClientAuthModal.tsx        # Autenticação de cliente
    - PaywallModal.tsx           # Paywall de upgrade

  dashboard_widgets:
    - DashboardHero.tsx
    - MeuDiaWidget.tsx
    - ChurnRadar.tsx
    - FinancialDoctorPanel.tsx
    - ActionCenter.tsx
    - ProfitMetrics.tsx

  scheduling:
    - TimeGrid.tsx               # Grade de horários (mobile-critical)
    - CalendarPicker.tsx         # Seletor de datas
    - ServiceList.tsx            # Lista de serviços
    - ClientSelection.tsx        # Picker de cliente

  utilities:
    - SkeletonLoader.tsx         # Loading state
    - SaveFooter.tsx             # Footer com ações de salvar
    - PhoneInput.tsx             # Input de telefone
    - SearchableSelect.tsx       # Dropdown com busca
    - ErrorBoundary.tsx          # Fallback de erro

  ai_features:
    - AIAssistantChat.tsx        # Chat flutuante IA
    - SmartNotifications.tsx     # Notificações contextuais

  public:
    - PublicBusinessHeader.tsx   # Header das páginas públicas
    - ClientBookingCard.tsx      # Card de agendamento do cliente
```

**Formato de Spec por Componente:**
```yaml
component_spec_format:
  modify:
    file: "components/BottomMobileNav.tsx"
    issue_refs: ["MOBILE-001", "MOBILE-002"]
    what_changes:
      - "Adicionar min-height: 44px em todos os touch targets (linha ~47)"
      - "Adicionar paddingBottom: env(safe-area-inset-bottom) para iOS"
      - "Atualizar active state: border-top 2px solid var(--color-primary)"
    tailwind_classes:
      add: ["min-h-[44px]", "pb-safe"]
      remove: ["h-10"]
    props_changes: none
    breaking_risk: low
    test_needed: "BottomMobileNav.test.tsx — touch target size"

  create:
    file: "components/ScrollContainer.tsx"
    issue_refs: ["NAV-001"]
    purpose: "Wrapper que previne overflow-x em viewports mobile"
    props:
      - "children: React.ReactNode"
      - "className?: string"
      - "maxWidth?: string"
    tailwind_classes: ["overflow-x-hidden", "w-full"]
    where_to_use: ["Agenda.tsx", "Dashboard.tsx"]
    test_needed: "ScrollContainer.test.tsx — overflow detection"
```

**Prompt Template:**
```
Especifique tecnicamente as mudanças de componente React para os seguintes issues do AgenX:
{issues}

Para cada issue:
1. Identifique o arquivo .tsx afetado (use o registry acima)
   - Se existente: descreva exatamente o que muda (linha, classe, prop)
   - Se novo: defina nome, propósito, props e onde será usado
2. Liste as classes Tailwind a adicionar/remover
3. Identifique se a mudança afeta o tema Brutal, Beauty ou ambos
4. Aponte breaking changes — outros componentes que podem ser afetados
5. Especifique qual arquivo de teste criar ou atualizar

Tech stack: React 19, TypeScript strict, Tailwind CSS, CSS vars (--color-*).
Formato de retorno: spec estruturada por issue_id → { file, changes, tailwind, risk, test }.
```

---

### 3. ✅ Criteria Agent
```yaml
agent:
  id: criteria-agent
  role: "Escreve critérios de aceite claros, testáveis e humanizados para cada spec"
  skill: acceptance-criteria-writing
  rpc: write_acceptance_criteria
  trigger: orchestrator_call
  input:
    - component_specs: list        # Output do Component Agent
    - audience: "dev" | "qa" | "stakeholder"
    - format: "gherkin" | "checklist" | "user_story"
    - theme_context: "brutal" | "beauty" | "both"
  output:
    - criteria_by_issue: object    # issue_id → lista de critérios
    - criteria_for_build_validation: list  # Formato pronto para Build Validation Squad
    - definition_of_done: list     # DoD geral para o conjunto de specs
    - edge_cases_covered: list     # Casos extremos explicitados
    - criteria_count: number
```

**Princípios de Escrita do Criteria Agent:**
```yaml
writing_principles:
  humanized:
    - "Escrever em linguagem que o usuário final entenderia"
    - "Evitar jargão técnico nos critérios de aceite"
    - "Descrever o comportamento esperado, não a implementação"

  testable:
    - "Todo critério deve ser verificável — sim ou não, nunca 'parece certo'"
    - "Incluir contexto: 'Dado X, quando Y, então Z'"
    - "Especificar viewport quando o critério for mobile"

  complete:
    - "Cobrir happy path + edge cases (campo vazio, erro, loading)"
    - "Incluir critério de acessibilidade quando relevante (44px, contrast)"
    - "Separar critérios por tema se comportamento diferir entre Brutal e Beauty"

  actionable_for_build_validation:
    - "Formatar critérios para serem checados mecanicamente"
    - "Incluir evidência esperada: screenshot, valor de prop, classe CSS"
    - "Marcar critérios bloqueantes (sem eles o build não pode ir ao ar)"
```

**Exemplos de Critérios por Tipo de Issue:**
```yaml
criteria_examples:
  mobile_touch_target:
    issue: "Touch target do BottomMobileNav < 44px em iOS"
    criteria:
      - "Dado que o usuário está em um iPhone (375px), quando ele visualiza o BottomMobileNav,
         então todos os ícones de navegação têm área tocável de no mínimo 44x44px"
      - "Dado que o app está em modo PWA instalado, quando o usuário toca em 'Agenda',
         então a navegação ocorre sem precisar tocar com precisão exata"
      - "Dado que o dispositivo tem safe area (notch/home bar iOS),
         então o BottomMobileNav não é cortado pelo safe area inset"
    blocking: true
    theme: both

  scroll_horizontal:
    issue: "Scroll horizontal indesejado na página Agenda em 375px"
    criteria:
      - "Dado que o usuário está na página Agenda em um dispositivo 375px,
         quando ele rola a página verticalmente, então nenhum scroll horizontal ocorre"
      - "Dado que a agenda tem 10 horários disponíveis, quando renderizada em 375px,
         então todos os horários ficam visíveis sem scroll lateral"
      - "Dado que o usuário tem gestos de swipe habilitados,
         então o swipe horizontal não entra em conflito com gestos do browser"
    blocking: true
    theme: both

  visual_consistency:
    issue: "BrutalCard com border-radius inconsistente entre Dashboard e Agenda"
    criteria:
      - "Dado que o tema Brutal está ativo, quando BrutalCard é renderizado em qualquer página,
         então o border-radius é sempre 8px (--radius-brutal)"
      - "Dado que há mais de um BrutalCard na mesma tela,
         então todos têm o mesmo border-radius visualmente"
    blocking: false
    theme: brutal

  benchmark_gap:
    issue: "Fluxo de agendamento público tem 7 passos vs 4 do Fresha"
    criteria:
      - "Dado que um cliente acessa a página de agendamento público (/book/:slug),
         quando ele completa o agendamento, então realiza no máximo 4 interações distintas"
      - "Dado que o cliente está no passo de seleção de serviço,
         quando toca em um serviço, então avança automaticamente para o próximo passo (sem botão extra de confirmar)"
      - "Dado que o cliente chegou na confirmação,
         quando visualiza o resumo, então vê nome do profissional, serviço, horário e preço sem precisar rolar"
    blocking: false
    theme: both

  quick_win:
    issue: "Padding do card de settings inconsistente"
    criteria:
      - "Dado que o usuário está em qualquer página de configurações,
         quando visualiza um card de formulário, então o padding interno é 24px em todos os lados"
    blocking: false
    theme: both
```

**Formato de Output para Build Validation Squad:**
```yaml
build_validation_ready_format:
  issue_id: "MOBILE-001"
  component: "BottomMobileNav.tsx"
  criteria:
    - id: "AC-001-1"
      description: "Touch targets >= 44x44px em viewport 375px"
      testable: true
      blocking: true
      verification: "DevTools → computed height/width do elemento"
    - id: "AC-001-2"
      description: "Safe area inset respeitada em iOS"
      testable: true
      blocking: true
      verification: "Screenshot em iPhone 14 / simulador iOS"
  definition_of_done:
    - "Nenhum critério bloqueante falhando"
    - "Teste unitário cobrindo touch target size"
    - "Screenshot aprovado nos viewports 375px e 390px"
```

**Prompt Template:**
```
Escreva critérios de aceite para as seguintes specs de componente do AgenX:
{component_specs}

Audiência: {audience}. Formato: {format}.

Para cada spec:
1. Escreva critérios no formato "Dado X, quando Y, então Z"
2. Cubra: happy path, edge case mobile, edge case de tema (Brutal/Beauty)
3. Marque critérios bloqueantes (o build não pode ir ao ar sem eles)
4. Inclua a verificação esperada (como testar na prática)
5. Adapte a linguagem para ser compreensível sem conhecimento técnico de React

Ao final, gere um Definition of Done consolidado para o conjunto.
Formate o output para ser consumido diretamente pelo Build Validation Squad.
```

---

### 4. 🎯 Priority Agent
```yaml
agent:
  id: priority-agent
  role: "Ordena todas as specs por impacto real — o que desbloqueia mais valor primeiro para o AgenX"
  skill: impact-prioritization
  rpc: prioritize_spec_backlog
  trigger: orchestrator_call  # Último a ser chamado
  input:
    - component_specs: list        # Output do Component Agent
    - criteria_list: list          # Output do Criteria Agent
    - business_context: object     # Fase do produto, métricas atuais
    - constraints: object          # Velocidade do time, dependências
  output:
    - priority_list: list          # Specs ordenadas por prioridade
    - sprint_1: list               # O que entra no próximo sprint (quick wins + críticos)
    - sprint_2: list               # O que entra depois
    - backlog: list                # Melhorias para avaliar no futuro
    - blocked_items: list          # Itens que dependem de outros
    - impact_matrix: object        # Esforço × Valor para cada spec
    - recommended_start: object    # "Começar por X porque desbloqueia Y e Z"
```

**Modelo de Priorização (Impact-First):**
```yaml
prioritization_model:
  score_dimensions:
    user_impact:
      weight: 40%
      criteria:
        - "Bloqueia uso de feature principal? (+40 pts)"
        - "Afeta fluxo de novos tenants no onboarding? (+30 pts)"
        - "Afeta cliente final do salão (booking público)? (+25 pts)"
        - "Apenas afeta configurações internas? (+10 pts)"

    business_value:
      weight: 30%
      criteria:
        - "Reduz churn? (+30 pts)"
        - "Melhora conversão no booking público? (+25 pts)"
        - "Elimina fricção no onboarding de novos tenants? (+20 pts)"
        - "Melhoria de qualidade geral? (+10 pts)"

    effort_inverse:
      weight: 20%
      criteria:
        - "Quick win (< 2h)? (+20 pts)"
        - "Pequeno (< 1 dia)? (+15 pts)"
        - "Médio (1-3 dias)? (+10 pts)"
        - "Grande (> 3 dias)? (+5 pts)"

    unlock_potential:
      weight: 10%
      criteria:
        - "Desbloqueia outras specs na lista? (+10 pts)"
        - "Item independente? (+5 pts)"
        - "Bloqueado por outro item? (0 pts)"

  priority_tiers:
    P0_now:
      score: ">= 80"
      action: "Sprint imediato — não pode esperar"
      label: "🔴 Crítico"
    P1_next_sprint:
      score: "60-79"
      action: "Próximo sprint planejado"
      label: "🟡 Importante"
    P2_backlog:
      score: "40-59"
      action: "Backlog priorizado — avaliar a cada sprint"
      label: "🟢 Melhoria"
    P3_defer:
      score: "< 40"
      action: "Defer — reavaliar em 90 dias"
      label: "⚪ Defer"
```

**Lógica de Desbloqueio:**
```yaml
unlock_logic:
  example_chains:
    scroll_fix_unlocks:
      spec: "Fix overflow-x na Agenda"
      unlocks:
        - "Spec de swipe gestures (não faz sentido sem o scroll correto)"
        - "Spec de navegação por drag no TimeGrid"
      recommendation: "Priorizar primeiro — base para as demais"

    design_token_fix_unlocks:
      spec: "Padronizar --radius-brutal em BrutalCard"
      unlocks:
        - "Spec de novos cards no tema Brutal (evita retrabalho)"
        - "Consistency check das demais páginas (base visual resolvida)"
      recommendation: "Quick win que multiplica impacto"

    onboarding_fix_independent:
      spec: "Melhorar step progress no OnboardingWizard"
      unlocks: []
      recommendation: "Alta prioridade por impacto em novos tenants, não depende de outros"
```

**Formato de Output (Priority List):**
```yaml
priority_list_output:
  sprint_1:
    - rank: 1
      spec_id: "SPEC-003"
      component: "TimeGrid.tsx + ScrollContainer.tsx (novo)"
      issue: "Scroll horizontal na Agenda em 375px"
      priority: "🔴 P0 — Crítico"
      score: 92
      effort: "3h"
      why_first: "Bloqueia uso principal da Agenda em mobile — feature core do produto"
      unlocks: ["SPEC-007", "SPEC-012"]
      criteria_ref: "AC-003-1 a AC-003-4 (todos bloqueantes)"

    - rank: 2
      spec_id: "SPEC-001"
      component: "BottomMobileNav.tsx"
      issue: "Touch targets < 44px"
      priority: "🔴 P0 — Crítico"
      score: 88
      effort: "30min"
      why_first: "Quick win: 30min de esforço, impacto em 100% dos usuários mobile"
      unlocks: []
      criteria_ref: "AC-001-1 a AC-001-3 (todos bloqueantes)"

  sprint_2:
    - rank: 3
      spec_id: "SPEC-008"
      component: "BrutalCard.tsx"
      issue: "Border-radius inconsistente no tema Brutal"
      priority: "🟡 P1 — Importante"
      score: 67
      effort: "20min"
      why_next: "Afeta consistência visual mas não bloqueia uso"
      unlocks: ["SPEC-009", "SPEC-014"]
      criteria_ref: "AC-008-1 a AC-008-2"

  backlog:
    - rank: 8
      spec_id: "SPEC-015"
      component: "PublicBooking.tsx — refactor flow"
      issue: "Benchmark gap: 7 passos vs 4 do Fresha"
      priority: "🟢 P2 — Melhoria"
      score: 58
      effort: "3-5 dias"
      why_backlog: "Alto valor mas esforço significativo — precisa de story completa"
      criteria_ref: "AC-015-1 a AC-015-5"
```

**Prompt Template:**
```
Priorize o seguinte backlog de specs do AgenX usando o modelo Impact-First:
{component_specs}

Contexto de negócio do AgenX:
- Produto: SaaS multi-tenant para salões e barbearias
- Fase: Growth — retenção e onboarding são as métricas mais críticas
- Velocidade do time: aproximadamente 20-30 story points por sprint
- Restrições: {constraints}

Para cada spec:
1. Calcule o score usando os 4 critérios (user_impact × 40% + business_value × 30% + effort_inverse × 20% + unlock_potential × 10%)
2. Classifique em P0/P1/P2/P3
3. Identifique chains de desbloqueio — o que priorizar primeiro multiplica o que vem depois
4. Justifique a prioridade em 1-2 linhas diretas ("por que isso e não aquilo agora?")
5. Gere 3 listas: sprint_1 (fazer agora), sprint_2 (próximo), backlog (avaliar depois)

Comece sempre pelos quick wins de alto impacto — eles constroem momentum.
```

---

## Tasks do Squad

```yaml
tasks:
  - id: full-spec-from-audit
    name: "Gerar Spec Completa a partir do Relatório UX"
    agent: spec-orchestrator
    trigger: ux_audit_report_received | manual
    filter_severity: critical_and_important
    output_format: story
    timeout: 900s
    next_squad: build-validation-v1

  - id: critical-spec-only
    name: "Spec de Emergência — Issues Críticos Apenas"
    agent: spec-orchestrator
    trigger: manual | post_audit_critical
    filter_severity: critical_only
    output_format: github_issue
    timeout: 300s
    fast_track: true

  - id: component-spec-single
    name: "Spec de Componente Único"
    agent: component-agent
    trigger: on_demand
    input: single_issue
    timeout: 120s

  - id: criteria-writing
    name: "Escrita de Critérios de Aceite"
    agent: criteria-agent
    trigger: on_demand | post_component_spec
    format: checklist
    audience: dev
    timeout: 180s

  - id: backlog-prioritization
    name: "Priorização do Backlog de Specs"
    agent: priority-agent
    trigger: on_demand | sprint_planning
    timeout: 300s

  - id: quick-win-spec
    name: "Spec Rápida de Quick Wins"
    agent: spec-orchestrator
    trigger: on_demand
    filter: "quick_wins_only"
    output_format: github_issue
    timeout: 120s
    note: "Fast track — specs de esforço < 2h direto para @dev"
```

---

## Workflows do Squad

### Pipeline Principal (Pós UX Audit)
```yaml
workflow:
  id: post-audit-spec-pipeline
  name: "Design Spec Pipeline Pós-Auditoria UX"
  trigger: ux_audit_report_received
  estimated_duration: "1-2h"
  steps:
    1_orchestrate:
      agent: spec-orchestrator
      action: parse_ux_audit_report
      filter_severity: critical_and_important
    2_parallel_spec:
      parallel: true
      depends_on: [1_orchestrate]
      agents:
        component_agent:
          action: spec_all_issues
        criteria_agent:
          action: write_criteria_for_all
    3_prioritize:
      agent: priority-agent
      depends_on: [2_parallel_spec]
      action: build_priority_list
    4_output:
      action: consolidate_outputs
      generates:
        - design-spec.md      → docs/stories/design-spec-{date}.md
        - acceptance-criteria.md → docs/stories/criteria-{date}.md
        - priority-list.md   → docs/stories/priority-{date}.md
    5_handoff:
      target_squad: build-validation-v1
      artifact: design-spec.md
      auto_trigger: true
```

### Fast Track (Quick Wins)
```yaml
workflow:
  id: quick-wins-fast-track
  name: "Fast Track de Quick Wins"
  trigger: manual | post_audit
  estimated_duration: "30min"
  steps:
    1_filter:
      agent: spec-orchestrator
      filter: quick_wins_only    # Issues com esforço < 2h
    2_spec:
      agent: component-agent
      mode: minimal_spec         # Spec simplificada para quick wins
    3_criteria:
      agent: criteria-agent
      format: checklist          # Checklist simples, sem gherkin completo
    4_priority:
      agent: priority-agent
      action: rank_quick_wins_only
    5_output:
      format: github_issue       # Direto para o @dev sem passar pelo Build Validation
      auto_assign: "@dev"
```

### Sprint Planning Support
```yaml
workflow:
  id: sprint-planning-support
  name: "Suporte ao Sprint Planning"
  trigger: sprint_planning | manual
  steps:
    1_backlog_review:
      agent: priority-agent
      action: recalculate_scores  # Rescora tudo com novo contexto de negócio
    2_sprint_1_selection:
      agent: priority-agent
      action: select_sprint_items
      capacity: "team_velocity_story_points"
    3_criteria_review:
      agent: criteria-agent
      action: review_and_update_criteria  # Atualiza critérios de aceite se produto mudou
    4_output:
      format: sprint_plan_doc
```

---

## Artefatos Gerados

### design-spec.md
```markdown
# Design Spec — AgenX UX Fixes
**Gerado por:** Design Spec Squad
**Data:** {date}
**Origem:** UX Audit Report (score: {audit_score}/100)
**Issues cobertas:** {critical_count} críticos + {important_count} importantes

## 🔴 Specs Críticas (Sprint Imediato)

### SPEC-001 — BottomMobileNav: Touch Targets
**Componente:** `components/BottomMobileNav.tsx`
**Issue origem:** MOBILE-001 (UX Audit)
**Esforço:** 30min

**O que muda:**
- Linha 47: classe `h-10` → `min-h-[44px]`
- Linha 52: adicionar `pb-safe` (safe area iOS)
- CSS: `.nav-item { min-width: 44px; min-height: 44px; }`

**Tema:** Brutal + Beauty (ambos)
**Breaking risk:** Baixo — apenas dimensionamento
**Teste:** `BottomMobileNav.test.tsx` — verificar computed size

---
...
```

### acceptance-criteria.md
```markdown
# Critérios de Aceite — AgenX UX Fixes
**Squad:** Design Spec Squad → Build Validation Squad
**Data:** {date}

## AC-001 — BottomMobileNav: Touch Targets

**Critério 1 (bloqueante):**
Dado que o usuário está em um iPhone (375px),
quando ele visualiza o menu de navegação inferior,
então todos os ícones têm área tocável de no mínimo 44x44px.
Verificação: DevTools → computed height/width

**Critério 2 (bloqueante):**
Dado que o app está instalado como PWA com safe area,
quando o menu é exibido no iPhone com home bar,
então o menu não é cortado pelo safe area inset.
Verificação: Screenshot em iPhone 14

**Definition of Done:**
- [ ] Nenhum critério bloqueante falhando
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem warnings
- [ ] Screenshot aprovado em 375px e 390px
```

### priority-list.md
```markdown
# Priority List — AgenX UX Fixes
**Squad:** Design Spec Squad
**Data:** {date}

## 🔴 Sprint 1 (Fazer Agora)
| # | Spec | Componente | Esforço | Score | Por quê agora? |
|---|------|-----------|---------|-------|----------------|
| 1 | SPEC-003 | TimeGrid.tsx | 3h | 92 | Bloqueia uso da Agenda em mobile |
| 2 | SPEC-001 | BottomMobileNav.tsx | 30min | 88 | Quick win — 100% dos usuários mobile |

## 🟡 Sprint 2
...
```

---

## Integrações

| Serviço | Uso | Status |
|---------|-----|--------|
| **UX Audit Squad** | Consome ux-audit-report.md como input | ✅ Ativo |
| **Build Validation Squad** | Entrega design-spec.md + acceptance-criteria.md | ✅ Ativo |
| **@dev (Dex)** | Quick wins vão direto para implementação via GitHub Issue | ✅ Ativo |
| **GitHub Issues** | Criação automática de issues por spec | ✅ Ativo |
| **docs/stories/** | Artefatos salvos como stories AIOS | ✅ Ativo |
| **Linear / JIRA** | Sincronização de priority-list como tickets | 📋 Roadmap |

---

## Métricas de Sucesso do Squad

```yaml
success_metrics:
  spec_quality:
    criteria_testability_rate: "> 95%"     # Critérios que podem ser verificados objetivamente
    scope_ambiguity_rate: "< 5%"           # Specs com ambiguidade que causaram retrabalho
    build_validation_pass_rate: "> 85%"    # Specs que passam no Build Validation na 1ª tentativa

  efficiency:
    spec_generation_time: "< 2h (full audit → priority list)"
    quick_win_time: "< 30min (fast track)"
    priority_accuracy: "> 80%"             # % das P0 confirmados como críticos pelo @dev

  business_impact:
    critical_issues_specced_per_sprint: tracking
    quick_wins_shipped_per_sprint: tracking
    time_saved_vs_manual_spec: tracking    # Comparar com tempo de spec manual
```

---

## Handoff Protocol

```yaml
handoff_to_build_validation:
  trigger: spec_pipeline_completed
  artifacts:
    - file: design-spec.md
      contains: "component specs com changes técnicas"
    - file: acceptance-criteria.md
      contains: "critérios prontos para validação mecânica"
    - file: priority-list.md
      contains: "ordem de build recomendada"
  metadata:
    source_audit_score: number
    issues_count: number
    critical_count: number
    quick_wins_count: number

handoff_to_dev_direct:
  trigger: quick_wins_fast_track_completed
  format: github_issue
  auto_assign: "@dev (Dex)"
  label: "quick-win, ux-fix"
  note: "Issues de esforço < 2h não precisam passar pelo Build Validation"
```

---

*Squad criado pelo @squad-creator | AgenX AIOS 2.1 | 09/03/2026*
