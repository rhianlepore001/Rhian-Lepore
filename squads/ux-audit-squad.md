# 🎨 UX Audit Squad — AgenX AIOS
# Squad ID: ux-audit-v1
# Versão: 1.0 | Data: 09/03/2026
# Formato: AIOS Squad 2.1

## Metadados do Squad

```yaml
squad:
  id: ux-audit-v1
  name: "UX Audit Squad"
  description: >
    Squad especializado em auditoria de experiência do usuário nas telas do AgenX (Beauty OS).
    Avalia se cada fluxo faz sentido para o usuário real — não se funciona tecnicamente,
    mas se é intuitivo, consistente e eficiente. Atua em todas as 29 páginas do app,
    nos dois temas (Brutal para barbearias e Beauty para salões) e nas jornadas mobile e desktop.
  version: "1.0.0"
  domain: ux
  created_at: "2026-03-09"
  status: active
  author: squad-creator-agent
  target_product: "AgenX / Beauty OS — React 19 + Tailwind + PWA"
```

---

## Agentes do Squad

### 1. 🎯 Orchestrator Agent
```yaml
agent:
  id: ux-orchestrator
  role: "Coordena a auditoria completa por seção do app, prioriza o que auditar e consolida resultados"
  skill: ux-audit-orchestration
  rpc: run_ux_audit
  trigger: manual | sprint_start | post_deploy_ux
  input:
    - scope: "full" | "section" | "page"
    - section: "dashboard" | "agenda" | "settings" | "public" | "onboarding" | "all"
    - theme: "brutal" | "beauty" | "both"
    - priority: "critical_only" | "all"
  output:
    - audit_plan: list           # Seções e ordem de auditoria
    - agents_dispatched: list    # Quais agentes foram acionados
    - coverage_report: object    # % de telas auditadas
    - consolidated_report: url   # Relatório final gerado pelo Report Agent
    - total_issues_found: number
    - audit_duration: minutes
```

**Scope de Telas por Seção:**
```yaml
sections:
  onboarding:
    pages: [OnboardingWizard, Login, Register, ForgotPassword]
    priority: critical  # Primeira impressão do tenant
  core:
    pages: [Dashboard, Agenda, Clients, ClientCRM, Finance, Marketing, Reports]
    priority: high
  queue:
    pages: [QueueManagement, QueueJoin, QueueStatus]
    priority: medium
  public:
    pages: [PublicBooking, ProfessionalPortfolio, ClientArea]
    priority: high  # Telas que o cliente final do salão vê
  settings:
    pages: [GeneralSettings, TeamSettings, ServiceSettings, CommissionsSettings,
            SecuritySettings, AuditLogs, RecycleBin, SystemLogs, SubscriptionSettings,
            PublicBookingSettings]
    priority: medium
```

**Prompt Template:**
```
Inicie auditoria UX do AgenX para a seção {section}.
Tema: {theme}. Prioridade: {priority}.
Acione os agentes na ordem: Navigation → Consistency → Mobile → Benchmark.
Aguarde resultados de cada agente antes de acionar o Report Agent.
Consolide todos os achados e classifique como: crítico / importante / melhoria.
```

---

### 2. 🧭 Navigation Agent
```yaml
agent:
  id: navigation-agent
  role: "Avalia fluxos de navegação, detecta problemas de hierarquia, scroll e transições"
  skill: navigation-ux-analysis
  rpc: audit_navigation
  trigger: orchestrator | on_demand
  input:
    - page: string              # Página específica ou "all"
    - user_role: "owner" | "staff" | "public_client"
    - device: "mobile" | "desktop" | "both"
  output:
    - flow_issues: list
    - dead_ends: list           # Telas sem saída clara
    - scroll_issues: list       # Scroll horizontal indesejado, overflow
    - navigation_depth: object  # Nº de taps para cada ação principal
    - back_button_behavior: list
    - tab_order_issues: list    # Acessibilidade de navegação por teclado
    - severity_map: object      # issue → critical | important | improvement
```

**Checks Específicos para o AgenX:**
```yaml
navigation_checks:
  sidebar:
    - item_count_vs_mobile_usability   # Sidebar tem muitos itens para mobile?
    - active_state_clarity             # Item ativo visualmente claro?
    - collapse_behavior                # Sidebar colapsa corretamente em mobile?

  bottom_mobile_nav:
    - icon_label_clarity               # Ícones legíveis sem labels?
    - active_item_contrast             # Item ativo vs inativo distinguível?
    - thumb_reach_zone                 # Ações críticas na zona de polegar?

  agenda_page:
    - vertical_scroll_experience       # Scroll vertical fluido na timeline?
    - horizontal_overflow_detection    # Detectar scroll horizontal indesejado
    - swipe_gesture_conflict           # Gestos de swipe conflitam com browser?

  public_booking:
    - guest_flow_steps                 # Quantos passos para fazer agendamento?
    - back_navigation_guest            # Cliente consegue voltar sem perder dados?
    - confirmation_clarity             # Usuário sabe que agendou com sucesso?

  onboarding_wizard:
    - step_progress_visibility         # Usuário sabe em qual step está?
    - step_skip_option                 # Pode pular steps opcionais?
    - completion_clarity               # Tela de sucesso comunica o que fazer agora?
```

**Prompt Template:**
```
Audite a navegação da página {page} no AgenX como usuário {user_role} em {device}.
Mapeie todos os fluxos de entrada e saída da tela.
Detecte: scroll horizontal indesejado, dead ends, profundidade excessiva de navegação (> 3 taps).
Verifique se o BottomMobileNav tem comportamento correto em mobile.
Documente cada issue com: localização exata, severidade, print/evidência, sugestão de correção.
```

---

### 3. 🎨 Consistency Agent
```yaml
agent:
  id: consistency-agent
  role: "Verifica padrões visuais entre telas, identifica inconsistências de componentes e design tokens"
  skill: visual-consistency-audit
  rpc: audit_visual_consistency
  trigger: orchestrator | post_component_change
  input:
    - theme: "brutal" | "beauty" | "both"
    - scope: "components" | "typography" | "spacing" | "colors" | "all"
    - compare_pages: list       # Pares de páginas para comparar
  output:
    - inconsistencies: list
    - component_violations: list  # Componente usado diferente em telas distintas
    - color_token_misuse: list    # CSS var não respeitado
    - spacing_irregularities: list
    - button_style_matrix: object # Mapeamento de todos os estilos de botão encontrados
    - typography_audit: object
    - theme_switching_issues: list # Brutal → Beauty e vice-versa
    - severity_map: object
```

**Checks Específicos para o AgenX:**
```yaml
consistency_checks:
  brutal_theme:
    - BrutalCard_usage_consistency     # BrutalCard.tsx aplicado da mesma forma?
    - BrutalButton_variants            # Variantes usadas corretamente?
    - BrutalBackground_coverage        # Todas as telas do tema usam o bg?
    - screw_decorative_placement       # Screw.tsx em posições padronizadas?
    - neon_color_consistency           # Neon aplicado nos mesmos contexts?

  beauty_theme:
    - glassmorphism_uniformity         # Efeito glassmorphism padronizado?
    - soft_color_palette               # Paleta Beauty consistente?
    - card_border_radius               # Raios de borda iguais em todos os cards?

  cross_theme:
    - theme_switch_no_layout_shift     # Trocar tema não quebra layout?
    - component_behavior_parity        # Modal funciona igual em ambos temas?

  typography:
    - heading_hierarchy                # H1 → H2 → H3 corretos?
    - body_text_size_consistency       # Body text igual entre páginas?
    - button_label_casing              # Capitalização dos botões padronizada?

  spacing:
    - card_internal_padding            # Padding interno dos cards uniforme?
    - section_gaps                     # Espaçamento entre seções padronizado?
    - form_field_spacing               # Formulários com espaçamento consistente?

  modals:
    - modal_structure_parity           # Header, body, footer igual em todos modais?
    - close_button_position            # X sempre no mesmo lugar?
    - overlay_opacity                  # Overlay com opacidade padronizada?
```

**Prompt Template:**
```
Audite consistência visual do AgenX no tema {theme}.
Compare os componentes BrutalCard, BrutalButton, Modal e formulários entre todas as páginas.
Identifique: inconsistências de spacing, cor, tipografia, posicionamento de elementos.
Documente o "flexible solto" — elementos que quebram o layout fora de contexto.
Classifique por severidade e gere matriz de componentes inconsistentes.
```

---

### 4. 📱 Mobile Agent
```yaml
agent:
  id: mobile-agent
  role: "Testa responsividade real em viewport mobile, detecta quebras de layout e UX táctil"
  skill: mobile-ux-testing
  rpc: audit_mobile_experience
  trigger: orchestrator | post_css_change
  input:
    - viewports: list          # ["375x667", "390x844", "414x896"]
    - pages: list              # Páginas a testar
    - interaction_types: list  # ["tap", "swipe", "scroll", "pinch"]
    - pwa_mode: boolean        # Testar em modo PWA instalado?
  output:
    - layout_breaks: list      # Elementos cortados, overflow, sobreposição
    - touch_target_violations: list  # Targets < 44px (guideline Apple/Google)
    - viewport_issues: object  # Issues por tamanho de viewport
    - pwa_specific_issues: list
    - gesture_conflicts: list
    - keyboard_overlap_issues: list  # Teclado virtual esconde campos?
    - performance_on_mobile: object  # LCP, FID, CLS em mobile
    - severity_map: object
```

**Checks Específicos para o AgenX:**
```yaml
mobile_checks:
  agenda_page:
    - timeline_touch_accuracy          # Slots de horário grandes o suficiente?
    - appointment_card_swipe_actions   # Swipe para editar/cancelar funcional?
    - horizontal_scroll_detection      # Layout vaza horizontalmente?
    - time_grid_readability            # TimeGrid.tsx legível em 375px?

  dashboard:
    - widget_stacking_mobile           # Widgets empilham corretamente?
    - churn_radar_chart_mobile         # Recharts legível em tela pequena?
    - action_center_tap_targets        # Botões de ação atingíveis com polegar?

  public_booking:
    - form_keyboard_behavior           # Campos não ficam atrás do teclado?
    - calendar_picker_touch            # CalendarPicker.tsx usável em mobile?
    - phone_input_format               # PhoneInput.tsx funciona em teclado numérico?

  bottom_mobile_nav:
    - safe_area_inset_compliance       # Respeita safe area iOS (notch/home bar)?
    - icon_size_touch_compliance       # 44x44px mínimo?

  modals:
    - modal_height_on_mobile           # Modal não ultrapassa viewport?
    - modal_scroll_internal            # Conteúdo longo rola dentro do modal?
    - close_tap_area                   # Área de fechar atingível no mobile?

  settings_pages:
    - form_usability_mobile            # Formulários das configurações usáveis?
    - save_footer_visibility           # SaveFooter.tsx sempre visível?

  pwa_mode:
    - install_prompt_timing            # Prompt de instalação aparece no momento certo?
    - offline_fallback_ux              # Mensagem de erro offline é clara?
    - standalone_navigation            # Navegação funciona sem barra do browser?
```

**Prompt Template:**
```
Teste a experiência mobile do AgenX nas páginas {pages}.
Viewports: {viewports}. PWA mode: {pwa_mode}.
Verifique: overflow horizontal, touch targets < 44px, teclado cobrindo campos, safe area iOS.
Documente cada quebra com viewport exato, screenshot da evidência e linha de código causadora.
Classifique: crítico (bloqueia uso), importante (degrada experiência), melhoria (otimização).
```

---

### 5. 📊 Benchmark Agent
```yaml
agent:
  id: benchmark-agent
  role: "Compara cada tela do AgenX com referências de mercado e identifica gaps de expectativa"
  skill: ux-competitive-analysis
  rpc: benchmark_against_market
  trigger: orchestrator | quarterly | on_demand
  input:
    - page: string
    - competitors: list         # ["fresha", "linear", "notion", "calendly"]
    - dimensions: list          # ["information_architecture", "interaction", "visual", "performance"]
  output:
    - benchmark_scores: object  # AgenX vs competidores por dimensão (0-10)
    - gap_analysis: list        # Onde o AgenX está abaixo do mercado
    - best_practices_found: list
    - opportunities: list       # O que o AgenX pode adotar
    - differentiators: list     # O que o AgenX faz melhor
    - competitor_screenshots: list
    - severity_map: object
```

**Referências por Tela:**
```yaml
benchmark_references:
  agenda_page:
    primary: fresha      # Líder de mercado em agendamento de salão
    secondary: calendly  # Referência em UX de calendário
    dimensions:
      - appointment_creation_flow  # Quantos cliques para agendar?
      - time_slot_visualization    # Como os horários são exibidos?
      - cancellation_ux            # Cancelar é fácil para o cliente?

  dashboard:
    primary: linear      # Referência em dashboards de SaaS
    secondary: notion    # Referência em organização de informação
    dimensions:
      - information_hierarchy      # O que está em destaque é o que importa?
      - action_discoverability     # Usuário encontra ações principais?
      - data_density               # Dashboard sobrecarregado ou equilibrado?

  public_booking:
    primary: fresha      # Bookings públicos de salão
    secondary: calendly  # UX de booking para o cliente externo
    dimensions:
      - steps_to_book             # Quantos passos até confirmação?
      - trust_signals             # Foto, avaliações, profissional visível?
      - mobile_experience         # Booking é fluido em mobile?

  client_crm:
    primary: notion      # Referência em CRM simples e organizável
    secondary: linear    # Referência em listagens e filtros
    dimensions:
      - search_and_filter          # Busca de clientes é rápida?
      - client_history_clarity     # Histórico do cliente é fácil de ler?

  finance:
    primary: linear      # Referência em dados estruturados
    dimensions:
      - chart_readability          # Gráficos Recharts fáceis de interpretar?
      - transaction_list_ux        # Lista de transações escaneável?

  onboarding_wizard:
    primary: notion      # Onboarding com progresso claro
    secondary: linear    # Onboarding de SaaS B2B
    dimensions:
      - time_to_value             # Em quantos minutos o usuário vê valor?
      - wizard_ux                 # Steps, progresso e feedback claros?
```

**Prompt Template:**
```
Compare a página {page} do AgenX com {competitors}.
Avalie nas dimensões: {dimensions}.
Atribua score de 0-10 para o AgenX e para cada competidor.
Identifique: onde o AgenX está abaixo do mercado (gap), onde está igual (parity), onde lidera (differentiator).
Liste as 3 melhores práticas do competidor que o AgenX poderia adotar.
Documente com screenshots comparativos quando disponível.
```

---

### 6. 📋 Report Agent
```yaml
agent:
  id: report-agent
  role: "Consolida todos os achados de auditoria e gera relatório priorizado e acionável"
  skill: ux-report-generation
  rpc: generate_ux_audit_report
  trigger: orchestrator_final | on_demand
  input:
    - audit_results: object     # Saídas de todos os agentes anteriores
    - output_format: "markdown" | "pdf" | "notion" | "github_issue"
    - audience: "dev_team" | "product" | "stakeholder"
    - include_screenshots: boolean
  output:
    - report_path: string
    - executive_summary: string
    - issues_by_priority:
        critical: list          # Bloqueia uso — corrigir antes do próximo release
        important: list         # Degrada experiência — corrigir no próximo sprint
        improvement: list       # Otimizações incrementais — backlog
    - issues_by_theme:
        brutal: list
        beauty: list
    - issues_by_page: object
    - quick_wins: list          # Correções < 2h com alto impacto
    - effort_impact_matrix: object
    - github_issues_created: list
    - total_issues: number
    - audit_score: 0-100        # Score geral de UX do AgenX
```

**Estrutura do Relatório:**
```yaml
report_structure:
  header:
    - product: "AgenX / Beauty OS"
    - audit_date: date
    - scope: seções auditadas
    - auditors: agentes utilizados
    - overall_score: 0-100

  executive_summary:
    - top_3_critical_issues
    - quick_wins_available
    - themes_comparison: "Brutal vs Beauty"

  issues_critical:
    format: "| Página | Issue | Evidência | Sugestão | Esforço |"
    severity_criteria: "Bloqueia fluxo principal ou causa dado incorreto"

  issues_important:
    format: "| Página | Issue | Evidência | Sugestão | Esforço |"
    severity_criteria: "Degrada experiência mas fluxo ainda funciona"

  issues_improvement:
    format: "| Página | Issue | Evidência | Sugestão | Esforço |"
    severity_criteria: "Melhoria incremental de qualidade"

  benchmark_summary:
    - score_vs_fresha
    - score_vs_linear
    - score_vs_notion
    - top_opportunities

  mobile_summary:
    - viewports_tested
    - breaks_found
    - pwa_compliance

  quick_wins:
    criteria: "Impacto alto + esforço < 2h"
    format: "| Fix | Arquivo | Esforço estimado |"

  roadmap_suggestions:
    - sprint_n: lista de issues a corrigir por sprint
```

**Prompt Template:**
```
Gere relatório de auditoria UX do AgenX com base nos resultados:
Navigation Agent: {nav_results}
Consistency Agent: {consistency_results}
Mobile Agent: {mobile_results}
Benchmark Agent: {benchmark_results}

Formato: {output_format}. Audiência: {audience}.
Classifique cada issue como: crítico / importante / melhoria.
Identifique quick wins (impacto alto, esforço < 2h).
Gere score geral de 0-100 para o AgenX.
Crie GitHub Issues para os itens críticos automaticamente.
```

---

## Tasks do Squad

```yaml
tasks:
  - id: full-ux-audit
    name: "Auditoria UX Completa do AgenX"
    agent: ux-orchestrator
    trigger: manual | quarterly
    scope: all
    theme: both
    output: full_report
    estimated_duration: "4-6h"

  - id: section-audit-agenda
    name: "Auditoria UX — Página Agenda"
    agent: ux-orchestrator
    trigger: manual | post_deploy
    scope: section
    section: agenda
    priority: critical_only
    estimated_duration: "1h"

  - id: section-audit-public-booking
    name: "Auditoria UX — Booking Público"
    agent: ux-orchestrator
    trigger: manual | post_deploy
    scope: section
    section: public
    priority: all
    estimated_duration: "1h"

  - id: navigation-spot-check
    name: "Spot Check de Navegação"
    agent: navigation-agent
    trigger: on_demand
    page: all
    user_role: owner
    device: both
    estimated_duration: "45min"

  - id: mobile-regression
    name: "Regressão Mobile Pós-Deploy"
    agent: mobile-agent
    trigger: post_deploy
    viewports: ["375x667", "390x844"]
    pages: ["Dashboard", "Agenda", "PublicBooking"]
    pwa_mode: true
    estimated_duration: "30min"

  - id: consistency-theme-check
    name: "Verificação de Consistência por Tema"
    agent: consistency-agent
    trigger: post_component_change
    theme: both
    scope: components
    estimated_duration: "1h"

  - id: benchmark-quarterly
    name: "Benchmark Trimestral vs Mercado"
    agent: benchmark-agent
    trigger: quarterly
    pages: ["Agenda", "Dashboard", "PublicBooking"]
    competitors: ["fresha", "linear", "notion", "calendly"]
    estimated_duration: "2h"

  - id: generate-ux-report
    name: "Gerar Relatório de Auditoria UX"
    agent: report-agent
    trigger: post_audit
    output_format: markdown
    audience: dev_team
    include_screenshots: true
    estimated_duration: "30min"
```

---

## Workflows do Squad

### Auditoria Completa (Sprint Start)
```yaml
workflow:
  id: full-ux-audit-workflow
  name: "Auditoria UX Completa"
  trigger: manual | sprint_start
  steps:
    1_orchestrate:
      agent: ux-orchestrator
      scope: all
      theme: both
    2_navigation:
      agent: navigation-agent
      page: all
      device: both
      depends_on: 1_orchestrate
    3_consistency:
      agent: consistency-agent
      theme: both
      scope: all
      depends_on: 1_orchestrate
    4_mobile:
      agent: mobile-agent
      viewports: ["375x667", "390x844", "414x896"]
      pages: all
      depends_on: 1_orchestrate
    5_benchmark:
      agent: benchmark-agent
      pages: ["Agenda", "Dashboard", "PublicBooking", "OnboardingWizard"]
      competitors: ["fresha", "linear", "notion"]
      depends_on: 1_orchestrate
    6_report:
      agent: report-agent
      output_format: markdown
      audience: dev_team
      depends_on: [2_navigation, 3_consistency, 4_mobile, 5_benchmark]
```

### Auditoria Rápida Pós-Deploy
```yaml
workflow:
  id: post-deploy-ux-check
  name: "UX Check Pós-Deploy"
  trigger: post_deploy
  estimated_duration: "45min"
  steps:
    1_mobile_regression:
      agent: mobile-agent
      viewports: ["375x667", "390x844"]
      pages: ["Dashboard", "Agenda", "PublicBooking"]
    2_consistency_spot:
      agent: consistency-agent
      scope: components
      theme: both
    3_navigation_spot:
      agent: navigation-agent
      page: changed_pages  # Apenas páginas alteradas no deploy
      device: mobile
    4_mini_report:
      agent: report-agent
      output_format: github_issue
      priority: critical_only
      depends_on: [1_mobile_regression, 2_consistency_spot, 3_navigation_spot]
```

### Auditoria de Nova Feature
```yaml
workflow:
  id: feature-ux-review
  name: "Revisão UX de Nova Feature"
  trigger: pre_merge | story_review
  steps:
    1_navigation:
      agent: navigation-agent
      page: new_feature_pages
      device: both
    2_mobile:
      agent: mobile-agent
      pages: new_feature_pages
      viewports: ["375x667", "390x844"]
    3_consistency:
      agent: consistency-agent
      scope: components
      compare_pages: [new_page, similar_existing_page]
    4_report:
      agent: report-agent
      output_format: github_issue
      audience: dev_team
      depends_on: [1_navigation, 2_mobile, 3_consistency]
```

---

## Escala de Severidade

```yaml
severity_scale:
  critical:
    description: "Bloqueia fluxo principal ou impede uso da feature"
    examples:
      - "Scroll horizontal em Agenda impede ver horários"
      - "Botão de agendamento inacessível em mobile 375px"
      - "Modal não fecha em iOS Safari"
    sla: "Corrigir antes do próximo release"

  important:
    description: "Degrada experiência significativamente mas fluxo funciona"
    examples:
      - "Inconsistência de cor entre BrutalCard e BrutalButton"
      - "Touch target < 44px no BottomMobileNav"
      - "Agenda não tem feedback visual de loading"
    sla: "Corrigir no próximo sprint"

  improvement:
    description: "Oportunidade de melhoria incremental"
    examples:
      - "Benchmark com Fresha mostra oportunidade de reduzir steps de booking"
      - "Spacing de formulários poderia ser mais consistente"
      - "Transição de tema Brutal → Beauty sem animação"
    sla: "Priorizar no backlog"
```

---

## Integrações

| Serviço | Uso | Status |
|---------|-----|--------|
| **GitHub Issues** | Criação automática de issues críticos pós-auditoria | ✅ Ativo |
| **Playwright** | Screenshots e testes de interação em viewports | ✅ Via MCP |
| **Fresha** | Referência de benchmark para fluxos de salão | 📋 Análise manual |
| **Linear** | Referência de benchmark para dashboards SaaS | 📋 Análise manual |
| **Notion** | Referência de benchmark para onboarding e organização | 📋 Análise manual |
| **Calendly** | Referência de benchmark para booking público | 📋 Análise manual |
| **Figma** | Comparação com protótipos e design system | 📋 Roadmap |

---

## Métricas de Sucesso do Squad

```yaml
success_metrics:
  coverage:
    pages_audited_per_sprint: "> 80%"
    critical_issues_found_vs_resolved: "100% resolved before release"

  quality:
    ux_score_target: "> 75/100"
    mobile_compliance: "100% touch targets >= 44px"
    scroll_horizontal_issues: "0 em produção"

  benchmark:
    fresha_parity: "> 7/10 em fluxos de agendamento"
    linear_parity: "> 7/10 em dashboards"
    booking_steps_target: "<= 4 taps para agendar (como Fresha)"

  speed:
    post_deploy_check_duration: "< 45min"
    full_audit_duration: "< 6h"
    issue_creation_time: "< 5min (automático via Report Agent)"
```

---

## Exemplo de Relatório de Saída

```markdown
# 🎨 AgenX UX Audit Report
**Data:** 09/03/2026 | **Score Geral:** 68/100 | **Tema:** Brutal + Beauty

## ⚠️ Issues Críticos (3)
| Página | Issue | Evidência | Sugestão | Esforço |
|--------|-------|-----------|----------|---------|
| Agenda | Scroll horizontal no TimeGrid em 375px | Screenshot #1 | overflow-x: hidden + grid responsivo | 2h |
| PublicBooking | Botão "Confirmar" abaixo do fold em iPhone SE | Screenshot #2 | Sticky footer com CTA | 1h |
| Dashboard | ChurnRadar recharts ilegível em 320px | Screenshot #3 | ResponsiveContainer com minWidth | 3h |

## 📌 Issues Importantes (8)
...

## 💡 Quick Wins (4)
| Fix | Arquivo | Esforço |
|-----|---------|---------|
| Padding BottomMobileNav → 44px | BottomMobileNav.tsx:47 | 30min |
| Consistência de border-radius em cards Brutal | BrutalCard.tsx | 20min |
| ...

## 📊 Benchmark vs Mercado
| Dimensão | AgenX | Fresha | Linear | Notion |
|----------|-------|--------|--------|--------|
| Fluxo de agendamento | 6/10 | 9/10 | — | — |
| Dashboard UX | 7/10 | 5/10 | 9/10 | 8/10 |
| Onboarding | 6/10 | 7/10 | 8/10 | 9/10 |
```

---

*Squad criado pelo @squad-creator | AgenX AIOS 2.1 | 09/03/2026*
