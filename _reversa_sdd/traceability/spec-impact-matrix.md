# Spec Impact Matrix — agendix

> Gerado pelo Architect em 2026-05-06
> Nível de confiança: 🟢 Confirmado | 🟡 Inferido | 🔴 Lacuna

---

A matriz abaixo mapeia qual componente/módulo impacta (depende de ou afeta) qual outro componente. Útil para refatorações, migrações e análise de risco.

## Legenda

| Símbolo | Significado |
|---------|-------------|
| 🔵 | **Lê / Consulta** — componente A lê dados do componente B |
| 🟢 | **Escreve / Cria** — componente A cria ou atualiza dados do componente B |
| 🟡 | **Depende / Importa** — componente A importa código do componente B |
| 🔴 | **Afeta / Dispara** — componente A dispara eventos ou afeta estado do componente B |
| ⚪ | **Nenhum impacto direto** |

---

## Matriz de Impacto entre Módulos

| Origem \ Destino | auth | agenda | public-booking | queue | clients/crm | dashboard | finance | marketing | onboarding | staff/team | settings | security/audit | ai-assistant | supabase-backend |
|------------------|:----:|:------:|:--------------:|:-----:|:-----------:|:---------:|:-------:|:---------:|:----------:|:----------:|:--------:|:--------------:|:------------:|:----------------:|
| **auth** | — | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟢 |
| **agenda** | 🟡 | — | 🟢🔴 | 🟢🔴 | 🟢 | 🔵 | 🟢 | ⚪ | 🔴 | 🟢 | ⚪ | ⚪ | ⚪ | 🟢 |
| **public-booking** | ⚪ | 🔵 | — | ⚪ | 🟢 | ⚪ | ⚪ | ⚪ | ⚪ | 🟢 | ⚪ | ⚪ | ⚪ | 🟢 |
| **queue** | 🟡 | 🔵 | ⚪ | — | 🟢 | ⚪ | 🟢 | ⚪ | ⚪ | 🟢 | ⚪ | ⚪ | ⚪ | 🟢 |
| **clients/crm** | 🟡 | 🔵 | ⚪ | ⚪ | — | 🔵 | 🔵 | 🟢 | ⚪ | ⚪ | ⚪ | ⚪ | 🟢 | 🟢 |
| **dashboard** | 🟡 | 🔵 | ⚪ | ⚪ | 🔵 | — | 🔵 | 🔵 | 🔴 | 🔵 | ⚪ | ⚪ | 🔵 | 🟢 |
| **finance** | 🟡 | 🔵 | ⚪ | ⚪ | 🔵 | 🔵 | — | ⚪ | ⚪ | 🔵 | ⚪ | ⚪ | ⚪ | 🟢 |
| **marketing** | 🟡 | ⚪ | ⚪ | ⚪ | 🟢 | 🔴 | ⚪ | — | ⚪ | ⚪ | ⚪ | ⚪ | 🟢 | 🟢 |
| **onboarding** | 🟡 | ⚪ | ⚪ | ⚪ | ⚪ | 🔴 | ⚪ | ⚪ | — | ⚪ | 🟢 | ⚪ | ⚪ | 🟢 |
| **staff/team** | 🟢 | 🟢 | ⚪ | 🟢 | ⚪ | 🔵 | 🟢 | ⚪ | ⚪ | — | ⚪ | ⚪ | ⚪ | 🟢 |
| **settings** | 🟡 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | 🔴 | ⚪ | 🔴 | 🟢 | — | ⚪ | ⚪ | 🟢 |
| **security/audit** | 🟡 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | — | ⚪ | 🟢 |
| **ai-assistant** | 🟡 | ⚪ | ⚪ | ⚪ | 🟢 | 🔴 | ⚪ | 🟢 | ⚪ | ⚪ | ⚪ | ⚪ | — | 🟢 |
| **supabase-backend** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | — |

---

## Matriz de Impacto Detalhada (Frontend → Backend)

| Componente Frontend | Tabelas/RPCs Impactados | Tipo | Descrição do Impacto |
|---------------------|------------------------|------|----------------------|
| **AuthContext** | profiles, team_members, auth.users | 🟢 | Cria perfil, trial, team_member em registro. Atualiza tutorial_completed. |
| **Login.tsx** | profiles (check onboarding) | 🔵 | Verifica onboarding_completed para redirect. |
| **Agenda.tsx** | appointments, public_bookings, clients, services, team_members, finance_records | 🟢 | CRUD de agendamentos, aceite de bookings, checkout com finance_record. |
| **PublicBooking.tsx** | public_bookings, public_clients, services, team_members | 🟢 | Cria reserva pública, upload de foto. |
| **QueueManagement.tsx** | queue_entries, clients, appointments, finance_records | 🟢 | Atualiza fila, finaliza criando appointment + finance. |
| **Clients.tsx** | clients, public_clients, appointments | 🟢 | Sincroniza public_clients, soft delete. |
| **ClientCRM.tsx** | clients, client_semantic_memory, appointments | 🟢 | Edita cliente, salva memórias semânticas. |
| **ClientArea.tsx** | public_clients, public_bookings | 🔵🟢 | Autentica cliente, mostra histórico, cancela booking. |
| **Dashboard.tsx** | appointments, goal_settings, profiles | 🔵🟢 | Busca estatísticas, atualiza meta mensal. |
| **Finance.tsx** | finance_records, commission_payments, business_settings | 🟢 | Registra despesas, liquida comissões. |
| **Settings** | business_settings, profiles, team_members, services | 🟢 | Atualiza configurações, serviços, equipe. |
| **OnboardingWizard** | onboarding_progress, business_settings, profiles | 🟢 | Persiste progresso, marca completo. |
| **TwoFactorSetup** | auth.mfa_factors (Supabase) | 🟢 | Enroll/verify TOTP. |
| **AuditLogs.tsx** | audit_logs | 🔵 | Busca logs com filtros. |
| **SystemLogs.tsx** | system_errors | 🔵 | Busca e resolve erros. |
| **AIOSDiagnosticCard** | aios_logs | 🟢 | Registra campanhas. |
| **useSemanticMemory** | client_semantic_memory | 🟢 | Insere embeddings. |

---

## Matriz de Impacto Inversa (Backend → Frontend)

| Tabela/RPC | Componentes Frontend Afetados | Tipo | Descrição |
|------------|------------------------------|------|-----------|
| **appointments** | Agenda, Dashboard, Finance, Clients | 🔴 | Mudanças em tempo real via subscription afetam agenda e dashboard. |
| **public_bookings** | Agenda, PublicBooking, ClientArea | 🔴 | Novas reservas aparecem na agenda em real-time. |
| **queue_entries** | QueueManagement, QueueStatus | 🔴 | Atualizações de status em tempo real. |
| **finance_records** | Finance, Dashboard, CommissionsManagement | 🔴 | Transações afetam métricas financeiras. |
| **profiles** | AuthContext, Dashboard, Settings | 🔴 | Mudanças em subscription_status ou configurações afetam todo o app. |
| **business_settings** | Agenda, PublicBooking, Finance, Settings | 🔴 | Alterações em configurações (ex: taxa de maquininha) afetam checkout. |
| **audit_logs** | AuditLogs.tsx | 🔵 | Inserido automaticamente por trigger; frontend apenas consulta. |

---

## Hotspots de Impacto (Alto Acoplamento)

| # | Hotspot | Módulos Envolvidos | Risco |
|---|---------|-------------------|-------|
| H1 | **Checkout de agendamento** | agenda → finance + clients + team_members + business_settings | 🔴 Alto — uma mudança no checkout afeta financeiro, comissões e relatórios |
| H2 | **Aceite de booking público** | agenda → public_bookings + clients + appointments + services | 🔴 Alto — cria/atualiza 3+ entidades em sequência |
| H3 | **Finalização de fila** | queue → clients + appointments + finance_records | 🟡 Médio — transação manual que pode deixar dados inconsistentes |
| H4 | **AuthContext** | auth → todos os módulos | 🟡 Médio — mudanças no perfil afetam todo o app |
| H5 | **Dashboard stats** | dashboard → appointments + finance + clients + ai-assistant | 🟡 Médio — depende de múltiplas fontes para cálculo |
| H6 | **Onboarding** | onboarding → profiles + business_settings + onboarding_progress | 🟡 Médio — dual system legado + novo aumenta complexidade |

---

## Análise de Risco para Migração

| Módulo | Risco de Migração | Justificativa |
|--------|-------------------|---------------|
| **supabase-backend** | 🔴 Crítico | 96 migrations, 50+ RPCs, evolução complexa de RLS. Mudanças aqui afetam TODO o sistema. |
| **agenda** | 🔴 Alto | Dual booking system, real-time, checkout com múltiplas entidades. |
| **finance** | 🟡 Médio | Lógica de comissões, taxa de maquininha, liquidação em lote. |
| **auth** | 🟡 Médio | Herança owner→staff, dev flag hardcoded, trial. |
| **ai-assistant** | 🟢 Baixo | Feature flag isolado (`aiosEnabled`). Pode ser desativado sem impactar core. |
| **marketing** | 🟢 Baixo | Depende de dados do CRM mas é essencialmente leitura + campanhas. |

---

*Fim da Spec Impact Matrix.*
