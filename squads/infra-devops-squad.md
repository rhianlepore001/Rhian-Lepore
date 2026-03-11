# 🛠️ Infra & DevOps Squad — AgenX AIOS
# Squad ID: infra-devops-v1
# Versão: 1.0 | Data: 09/03/2026
# Formato: AIOS Squad 2.1

## Metadados do Squad

```yaml
squad:
  id: infra-devops-v1
  name: "Infra & DevOps Squad"
  description: >
    Squad especializado em estabilidade, performance e deploys seguros do AgenX SaaS.
    Monitora infraestrutura em tempo real, orquestra pipelines CI/CD, detecta anomalias
    de performance, responde a incidentes e garante deploys com zero downtime.
  version: "1.0.0"
  domain: infrastructure
  created_at: "2026-03-09"
  status: active
  author: squad-creator-agent
```

---

## Agentes do Squad

### 1. 🚀 Deploy Guardian Agent
```yaml
agent:
  id: deploy-guardian
  role: "Orquestra deploys seguros com rollback automático em caso de falha"
  skill: ci-cd-orchestration
  rpc: execute_safe_deploy
  trigger: push_to_main | manual | scheduled
  input:
    - branch: string
    - environment: "staging" | "production"
    - deploy_strategy: "blue-green" | "canary" | "rolling"
    - rollback_threshold: percentage
  output:
    - deploy_status: "success" | "failed" | "rolled_back"
    - deploy_duration: seconds
    - health_check_result: boolean
    - rollback_triggered: boolean
    - deploy_url: string
```

**Prompt Template:**
```
Execute deploy do branch {branch} para {environment}.
Estratégia: {deploy_strategy}.
Monitore health checks por 120 segundos pós-deploy.
Se error rate > {rollback_threshold}%, acionar rollback automático.
Notifique o canal devops com resultado e métricas.
```

---

### 2. 📡 Infrastructure Monitor Agent
```yaml
agent:
  id: infra-monitor
  role: "Monitora saúde da infraestrutura em tempo real e detecta anomalias"
  skill: observability
  rpc: check_infrastructure_health
  trigger: cron_5min | alert_webhook
  output:
    - cpu_usage: percentage
    - memory_usage: percentage
    - disk_usage: percentage
    - latency_p99: milliseconds
    - error_rate: percentage
    - services_status: list
    - anomalies_detected: list
    - overall_health: "healthy" | "degraded" | "critical"
```

**Alertas Configurados:**
```yaml
thresholds:
  cpu_critical: 90%
  memory_critical: 85%
  disk_warning: 75%
  latency_p99_critical: 2000ms
  error_rate_critical: 5%
```

---

### 3. 🔒 Security Scanner Agent
```yaml
agent:
  id: security-scanner
  role: "Escaneia vulnerabilidades, dependências desatualizadas e configurações inseguras"
  skill: security-audit
  rpc: run_security_scan
  trigger: pre_deploy | weekly | on_demand
  input:
    - scan_targets: list  # repos, containers, configs
    - severity_threshold: "low" | "medium" | "high" | "critical"
  output:
    - vulnerabilities_found: list
    - critical_count: number
    - high_count: number
    - affected_packages: list
    - cve_ids: list
    - remediation_suggestions: list
    - scan_report_url: string
```

---

### 4. 🗄️ Database Health Agent
```yaml
agent:
  id: db-health
  role: "Monitora performance do banco, detecta queries lentas e sugere otimizações"
  skill: database-observability
  rpc: get_database_health
  trigger: cron_hourly | on_demand
  input:
    - database: "supabase" | "postgres"
    - tenant_id: uuid  # opcional, para análise por tenant
  output:
    - connection_pool_usage: percentage
    - slow_queries: list
    - index_suggestions: list
    - rls_policy_issues: list
    - replication_lag: milliseconds
    - table_bloat: list
    - uptime: percentage
```

**Prompt Template:**
```
Analise a saúde do banco Supabase.
Identifique queries com execução > 500ms.
Verifique se RLS está ativo em todas as tabelas tenant-accessible.
Calcule index coverage para os top 10 queries mais frequentes.
Gere relatório de otimizações priorizadas por impacto.
```

---

### 5. ⚡ Performance Analyzer Agent
```yaml
agent:
  id: performance-analyzer
  role: "Analisa métricas de performance da aplicação e identifica gargalos"
  skill: apm-analysis
  rpc: analyze_performance
  trigger: post_deploy | weekly | on_demand
  input:
    - time_range: "1h" | "24h" | "7d" | "30d"
    - environment: "staging" | "production"
  output:
    - core_web_vitals:
        lcp: milliseconds
        fid: milliseconds
        cls: score
    - api_response_times: object
    - bundle_size: kb
    - memory_leaks_detected: boolean
    - bottlenecks: list
    - performance_score: 0-100
    - regression_detected: boolean
```

---

### 6. 🚨 Incident Responder Agent
```yaml
agent:
  id: incident-responder
  role: "Coordena resposta a incidentes, cria postmortems e executa runbooks automaticamente"
  skill: incident-management
  rpc: handle_incident
  trigger: alert_critical | manual
  input:
    - incident_type: "outage" | "degradation" | "security_breach" | "data_incident"
    - severity: "P1" | "P2" | "P3" | "P4"
    - affected_services: list
  output:
    - incident_id: string
    - status: "open" | "mitigating" | "resolved"
    - runbook_executed: string
    - actions_taken: list
    - mttr: minutes
    - postmortem_draft: string
    - stakeholders_notified: list
```

**Runbooks Automáticos:**
```yaml
runbooks:
  high_memory:
    - scale_horizontally
    - clear_cache
    - notify_dev_team
  database_overload:
    - enable_read_replica
    - kill_long_running_queries
    - page_oncall
  deploy_failure:
    - execute_rollback
    - restore_previous_version
    - create_incident_ticket
```

---

## Tasks do Squad

```yaml
tasks:
  - id: deploy-production
    name: "Deploy Seguro para Produção"
    agent: deploy-guardian
    trigger: manual | ci_pipeline
    priority: critical
    pre_checks:
      - security-scanner
      - performance-analyzer
    post_checks:
      - infra-monitor
      - db-health

  - id: infra-health-check
    name: "Health Check da Infraestrutura"
    agent: infra-monitor
    schedule: "*/5 * * * *"  # A cada 5 minutos
    notify_channel: slack_devops
    alert_on: degraded | critical

  - id: weekly-security-scan
    name: "Scan de Segurança Semanal"
    agent: security-scanner
    schedule: "0 6 * * 1"  # Toda segunda-feira às 6h
    severity_threshold: medium
    output_format: report

  - id: db-daily-health
    name: "Health Check Diário do Banco"
    agent: db-health
    schedule: "0 7 * * *"  # Todos os dias às 7h
    output_format: dashboard_widget

  - id: post-deploy-performance
    name: "Análise de Performance Pós-Deploy"
    agent: performance-analyzer
    trigger: post_deploy
    async: true
    time_range: "1h"

  - id: incident-response
    name: "Resposta Automática a Incidente"
    agent: incident-responder
    trigger: alert_webhook
    priority: critical
    async: false
```

---

## Workflows do Squad

### Deploy Pipeline Completo
```yaml
workflow:
  id: safe-deploy-pipeline
  name: "Pipeline de Deploy Seguro"
  steps:
    1_security_gate:
      agent: security-scanner
      condition: severity_threshold=high
      on_fail: block_deploy
    2_staging_deploy:
      agent: deploy-guardian
      environment: staging
      on_fail: notify_team
    3_smoke_tests:
      agent: performance-analyzer
      environment: staging
      on_fail: block_production
    4_production_deploy:
      agent: deploy-guardian
      environment: production
      strategy: blue-green
    5_post_deploy_monitor:
      agent: infra-monitor
      duration: 300s
      on_degraded: trigger_rollback
```

### Incident Response Flow
```yaml
workflow:
  id: incident-response-flow
  name: "Fluxo de Resposta a Incidente"
  trigger: critical_alert
  steps:
    1_detect:
      agent: infra-monitor
    2_classify:
      agent: incident-responder
    3_mitigate:
      agent: incident-responder
      action: execute_runbook
    4_verify:
      agent: infra-monitor
      duration: 60s
    5_postmortem:
      agent: incident-responder
      action: generate_postmortem
```

---

## Integrações

| Serviço | Uso | Status |
|---------|-----|--------|
| **GitHub Actions** | CI/CD pipelines, deploy triggers | ✅ Ativo |
| **Supabase** | Banco de dados, RLS monitoring | ✅ Ativo |
| **Vercel / Netlify** | Deploy de frontend, preview envs | ✅ Ativo |
| **Sentry** | Error tracking, alertas de exceção | ✅ Ativo |
| **Datadog / Grafana** | Observabilidade, APM, logs | 📋 Roadmap |
| **PagerDuty** | On-call, escalonamento de incidentes | 📋 Roadmap |
| **Snyk / OWASP** | Security scanning, CVE database | 📋 Roadmap |

---

## Métricas de Sucesso do Squad

```yaml
success_metrics:
  stability:
    uptime_sla: "> 99.9%"
    mttr: "< 15min"
    incident_frequency: "< 2/mês"

  performance:
    deploy_frequency: "> 5/semana"
    change_failure_rate: "< 5%"
    lead_time_for_changes: "< 2h"

  security:
    critical_vulnerabilities_open: "0"
    mean_time_to_patch: "< 48h"
    rls_coverage: "100%"

  devops:
    deploy_success_rate: "> 98%"
    rollback_frequency: "< 2%"
    pipeline_duration: "< 10min"
```

---

## DORA Metrics Tracking

```yaml
dora_metrics:
  deployment_frequency:
    target: "Multiple deploys per day"
    current: tracking
  lead_time_for_changes:
    target: "< 1 day"
    current: tracking
  change_failure_rate:
    target: "< 5%"
    current: tracking
  time_to_restore_service:
    target: "< 1 hour"
    current: tracking
```

---

*Squad criado pelo @squad-creator | AgenX AIOS 2.1 | 09/03/2026*
