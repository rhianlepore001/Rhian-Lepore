# Dicionário de Dados — agendix

> Gerado pelo Archaeologist em 2026-05-03
> Nível de documentação: **Detalhado**

---

## Tabela: appointments

> 🟡 INFERIDO — a partir dos campos acessados em Agenda.tsx, AppointmentWizard.tsx, CheckoutModal.tsx, QueueManagement.tsx

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id (owner). RLS: company_id filter |
| client_id | uuid | sim | — | FK clients.id |
| professional_id | uuid | não | null | FK team_members.id. Null = sem profissional atribuído |
| service | text | sim | — | Nomes dos serviços separados por vírgula (denormalizado) |
| appointment_time | timestamptz | sim | — | Data e hora do agendamento |
| price | numeric | sim | — | Preço final (após desconto, se houver) |
| status | text | sim | 'Pending' | Confirmed, Pending, Completed, Cancelled |
| notes | text | não | null | Observações do agendamento |
| payment_method | text | não | null | Método de pagamento (pix, dinheiro, debito, credito, mbway) |
| duration_minutes | integer | não | 30 | Duração total em minutos |
| base_price | numeric | não | null | Preço original dos serviços (para cálculo de desconto) |
| received_by | uuid | não | null | FK team_members.id — quem recebeu o pagamento |
| completed_by | uuid | não | null | FK auth.users.id — quem marcou como concluído |
| machine_fee_percent | numeric | não | null | Percentual da taxa de maquininha |
| machine_fee_amount | numeric | não | null | Valor da taxa de maquininha |
| public_booking_id | uuid | não | null | FK public_bookings.id — reserva que originou este appointment |

---

## Tabela: public_bookings

> 🟡 INFERIDO — a partir dos campos de INSERT/UPDATE em Agenda.tsx e PublicBooking.tsx

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| business_id | uuid | sim | — | FK profiles.id (owner) |
| customer_name | text | sim | — | Nome do cliente público |
| customer_phone | text | sim | — | Telefone (com País) |
| customer_email | text | não | null | Email do cliente |
| customer_photo_url | text | não | null | URL da foto enviada |
| service_ids | uuid[] | sim | — | Array de IDs dos serviços selecionados |
| professional_id | uuid | não | null | FK team_members.id. Null = qualquer profissional |
| appointment_time | timestamptz | sim | — | Data e hora solicitada |
| total_price | numeric | sim | — | Preço total |
| status | text | sim | 'pending' | pending, confirmed, cancelled |
| duration_minutes | integer | não | null | Duração total em minutos |
| is_edit | boolean | não | false | Flag de edição de reserva existente |
| original_appointment_time | timestamptz | não | null | Timestamp original (âncora para UPDATE do appointment) |
| updated_at | timestamptz | não | now() | Última atualização |

---

## Tabela: queue_entries

> 🟢 CONFIRMADO — QueueJoin.tsx (INSERT), QueueStatus.tsx (SELECT), QueueManagement.tsx (SELECT/UPDATE)

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| business_id | uuid | sim | — | FK profiles.id (owner) |
| client_id | uuid | não | null | FK clients.id (null se sem cadastro) |
| client_name | text | sim | — | Nome do cliente |
| client_phone | text | não | '0000000000' | Telefone |
| service_id | uuid | não | null | FK services.id |
| professional_id | uuid | não | null | FK team_members.id |
| status | text | sim | 'waiting' | waiting, calling, serving, completed, cancelled, no_show |
| joined_at | timestamptz | sim | now() | Momento de entrada na fila |
| estimated_wait_time | integer | não | null | Minutos estimados de espera |

---

## Tabela: services

> 🟡 INFERIDO — a partir de queries em Agenda, PublicBooking, QueueJoin, AppointmentWizard

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id (owner). RLS filter |
| name | text | sim | — | Nome do serviço |
| price | numeric | sim | — | Preço |
| duration_minutes | integer | não | 30 | Duração em minutos |
| category_id | uuid | não | null | FK service_categories.id |
| description | text | não | null | Descrição detalhada |
| active | boolean | não | true | Soft delete |
| image_url | text | não | null | URL da imagem |
| upsell_text | text | não | null | Texto de cross-sell |
| combo_discount | numeric | não | null | Desconto percentual para combo |
| display_order | integer | não | 0 | Ordem de exibição |
| created_at | timestamptz | não | now() | |
| updated_at | timestamptz | não | now() | |

---

## Tabela: service_categories

> 🟡 INFERIDO — a partir de queries em Agenda, PublicBooking

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id |
| name | text | sim | — | Nome da categoria |
| display_order | integer | não | 0 | Ordem de exibição |

---

## Tabela: clients

> 🟢 CONFIRMADO — Clients.tsx, ClientCRM.tsx, Agenda.tsx, migrations 20260218, 20260318, 20260405

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id (owner). RLS filter via company_id |
| name | text | sim | — | Nome completo |
| phone | text | não | null | Telefone (múltiplos formatos, deduplicação flexível) |
| email | text | não | null | Email |
| photo_url | text | não | null | URL da foto (storage bucket: client_photos) |
| loyalty_tier | text | não | 'Bronze' | Nível de fidelidade: Bronze/Silver/Gold/Platinum |
| total_visits | integer | não | 0 | Contador de visitas (1 se migrado de outro sistema) |
| rating | numeric | não | 0 | Rating do cliente (0-5 estrelas) |
| notes | text | não | null | Observações do profissional |
| source | text | não | 'manual' | Fonte: 'manual' ou 'agendamento_online' |
| is_active | boolean | não | true | Soft delete. Filtrado na listagem |
| company_id | uuid | não | null | FK profiles.id (owner). RLS multi-tenant isolation |
| last_visit | timestamptz | não | null | Data da última visita |
| hair_history | text | não | null | Histórico capilar (legacy, beauty) |
| created_at | timestamptz | não | now() | |
| updated_at | timestamptz | não | now() | |

**Constraints:** `clients_user_id_phone_unique` UNIQUE (user_id, phone)

---

## Tabela: public_clients

> 🟢 CONFIRMADO — PublicClientContext.tsx, ClientArea.tsx, migration 20260218_professional_booking_system.sql

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| business_id | uuid | sim | — | FK profiles.id (owner). ON DELETE CASCADE |
| name | varchar(255) | sim | — | Nome do cliente público |
| phone | varchar(50) | sim | — | Telefone. UNIQUE(business_id, phone) |
| email | varchar(255) | não | null | Email |
| photo_url | text | não | null | URL da foto |
| google_id | varchar(255) | não | null | OAuth Google ID |
| last_booking_at | timestamptz | não | null | Data da última reserva |
| created_at | timestamptz | não | now() | |

**RLS:** Business owners can view their public_clients (auth.uid() = business_id). Public can register (INSERT with check true).

---

## Tabela: client_semantic_memory

> 🟡 INFERIDO — hooks/useSemanticMemory.ts, migration 20260318_fix_rls_client_semantic_memory.sql

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| client_id | uuid | sim | — | FK clients.id. RLS: company isolation via subquery |
| observation | text | sim | — | Texto da observação/preferência |
| embedding | vector | sim | — | Embedding gerado via Gemini |
| context_type | text | não | 'preference' | 'style' \| 'preference' \| 'habit' |
| created_at | timestamptz | não | now() | |

**RLS:** `client_semantic_memory_company_isolation` — isolamento por company_id via subquery em clients

---

## Tabela: business_settings

> 🟡 INFERIDO — CheckoutModal.tsx, PublicBooking.tsx, Agenda.tsx

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| user_id | uuid | sim | — | FK profiles.id (PK) |
| machine_fee_enabled | boolean | não | false | Habilita taxa de maquininha |
| debit_fee_percent | numeric | não | 0 | Percentual taxa débito |
| credit_fee_percent | numeric | não | 0 | Percentual taxa crédito |
| enable_self_rescheduling | boolean | não | true | Permite cliente remarcar |
| currency_symbol | text | não | 'R$' | Símbolo monetário |
| onboarding_completed | boolean | não | false | Flag de onboarding completo |

---

## Tabela: business_galleries

> 🟡 INFERIDO — PublicBooking.tsx

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id |
| image_url | text | sim | — | URL da foto |
| is_active | boolean | não | true | |
| display_order | integer | não | 0 | Ordem de exibição |

---

## Tabela: finance_records

> 🟡 INFERIDO — QueueManagement.tsx (INSERT), Agenda.tsx (DELETE on cascade)

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id |
| appointment_id | uuid | não | null | FK appointments.id |
| professional_id | uuid | não | null | FK team_members.id |
| barber_name | text | sim | — | Nome do profissional (denormalizado) |
| revenue | numeric | sim | — | Valor total |
| commission_rate | numeric | não | 0 | Percentual de comissão |
| commission_value | numeric | não | 0 | Valor da comissão |
| type | text | não | 'revenue' | revenue, expense |
| client_name | text | não | null | Nome do cliente (denormalizado) |
| service_name | text | não | null | Nome do serviço (denormalizado) |
| created_at | timestamptz | não | now() | |

---

## Funções RPC

### get_available_slots(p_business_id, p_date, p_professional_id, p_duration_min)

> 🟢 CONFIRMADO — chamado em ScheduleSelection.tsx e PublicBooking.tsx

Retorna `{ slots: string[] }` com horários disponíveis no formato "HH:MM".

### get_full_dates(p_business_id, p_start_date, p_end_date, p_professional_id, p_duration_min)

> 🟢 CONFIRMADO — chamado em PublicBooking.tsx

Retorna array de datas (YYYY-MM-DD) que estão completamente lotadas.

### get_queue_position(p_queue_id, p_business_id)

> 🟢 CONFIRMADO — chamado em QueueStatus.tsx

Retorna posição numérica na fila.

### get_active_booking_by_phone(p_phone, p_business_id)

> 🟢 CONFIRMADO — chamado em PublicBooking.tsx

Retorna booking ativo (pending/confirmed) para prevenir duplicatas.

### get_first_available_professional(p_business_id, p_appointment_time, p_duration_min)

> 🟢 CONFIRMADO — chamado em PublicBooking.tsx

Auto-atribui o primeiro profissional disponível quando "qualquer" é selecionado.

### create_secure_booking(p_business_id, p_professional_id, p_customer_name, p_customer_phone, p_customer_email, p_appointment_time, p_service_ids, p_total_price, p_duration_min, p_status, p_client_id, p_notes, p_custom_service_name, p_payment_method)

> 🟢 CONFIRMADO — chamado em AppointmentWizard.tsx

Cria appointment com verificação de colisão de horário. Retorna `{ success: boolean, message: string }`.

### complete_appointment(p_appointment_id)

> 🟢 CONFIRMADO — chamado em Agenda.tsx (com fallback client-side)

Marca appointment como Completed e cria finance_record. Aceita também p_payment_method, p_received_by, p_completed_by, p_machine_fee_percent, p_machine_fee_amount.

### get_public_client_by_phone(p_business_id, p_phone)

> 🟢 CONFIRMADO — chamado em PublicClientContext.tsx, migration 20260218

Retorna dados do public_client (id, name, email, phone, photo_url) filtrado por business_id e telefone. SECURITY DEFINER.

### get_client_bookings_history(p_phone, p_business_id)

> 🟢 CONFIRMADO — chamado em ClientArea.tsx, migration 20260302

Retorna histórico completo de bookings de um cliente público: id, appointment_time, status, service_ids, service_names, professional_id, professional_name, total_price, duration_minutes, created_at. SECURITY DEFINER.

### mirror_public_client_to_crm(p_user_id, p_name, p_phone, p_email, p_photo_url)

> 🟢 CONFIRMADO — chamado em PublicClientContext.tsx, migration 20260405

Sincroniza public_client para clients do owner. SECURITY DEFINER (acessa tabela clients em nome do owner). Upsert ON CONFLICT (user_id, phone). Valida p_user_id e p_phone obrigatórios.

### get_client_profile(p_client_id)

> 🟡 INFERIDO — chamado em ClientCRM.tsx

Retorna dados consolidados do cliente: client data, LTV calculado, appointments_history (com professional_name), hair_history com image_url.

### get_aios_diagnostic(p_establishment_id)

> 🟡 INFERIDO — chamado em useAIOSDiagnostic.ts

Retorna diagnóstico AIOS: receita recuperável, clientes em risco (at_risk_clients com id, name, phone, last_visit, total_visits, avg_ticket, days_since_last_visit), gaps de agenda.

### log_aios_campaign(p_client_id, p_agent_name, p_campaign_type)

> 🟡 INFERIDO — chamado em ClientCRM.tsx

Registra atividade de campanha AIOS para atribuição de ROI.

### match_client_memories(p_client_id, query_embedding, match_threshold, match_count)

> 🟡 INFERIDO — chamado em useSemanticMemory.ts

Busca memórias semânticas por similaridade de embedding. Retorna observations com score de similaridade.

---

## Tabela: goal_settings

> 🟡 INFERIDO — a partir de upsert em useDashboardData.ts

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| user_id | uuid | sim | — | FK profiles.id |
| month | integer | sim | — | Mês (0-11, JavaScript Date.getMonth()) |
| year | integer | sim | — | Ano |
| monthly_goal | numeric | sim | — | Valor da meta de faturamento mensal |

**Unique constraint:** `(user_id, month, year)`

---

## Tabela: business_settings (campos usados no dashboard)

> 🟡 INFERIDO — a partir de queries em Dashboard.tsx e SetupCopilot.tsx

| Campo | Tipo | Descrição |
|-------|------|-----------|
| commission_settlement_day_of_month | integer | Dia do mês para pagamento de comissões (1-28) |
| onboarding_completed | boolean | Flag de onboarding completo |
| enable_self_rescheduling | boolean | Flag de reagendamento pelo cliente (default: true) |

---

## RPC: get_dashboard_stats(p_user_id)

> 🟢 CONFIRMADO — chamado em useDashboardData.ts e Reports.tsx

Retorna estatísticas consolidadas do dashboard:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| total_profit | numeric | Lucro total |
| current_month_revenue | numeric | Receita do mês atual |
| weekly_growth | numeric | Crescimento semanal (%) |
| recovered_revenue | numeric | Receita recuperada via campanhas |
| avoided_no_shows | numeric | Faltas evitadas |
| filled_slots | numeric | Vagas preenchidas via booking público |
| campaigns_sent | numeric | Campanhas enviadas |
| appointments_total | integer | Total de agendamentos |
| appointments_this_month | integer | Agendamentos este mês |
| completed_this_month | integer | Completados este mês |
| has_public_bookings | boolean | Tem bookings públicos |
| account_days_old | integer | Idade da conta em dias |
| data_maturity_score | numeric | Score de maturidade (0-100) |
| avg_ticket | numeric | Ticket médio por atendimento |
| churn_risk_count | integer | Clientes em risco de churn |
| top_service | text | Serviço mais pedido |
| repeat_client_rate | numeric | Taxa de retorno (%) |
| month_scheduled_value | numeric | Valor agendado do mês |

---

## RPC: get_dashboard_actions(p_user_id)

> 🟢 CONFIRMADO — chamado em useDashboardData.ts

Retorna lista de ações sugeridas (oportunidades do dia):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | Identificador da ação |
| type | text | 'recovery', 'gap', 'upsell' |
| title | text | Título da ação |
| description | text | Descrição detalhada |
| time | text | Horário sugerido (opcional) |

---

## RPC: get_finance_stats(p_user_id, p_start_date, p_end_date)

> 🟢 CONFIRMADO — chamado em useDashboardData.ts e MonthlyProfitModal.tsx

Retorna estatísticas financeiras por período:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| revenue | numeric | Receita no período |
| expenses | numeric | Despesas no período |
| profit | numeric | Lucro no período (revenue - expenses) |

---

## RPC: get_onboarding_progress(p_company_id)

> 🟡 INFERIDO — chamado em SetupCopilot.tsx

Retorna progresso do onboarding:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| current_step | integer | Step atual |
| completed_steps | integer[] | Steps completados |
| step_data | jsonb | Dados do step (inclui last_visited_step, guided_dismissed_at) |

---

## Função: getSetupStatus(user_id)

> 🟡 INFERIDO — chamado em SetupCopilot.tsx

Verifica o status de setup do usuário:

| Retorno | Tipo | Descrição |
|---------|------|-----------|
| hasServices | boolean | Existe service para o user |
| hasTeam | boolean | Existe team_member para o user |
| hasClients | boolean | Existe client para o user |
| hasBusinessHours | boolean | business_hours configurado |
| hasBookingSlug | boolean | business_slug configurado |
| hasAppointments | boolean | Existe appointment para o user |
| isActivated | boolean | setup_completed e activation_completed |

---

## Tabela: finance_records

> 🟢 CONFIRMADO — a partir de Finance.tsx, CommissionsManagement.tsx, CommissionDetailReport.tsx, ProfessionalCommissionDetails.tsx

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id (owner). RLS: company_id filter |
| appointment_id | uuid | não | null | FK appointments.id — transação vinculada a agendamento |
| professional_id | uuid | não | null | FK team_members.id — profissional que realizou |
| barber_name | text | sim | — | Nome do profissional (denormalizado) |
| client_name | text | não | null | Nome do cliente (denormalizado) |
| service_name | text | não | null | Nome do serviço (denormalizado) |
| revenue | numeric | não | 0 | Valor da receita (para type='revenue') |
| commission_value | numeric | não | 0 | Valor da comissão do profissional |
| commission_rate | numeric | não | 0 | Percentual da comissão no momento do registro |
| commission_paid | boolean | não | false | Se a comissão foi paga ao profissional |
| commission_paid_at | timestamptz | não | null | Data/hora do pagamento da comissão |
| type | text | sim | — | 'revenue' ou 'expense' |
| expense | numeric | não | 0 | Valor da despesa (para type='expense') |
| status | text | não | 'paid' | 'paid' ou 'pending' (para despesas) |
| due_date | timestamptz | não | null | Data de vencimento (despesas pendentes) |
| description | text | não | null | Descrição manual da transação |
| payment_method | text | não | null | pix, dinheiro, debito, credito, mbway |
| created_at | timestamptz | sim | now() | Data/hora do registro |

**Observações:**
- Transações automáticas (de appointments) têm `appointment_id` preenchido e são criadas ao concluir um agendamento
- Transações manuais não têm `appointment_id`
- Deletar receita automática = deletar o appointment vinculado também
- Despesas podem ser 'paid' ou 'pending'; pendentes podem ser liquidadas via `mark_expense_as_paid`

---

## Tabela: commission_payments

> 🟡 INFERIDO — a partir de CommissionsManagement.tsx (fetchPaidCommissions)

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| company_id | uuid | sim | — | FK profiles.id (owner). RLS |
| collaborator_id | uuid | sim | — | FK team_members.id |
| period_start | timestamptz | sim | — | Início do período de referência |
| period_end | timestamptz | sim | — | Fim do período de referência |
| net_amount | numeric | sim | — | Valor líquido pago |
| commission_percent | numeric | sim | — | Taxa no momento do pagamento |
| status | text | sim | 'paid' | Status do pagamento |
| paid_at | timestamptz | sim | — | Data do pagamento |

---

## Tabela: business_settings — campos finance

> 🟢 CONFIRMADO — a partir de CommissionsSettings.tsx, FinancialSettings.tsx, Dashboard.tsx

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| user_id | uuid | sim | — | PK, FK profiles.id |
| commission_settlement_day_of_month | integer | não | 5 | Dia do mês para acerto de comissões |
| machine_fee_enabled | boolean | não | false | Se taxa de maquininha é repassada ao colaborador |
| debit_fee_percent | numeric | não | 0 | Percentual da taxa de débito |
| credit_fee_percent | numeric | não | 0 | Percentual da taxa de crédito |

**Observações:**
- Quando `machine_fee_enabled=true`, a comissão é calculada sobre `price × (1 - fee% / 100)` em vez de `price`
- Taxa de débito e crédito são diferentes (ex: 2.5% débito, 3.5% crédito)

---

## Tabela: profiles — campo stripe_customer_id

> 🟡 INFERIDO — a partir de create-checkout-session Edge Function

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| stripe_customer_id | text | não | null | ID do customer no Stripe |

---

## RPCs do Módulo Finance

> 🟢 CONFIRMADO — a partir de chamadas em Finance.tsx e CommissionsManagement.tsx

| RPC | Parâmetros | Descrição |
|-----|-----------|-----------|
| `get_finance_stats` | p_user_id, p_start_date, p_end_date | Retorna receita, despesas, lucro, comissões pendentes, transações, chart_data, revenue_by_method, pendingExpenses |
| `get_monthly_finance_history` | p_user_id, p_months_count | Retorna histórico mensal de receita/despesa/lucro dos últimos N meses |
| `get_commissions_due` | p_user_id | Retorna métricas de comissão por profissional (total_due, total_earnings_month, total_paid, commission_rate, total_pending_records) |
| `mark_commissions_as_paid` | p_user_id, p_professional_id, p_amount, p_start_date, p_end_date | Marca comissões como pagas e cria registro em commission_payments |
| `mark_expense_as_paid` | p_record_id, p_user_id | Marca despesa pendente como paga |
| `update_commission_record` | p_record_id, p_new_value, p_new_rate | Atualiza valor e taxa de um registro de comissão individual |
| `recalculate_pending_commissions` | p_professional_id, p_new_rate | Recalcula comissões pendentes de um profissional com nova taxa |

---

## Tabela: onboarding_progress

> 🟢 CONFIRMADO — migration 20260320_onboarding_wizard.sql

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| company_id | uuid | sim | — | FK → companies(id). UNIQUE. RLS: company_id filter |
| current_step | smallint | sim | 1 | Step atual do wizard. CHECK (BETWEEN 1 AND 5) |
| completed_steps | smallint[] | sim | '{}' | Array de IDs de steps concluídos. Ex: '{1,2,3}' |
| is_completed | boolean | sim | false | Wizard completo |
| is_skipped | boolean | sim | false | Wizard pulado |
| started_at | timestamptz | sim | now() | Timestamp de início do wizard |
| completed_at | timestamptz | não | null | Timestamp de conclusão. NULL enquanto não finalizado |
| last_activity | timestamptz | sim | now() | Última interação do usuário |
| step_data | jsonb | sim | '{}' | Dados flexíveis por step. Chave = step_id (string). Ex: {"1": {"business_name": "Barbearia"}, "2": {"services": [...]}} |

> **Índices:** `idx_onboarding_progress_company_id` (company_id), `idx_onboarding_progress_active` (company_id, is_completed) WHERE is_completed = FALSE
> **RLS:** 3 policies (onboarding_select_own_company, onboarding_insert_own_company, onboarding_update_own_company) filtrando por company_id via subquery em profiles WHERE id = auth.uid()
> **UNIQUE constraint:** (company_id) — 1 registro por empresa

---

## Colunas de Onboarding em business_settings (Legado)

> 🟢 CONFIRMADO — migration 20260218_onboarding_setup.sql

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| onboarding_completed | boolean | false | Flag de conclusão do wizard legado |
| onboarding_step | integer | 1 | Step atual do wizard legado (clamp 1-5) |

---

## RPCs do Módulo Onboarding

> 🟢 CONFIRMADO — a partir de lib/onboarding.ts e migrations

| RPC | Parâmetros | Descrição |
|-----|-----------|-----------|
| `upsert_onboarding_progress` | p_company_id, p_current_step, p_completed_steps, p_step_data | SECURITY DEFINER. Upsert progresso do wizard. Valida company_id do chamador. Merge JSONB com \|\| |
| `update_onboarding_step` | p_user_id, p_step, p_completed | Legado. Upsert business_settings.onboarding_step e onboarding_completed. Usa GREATEST para step e CASE para completed |

---

## Entidades Frontend do Módulo Onboarding

### OnboardingProgress (🟢 CONFIRMADO — lib/onboarding.ts)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID do registro |
| company_id | string | Tenant |
| current_step | number | Step atual (1-5) |
| completed_steps | number[] | Steps concluídos |
| is_completed | boolean | Wizard completo |
| completed_at | string \| null | Data de conclusão |
| step_data | Record\<string, unknown\> | Dados flexíveis por step |

### WizardState (🟢 CONFIRMADO — WizardContext.tsx)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| currentStep | WizardStep (1\|2\|3\|4\|5) | Step ativo |
| completedSteps | WizardStep[] | Steps concluídos |
| isActive | boolean | Overlay visível |
| isCompleted | boolean | Wizard finalizado |
| isLoading | boolean | Estado de carregamento |

### GuidedModeState (🟢 CONFIRMADO — GuidedModeContext.tsx)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| activeStep | WizardStepId \| null | Step ativo do guided mode |
| targetElementId | string \| null | ID do elemento DOM alvo |
| position | 'top'\|'bottom'\|'left'\|'right' | Posição do tooltip |
| message | string | Mensagem do tooltip |
| isGuideActive | boolean | Guide ativo |

### SetupStatus (🟢 CONFIRMADO — lib/onboarding.ts)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| hasServices | boolean | Tem pelo menos 1 serviço cadastrado |
| hasTeam | boolean | Tem pelo menos 1 profissional |
| hasClients | boolean | Tem pelo menos 1 cliente |
| hasBusinessHours | boolean | Horário de funcionamento configurado |
| hasBookingSlug | boolean | Slug de booking público definido |
| hasAppointments | boolean | Tem pelo menos 1 agendamento |
| isActivated | boolean | profiles.activation_completed = true |

---

## Módulo: staff/team

## Tabela: team_members

> 🟢 CONFIRMADO — 20260218_team_setup.sql, 20260307_staff_user_id.sql, 20260130_fix_staff_and_reporting.sql, TeamMemberForm.tsx

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | uuid_generate_v4() | PK |
| user_id | uuid | sim | — | FK auth.users (owner). Identifica a empresa à qual pertence |
| name | text | sim | — | Nome do profissional |
| role | text | sim | — | Cargo (ex: 'Barbeiro', 'Dono / Profissional') |
| bio | text | não | null | Biografia curta para portfólio |
| photo_url | text | não | null | URL da foto (bucket team_photos) |
| active | boolean | sim | true | Profissional ativo/inativo |
| is_owner | boolean | não | false | Flag de proprietário |
| commission_rate | numeric | não | 0 | Percentual de comissão (0-100). Owner = 0 no banco, 100 no form |
| slug | text | sim | — | Link personalizado (/pro/{slug}) |
| specialties | text[] | não | null | Array de especialidades |
| cpf | text | não | null | CPF para comissões |
| staff_user_id | uuid | não | null | FK auth.users (conta do staff). Index parcial WHERE NOT NULL |
| business_id | uuid | não | null | FK auth.users — redundante com user_id para owners |
| display_order | integer | não | 0 | Ordem de exibição |
| created_at | timestamp | não | now() | Data de criação |
| updated_at | timestamp | não | now() | Data de atualização |

**Índices:**
- `idx_team_members_staff_user_id` ON (staff_user_id) WHERE staff_user_id IS NOT NULL

**Storage bucket:** `team_photos` — público para leitura, upload/update/delete restrito ao owner

**RLS policies:**
- `"Team: company isolation"` — ALL: `user_id = get_auth_company_id()`
- `"Staff can read company team members"` — SELECT: `staff_user_id = auth.uid() OR profiles.company_id = team_members.user_id`

## Tabela: profiles — campos staff-related

> 🟢 CONFIRMADO — 20260307_us015b_multi_user_rls.sql

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| role | text | 'owner' | Papel do usuário: 'owner' ou 'staff'. CHECK (role IN ('owner', 'staff')) |
| company_id | text | null | ID do owner (para staff). Para owner = próprio ID. Usado em get_auth_company_id() |

## Funções SQL

> 🟢 CONFIRMADO — migrations

| Função | Retorna | Descrição |
|--------|---------|-----------|
| get_auth_company_id() | text | COALESCE(company_id, id) de profiles para auth.uid(). Owner → próprio ID; Staff → ID do owner |
| get_auth_role() | text | role de profiles para auth.uid(). 'owner' ou 'staff' |
| is_staff_of(p_business_id UUID) | boolean | Verifica se auth.uid() é membro ativo do time com business_id |
| get_company_for_invite(p_company_id UUID) | json | Retorna business_name e user_type do owner para tela de registro de staff |
| restore_team_member(record JSON) | team_members | Soft-delete restore (RecycleBin) |

## Interface: TeamMember (Componentes)

> 🟢 CONFIRMADO — TeamMemberCard.tsx, TeamMemberForm.tsx

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | PK |
| name | string | Nome do profissional |
| role | string | Cargo |
| photo_url | string \| null | URL da foto |
| active | boolean | Profissional ativo |
| is_owner | boolean | Flag de proprietor |
| commission_rate | number | Percentual de comissão |

## Interface: AuthContextType — campos staff-related

> 🟢 CONFIRMADO — AuthContext.tsx

| Campo | Tipo | Descrição |
|-------|------|-----------|
| role | 'owner' \| 'staff' | Papel do usuário |
| companyId | string \| null | ID do owner (ou próprio ID se owner) |
| teamMemberId | string \| null | ID do registro em team_members (null se vinculação pendente) |
| isStaff | boolean | Atalho: role === 'staff' |

---

## Tabela: business_settings

> 🟢 CONFIRMADO — GeneralSettings.tsx, PublicBookingSettings.tsx, CommissionsSettings.tsx, FinancialSettings.tsx, Agenda.tsx, migrations

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| user_id | uuid | sim | — | FK profiles.id. PK. RLS: isolamento por user_id |
| business_hours | jsonb | não | null | Horário de funcionamento. Estrutura: {mon: {isOpen, blocks: [{start, end}]}, ...} |
| cancellation_policy | text | não | null | Texto da política de cancelamento (editável ou template) |
| public_booking_enabled | boolean | não | true | Habilita/desabilita agendamento público |
| enable_upsells | boolean | não | false | Sugere serviços extras no booking público |
| enable_professional_selection | boolean | não | true | Permite cliente escolher profissional no booking |
| enable_email_reminders | boolean | não | true | Envia lembrete 24h antes via Edge Function |
| enable_self_rescheduling | boolean | não | true | Permite reagendamento autônomo pelo cliente |
| lead_time_hours | integer | não | 2 | Horas mínimas de antecedência para agendamento |
| max_bookings_per_day | integer | não | null | Limite de agendamentos por dia (null = ilimitado) |
| commission_settlement_day_of_month | integer | não | 5 | Dia do mês para acerto de comissões (1-31) |
| machine_fee_enabled | boolean | não | false | Se true, comissão é calculada sobre valor líquido (descontada a taxa de maquininha) |
| debit_fee_percent | numeric | não | 0 | Taxa de maquininha débito (%) |
| credit_fee_percent | numeric | não | 0 | Taxa de maquininha crédito (%) |
| onboarding_completed | boolean | não | false | 🟡 Se o onboarding foi concluído |
| onboarding_progress | jsonb | não | null | 🟡 Progresso do wizard de onboarding |
| updated_at | timestamptz | não | now() | Timestamp de atualização |

**RLS:** Owner pode gerenciar seus próprios registros. Pública leitura limitada para booking.

---

## Tabela: service_categories

> 🟢 CONFIRMADO — ServiceSettings.tsx, migrations

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id. RLS: isolamento por user_id |
| name | text | sim | — | Nome da categoria (ex: Cabelo, Barba) |
| display_order | integer | não | 0 | Ordem de exibição |

---

## Tabela: services (campos adicionais relevantes ao settings)

> 🟢 CONFIRMADO — ServiceSettings.tsx, types.ts

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id |
| name | text | sim | — | Nome do serviço |
| description | text | não | null | Descrição do serviço |
| price | numeric | sim | — | Preço em moeda local |
| duration_minutes | integer | não | 30 | Duração em minutos |
| category_id | uuid | não | null | FK service_categories.id |
| is_active | boolean | não | true | Se o serviço está ativo |
| image_url | text | não | null | URL da imagem do serviço |
| upsell_text | text | não | null | 🟡 Texto de upsell sugerido |
| combo_discount | numeric | não | null | 🟡 Desconto para combos |

---

## Tabela: audit_logs

> 🟢 CONFIRMADO — AuditLogs.tsx, lib/auditLogs.ts, migrations

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| company_id | uuid | sim | — | FK profiles.company_id. RLS: isolamento por company_id |
| user_id | uuid | não | null | FK auth.users.id. Null = ação do sistema |
| user_name | text | não | null | Nome do usuário no momento da ação |
| action | text | sim | — | Tipo: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE, EMAIL_CHANGE, EXPORT, IMPORT, BACKUP |
| resource_type | text | sim | — | Recurso: appointments, clients, financial_records, services, team_members, profiles, categories |
| resource_id | uuid | não | null | ID do recurso afetado |
| old_values | jsonb | não | null | Valores anteriores (para diff) |
| new_values | jsonb | não | null | Valores novos (para diff) |
| ip_address | text | não | null | IP do usuário |
| user_agent | text | não | null | User-Agent do navegador |
| metadata | jsonb | não | null | Dados adicionais da ação |
| created_at | timestamptz | sim | now() | Timestamp |

**RLS:** SELECT para authenticated (company_id match). INSERT/UPDATE/DELETE apenas via service_role (RLS bloqueia authenticated). Logs são inseridos via RPC `create_audit_log` (SECURITY DEFINER).

---

## Tabela: system_errors

> 🟢 CONFIRMADO — SystemLogs.tsx, migrations

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| error_message | text | sim | — | Mensagem de erro |
| stack_trace | text | não | null | Stack trace completa |
| severity | text | sim | 'error' | Nível: info, warning, error, critical |
| context | jsonb | não | null | Contexto adicional do erro |
| resolved | boolean | não | false | Se o erro foi resolvido |
| user_id | uuid | não | null | FK auth.users.id. Usuário afetado |
| created_at | timestamptz | sim | now() | Timestamp |

**RLS:** Apenas owners podem ler. Inserido via `log_error()` RPC ou diretamente pelo frontend.

---

## RPCs Relevantes ao Settings

| RPC | Parâmetros | Retorno | Descrição | Confiança |
|-----|-----------|--------|-----------|-----------|
| get_audit_logs | p_limit, p_offset, p_action, p_resource_type, p_start_date, p_end_date | AuditLog[] | Busca logs de auditoria com filtros | 🟢 |
| create_audit_log | p_action, p_resource_type, p_resource_id, p_old_values, p_new_values, p_metadata | void | Cria log de auditoria (SECURITY DEFINER) | 🟢 |
| get_deleted_items | p_resource_type | DeletedItem[] | Lista itens soft-deleted com countdown | 🟢 |
| restore_appointment | p_id | void | Restaura appointment da lixeira | 🟢 |
| restore_client | p_id | void | Restaura client da lixeira | 🟢 |
| restore_service | p_id | void | Restaura service da lixeira | 🟢 |
| restore_financial_record | p_id | void | Restaura financial_record da lixeira | 🟢 |
| restore_team_member | p_id | void | Restaura team_member da lixeira | 🟢 |
| create-checkout-session | priceId, successUrl, cancelUrl, mode | {url} | Cria sessão de checkout Stripe | 🟢 |
| log_error | p_message, p_stack, p_component_stack, p_severity, p_context | UUID | Insere registro em system_errors | 🟢 |
| soft_delete_appointment | p_id | BOOLEAN | Soft delete em appointment (set deleted_at=NOW) | 🟢 |
| soft_delete_client | p_id | BOOLEAN | Soft delete em client (com ownership check) | 🟢 |
| soft_delete_service | p_id | VOID | Soft delete em service | 🟢 |
| soft_delete_financial_record | p_id | VOID | Soft delete em financial_record | 🟢 |
| soft_delete_team_member | p_id | VOID | Soft delete em team_member | 🟢 |
| validate_company_access | p_company_id, p_context | BOOLEAN | Valida JWT company_id contra resource company_id | 🟢 |
| log_rpc_call | p_function_name, p_company_id, p_action, p_resource_id | VOID | Loga chamada RPC em audit_logs | 🟢 |
| cleanup_old_audit_logs | — | INTEGER | Remove audit_logs com > 180 dias | 🟢 |
| cleanup_old_deleted_items | — | TABLE | Remove soft-deleted items com > 30 dias | 🟢 |
| get_aios_diagnostic | p_establishment_id | AIOSDiagnostic | Diagnóstico de churn: clientes em risco, receita recuperável, agenda gaps | 🟢 |
| log_aios_campaign | p_client_id, p_agent_name, p_campaign_type, p_metadata | UUID | Registra campanha AIOS no aios_logs | 🟢 |
| match_kb_content | query_embedding, match_threshold, match_count | TABLE | Busca semântica na base de conhecimento (cosine similarity) | 🟢 |
| match_client_memories | p_client_id, query_embedding, match_threshold, match_count | TABLE | Busca memórias semânticas de cliente (cosine similarity) | 🟢 |

---

## Tabela: ai_knowledge_base

> 🟡 INFERIDO — Criada em 20260222, dimensão corrigida para 768 em 20260222_fix

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| content | text | sim | — | Conteúdo da resposta cacheada |
| embedding | vector(768) | sim | — | Embedding gerado por text-embedding-004 |
| metadata | jsonb | não | '{}' | Metadados (tipo, query original, timestamp) |
| created_at | timestamptz | sim | now() | Timestamp |

**RLS:** Leitura permitida para authenticated. Escrita via saveSemanticCache (frontend).

---

## Tabela: client_semantic_memory

> 🟢 CONFIRMADO — hooks/useSemanticMemory.ts, migrações com RLS corrigida

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| client_id | uuid | sim | — | FK → clients.id |
| observation | text | sim | — | Observação/preferência do cliente |
| embedding | vector(768) | sim | — | Embedding da observação |
| context_type | text | sim | 'preference' | Tipo: style, preference, habit |
| created_at | timestamptz | sim | now() | Timestamp |

**RLS:** Isolamento por company_id (corrigido em US-026). Authenticated pode CRUD na sua empresa.

---

## Tabela: aios_logs

> 🟢 CONFIRMADO — 20260221_aios_foundation.sql

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK → auth.users.id (owner) |
| agent_name | text | sim | — | Nome do agente AIOS |
| action_type | text | sim | — | Tipo de ação (ex: reactivation) |
| content | jsonb | não | '{}' | Detalhes da ação |
| created_at | timestamptz | sim | now() | Timestamp |

**RLS:** Usuário vê e cria apenas seus próprios logs.

---

## Tabela: rag_context_strategic / rag_context_architecture / rag_context_operational / rag_context_conversational

> 🟡 INFERIDO — 20260315_rag_2_0_tables.sql (RAG 2.0, 4 tabelas de contexto)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| content | text | Conteúdo contextual |
| embedding | vector(768) | Embedding para busca semântica |
| metadata | jsonb | Metadados |
| created_at | timestamptz | Timestamp |

**Nota:** Cada tabela representa uma camada de contexto RAG (estratégica, arquitetural, operacional, conversacional). Índices ivfflat com lists=100.

---

## Trigger: trigger_audit_log

> 🟢 CONFIRMADO — `supabase/migrations/20260214_audit_system.sql:141-190`

Trigger genérico AFTER INSERT OR UPDATE OR DELETE em 6 tabelas (appointments, clients, financial_records, services, team_members, profiles). Captura auth.uid(), TG_OP, TG_TABLE_NAME, e row_to_json(OLD/NEW). Insere automaticamente em audit_logs.