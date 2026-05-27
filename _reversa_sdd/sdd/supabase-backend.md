# Backend Supabase (supabase-backend)

## Visão Geral
96 migrações em 12 categorias. 2 Edge Functions (Stripe checkout + Resend email). RLS evoluída em 5 fases até company-isolation (US-015B). 50+ RPCs SECURITY DEFINER. Rate limiting token bucket. `create_secure_booking` com 3 versões. `get_finance_stats` com 5 versões. Trigger auto-audit em 6 tabelas. Storage buckets (logos, covers, service_images, team_photos, client_photos). pgvector com ivfflat (768 dim). Data maturity guard progressivo.

## Responsabilidades
- Isolamento multi-tenant via RLS (`company_id = get_auth_company_id()`)
- Lógica crítica em RPCs SECURITY DEFINER (bypass seguro de RLS)
- Rate limiting token bucket no login
- Criação segura de agendamentos (verificação de colisão)
- Auto-auditoria em 6 tabelas via trigger
- Checkout Stripe via Edge Function
- Lembretes de agendamento via email (Resend)
- Busca semântica com pgvector (embeddings 768d)
- Soft delete e restore dinâmico

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| p_email | string | Email para rate limit |
| p_user_id | uuid | ID do usuário |
| p_business_id | uuid | ID do negócio |
| p_data | jsonb | Dados do agendamento |
| priceId | string | ID do preço Stripe |
| successUrl | string | URL de sucesso |
| cancelUrl | string | URL de cancelamento |
| query_embedding | vector(768) | Embedding para busca |
| match_threshold | number | Threshold de similaridade |
| match_count | integer | Limite de resultados |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| rate_limit_status | boolean | Permitido/bloqueado |
| finance_stats | object | Estatísticas financeiras |
| dashboard_stats | object | Estatísticas do dashboard |
| available_slots | string[] | Horários disponíveis |
| checkout_url | string | URL do Stripe |
| semantic_results | object[] | Resultados de busca semântica |
| audit_log | object | Log de auditoria |

## Regras de Negócio
- **R134** RLS evoluída em 5 fases: user-isolation → owner-only → public access → strict financial → company-isolation. 🟢
- **R135** `get_auth_company_id()`: COALESCE(company_id, id) de profiles. 🟢
- **R136** Rate limiting: token bucket, 5 tentativas, reset após 1 min. 🟢
- **R137** `create_secure_booking`: LOCK + verificação de colisão. 🟢
- **R138** Trigger audit: 6 tabelas (appointments, clients, finance_records, services, team_members, profiles). 🟢
- **R139** Edge Function Stripe: auto-provisionamento de customer. 🟢
- **R140** Edge Function Resend: lembretes 24h antes. 🟢
- **R141** pgvector: ivfflat, 768 dimensões. 🟢
- **R142** Cleanup: `cleanup_old_audit_logs` (>180 dias), `cleanup_old_deleted_items` (>30 dias). 🟢

## Fluxo Principal

### RLS — Company Isolation
1. `get_auth_company_id()`: COALESCE(company_id, id)
2. `get_auth_role()`: 'owner' ou 'staff'
3. `is_staff_of(p_business_id)`: verifica membership
4. Tabelas filtram por `company_id = get_auth_company_id()`

### Rate Limiting
1. `check_login_rate_limit(email)`
2. Se não existe: INSERT attempt_count=1
3. Se < 5: INCREMENT
4. Se ≥ 5: verifica se passou 1 min
5. Se sim: RESET; se não: BLOQUEIA

### Secure Booking
1. `create_secure_booking(p_data)`
2. LOCK appointments WHERE professional_id + date
3. Verifica colisão
4. INSERT appointments
5. INSERT finance_records
6. Mirror public_client → CRM

### Stripe Checkout
1. Verifica auth header
2. Busca `stripe_customer_id` em profiles
3. Se não existe: busca/cria no Stripe
4. Salva `stripe_customer_id`
5. Cria checkout session
6. Retorna URL

## Dependências
- Supabase Platform (Auth, PostgreSQL, Storage, Realtime, Edge Functions)
- Stripe API
- Resend API
- Google Gemini API
- OpenRouter API

## Critérios de Aceitação

```gherkin
# Cenário 1: Rate limit
Dado que um usuário tenta logar 5 vezes em 1 minuto
Quando tenta a 6ª vez
Então o sistema bloqueia por 1 minuto

# Cenário 2: Colisão de agendamento
Dado que um profissional já tem agendamento às 10:00
Quando tenta criar outro às 10:00
Então o sistema retorna erro de colisão

# Cenário 3: Checkout Stripe
Dado que um owner seleciona plano
Quando clica em assinar
Então o sistema redireciona para Stripe checkout
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| RLS company-isolation | Must | Segurança multi-tenant |
| Rate limiting | Must | Proteção |
| Secure booking | Must | Integridade |
| Auto-audit | Should | Compliance |
| Stripe checkout | Should | Monetização |
| Email reminders | Could | UX |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `supabase/migrations/` | 96 migrações SQL | 🟢 |
| `supabase/functions/create-checkout-session/index.ts` | Edge Function Stripe | 🟢 |
| `supabase/functions/send-appointment-reminder/index.ts` | Edge Function Resend | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
