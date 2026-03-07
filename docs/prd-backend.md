# PRD Backend — AgenX (AIOS)

> **Status**: [DRAFT] | **Versão**: 1.0.0
> **Objetivo**: Definir a infraestrutura de dados, segurança e processamento server-side para o AgenX.

---

## 🏗️ 1. Arquitetura de Dados (Supabase/Postgres)

O banco de dados será organizado seguindo o modelo **Multi-tenant** com isolamento via **RLS (Row Level Security)**. Todas as tabelas (exceto `establishments`) devem conter a coluna `establishment_id`.

### 1.1 Esquema de Tabelas (Simplified DDL)

| Tabela | Colunas Principais | Descrição |
| :--- | :--- | :--- |
| `establishments` | `id (PK)`, `name`, `subdomain`, `theme_config`, `logo_url`, `banner_url` | Dados do tenant/negócio |
| `profiles` | `id (PK)`, `auth_id (FK)`, `establishment_id (FK)`, `full_name`, `role (admin/staff)`, `avatar_url` | Perfis internos vinculados ao Auth |
| `clients` | `id (PK)`, `establishment_id (FK)`, `name`, `phone`, `email`, `last_visit`, `retention_score`, `deleted_at` | CRM e base de dados para a IA |
| `services` | `id (PK)`, `establishment_id (FK)`, `name`, `description`, `price`, `duration_minutes`, `image_url`, `deleted_at` | Catálogo de serviços |
| `working_hours` | `id (PK)`, `establishment_id (FK)`, `profile_id (FK)`, `day_of_week`, `start_time`, `end_time` | Grade de horários por profissional |
| `time_blocks` | `id (PK)`, `establishment_id (FK)`, `profile_id (FK)`, `start_at`, `end_at`, `reason` | Bloqueios (almoço, folga, etc) |
| `appointments` | `id (PK)`, `establishment_id (FK)`, `client_id (FK)`, `profile_id (FK)`, `service_id (FK)`, `scheduled_at`, `status`, `total_price`, `deleted_at` | Registro de agendamentos |
| `finance` | `id (PK)`, `establishment_id (FK)`, `appointment_id (FK)`, `type (income/expense)`, `category`, `amount`, `description`, `deleted_at` | Movimentação de caixa |
| `commissions` | `id (PK)`, `establishment_id (FK)`, `appointment_id (FK)`, `profile_id (FK)`, `amount`, `status (pending/paid)` | Gestão de repasses para equipe |
| `subscriptions` | `id (PK)`, `establishment_id (FK)`, `plan_type`, `status`, `ai_credits_balance` | Planos e saldos de créditos |
| `ai_usage_logs` | `id (PK)`, `establishment_id (FK)`, `action_type`, `credits_cost`, `model_used` | Log de consumo de IA e auditoria |
| `audit_logs` | `id (PK)`, `establishment_id (FK)`, `user_id`, `action`, `entity_type`, `old_values`, `new_values` | Rastreabilidade completa |

### 1.2 Regras de Segurança (RLS Policies)

- **Isolation Strategy**: `CREATE POLICY tenant_isolation ON table TO authenticated USING (establishment_id = ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'establishment_id')::uuid);`
- **Soft Delete Filter**: Todas as views e select policies devem incluir `deleted_at IS NULL`.
- **Admin Access**: Apenas perfis com `role = 'admin'` podem visualizar a tabela `finance` consolidada e `subscriptions`.

---

## 🧠 2. Motor de IA (IAOS Engine)

A inteligência será orquestrada via **OpenRouter** para flexibilidade entre modelos (Gemini Pro como default).

### 2.1 Edge Function `ai-proxy`
- **Finalidade**: Intermediador seguro para chamadas de IA.
- **Workflow**: 
    1. Verifica JWT do usuário.
    2. Valida se `subscriptions.ai_credits_balance > 0`.
    3. Constrói o prompt injetando contexto do `clients` e `appointments`.
    4. Chama OpenRouter.
    5. Desconta créditos e salva no `ai_usage_logs`.

### 2.2 Prompts & Diagnósticos
- **Radar de Lucro**: Scan noturno via `pg_cron` identifica inatividade > 30 dias.
- **Copywriter**: Geração de mensagens personalizadas baseadas no histórico do serviço (ex: "Oi João, vi que faz tempo que não faz seu degrade...").

---

## ⚙️ 3. Processos Servidor (Agendamentos)

Usaremos **`pg_cron`** no Supabase para tarefas recorrentes:

1. **Daily Scan (02:00)**: Processa churn e prepara lista de leads frios.
2. **Reminder Digest (22:00)**: Filtra agendamentos do dia seguinte e prepara templates de WhatsApp.
3. **Trash Cleanup (Semanal)**: `DELETE FROM table WHERE deleted_at < now() - interval '30 days'`.

---

## 🛠️ 4. Integrações Externas

- **Pagamentos**: Stripe Webhooks (Update de `subscriptions`).
- **Comunicação**: Deep Link para WhatsApp (Web/Mobile App).
- **IA**: OpenRouter (Gemini Pro/Flash).

---

## 📂 5. Storage (Supabase Storage)

- **Bucket `portfolio`**: Organizado por `establishment_id/professional_id/`.
- **Politica**: Apenas autenticados do mesmo tenant fazem upload.
- **Limites**: Max 5MB, formato WebP.
