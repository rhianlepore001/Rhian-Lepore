# 🤖 Marketing Growth Squad — AgenX AIOS
# Squad ID: marketing-growth-v1
# Versão: 1.0 | Data: 22/02/2026
# Formato: AIOS Squad 2.1

## Metadados do Squad

```yaml
squad:
  id: marketing-growth-v1
  name: "Marketing Growth Squad"
  description: >
    Squad especializado em acelerar o crescimento (GTM) do AgenX SaaS.
    Combina análise de churn, geração de conteúdo, rastreamento de ROI
    de campanhas e viral loops para maximizar aquisição e retenção.
  version: "1.0.0"
  domain: marketing
  created_at: "2026-02-22"
  status: active
  author: squad-creator-agent
```

---

## Agentes do Squad

### 1. 🎯 Churn Radar Agent
```yaml
agent:
  id: churn-radar
  role: "Detecta clientes em risco de abandono e calcula receita recuperável"
  skill: aios-diagnostic
  rpc: get_aios_diagnostic
  trigger: daily_cron | manual
  output:
    - clients_at_risk: list
    - recoverable_revenue: number
    - priority_score: 0-100
```

**Prompt Template:**
```
Analise os clientes do tenant {tenant_id}. 
Identifique clientes que não agendaram nos últimos 30 dias.
Calcule a receita recuperável com base no ticket médio histórico.
Priorize pelo maior potencial de retorno.
```

---

### 2. ✍️ AIOS Copywriter Agent
```yaml
agent:
  id: aios-copywriter
  role: "Gera mensagens personalizadas de reativação via WhatsApp"
  skill: gemini-copywriting
  rpc: generate_reactivation_message
  trigger: on_demand | user_action
  input:
    - client_name: string
    - last_service: string
    - days_absent: number
    - business_name: string
    - business_theme: "barber" | "beauty"
  output:
    - message_text: string
    - whatsapp_url: string
    - estimated_conversion: percentage
```

**Templates por Segmento:**

**Barber Theme:**
```
Oi {client_name}! 👋
Faz {days_absent} dias que não te vejo aqui na {business_name}.
Tá na hora de dar uma reativada no visual, parceiro! 
Tô com horário disponível essa semana.
Reserva aqui: {booking_link}
```

**Beauty Theme:**
```
Oii {client_name}! 💅
Quanto tempo! Sua última visita aqui na {business_name} foi há {days_absent} dias.
Que tal se cuidar um pouquinho? Tenho horários disponíveis pra você 🌸
Agende agora: {booking_link}
```

---

### 3. 📊 Campaign ROI Analyst Agent
```yaml
agent:
  id: campaign-roi-analyst
  role: "Mede o resultado financeiro real de cada campanha de reativação"
  skill: data-analytics
  rpc: get_campaign_roi
  trigger: weekly_report | on_demand
  output:
    - messages_sent: number
    - clients_reactivated: number
    - revenue_attributed: number
    - best_performing_day: string
    - best_performing_time: string
    - conversion_rate: percentage
```

---

### 4. 📣 Content Generator Agent
```yaml
agent:
  id: content-generator
  role: "Cria posts e conteúdos de marketing para redes sociais do estabelecimento"
  skill: gemini-content
  trigger: on_demand | weekly
  input:
    - content_type: "instagram_post" | "story" | "whatsapp_status"
    - theme: "promotion" | "tip" | "before_after" | "testimonial"
    - business_data: object
  output:
    - caption: string
    - hashtags: list
    - best_time_to_post: string
    - cta: string
```

---

### 5. 🔗 Referral Manager Agent
```yaml
agent:
  id: referral-manager
  role: "Gerencia o programa de indicações e aplica recompensas automaticamente"
  skill: growth-mechanics
  rpc: process_referral
  trigger: on_new_paid_subscription
  input:
    - referrer_id: uuid
    - referred_id: uuid
    - subscription_id: string
  output:
    - reward_applied: boolean
    - credit_amount: number
    - notification_sent: boolean
  integration:
    - stripe_webhook: customer.subscription.created
    - supabase_table: referrals
```

---

### 6. 💬 NPS Feedback Agent
```yaml
agent:
  id: nps-feedback
  role: "Coleta e analisa scores de NPS, identifica promotores para cases"
  skill: customer-success
  trigger: day_7 | day_30 | quarterly
  input:
    - user_id: uuid
    - tenant_id: uuid
    - trigger_event: string
  output:
    - nps_score: 0-10
    - feedback_text: string
    - classification: "detractor" | "passive" | "promoter"
    - action_required: boolean
    - suggested_response: string
```

---

## Tasks do Squad

```yaml
tasks:
  - id: daily-churn-scan
    name: "Scan Diário de Churn"
    agent: churn-radar
    schedule: "0 9 * * *"  # Todo dia às 9h
    notify_channel: in_app

  - id: weekly-roi-report
    name: "Relatório Semanal de ROI de Campanhas"
    agent: campaign-roi-analyst
    schedule: "0 8 * * 1"  # Toda segunda-feira às 8h
    output_format: dashboard_widget

  - id: referral-processor
    name: "Processar Indicação"
    agent: referral-manager
    trigger: webhook
    priority: high

  - id: nps-day7
    name: "NPS Trigger D+7"
    agent: nps-feedback
    trigger: subscription_day_7
    async: true
```

---

## Integrações

| Serviço | Uso | Status |
|---------|-----|--------|
| **Supabase** | Dados de clientes, RPCs, tabela referrals | ✅ Ativo |
| **Stripe** | Webhooks de assinatura, créditos de referral | ✅ Ativo |
| **Google Gemini** | Geração de copy e conteúdo | ✅ Ativo |
| **WhatsApp (wa.me)** | Envio de mensagens de reativação | ✅ Ativo (deep link) |
| **Meta Ads API** | Tracking de conversões de anúncios | 📋 Roadmap |

---

## Métricas de Sucesso do Squad

```yaml
success_metrics:
  acquisition:
    viral_coefficient: "> 0.3"
    referral_conversion_rate: "> 25%"
    trial_to_paid_rate: "> 35%"
  
  retention:
    churn_rate_monthly: "< 5%"
    nps_score: "> 50"
    campaign_roi: "> 300%"
  
  activation:
    day1_aha_moment: "Diagnóstico AIOS visualizado"
    day3_action: "Primeira mensagem de reativação enviada"
    day7_value: "Pelo menos 1 cliente reativado"
```

---

*Squad criado pelo @squad-creator | AgenX AIOS 2.1 | 22/02/2026*
