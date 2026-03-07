# Referência Completa do Banco de Dados — Beauty OS / AgenX AIOS

> **Atualizado em:** 2026-03-04
> **Escopo:** Mapeamento total do schema PostgreSQL/Supabase, RPCs frontend×banco e gaps críticos.
> Serve como referência canônica para que o agente Antigravity saiba o que existe, o que falta e como o sistema foi projetado.

---

## Seção 1 — Visão Geral do Banco

| Propriedade | Valor |
|---|---|
| **Plataforma** | Supabase (PostgreSQL 15+) |
| **Extensões** | `uuid-ossp`, `vector` (pgvector 768 dims) |
| **Modelo** | Multi-tenant SaaS (isolamento por `user_id = auth.uid()`) |
| **RLS** | Habilitado em todas as tabelas de negócio |
| **Migrações** | 64 arquivos em `supabase/migrations/` (Jan 2024 – Mar 2026) |

### Padrão de Isolamento

| Contexto | Coluna de isolamento | Como obter |
|---|---|---|
| Dono do negócio (interno) | `user_id` | `auth.uid()` |
| Sistema público (booking externo) | `business_id` | UUID do perfil público (`profiles.id`) |

**Regra de Ouro:** Nunca aceitar `user_id` ou `business_id` como parâmetro de URL/formulário — sempre derivar de `auth.uid()` dentro de funções `SECURITY DEFINER`.

---

## Seção 2 — Tabelas (19 tabelas principais + 2 sistema)

### Grupo 1: Auth & Perfil

#### `profiles`
Criada automaticamente via trigger `on_auth_user_created` quando um usuário se registra no Supabase Auth.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, FK → `auth.users(id)` | Igual ao `auth.uid()` |
| `email` | TEXT | — | E-mail do proprietário |
| `full_name` | TEXT | — | Nome completo |
| `business_name` | TEXT | — | Nome do estabelecimento |
| `phone` | TEXT | — | Telefone |
| `user_type` | TEXT | DEFAULT `'barber'` | `'barber'` ou `'beauty'` — determina o tema |
| `region` | TEXT | DEFAULT `'BR'` | `'BR'` ou `'PT'` |
| `logo_url` | TEXT | — | URL do logo (bucket `logos`) |
| `cover_photo_url` | TEXT | — | URL da capa (bucket `covers`) |
| `address_street` | TEXT | — | Endereço |
| `instagram_handle` | TEXT | — | Handle do Instagram |
| `public_booking_enabled` | BOOLEAN | DEFAULT `false` | Liga/desliga o portal público |
| `booking_lead_time_hours` | INTEGER | DEFAULT `2` | Antecedência mínima para booking |
| `max_bookings_per_day` | INTEGER | DEFAULT `20` | Limite diário |
| `business_slug` | TEXT | UNIQUE | Slug para URL pública (`/b/{slug}`) |
| `monthly_goal` | NUMERIC | — | Meta mensal de receita (fallback) |
| `aios_enabled` | BOOLEAN | DEFAULT `false` | Flag de ativação do AIOS |
| `aios_features` | JSONB | DEFAULT `{}` | Feature flags granulares do AIOS |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** SELECT público (necessário para booking público), UPDATE restrito ao dono.
**Trigger:** `on_auth_user_created` popula o perfil na criação do usuário.

---

#### `business_settings`
Configurações operacionais do negócio (horários, política de cancelamento, onboarding).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `user_id` | UUID | FK → `auth.users(id)`, UNIQUE | Um registro por usuário |
| `business_hours` | JSONB | DEFAULT `{}` | Horários por dia (`mon`, `tue`... com `isOpen`, `blocks[]`) |
| `cancellation_policy` | TEXT | DEFAULT `'flexible'` | Política de cancelamento |
| `onboarding_completed` | BOOLEAN | DEFAULT `false` | Onboarding concluído |
| `onboarding_step` | INTEGER | DEFAULT `1` | Etapa atual do onboarding |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restrito a `auth.uid() = user_id`.

---

### Grupo 2: Equipe & Serviços

#### `team_members`
Profissionais vinculados ao negócio (barbeiros, cabeleireiros etc.).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Dono do negócio que criou |
| `business_id` | UUID | FK → `auth.users(id)` | Negócio ao qual pertence (multi-user) |
| `name` | TEXT | NOT NULL | Nome do profissional |
| `role` | TEXT | NOT NULL | Cargo/função |
| `bio` | TEXT | — | Biografia para portfólio público |
| `photo_url` | TEXT | — | Foto (bucket `team_photos`) |
| `active` | BOOLEAN | DEFAULT `true` | Ativo/inativo |
| `display_order` | INTEGER | DEFAULT `0` | Ordem de exibição |
| `slug` | VARCHAR(100) | UNIQUE | Slug para link individual do profissional |
| `commission_rate` | DECIMAL(5,2) | — | Taxa de comissão (%) |
| `full_name` | TEXT | — | Nome completo (alias/alternativo) |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL onde `auth.uid() = user_id` OU `is_staff_of(user_id)`.

---

#### `service_categories`
Categorias de serviços (ex: "Corte", "Barba", "Coloração").

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Dono |
| `name` | TEXT | NOT NULL | Nome da categoria |
| `display_order` | INTEGER | DEFAULT `0` | Ordem de exibição |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restrito a `auth.uid() = user_id`.

---

#### `services`
Serviços oferecidos pelo negócio.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Dono |
| `category_id` | UUID | FK → `service_categories(id)` ON DELETE SET NULL | Categoria |
| `name` | TEXT | NOT NULL | Nome do serviço |
| `description` | TEXT | — | Descrição |
| `price` | DECIMAL(10,2) | NOT NULL | Preço |
| `duration_minutes` | INTEGER | NOT NULL | Duração em minutos |
| `image_url` | TEXT | — | Imagem (bucket `service_images`) |
| `active` | BOOLEAN | DEFAULT `true` | Ativo/inativo |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL onde `auth.uid() = user_id` OU `is_staff_of(user_id)`.

---

#### `service_upsells`
Relacionamento many-to-many entre serviços para upsell (ex: "Corte + Barba").

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Dono |
| `parent_service_id` | UUID | FK → `services(id)` ON DELETE CASCADE | Serviço principal |
| `upsell_service_id` | UUID | FK → `services(id)` ON DELETE CASCADE | Serviço sugerido |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restrito a `auth.uid() = user_id`.

---

### Grupo 3: Clientes & Agenda

#### `clients`
Cadastro de clientes do negócio (CRM interno).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)`, DEFAULT `auth.uid()` | Dono |
| `name` | TEXT | NOT NULL | Nome do cliente |
| `email` | TEXT | — | E-mail |
| `phone` | TEXT | — | Telefone |
| `loyalty_tier` | TEXT | DEFAULT `'Bronze'` | `'Bronze'`, `'Silver'`, `'Gold'` |
| `total_visits` | INTEGER | DEFAULT `0` | Contador de visitas |
| `notes` | TEXT | — | Observações internas |
| `photo_url` | TEXT | — | Foto (bucket `client_photos`) |
| `rating` | DECIMAL(2,1) | CHECK 0–5, DEFAULT `0` | Avaliação do cliente |
| `last_visit` | TIMESTAMPTZ | — | Data da última visita |
| `next_prediction` | TEXT | — | Previsão da próxima visita (IA) |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL onde `auth.uid() = user_id` OU `is_staff_of(user_id)`.
**Trigger:** `audit_clients` gera log em `audit_logs` em INSERT/UPDATE/DELETE.

---

#### `appointments`
Agendamentos internos (criados pelo dono/equipe).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)`, DEFAULT `auth.uid()` | Dono do negócio |
| `client_id` | UUID | FK → `clients(id)` ON DELETE CASCADE | Cliente |
| `professional_id` | UUID | FK → `team_members(id)` ON DELETE SET NULL | Profissional |
| `service` | TEXT | NOT NULL | Nome(s) do(s) serviço(s) — texto concatenado |
| `appointment_time` | TIMESTAMPTZ | NOT NULL | Data/hora do agendamento |
| `price` | DECIMAL(10,2) | NOT NULL | Valor cobrado |
| `status` | TEXT | DEFAULT `'Pending'` | `'Pending'`, `'Confirmed'`, `'Completed'`, `'Cancelled'` |
| `notes` | TEXT | — | Observações |
| `payment_method` | TEXT | — | Método de pagamento (`'pix'`, `'dinheiro'`, `'cartao'`) |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL onde `auth.uid() = user_id` OU `is_staff_of(user_id)`.
**Trigger:** `audit_appointments` gera log em `audit_logs`.
**Índices:** `(user_id, appointment_time, status)`, `(deleted_at) WHERE NOT NULL`.

---

### Grupo 4: Sistema Público (Booking Externo)

#### `public_clients`
Clientes registrados via portal público (sem conta Supabase Auth).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `business_id` | UUID | FK → `profiles(id)` ON DELETE CASCADE | Negócio |
| `name` | VARCHAR(255) | NOT NULL | Nome do cliente |
| `email` | VARCHAR(255) | — | E-mail |
| `phone` | VARCHAR(50) | NOT NULL | Telefone |
| `photo_url` | TEXT | — | Foto do perfil |
| `google_id` | VARCHAR(255) | — | ID Google (OAuth futuro) |
| `last_booking_at` | TIMESTAMPTZ | — | Data do último agendamento |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| UNIQUE | — | `(business_id, phone)` | Um registro por telefone por negócio |

**RLS:** INSERT público (qualquer um pode se registrar). SELECT/ALL para `auth.uid() = business_id`.

---

#### `public_bookings`
Requisições de agendamento via portal público (aguardam confirmação).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `business_id` | UUID | FK → `profiles(id)` | Negócio alvo |
| `customer_name` | TEXT | NOT NULL | Nome do cliente |
| `customer_phone` | TEXT | NOT NULL | Telefone |
| `customer_email` | TEXT | — | E-mail |
| `service_ids` | UUID[] | — | Array de IDs dos serviços |
| `professional_id` | UUID | FK → `team_members(id)` | Profissional escolhido |
| `appointment_time` | TIMESTAMPTZ | NOT NULL | Data/hora solicitada |
| `total_price` | DECIMAL | — | Valor total |
| `duration_minutes` | INTEGER | — | Duração estimada |
| `status` | TEXT | DEFAULT `'pending'` | `'pending'`, `'confirmed'`, `'cancelled'`, `'completed'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** INSERT público (sem auth). SELECT/UPDATE para `auth.uid() = business_id`. Usado por `create_secure_booking` e lido por `get_available_slots` para evitar double-booking.

---

#### `queue_entries`
Fila de espera virtual (clientes sem hora marcada).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | — |
| `business_id` | UUID | FK → `profiles(id)` ON DELETE CASCADE, NOT NULL | Negócio |
| `client_name` | VARCHAR(255) | NOT NULL | Nome do cliente |
| `client_phone` | VARCHAR(50) | NOT NULL | Telefone |
| `service_id` | UUID | FK → `services(id)` ON DELETE SET NULL | Serviço |
| `professional_id` | UUID | FK → `team_members(id)` ON DELETE SET NULL | Profissional preferido |
| `status` | VARCHAR(50) | DEFAULT `'waiting'` | `waiting`, `calling`, `serving`, `completed`, `cancelled`, `no_show` |
| `joined_at` | TIMESTAMPTZ | DEFAULT NOW() | Hora de entrada na fila |
| `estimated_wait_time` | INTEGER | — | Tempo estimado de espera (min) |
| `notes` | TEXT | — | Observações |

**RLS:** INSERT público. SELECT para status ativos (público). ALL para `auth.uid() = business_id`.
**Índices:** `(business_id, status)`, `(joined_at)`.

---

### Grupo 5: Financeiro

#### `finance_records`
Registros financeiros: comissões geradas automaticamente + despesas manuais.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)`, DEFAULT `auth.uid()` | Dono |
| `professional_id` | UUID | FK → `team_members(id)` | Profissional (para comissão) |
| `appointment_id` | UUID | FK → `appointments(id)` | Agendamento origem |
| `barber_name` | TEXT | — | Nome do profissional (snapshot) |
| `client_name` | TEXT | — | Nome do cliente (snapshot) |
| `service_name` | TEXT | — | Nome do serviço (snapshot) |
| `revenue` | DECIMAL(10,2) | NOT NULL | Receita bruta |
| `commission_rate` | DECIMAL(5,2) | DEFAULT `0` | Taxa de comissão (%) |
| `commission_value` | DECIMAL(10,2) | DEFAULT `0` | Valor da comissão (R$) |
| `commission_paid` | BOOLEAN | DEFAULT `false` | Comissão paga? |
| `commission_paid_at` | TIMESTAMPTZ | — | Data do pagamento |
| `auto_split` | BOOLEAN | DEFAULT `false` | Divisão automática? |
| `type` | TEXT | DEFAULT `'expense'` | `'revenue'` ou `'expense'` |
| `description` | TEXT | — | Descrição da despesa |
| `category` | TEXT | — | Categoria da despesa |
| `status` | TEXT | DEFAULT `'paid'` | `'paid'` ou `'pending'` |
| `due_date` | TIMESTAMP | — | Vencimento (despesa a pagar) |
| `payment_method` | TEXT | — | Método de pagamento |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL onde `auth.uid() = user_id` OU `is_staff_of(user_id)`.
**Trigger:** `audit_financial_records` → `audit_logs`.
**Nota:** Registros `type='revenue'` com `appointment_id IS NOT NULL` são gerados automaticamente por `complete_appointment()`. Registros `type='expense'` são manuais.

---

### Grupo 6: Conteúdo & Marketing

#### `content_calendar`
Calendário de conteúdo gerado pela IA para redes sociais.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)`, NOT NULL | Dono |
| `date` | DATE | NOT NULL | Data da publicação |
| `content_type` | TEXT | NOT NULL | `'carousel'`, `'reel'`, `'story'`, `'post'` |
| `topic` | TEXT | NOT NULL | Tema do conteúdo |
| `caption` | TEXT | NOT NULL | Legenda gerada |
| `hashtags` | TEXT[] | NOT NULL | Array de hashtags |
| `posting_time` | TIME | — | Horário sugerido |
| `status` | TEXT | DEFAULT `'pending'` | `'pending'`, `'posted'`, `'skipped'` |
| `ai_generated` | BOOLEAN | DEFAULT `true` | Gerado por IA? |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restrito a `auth.uid() = user_id`.
**Índice:** `(user_id, date)`.

---

#### `marketing_assets`
Fotos editadas pela IA para campanhas de marketing.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)`, NOT NULL | Dono |
| `original_image_url` | TEXT | NOT NULL | URL da imagem original |
| `edited_image_url` | TEXT | — | URL da imagem editada |
| `caption` | TEXT | — | Legenda sugerida |
| `hashtags` | TEXT[] | — | Hashtags sugeridas |
| `ai_suggestions` | JSONB | — | Sugestões da IA em formato estruturado |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restrito a `auth.uid() = user_id`.

---

#### `hair_records`
Histórico visual de cortes por cliente.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)`, NOT NULL | Dono |
| `client_id` | UUID | FK → `clients(id)` ON DELETE CASCADE, NOT NULL | Cliente |
| `service` | TEXT | NOT NULL | Serviço realizado |
| `barber` | TEXT | — | Nome do profissional |
| `date` | TIMESTAMPTZ | DEFAULT NOW() | Data do corte |
| `image_url` | TEXT | — | Foto do resultado |
| `notes` | TEXT | — | Observações |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restrito a `auth.uid() = user_id`.

---

### Grupo 7: AI & Memória

#### `aios_logs`
Memória e logs de decisões dos agentes de IA do AIOS.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | — |
| `user_id` | UUID | FK → `auth.users(id)`, NOT NULL | Negócio |
| `agent_name` | TEXT | NOT NULL | Ex: `'FinanceAgent'`, `'MarketingAgent'` |
| `action_type` | TEXT | NOT NULL | `'suggestion'`, `'execution'`, `'learning'` |
| `content` | JSONB | NOT NULL | Payload da ação |
| `metadata` | JSONB | DEFAULT `{}` | Metadados adicionais |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** SELECT/INSERT restrito a `auth.uid() = user_id`.
**Índices:** `(user_id, agent_name)`, `(created_at)`.
**Usado por:** `get_dashboard_stats` (conta campanhas enviadas), `get_aios_diagnostic`.

---

#### `ai_knowledge_base`
Base de conhecimento vetorial para reduzir tokens via RAG (cache semântico).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `content` | TEXT | NOT NULL | Conteúdo textual (FAQ, procedimentos) |
| `embedding` | VECTOR(768) | — | Embedding gerado pelo Gemini `text-embedding-004` |
| `metadata` | JSONB | DEFAULT `{}` | Metadados do conteúdo |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** SELECT para todos autenticados.
**Índice:** HNSW `(embedding vector_cosine_ops)`.

---

#### `client_semantic_memory`
Memória semântica por cliente para personalização profunda via RAG.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `client_id` | UUID | FK → `clients(id)` ON DELETE CASCADE | Cliente |
| `observation` | TEXT | NOT NULL | Observação textual (preferência, hábito) |
| `embedding` | VECTOR(768) | — | Embedding Gemini |
| `context_type` | VARCHAR(50) | — | `'style'`, `'preference'`, `'habit'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL para todos autenticados (a refinar para filtrar por user_id).
**Índice:** HNSW `(embedding vector_cosine_ops)`.

---

### Grupo 8: Auditoria & Sistema

#### `audit_logs`
Registro completo e imutável de todas as ações no sistema.

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE SET NULL | Usuário que executou |
| `action` | VARCHAR(50) | CHECK enum | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_CHANGE`, `EMAIL_CHANGE`, `EXPORT`, `IMPORT`, `BACKUP` |
| `resource_type` | VARCHAR(100) | NOT NULL | Nome da tabela afetada |
| `resource_id` | UUID | — | ID do recurso afetado |
| `old_values` | JSONB | — | Estado anterior |
| `new_values` | JSONB | — | Novo estado |
| `ip_address` | INET | — | IP do usuário |
| `user_agent` | TEXT | — | Browser/cliente |
| `request_method` | VARCHAR(10) | — | Método HTTP |
| `request_path` | TEXT | — | Path da requisição |
| `metadata` | JSONB | DEFAULT `{}` | Metadados extras |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | — |

**RLS:** INSERT público (via sistema). SELECT restrito a `user_id = auth.uid()`. UPDATE/DELETE bloqueado (imutável).
**Índices:** `(user_id, created_at DESC)`, `(resource_type, resource_id, created_at DESC)`, `(action, created_at DESC)`, GIN em `metadata`.
**Tabelas auditadas automaticamente:** `appointments`, `clients`, `financial_records`, `services`, `team_members`, `profiles` (update).

---

#### `system_errors`
Log de erros do sistema (frontend e backend).

| Coluna | Tipo | Constraint | Notas |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `error_message` | TEXT | NOT NULL | Mensagem do erro |
| `stack_trace` | TEXT | — | Stack trace |
| `component_stack` | TEXT | — | Stack de componentes React |
| `severity` | VARCHAR(20) | CHECK enum | `'info'`, `'warning'`, `'error'`, `'critical'` |
| `context` | JSONB | DEFAULT `{}` | URL, Browser, OS |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE SET NULL | Usuário que gerou o erro |
| `resolved` | BOOLEAN | DEFAULT `false` | Foi resolvido? |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | — |

**RLS:** INSERT para autenticados e anônimos. SELECT para `user_id = auth.uid()`.

---

#### `rate_limits` (UNLOGGED — Sistema)
Controle de rate limiting (Token Bucket). Dados voláteis — resetados ao reiniciar o servidor.

| Coluna | Tipo | Notas |
|---|---|---|
| `key` | TEXT | PK. Formato: `'login:{email}'` |
| `tokens` | INTEGER | Tokens disponíveis |
| `last_refill` | TIMESTAMPTZ | Última recarga |

**Sem RLS** — acesso apenas via funções `SECURITY DEFINER`.

---

## Seção 3 — RPCs Existentes (41 funções documentadas)

### 3.1 Domínio: Finance

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `get_finance_stats` | `(p_user_id TEXT, p_start_date TEXT, p_end_date TEXT)` | JSON | `Finance.tsx:132`, `useDashboardData.ts:195` |
| `get_monthly_finance_history` | `(p_user_id TEXT, p_months_count INT DEFAULT 12)` | JSON | `Finance.tsx:210` |
| `mark_expense_as_paid` | `(p_record_id TEXT, p_user_id TEXT)` | VOID | `Finance.tsx:725,826` |
| `get_commissions_due` | `(p_user_id UUID)` | TABLE | `CommissionsManagement.tsx:54`, `AlertsContext.tsx:89` |
| `mark_commissions_as_paid` | `(p_user_id UUID, p_professional_id UUID, p_amount DECIMAL, p_start_date TIMESTAMP, p_end_date TIMESTAMP)` | VOID | `CommissionsManagement.tsx:127` |
| `complete_appointment` | `(p_appointment_id UUID)` | VOID | `Agenda.tsx:653` |
| `update_commission_record` | `(parâmetros a confirmar nas migrações)` | ? | `ProfessionalCommissionDetails.tsx:190` |

**`get_finance_stats` retorna:**
```json
{
  "revenue": 0.00,
  "expenses": 0.00,
  "pendingExpenses": 0.00,
  "commissions_pending": 0.00,
  "profit": 0.00,
  "revenue_by_method": {"pix": 0, "dinheiro": 0, "cartao": 0},
  "chart_data": [],
  "transactions": []
}
```

---

### 3.2 Domínio: Booking Público

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `get_available_slots` | `(p_business_id UUID, p_date DATE, p_professional_id UUID DEFAULT NULL, p_duration_min INT DEFAULT 30)` | JSON `{slots: string[]}` | `PublicBooking.tsx:223`, `ScheduleSelection.tsx:73` |
| `create_secure_booking` | `(p_business_id UUID, p_professional_id UUID, p_customer_name TEXT, p_customer_phone TEXT, p_customer_email TEXT, p_appointment_time TIMESTAMPTZ, p_service_ids TEXT[], p_total_price NUMERIC, p_duration_min INT DEFAULT 30, p_status TEXT DEFAULT 'pending', p_client_id UUID DEFAULT NULL, p_notes TEXT DEFAULT NULL)` | JSON `{success, booking_id}` | `AppointmentWizard.tsx:123` |
| `get_active_booking_by_phone` | `(p_phone TEXT, p_business_id UUID)` | TABLE/JSON | `PublicBooking.tsx:144,167,523,543` |
| `get_public_client_by_phone` | `(p_business_id UUID, p_phone TEXT)` | TABLE `(id, name, email, phone, photo_url)` | `PublicClientContext.tsx:34,62` |
| `get_client_bookings_history` | `(p_phone TEXT, p_business_id UUID)` | TABLE | `ClientArea.tsx:88` |

**`get_client_bookings_history` retorna:** `id`, `appointment_time`, `status`, `service_ids`, `service_names`, `professional_id`, `professional_name`, `total_price`, `duration_minutes`, `created_at`.

---

### 3.3 Domínio: Dashboard & Analytics

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `get_dashboard_stats` | `(p_user_id TEXT)` | JSON | `useDashboardData.ts:119` |
| `get_dashboard_insights` | `(p_user_id UUID, p_start_date TIMESTAMP DEFAULT NULL, p_end_date TIMESTAMP DEFAULT NULL)` | JSON | `Reports.tsx:69` |
| `get_client_insights` | `(p_user_id UUID, p_months INT DEFAULT 6)` | JSON | `Reports.tsx:74` |
| `get_aios_diagnostic` | `(p_establishment_id UUID)` | JSON | `useAIOSDiagnostic.ts:37` |

**`get_dashboard_stats` retorna (versão atual — hotfix):**
```json
{
  "total_profit": 0,
  "current_month_revenue": 0,
  "weekly_growth": 0,
  "monthly_goal": 5000,
  "recovered_revenue": 0,
  "avoided_no_shows": 0,
  "filled_slots": 0,
  "campaigns_sent": 0
}
```
⚠️ **Gap:** O frontend acessa `s.appointments_total`, `s.appointments_this_month`, `s.completed_this_month`, `s.has_public_bookings`, `s.account_days_old`, `s.data_maturity_score`, `s.avg_ticket`, `s.churn_risk_count`, `s.top_service`, `s.repeat_client_rate` — campos NÃO retornados pela função atual (retornam `undefined`, tratados como `0` no frontend).

**`get_dashboard_insights` retorna:** `total_appointments`, `new_clients`, `active_clients`, `top_professionals[]`, `top_services[]`, `appointments_by_day[]`.

**`get_client_insights` retorna:** `client_growth_by_month[]`, `top_clients[]`, `retention_rate`.

---

### 3.4 Domínio: Queue

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `get_queue_position` | `(p_queue_id UUID, p_business_id UUID)` | INTEGER | `QueueStatus.tsx:82` |

---

### 3.5 Domínio: Audit

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `create_audit_log` | `(p_action VARCHAR, p_resource_type VARCHAR, p_resource_id UUID DEFAULT NULL, p_old_values JSONB DEFAULT NULL, p_new_values JSONB DEFAULT NULL, p_metadata JSONB DEFAULT '{}')` | UUID | `auditLogs.ts:38` |
| `get_audit_logs` | `(p_limit INT DEFAULT 50, p_offset INT DEFAULT 0, p_action VARCHAR DEFAULT NULL, p_resource_type VARCHAR DEFAULT NULL, p_start_date TIMESTAMPTZ DEFAULT NULL, p_end_date TIMESTAMPTZ DEFAULT NULL)` | TABLE | `auditLogs.ts:68` |

---

### 3.6 Domínio: Memória Semântica

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `match_kb_content` | `(query_embedding vector(768), match_threshold float, match_count int)` | TABLE `(id, content, metadata, similarity)` | `gemini.ts:52` |
| `match_client_memories` | `(p_client_id uuid, query_embedding vector(768), match_threshold float, match_count int)` | TABLE `(id, observation, context_type, similarity)` | `useSemanticMemory.ts:61` |

---

### 3.7 Domínio: Soft Delete (10 funções + 1 listagem)

| RPC | Assinatura | Retorno |
|---|---|---|
| `soft_delete_appointment` | `(p_id UUID)` | VOID |
| `soft_delete_client` | `(p_id UUID)` | VOID |
| `soft_delete_service` | `(p_id UUID)` | VOID |
| `soft_delete_team_member` | `(p_id UUID)` | VOID |
| `soft_delete_financial_record` | `(p_id UUID)` | VOID |
| `restore_appointment` | `(p_id UUID)` | VOID |
| `restore_client` | `(p_id UUID)` | VOID |
| `restore_service` | `(p_id UUID)` | VOID |
| `restore_team_member` | `(p_id UUID)` | VOID |
| `restore_financial_record` | `(p_id UUID)` | VOID |
| `get_deleted_items` | `(p_resource_type VARCHAR DEFAULT NULL, p_limit INT DEFAULT 100)` | TABLE `(id, resource_type, name, deleted_at, days_until_permanent)` |

**Chamada em:** `RecycleBin.tsx:39` (get_deleted_items), `RecycleBin.tsx:69` (restore/soft_delete dinâmico).

---

### 3.8 Domínio: Onboarding

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `update_onboarding_step` | `(p_user_id UUID, p_step INT, p_completed BOOLEAN DEFAULT false)` | VOID | `StepTeam.tsx:38`, `StepServices.tsx:53`, `StepBusinessInfo.tsx:67`, `StepBusinessHours.tsx:57`, `OnboardingWizard.tsx:69` |

---

### 3.9 Domínio: Segurança & Rate Limiting

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `check_login_rate_limit` | `(p_email TEXT)` | BOOLEAN | `AuthContext.tsx:140` |
| `check_rate_limit` | `(p_key TEXT, p_limit INT, p_window_seconds INT)` | BOOLEAN | interno |
| `is_staff_of` | `(p_business_id UUID)` | BOOLEAN | políticas RLS (helper) |

---

### 3.10 Domínio: AIOS & Erros

| RPC | Assinatura | Retorno | Chamada em |
|---|---|---|---|
| `log_aios_campaign` | `(p_client_id UUID, p_agent_name TEXT, p_campaign_type TEXT, p_metadata JSONB DEFAULT '{}')` | UUID | `useAIOSDiagnostic.ts:54` |
| `log_error` | `(p_message TEXT, p_stack TEXT DEFAULT NULL, p_component_stack TEXT DEFAULT NULL, p_severity VARCHAR DEFAULT 'error', p_context JSONB DEFAULT '{}')` | UUID | `Logger.ts:57` |

---

## Seção 4 — Gaps Críticos (O Que FALTA no Banco)

### 4.1 RPCs Ausentes

| RPC | Chamada em | Status | Parâmetros esperados | Comportamento esperado |
|---|---|---|---|---|
| `get_full_dates` | `PublicBooking.tsx:246` | ❌ NÃO EXISTE | `p_business_id UUID`, `p_professional_id UUID`, `p_service_duration INT`, `p_from_date DATE` | Retorna lista de datas sem disponibilidade para desabilitar no datepicker |
| `get_first_available_professional` | `PublicBooking.tsx:533` | ❌ NÃO EXISTE | `p_business_id UUID`, `p_appointment_time TIMESTAMPTZ`, `p_duration_min INT` | Retorna UUID do primeiro profissional disponível no horário |
| `get_dashboard_actions` | `useDashboardData.ts:120` | ❌ NÃO EXISTE | `p_user_id UUID` | Retorna lista de ações recomendadas para o dashboard (action items) |
| `recalculate_pending_commissions` | `CommissionsSettings.tsx:135` | ❌ NÃO EXISTE | `p_user_id UUID` | Recalcula e cria registros de comissão pendentes para agendamentos completados sem registro |

### 4.2 Tabela Possivelmente Ausente

| Tabela | Acessada em | Status | Schema inferido |
|---|---|---|---|
| `goal_settings` | `useDashboardData.ts:84,196` | ⚠️ POSSIVELMENTE AUSENTE | `user_id UUID`, `month INT`, `year INT`, `monthly_goal NUMERIC` — UNIQUE `(user_id, month, year)` |

O frontend faz `supabase.from('goal_settings').upsert({user_id, month, year, monthly_goal}, {onConflict: 'user_id,month,year'})`. Se a tabela não existir, o `upsert` falha silenciosamente.

### 4.3 Campos Ausentes em `get_dashboard_stats`

O frontend em `useDashboardData.ts` acessa os seguintes campos que a função atual **não retorna**:

| Campo esperado | Tipo | Descrição |
|---|---|---|
| `appointments_total` | INT | Total de agendamentos de todos os tempos |
| `appointments_this_month` | INT | Agendamentos no mês atual |
| `completed_this_month` | INT | Agendamentos concluídos no mês |
| `has_public_bookings` | BOOLEAN | Tem bookings públicos? |
| `account_days_old` | INT | Dias desde a criação da conta |
| `data_maturity_score` | INT (0–100) | Score de maturidade de dados |
| `avg_ticket` | DECIMAL | Ticket médio do período |
| `churn_risk_count` | INT | Clientes em risco de churn |
| `top_service` | TEXT | Serviço mais vendido |
| `repeat_client_rate` | DECIMAL | Taxa de clientes recorrentes (%) |

---

## Seção 5 — Storage Buckets (6 buckets)

| Bucket | Público | Usado para | Referência de migration |
|---|---|---|---|
| `logos` | Sim | Logo do negócio (`profiles.logo_url`) | `20260218_full_schema_fix.sql` |
| `covers` | Sim | Foto de capa (`profiles.cover_photo_url`) | `20260218_full_schema_fix.sql` |
| `team_photos` | Sim | Fotos dos profissionais (`team_members.photo_url`) | `20260218_full_schema_fix.sql` |
| `service_images` | Sim | Imagens dos serviços (`services.image_url`) | `20260218_full_schema_fix.sql` |
| `client_photos` | Sim | Fotos dos clientes (`clients.photo_url`) | `20260218_add_client_photos_bucket.sql` |
| `marketing_images` | Sim | Assets de marketing (`marketing_assets`) | `20260218_marketing_ai_tables.sql` |

**Políticas:** Todos os buckets têm SELECT público + INSERT/UPDATE/DELETE restrito a `auth.role() = 'authenticated'`.

---

## Seção 6 — Ordem de Aplicação das Migrações (64 arquivos)

| # | Arquivo | Data | Propósito |
|---|---|---|---|
| 1 | `20240107_fix_client_and_booking_rules.sql` | Jan 2024 | Correção RLS de clients/bookings |
| 2 | `20240523000000_add_reschedule_token.sql` | Mai 2024 | Token de reagendamento |
| 3 | `20260129_consolidate_rls_final.sql` | Jan 2026 | Consolidação final das políticas RLS |
| 4 | `20260130_fix_availability_rpc.sql` | Jan 2026 | `get_available_slots` + `create_secure_booking` |
| 5 | `20260130_fix_staff_and_reporting.sql` | Jan 2026 | Multi-usuário (staff) + `get_dashboard_insights` v1 |
| 6 | `20260214_audit_system.sql` | Fev 2026 | Sistema completo de auditoria (`audit_logs`) |
| 7 | `20260214_soft_delete.sql` | Fev 2026 | Soft delete em 5 tabelas + lixeira |
| 8 | `20260214_rate_limiting.sql` | Fev 2026 | Rate limiting (Token Bucket) |
| 9 | `20260216_error_tracking.sql` | Fev 2026 | Tabela `system_errors` + `log_error` |
| 10 | `20260216_secure_rpc_fix.sql` | Fev 2026 | Correções de segurança em RPCs |
| 11 | `20260216_rls_phase2_core.sql` | Fev 2026 | RLS fase 2 — tabelas core |
| 12 | `20260216_rls_phase3_operational.sql` | Fev 2026 | RLS fase 3 — tabelas operacionais |
| 13 | `20260216_rls_phase4_financial.sql` | Fev 2026 | RLS fase 4 — tabelas financeiras |
| 14 | `20260216_security_cleanup.sql` | Fev 2026 | Limpeza de políticas duplicadas |
| 15 | `20260216_factory_reset.sql` | Fev 2026 | Reset de políticas conflitantes |
| 16 | `20260217_fix_secure_booking_final.sql` | Fev 2026 | Correção final do booking seguro |
| 17 | `20260217_fix_secure_booking_resilient.sql` | Fev 2026 | Booking resiliente a erros |
| 18 | `20260218_full_schema_fix.sql` | Fev 2026 | **Schema inicial completo** (profiles, business_settings, team_members, service_categories, services, service_upsells, clients, appointments, finance_records + buckets básicos) |
| 19 | `20260218_storage_setup.sql` | Fev 2026 | Configuração de storage |
| 20 | `20260218_team_setup.sql` | Fev 2026 | Configurações de equipe |
| 21 | `20260218_services_setup.sql` | Fev 2026 | Configurações de serviços |
| 22 | `20260218_onboarding_setup.sql` | Fev 2026 | Colunas de onboarding + `update_onboarding_step` |
| 23 | `20260218_security_fix.sql` | Fev 2026 | Correções de segurança |
| 24 | `20260218_client_crm_enhancements.sql` | Fev 2026 | Campos extras em `clients` + `hair_records` + bucket `client_photos` |
| 25 | `20260218_finance_system.sql` | Fev 2026 | `get_finance_stats` v1 |
| 26 | `20260218_marketing_ai_tables.sql` | Fev 2026 | `content_calendar` + `marketing_assets` + bucket `marketing_images` |
| 27 | `20260218_add_client_photos_bucket.sql` | Fev 2026 | Bucket de fotos de clientes |
| 28 | `20260218_add_tutorial_column.sql` | Fev 2026 | Coluna de tutorial |
| 29 | `20260218_commissions_rpc.sql` | Fev 2026 | `complete_appointment` + `get_commissions_due` + `mark_commissions_as_paid` |
| 30 | `20260218_commissions_enhancement.sql` | Fev 2026 | `get_commissions_due` v2 (com photo_url + earnings_month) |
| 31 | `20260218_fix_complete_appointment.sql` | Fev 2026 | Correção de `complete_appointment` |
| 32 | `20260218_add_updated_at_column.sql` | Fev 2026 | Coluna `updated_at` em tabelas |
| 33 | `20260218_professional_booking_system.sql` | Fev 2026 | Slug em `team_members` + tabela `public_clients` + `get_public_client_by_phone` |
| 34 | `20260218_fix_client_crm_issues.sql` | Fev 2026 | Correções do CRM de clientes |
| 35 | `20260218_cleanup_policies.sql` | Fev 2026 | Limpeza de políticas |
| 36 | `20260218_fix_rls_policies_authenticated.sql` | Fev 2026 | Correção de políticas para role authenticated |
| 37 | `20260218_fix_rpc_ambiguity.sql` | Fev 2026 | Remove ambiguidade de RPCs com assinaturas duplicadas |
| 38 | `20260218_fix_expense_calculation.sql` | Fev 2026 | Correção de cálculo de despesas |
| 39 | `20260218_update_commission_rpc.sql` | Fev 2026 | Atualização de RPC de comissões |
| 40 | `20260218_queue_system.sql` | Fev 2026 | Tabela `queue_entries` + `get_queue_position` |
| 41 | `20260218_new_insights_rpc.sql` | Fev 2026 | `get_dashboard_insights` v1 |
| 42 | `20260218_update_premium_account.sql` | Fev 2026 | Campos de conta premium |
| 43 | `20260218_fix_queue_rls_completed.sql` | Fev 2026 | Correção RLS da fila (status completed) |
| 44 | `20260218_update_finance_stats_rpc.sql` | Fev 2026 | Atualização de `get_finance_stats` |
| 45 | `20260218_consolidate_finance_rpc_final.sql` | Fev 2026 | Consolidação final de RPCs financeiros |
| 46 | `20260218_add_payment_method.sql` | Fev 2026 | Coluna `payment_method` em `appointments` |
| 47 | `20260221_aios_foundation.sql` | Fev 2026 | Tabela `aios_logs` + campos `aios_enabled/features` em `profiles` |
| 48 | `20260221_aios_diagnostic_rpc.sql` | Fev 2026 | `get_aios_diagnostic` |
| 49 | `20260221_dashboard_stats_v2.sql` | Fev 2026 | `get_dashboard_stats` v2 (sinceridade) |
| 50 | `20260221_aios_roi_tracking.sql` | Fev 2026 | `log_aios_campaign` + `get_dashboard_stats` v3 (atribuição ROI) |
| 51 | `20260221_dashboard_stats_hotfix.sql` | Fev 2026 | `get_dashboard_stats` hotfix — parâmetro TEXT |
| 52 | `20260222_enable_vector_and_semantic_memory.sql` | Fev 2026 | pgvector + `ai_knowledge_base` + `client_semantic_memory` (1536 dims) |
| 53 | `20260222_rollback_vector_and_semantic_memory.sql` | Fev 2026 | Rollback das dimensões de embedding |
| 54 | `20260222_fix_vector_dimensions_and_rpc.sql` | Fev 2026 | Embeddings → 768 dims + `match_kb_content` + `match_client_memories` |
| 55 | `20260222_data_maturity_guard.sql` | Fev 2026 | Data Maturity Guard |
| 56 | `20260226_fix_public_access_rls.sql` | Fev 2026 | Correção de acesso público |
| 57 | `20260228_fix_finance_names_and_types.sql` | Fev 2026 | Correção de nomes/tipos financeiros |
| 58 | `20260228_definitive_finance_fix.sql` | Fev 2026 | Correção definitiva das finanças |
| 59 | `20260301_finance_stats_v3_final.sql` | Mar 2026 | `get_finance_stats` **v3 CANÔNICA** (assinatura TEXT,TEXT,TEXT) |
| 60 | `20260301_finance_missing_rpcs.sql` | Mar 2026 | `mark_expense_as_paid` + `get_monthly_finance_history` |
| 61 | `20260301_cleanup_duplicate_finance_records.sql` | Mar 2026 | Limpeza de duplicatas financeiras |
| 62 | `20260302_client_area_rpc.sql` | Mar 2026 | `get_client_bookings_history` (área do cliente público) |
| 63 | `20260304_client_insights_rpc.sql` | Mar 2026 | `get_client_insights` |
| 64 | _(próxima migration)_ | — | A ser criada conforme necessidade |

---

## Seção 7 — Regras de Desenvolvimento (Para o Agente)

### 7.1 Segurança — Regras Inegociáveis

```sql
-- NUNCA aceitar user_id diretamente para operações sensíveis
-- SEMPRE derivar de auth.uid() dentro da função

CREATE OR REPLACE FUNCTION exemplo_seguro(p_filtro TEXT)
RETURNS TABLE(id UUID, nome TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name
  FROM clients c
  WHERE c.user_id = auth.uid()  -- isolamento garantido internamente
    AND c.name ILIKE '%' || p_filtro || '%';
END;
$$;

GRANT EXECUTE ON FUNCTION exemplo_seguro(TEXT) TO authenticated;
```

**Regras obrigatórias:**
1. Toda função DEVE ter `SECURITY DEFINER`
2. Toda função DEVE ter `GRANT EXECUTE ON FUNCTION ... TO authenticated`
3. Funções públicas (booking, queue) devem `GRANT ... TO anon` também
4. Usar `SET search_path = public` em funções críticas para evitar injeção de schema
5. Nunca confiar em parâmetros de `user_id` vindos de fora — derivar sempre de `auth.uid()`

### 7.2 Nomenclatura de Funções

| Prefixo | Quando usar | Exemplo |
|---|---|---|
| `get_` | Leitura/query | `get_finance_stats`, `get_available_slots` |
| `create_` | Inserção com lógica de negócio | `create_secure_booking` |
| `update_` | Atualização com lógica | `update_onboarding_step` |
| `mark_` | Mudança de status | `mark_expense_as_paid`, `mark_commissions_as_paid` |
| `log_` | Registro de auditoria/erro | `log_error`, `log_aios_campaign` |
| `match_` | Busca semântica vetorial | `match_kb_content`, `match_client_memories` |
| `check_` | Validação/verificação | `check_login_rate_limit` |
| `soft_delete_` | Soft delete | `soft_delete_appointment` |
| `restore_` | Restauração de soft delete | `restore_client` |

### 7.3 Padrão de Retorno

| Tipo de dado | Retorno recomendado | Exemplo |
|---|---|---|
| Objeto único com múltiplos campos | `JSON` | `get_finance_stats`, `get_dashboard_stats` |
| Lista consultável/filtrável | `TABLE` | `get_deleted_items`, `get_audit_logs` |
| Confirmação de ação | `VOID` ou `UUID` | `update_onboarding_step`, `create_audit_log` |
| Booleano de permissão | `BOOLEAN` | `check_login_rate_limit`, `is_staff_of` |

### 7.4 Padrão de Transação Atômica

Para operações que modificam múltiplas tabelas, encapsular em uma única função:

```sql
-- Tudo em uma transação — se qualquer parte falhar, tudo é revertido
CREATE OR REPLACE FUNCTION complete_appointment(p_appointment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE appointments SET status = 'Completed' WHERE id = p_appointment_id;
  INSERT INTO finance_records (...) VALUES (...);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.5 Padrão de Contexto Público vs Interno

```
CONTEXTO INTERNO (dono/equipe autenticado):
  user_id = auth.uid()
  Tabelas: appointments, clients, finance_records, etc.

CONTEXTO PÚBLICO (cliente sem login):
  business_id = UUID via URL/parâmetro (validado pela RLS de profiles)
  Tabelas: public_bookings, public_clients, queue_entries
  RPCs públicas: get_available_slots, create_secure_booking,
                 get_public_client_by_phone, get_client_bookings_history
```

### 7.6 Colunas Obrigatórias em Novas Tabelas

```sql
CREATE TABLE nova_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  -- colunas de negócio...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- deleted_at TIMESTAMPTZ,  -- incluir se precisar de soft delete
);

ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento usuario" ON nova_tabela
  FOR ALL USING (auth.uid() = user_id);
```

### 7.7 Versionamento de RPCs (Como mudar assinatura)

Quando uma RPC precisar mudar de assinatura, seguir o padrão de `20260301_finance_stats_v3_final.sql`:
1. `DROP FUNCTION IF EXISTS` para TODAS as variantes de assinatura existentes
2. `CREATE OR REPLACE FUNCTION` com nova assinatura
3. `GRANT EXECUTE` para o role correto
4. Verificar todos os callers: `pages/`, `components/`, `hooks/`, `lib/`, `contexts/`

---

## Referências Rápidas

### Buscar todas as RPCs chamadas no frontend
```bash
grep -rn "supabase.rpc(" pages/ components/ hooks/ lib/ contexts/ --include="*.tsx" --include="*.ts"
```

### Tabelas acessadas via `supabase.from()`
`profiles`, `business_settings`, `team_members`, `service_categories`, `services`, `service_upsells`, `clients`, `appointments`, `finance_records`, `content_calendar`, `marketing_assets`, `public_bookings`, `public_clients`, `queue_entries`, `goal_settings` (⚠️ possivelmente ausente), `aios_logs`, `ai_knowledge_base`, `client_semantic_memory`, `audit_logs`, `system_errors`

### Variáveis de Ambiente
- `VITE_SUPABASE_URL` — URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` — Chave anon (frontend-safe, RLS protege os dados)
- `VITE_GEMINI_API_KEY` — API Key do Gemini (frontend-safe, apenas Gemini)
- Arquivo de referência: `.env.example`
