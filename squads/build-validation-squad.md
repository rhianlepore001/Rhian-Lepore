# 🏗️ Build Validation Squad — AgenX AIOS
# Squad ID: build-validation-v1
# Versão: 1.0 | Data: 09/03/2026
# Formato: AIOS Squad 2.1

## Metadados do Squad

```yaml
squad:
  id: build-validation-v1
  name: "Build Validation Squad"
  description: >
    Gate de construção do AgenX AIOS. Recebe o output de squads upstream,
    valida escopo, dependências, riscos, esforço e alinhamento com o PRD
    antes de qualquer build ir ao ar. Emite veredicto final: Aprovado,
    Revisar ou Bloqueado — com justificativa detalhada.
  version: "1.0.0"
  domain: quality-gate
  created_at: "2026-03-09"
  status: active
  author: squad-creator-agent
```

---

## Agentes do Squad

### 1. 🎛️ Orchestrator Agent
```yaml
agent:
  id: orchestrator
  role: "Recebe o output do Squad upstream, coordena a sequência de validação e emite veredicto final consolidado"
  skill: pipeline-orchestration
  rpc: run_validation_pipeline
  trigger: squad_output_received | manual
  input:
    - source_squad: string         # ID do squad que gerou o artefato
    - artifact: object             # Story, feature spec, PRD slice, etc.
    - artifact_type: "story" | "feature" | "epic" | "prd_slice"
    - priority: "P1" | "P2" | "P3" | "P4"
  output:
    - validation_id: uuid
    - pipeline_status: "running" | "completed" | "failed"
    - agents_results: object       # Resultados individuais de cada agente
    - final_verdict: object        # Emitido pelo Verdict Agent
    - report_url: string
```

**Sequência de Orquestração:**
```yaml
pipeline_order:
  1: scope-agent       # Primeiro valida o escopo
  2: dependency-agent  # Mapeia o que precisa existir
  3: risk-agent        # Avalia riscos de regressão
  4: effort-agent      # Estima esforço vs. valor
  5: alignment-agent   # Cruza com o PRD
  6: verdict-agent     # Consolida e emite veredicto
parallel_allowed: [risk-agent, effort-agent, alignment-agent]  # Podem rodar em paralelo após dependency
```

---

### 2. 🔭 Scope Agent
```yaml
agent:
  id: scope-agent
  role: "Verifica se o escopo definido está claro, sem ambiguidade e sem scope creep"
  skill: scope-analysis
  rpc: validate_scope
  trigger: orchestrator_call
  input:
    - artifact: object
    - acceptance_criteria: list
    - out_of_scope: list
  output:
    - scope_clarity_score: 0-10
    - ambiguities_found: list
    - scope_creep_detected: boolean
    - scope_creep_items: list
    - missing_acceptance_criteria: list
    - recommendations: list
    - verdict: "clear" | "needs_refinement" | "blocked"
```

**Prompt Template:**
```
Analise o artefato: {artifact}.

Verifique:
1. Os critérios de aceite cobrem todos os casos de uso descritos?
2. Há itens no escopo que vão além do objetivo declarado? (scope creep)
3. Existe alguma ambiguidade que pode gerar retrabalho durante o build?
4. O "out of scope" está explícito e documentado?

Retorne pontuação de clareza de 0 a 10, lista de ambiguidades encontradas
e recomendações para refinamento. Seja direto e objetivo.
```

---

### 3. 🔗 Dependency Agent
```yaml
agent:
  id: dependency-agent
  role: "Mapeia dependências técnicas — o que precisa existir antes disso ser construído"
  skill: dependency-mapping
  rpc: map_dependencies
  trigger: orchestrator_call
  input:
    - artifact: object
    - current_tech_stack: object   # Estado atual do AgenX
    - existing_components: list
  output:
    - hard_dependencies: list      # Bloqueiam o build se não existirem
    - soft_dependencies: list      # Podem ser desenvolvidas em paralelo
    - missing_dependencies: list
    - circular_dependencies: list
    - dependency_graph: object
    - build_order: list
    - verdict: "ready" | "partial" | "blocked"
```

**Prompt Template:**
```
Dado o artefato {artifact}, mapeie todas as dependências técnicas no contexto do AgenX AIOS.

Tech stack atual: React 19, TypeScript, Vite, Supabase (PostgreSQL + RLS), Clerk Auth, Gemini AI, Stripe.

Identifique:
1. O que DEVE existir antes deste build começar (hard dependencies)?
2. O que PODE ser desenvolvido em paralelo (soft dependencies)?
3. Há dependências circulares ou conflitos com o que já existe?
4. Qual a ordem recomendada de build?

Para cada dependência, informe: nome, tipo, status atual (exists/missing/partial).
```

---

### 4. ⚠️ Risk Agent
```yaml
agent:
  id: risk-agent
  role: "Avalia riscos de regressão — o que pode quebrar no AgenX se isso for ao ar"
  skill: risk-assessment
  rpc: assess_regression_risk
  trigger: orchestrator_call
  input:
    - artifact: object
    - affected_modules: list
    - test_coverage: percentage
  output:
    - regression_risks: list
    - high_risk_areas: list
    - affected_tenants: list        # Risco multi-tenant
    - rls_impact: boolean           # Impacto em Row Level Security
    - auth_impact: boolean          # Impacto em Clerk Auth
    - data_migration_required: boolean
    - rollback_complexity: "easy" | "medium" | "hard"
    - risk_score: 0-100
    - mitigation_strategies: list
    - verdict: "low" | "medium" | "high" | "critical"
```

**Prompt Template:**
```
Avalie os riscos de regressão do artefato {artifact} no contexto do AgenX.

Módulos críticos a verificar: autenticação (Clerk), isolamento multi-tenant (Supabase RLS),
fluxo de agendamento, sistema de pagamentos (Stripe), módulo de IA (Gemini).

Responda:
1. Quais funcionalidades existentes podem ser impactadas?
2. Há risco de quebrar o isolamento multi-tenant (company_id leakage)?
3. Existe risco de regressão em pagamentos ou autenticação?
4. Qual a complexidade de rollback se algo der errado?
5. Quais testes devem ser escritos/executados antes do deploy?

Pontue o risco geral de 0 a 100 e liste estratégias de mitigação.
```

---

### 5. ⚖️ Effort Agent
```yaml
agent:
  id: effort-agent
  role: "Estima esforço real vs. valor entregue — filtra o que não vale o custo agora"
  skill: effort-estimation
  rpc: estimate_effort_vs_value
  trigger: orchestrator_call
  input:
    - artifact: object
    - team_velocity: number        # Story points por sprint
    - business_context: object     # Fase atual do produto, ARR, churn, etc.
  output:
    - effort_estimate:
        story_points: number
        dev_days: number
        confidence: percentage
    - value_score: 0-100           # Valor de negócio estimado
    - roi_ratio: number            # Value / Effort
    - opportunity_cost: string     # O que deixa de ser feito
    - recommended_priority: "now" | "next_sprint" | "backlog" | "discard"
    - justification: string
    - verdict: "worth_it" | "deprioritize" | "discard"
```

**Prompt Template:**
```
Estime o esforço e valor do artefato {artifact} para o AgenX.

Contexto de negócio: {business_context}
Velocidade atual do time: {team_velocity} story points/sprint.

Calcule:
1. Estimativa de esforço em story points e dias de desenvolvimento
2. Score de valor de negócio (0-100): impacto em retenção, aquisição, receita, NPS
3. Razão ROI = valor / esforço
4. O que deixa de ser entregue se este item for priorizado agora?

Recomende: construir agora / próximo sprint / backlog / descartar.
Seja honesto — filtre o que não vale o custo neste momento.
```

---

### 6. 🎯 Alignment Agent
```yaml
agent:
  id: alignment-agent
  role: "Cruza com o PRD do AgenX — verifica se o artefato está alinhado com a visão do produto"
  skill: product-alignment
  rpc: check_prd_alignment
  trigger: orchestrator_call
  input:
    - artifact: object
    - prd_reference: string        # Seção do PRD relevante
    - product_vision: string       # Visão de longo prazo do AgenX
    - current_okrs: list
  output:
    - prd_coverage: percentage     # Quanto do PRD este item cobre
    - vision_alignment_score: 0-10
    - okr_contribution: list       # Quais OKRs são impactados
    - contradictions_found: list   # Conflitos com decisões anteriores do PRD
    - missing_prd_requirements: list
    - product_strategy_notes: string
    - verdict: "aligned" | "partial" | "misaligned"
```

**Prompt Template:**
```
Verifique o alinhamento do artefato {artifact} com o PRD do AgenX AIOS.

Visão do produto: Sistema premium de gestão para salões e barbearias com
suporte multi-tenant, IA embarcada (Gemini), temas Brutal/Beauty e automação
de marketing.

Responda:
1. Este artefato está na direção da visão do produto?
2. Contradiz alguma decisão arquitetural ou de produto já documentada?
3. Contribui para os OKRs atuais?
4. Existe alguma feature que deveria estar no PRD mas não está coberta aqui?

Pontue o alinhamento de 0 a 10 e aponte divergências se existirem.
```

---

### 7. 🏛️ Verdict Agent
```yaml
agent:
  id: verdict-agent
  role: "Consolida os resultados de todos os agentes e emite veredicto final com justificativa"
  skill: decision-synthesis
  rpc: emit_final_verdict
  trigger: orchestrator_call  # Último a ser chamado
  input:
    - scope_result: object
    - dependency_result: object
    - risk_result: object
    - effort_result: object
    - alignment_result: object
    - artifact: object
  output:
    - verdict: "✅ Aprovado" | "⚠️ Revisar" | "❌ Bloqueado"
    - verdict_code: "approved" | "review" | "blocked"
    - confidence: percentage
    - summary: string              # Resumo executivo em 3-5 linhas
    - blocking_reasons: list       # Preenchido quando bloqueado
    - review_items: list           # Preenchido quando revisar
    - conditions_to_approve: list  # O que precisa mudar para aprovar
    - approved_as_is: boolean
    - report: object               # Relatório completo consolidado
```

**Lógica de Veredicto:**
```yaml
verdict_rules:
  blocked:
    - scope_verdict == "blocked"
    - dependency_verdict == "blocked"
    - risk_verdict == "critical"
    - alignment_verdict == "misaligned"
    - effort_verdict == "discard"

  review:
    - scope_clarity_score < 7
    - risk_score > 50
    - roi_ratio < 1.5
    - vision_alignment_score < 7
    - missing_dependencies > 0

  approved:
    - all above conditions NOT met
    - scope_clarity_score >= 7
    - risk_score <= 50
    - roi_ratio >= 1.5
    - vision_alignment_score >= 7
```

**Prompt Template:**
```
Consolide os resultados da validação do artefato {artifact}:

Escopo: {scope_result.verdict} (score: {scope_result.scope_clarity_score}/10)
Dependências: {dependency_result.verdict} — {dependency_result.missing_dependencies.length} faltando
Risco: {risk_result.verdict} (score: {risk_result.risk_score}/100)
Esforço vs. Valor: {effort_result.verdict} (ROI: {effort_result.roi_ratio})
Alinhamento PRD: {alignment_result.verdict} (score: {alignment_result.vision_alignment_score}/10)

Com base nesses dados, emita:
1. Veredicto final: ✅ Aprovado / ⚠️ Revisar / ❌ Bloqueado
2. Resumo executivo (máximo 5 linhas)
3. Razões de bloqueio (se aplicável)
4. Itens para revisão (se aplicável)
5. Condições para aprovação (se revisão ou bloqueio)

Seja direto, objetivo e acionável.
```

---

## Tasks do Squad

```yaml
tasks:
  - id: validate-story
    name: "Validação Completa de Story"
    agent: orchestrator
    trigger: story_submitted | manual
    artifact_type: story
    timeout: 300s
    notify_channel: in_app

  - id: validate-feature
    name: "Validação de Feature Spec"
    agent: orchestrator
    trigger: feature_spec_submitted | manual
    artifact_type: feature
    timeout: 600s
    notify_channel: in_app

  - id: quick-scope-check
    name: "Verificação Rápida de Escopo"
    agent: scope-agent
    trigger: on_demand
    artifact_type: any
    timeout: 60s

  - id: risk-assessment-only
    name: "Avaliação de Risco Isolada"
    agent: risk-agent
    trigger: on_demand | pre_deploy
    artifact_type: any
    timeout: 120s

  - id: prd-alignment-check
    name: "Verificação de Alinhamento com PRD"
    agent: alignment-agent
    trigger: on_demand | weekly_review
    artifact_type: any
    timeout: 90s
```

---

## Workflow: Pipeline de Validação Completa

```yaml
workflow:
  id: full-validation-pipeline
  name: "Pipeline de Validação de Build"
  trigger: artifact_submitted
  steps:
    1_orchestrate:
      agent: orchestrator
      action: receive_artifact
    2_scope:
      agent: scope-agent
      on_blocked: emit_verdict_immediately
    3_dependency:
      agent: dependency-agent
      depends_on: [2_scope]
    4_parallel_analysis:
      parallel: true
      agents:
        - risk-agent
        - effort-agent
        - alignment-agent
      depends_on: [3_dependency]
    5_verdict:
      agent: verdict-agent
      depends_on: [4_parallel_analysis]
      action: emit_final_verdict

output_format:
  verdict_badge: true
  executive_summary: true
  detailed_report: true
  action_items: true
```

---

## Formato de Output do Veredicto

```
╔══════════════════════════════════════════════╗
║         BUILD VALIDATION REPORT              ║
║         {artifact_name}                      ║
╠══════════════════════════════════════════════╣
║ Veredicto:  ✅ APROVADO / ⚠️ REVISAR / ❌ BLOQUEADO ║
║ Confiança:  {confidence}%                    ║
╠══════════════════════════════════════════════╣
║ 📋 Escopo:       {scope_verdict}             ║
║ 🔗 Dependências: {dependency_verdict}        ║
║ ⚠️ Risco:        {risk_verdict}              ║
║ ⚖️ Esforço/Valor: {effort_verdict}           ║
║ 🎯 Alinhamento:  {alignment_verdict}         ║
╠══════════════════════════════════════════════╣
║ RESUMO:                                      ║
║ {summary}                                    ║
╠══════════════════════════════════════════════╣
║ CONDIÇÕES PARA APROVAÇÃO:                    ║
║ • {condition_1}                              ║
║ • {condition_2}                              ║
╚══════════════════════════════════════════════╝
```

---

## Integrações

| Serviço | Uso | Status |
|---------|-----|--------|
| **Squad A (upstream)** | Recebe artefatos para validação | ✅ Ativo |
| **Supabase** | Persiste resultados de validações | ✅ Ativo |
| **GitHub** | Comenta em PRs com veredicto | 📋 Roadmap |
| **Slack / In-App** | Notifica time com resultado | ✅ Ativo |
| **JIRA / Linear** | Atualiza status de tickets | 📋 Roadmap |

---

## Métricas de Sucesso do Squad

```yaml
success_metrics:
  quality_gate:
    false_positive_rate: "< 5%"        # Bloqueios indevidos
    false_negative_rate: "< 2%"        # Problemas não detectados
    validation_accuracy: "> 93%"

  efficiency:
    avg_validation_time: "< 5min"
    pipeline_completion_rate: "> 99%"
    scope_creep_detected_early: "> 80%"

  business_impact:
    regressions_prevented: tracking
    misaligned_features_blocked: tracking
    effort_saved_by_early_filtering: tracking
```

---

*Squad criado pelo @squad-creator | AgenX AIOS 2.1 | 09/03/2026*
