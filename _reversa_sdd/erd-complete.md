# ERD Completo — agendix

> Gerado pelo Architect em 2026-05-06
> Nível de confiança: 🟢 Confirmado | 🟡 Inferido | 🔴 Lacuna

---

```mermaid
erDiagram
    AUTH_USERS ||--o| PROFILES : "id -> id"
    PROFILES ||--o{ TEAM_MEMBERS : "owner -> user_id"
    PROFILES ||--o{ CLIENTS : "owner -> user_id"
    PROFILES ||--o{ PUBLIC_CLIENTS : "owner -> business_id"
    PROFILES ||--o{ APPOINTMENTS : "owner -> user_id"
    PROFILES ||--o{ PUBLIC_BOOKINGS : "owner -> business_id"
    PROFILES ||--o{ QUEUE_ENTRIES : "owner -> business_id"
    PROFILES ||--o{ SERVICES : "owner -> user_id"
    PROFILES ||--o{ SERVICE_CATEGORIES : "owner -> user_id"
    PROFILES ||--o{ FINANCE_RECORDS : "owner -> user_id"
    PROFILES ||--o{ COMMISSION_PAYMENTS : "owner -> company_id"
    PROFILES ||--o{ GOAL_SETTINGS : "owner -> user_id"
    PROFILES ||--o| BUSINESS_SETTINGS : "owner -> user_id"
    PROFILES ||--o{ BUSINESS_GALLERIES : "owner -> user_id"
    PROFILES ||--o{ AUDIT_LOGS : "owner -> company_id"
    PROFILES ||--o{ SYSTEM_ERRORS : "affected -> user_id"
    PROFILES ||--o{ AIOS_LOGS : "owner -> user_id"
    PROFILES ||--o{ ONBOARDING_PROGRESS : "owner -> company_id"

    TEAM_MEMBERS ||--o{ APPOINTMENTS : "professional -> professional_id"
    TEAM_MEMBERS ||--o{ FINANCE_RECORDS : "professional -> professional_id"
    TEAM_MEMBERS ||--o{ COMMISSION_PAYMENTS : "professional -> collaborator_id"
    TEAM_MEMBERS ||--o{ QUEUE_ENTRIES : "professional -> professional_id"

    CLIENTS ||--o{ APPOINTMENTS : "client -> client_id"
    CLIENTS ||--o{ CLIENT_SEMANTIC_MEMORY : "client -> client_id"
    CLIENTS ||--o{ QUEUE_ENTRIES : "client -> client_id"

    SERVICES ||--o{ APPOINTMENTS : "service names (denormalized)"
    SERVICES ||--o{ PUBLIC_BOOKINGS : "service_ids[]"
    SERVICES ||--o{ QUEUE_ENTRIES : "service -> service_id"
    SERVICE_CATEGORIES ||--o{ SERVICES : "category -> category_id"

    APPOINTMENTS ||--o| PUBLIC_BOOKINGS : "origin -> public_booking_id"
    APPOINTMENTS ||--o| FINANCE_RECORDS : "transaction -> appointment_id"

    PUBLIC_BOOKINGS ||--o| APPOINTMENTS : "accepted -> public_booking_id"

    APPOINTMENTS {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        uuid client_id FK "-> clients.id"
        uuid professional_id FK "-> team_members.id"
        text service
        timestamptz appointment_time
        numeric price
        text status "Confirmed|Pending|Completed|Cancelled"
        text notes
        text payment_method
        integer duration_minutes "default 30"
        numeric base_price
        uuid received_by FK "-> team_members.id"
        uuid completed_by FK "-> auth.users.id"
        numeric machine_fee_percent
        numeric machine_fee_amount
        uuid public_booking_id FK "-> public_bookings.id"
    }

    PUBLIC_BOOKINGS {
        uuid id PK
        uuid business_id FK "-> profiles.id"
        text customer_name
        text customer_phone
        text customer_email
        text customer_photo_url
        uuid[] service_ids
        uuid professional_id FK "-> team_members.id"
        timestamptz appointment_time
        numeric total_price
        text status "pending|confirmed|cancelled"
        integer duration_minutes
        boolean is_edit "default false"
        timestamptz original_appointment_time
        timestamptz updated_at
    }

    QUEUE_ENTRIES {
        uuid id PK
        uuid business_id FK "-> profiles.id"
        uuid client_id FK "-> clients.id"
        text client_name
        text client_phone "default '0000000000'"
        uuid service_id FK "-> services.id"
        uuid professional_id FK "-> team_members.id"
        text status "waiting|calling|serving|completed|cancelled|no_show"
        timestamptz joined_at
        integer estimated_wait_time
    }

    CLIENTS {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        text name
        text phone
        text email
        text photo_url
        text loyalty_tier "Bronze|Silver|Gold|Platinum"
        integer total_visits "default 0"
        numeric rating "default 0"
        text notes
        text source "manual|agendamento_online"
        boolean is_active "default true"
        uuid company_id FK "-> profiles.id"
        timestamptz last_visit
        text hair_history
        timestamptz created_at
        timestamptz updated_at
    }

    PUBLIC_CLIENTS {
        uuid id PK
        uuid business_id FK "-> profiles.id"
        varchar name
        varchar phone
        varchar email
        text photo_url
        varchar google_id
        timestamptz last_booking_at
        timestamptz created_at
    }

    CLIENT_SEMANTIC_MEMORY {
        uuid id PK
        uuid client_id FK "-> clients.id"
        text observation
        vector embedding "768d"
        text context_type "style|preference|habit"
        timestamptz created_at
    }

    TEAM_MEMBERS {
        uuid id PK
        uuid user_id FK "-> profiles.id (owner)"
        text name
        text role
        text bio
        text photo_url
        boolean active "default true"
        boolean is_owner "default false"
        numeric commission_rate "default 0"
        text slug
        text[] specialties
        text cpf
        uuid staff_user_id FK "-> auth.users"
        uuid business_id FK "-> auth.users"
        integer display_order "default 0"
        timestamp created_at
        timestamp updated_at
    }

    PROFILES {
        uuid id PK "FK -> auth.users"
        text full_name
        text business_name
        text user_type "barber|beauty"
        text region "BR|PT"
        text phone
        boolean tutorial_completed "default false"
        text subscription_status "trial|active|past_due|canceled|subscriber"
        timestamptz trial_ends_at
        text role "owner|staff"
        uuid company_id FK "-> profiles.id (owner)"
        text photo_url
        boolean aios_enabled "default true"
        text stripe_customer_id
        text business_slug
        numeric monthly_goal
        boolean setup_completed
        boolean activation_completed
        timestamptz activated_at
    }

    SERVICES {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        text name
        numeric price
        integer duration_minutes "default 30"
        uuid category_id FK "-> service_categories.id"
        text description
        boolean active "default true"
        text image_url
        text upsell_text
        numeric combo_discount
        integer display_order "default 0"
        timestamptz created_at
        timestamptz updated_at
    }

    SERVICE_CATEGORIES {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        text name
        integer display_order "default 0"
    }

    FINANCE_RECORDS {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        uuid appointment_id FK "-> appointments.id"
        uuid professional_id FK "-> team_members.id"
        text barber_name
        text client_name
        text service_name
        numeric revenue "default 0"
        numeric commission_value "default 0"
        numeric commission_rate "default 0"
        boolean commission_paid "default false"
        timestamptz commission_paid_at
        text type "revenue|expense"
        numeric expense "default 0"
        text status "paid|pending"
        timestamptz due_date
        text description
        text payment_method
        timestamptz created_at
    }

    COMMISSION_PAYMENTS {
        uuid id PK
        uuid company_id FK "-> profiles.id"
        uuid collaborator_id FK "-> team_members.id"
        timestamptz period_start
        timestamptz period_end
        numeric net_amount
        numeric commission_percent
        text status "paid"
        timestamptz paid_at
    }

    BUSINESS_SETTINGS {
        uuid user_id PK FK "-> profiles.id"
        jsonb business_hours
        text cancellation_policy
        boolean public_booking_enabled "default true"
        boolean enable_upsells "default false"
        boolean enable_professional_selection "default true"
        boolean enable_email_reminders "default true"
        boolean enable_self_rescheduling "default true"
        integer lead_time_hours "default 2"
        integer max_bookings_per_day
        integer commission_settlement_day_of_month "default 5"
        boolean machine_fee_enabled "default false"
        numeric debit_fee_percent "default 0"
        numeric credit_fee_percent "default 0"
        boolean onboarding_completed "default false"
        jsonb onboarding_progress
        timestamptz updated_at
    }

    GOAL_SETTINGS {
        uuid user_id FK "-> profiles.id"
        integer month
        integer year
        numeric monthly_goal
    }

    BUSINESS_GALLERIES {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        text image_url
        boolean is_active "default true"
        integer display_order "default 0"
    }

    AUDIT_LOGS {
        uuid id PK
        uuid company_id FK "-> profiles.company_id"
        uuid user_id FK "-> auth.users"
        text user_name
        text action
        text resource_type
        uuid resource_id
        jsonb old_values
        jsonb new_values
        text ip_address
        text user_agent
        jsonb metadata
        timestamptz created_at
    }

    SYSTEM_ERRORS {
        uuid id PK
        text error_message
        text stack_trace
        text severity "info|warning|error|critical"
        jsonb context
        boolean resolved "default false"
        uuid user_id FK "-> auth.users"
        timestamptz created_at
    }

    AIOS_LOGS {
        uuid id PK
        uuid user_id FK "-> auth.users"
        text agent_name
        text action_type
        jsonb content
        timestamptz created_at
    }

    AI_KNOWLEDGE_BASE {
        uuid id PK
        text content
        vector embedding "768d"
        jsonb metadata
        timestamptz created_at
    }

    ONBOARDING_PROGRESS {
        uuid id PK
        uuid company_id FK "-> profiles.id"
        smallint current_step "CHECK 1-5"
        smallint[] completed_steps
        boolean is_completed "default false"
        boolean is_skipped "default false"
        timestamptz started_at
        timestamptz completed_at
        timestamptz last_activity
        jsonb step_data
    }
```

---

## Entidades e Cardinalidades

| Entidade A | Relação | Entidade B | Cardinalidade | Descrição |
|------------|---------|------------|---------------|-----------|
| auth.users | possui | profiles | 1:1 | Cada usuário auth tem um perfil |
| profiles (owner) | possui | team_members | 1:N | Um owner tem muitos profissionais |
| profiles (owner) | possui | clients | 1:N | Um owner tem muitos clientes |
| profiles (owner) | possui | public_clients | 1:N | Um owner tem muitos clientes públicos |
| profiles (owner) | possui | appointments | 1:N | Um owner tem muitos agendamentos |
| profiles (owner) | recebe | public_bookings | 1:N | Um owner recebe muitas reservas públicas |
| profiles (owner) | gerencia | queue_entries | 1:N | Um owner gerencia muitas entradas de fila |
| profiles (owner) | oferece | services | 1:N | Um owner oferece muitos serviços |
| profiles (owner) | possui | service_categories | 1:N | Um owner tem muitas categorias |
| profiles (owner) | registra | finance_records | 1:N | Um owner registra muitas transações |
| profiles (owner) | paga | commission_payments | 1:N | Um owner paga muitas comissões |
| profiles (owner) | define | goal_settings | 1:N | Um owner define metas mensais |
| profiles (owner) | configura | business_settings | 1:1 | Um owner tem uma configuração |
| profiles (owner) | possui | business_galleries | 1:N | Um owner tem muitas fotos |
| profiles (owner) | gera | audit_logs | 1:N | Um owner gera muitos logs |
| profiles (owner) | possui | aios_logs | 1:N | Um owner possui logs de IA |
| profiles (owner) | possui | onboarding_progress | 1:1 | Um owner tem um progresso de onboarding |
| team_members | realiza | appointments | 1:N | Um profissional realiza muitos agendamentos |
| team_members | recebe | finance_records | 1:N | Um profissional recebe muitas transações |
| team_members | recebe | commission_payments | 1:N | Um profissional recebe muitos pagamentos |
| team_members | atende | queue_entries | 1:N | Um profissional atende muitas filas |
| clients | agenda | appointments | 1:N | Um cliente tem muitos agendamentos |
| clients | possui | client_semantic_memory | 1:N | Um cliente tem muitas memórias |
| clients | entra | queue_entries | 1:N | Um cliente entra em muitas filas |
| service_categories | agrupa | services | 1:N | Uma categoria agrupa muitos serviços |
| services | compõe | appointments | N:M (denormalizado) | Serviços são nomes separados por vírgula |
| services | aparece em | public_bookings | N:M (array) | IDs em array service_ids |
| services | usado em | queue_entries | 1:N | Um serviço é usado em muitas filas |
| appointments | origina | finance_records | 1:1 | Um agendamento gera um registro financeiro |
| appointments | vem de | public_bookings | N:1 | Muitos agendamentos podem vir de uma reserva pública (edições) |
| public_bookings | gera | appointments | 1:1 | Uma reserva pública aceita gera um agendamento |

---

## Índices e Constraints Relevantes

| Tabela | Constraint/Índice | Tipo | Campos |
|--------|-------------------|------|--------|
| clients | clients_user_id_phone_unique | UNIQUE | (user_id, phone) |
| public_clients | public_clients_business_phone_unique | UNIQUE | (business_id, phone) |
| goal_settings | goal_settings_user_month_year_unique | UNIQUE | (user_id, month, year) |
| onboarding_progress | onboarding_progress_company_id_unique | UNIQUE | (company_id) |
| team_members | idx_team_members_staff_user_id | Índice parcial | (staff_user_id) WHERE staff_user_id IS NOT NULL |
| onboarding_progress | idx_onboarding_progress_active | Índice parcial | (company_id, is_completed) WHERE is_completed = FALSE |
| client_semantic_memory | ivfflat index | Índice vetorial | embedding (768d, lists=100) |
| ai_knowledge_base | ivfflat index | Índice vetorial | embedding (768d, lists=100) |

---

*Fim do ERD.*
