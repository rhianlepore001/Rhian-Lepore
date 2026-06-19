# Duplication Detector — AgendiX (client + RLS)

**Data:** 2026-06-13  
**Escopo:** auth checks, `company_id` / tenant filtering, validação de input, padrões RLS no client  
**Método:** grep + leitura de código-fonte (evidência por arquivo:linha)

## Resumo executivo

| ID | Padrão duplicado | Arquivos afetados | Severidade | Correção sugerida |
|---|---|---:|---|---|
| DUP-001 | Policies RLS `finance_records` conflitantes (migrations) | 3 migrations | ALTO | 1 migration limpa |
| DUP-002 | CORS `Allow-Origin: *` em Edge Functions | 2 | MÉDIO | `_shared/cors.ts` |
| DUP-003 | Resolução de tenant (`companyId ?? user.id` vs só `user.id`) | **18** | **CRÍTICO** | `resolveTenantId()` único |
| DUP-004 | Coluna tenant: `user_id` vs `company_id` no client | **12+** | ALTO | Contrato único + alias |
| DUP-005 | `role === 'staff'` / guards de owner duplicados | **10** | MÉDIO | hook `useTenantRole()` |
| DUP-006 | Fetch `commission_settlement_day_of_month` copiado | 3 | MÉDIO | service settings |
| DUP-007 | RPC `get_commissions_due` com tenant inconsistente | 2 | ALTO | sempre `tenantId` |
| DUP-008 | `phonesMatch` / normalização de telefone | 2 services | MÉDIO | `@/utils/phone` |
| DUP-009 | Queries Supabase inline vs camada `services/` | **25+** | ALTO | migrar + Zod |
| DUP-010 | Mutações sem filtro tenant (delete/update) | 3 | ALTO | usar services + tenant |
| DUP-011 | Profile creation (trigger DB + insert client) | 2 | ALTO | 1 RPC / trigger only |
| DUP-012 | Validação Zod só em parte dos services | 8 vs 4 | MÉDIO | estender schemas |

**Contagem total de arquivos com duplicação/inconsistência de segurança no client:** **42** (lista consolidada na seção final).

---

## DUP-003 — Resolução de tenant (bug copiado para staff)

**Problema:** O tenant correto para multi-tenant é `companyId ?? user.id` (owner: `companyId === user.id`; staff: `companyId === owner.id`). Vários arquivos usam apenas `user.id`, quebrando staff ou retornando vazio silenciosamente (RLS).

### Padrão correto (duplicado em ~8 lugares, mas não centralizado)

| Arquivo | Linha | Evidência |
|---|---:|---|
| `hooks/useDashboardData.ts` | 12 | `const effectiveUserId = companyId ?? user?.id` |
| `hooks/useMeuDiaData.ts` | — | mesmo padrão |
| `pages/Clients.tsx` | 24 | `effectiveUserId = companyId ?? user?.id` |
| `pages/Reports.tsx` | 21 | idem |
| `pages/Agenda.tsx` | 82 | `effectiveUserId = companyId ?? user?.id` |
| `contexts/AlertsContext.tsx` | 28 | `tenantId = companyId \|\| user.id` |
| `pages/Finance.tsx` | 140, 221 | `queryUserId = isStaff && companyId ? companyId : user.id` |
| `pages/settings/CommissionsSettings.tsx` | 129 | `.eq('user_id', companyId!)` |

### Padrão incorreto — só `user.id` (bug para staff / tenant errado)

| Arquivo | Linha(s) | Evidência |
|---|---:|---|
| `pages/Dashboard.tsx` | 51, 72 | `.eq('user_id', user.id)` em `business_settings` e `appointments` |
| `pages/ClientCRM.tsx` | 113, 138, 197, 224, 299 | updates/deletes com `.eq('user_id', user.id)` |
| `components/CommissionsManagement.tsx` | 131, 143, 188, 246, 269 | RPC e queries com `user.id`; `commission_payments` usa `.eq('company_id', user.id)` |
| `components/CommissionDetailReport.tsx` | 70 | `.eq('user_id', user.id)` |
| `components/AppointmentEditModal.tsx` | 241 | `.eq('user_id', user.id)` |
| `components/AppointmentWizard.tsx` | 237 | contagem pós-criação com `user.id` (tem `companyId` no hook, não usa) |
| `components/TeamMemberForm.tsx` | 121 | `.eq('user_id', user.id)` |
| `components/onboarding/StepTeam.tsx` | 28 | `.eq('user_id', user.id)` |
| `components/onboarding/StepServices.tsx` | 34, 47 | `.eq('user_id', user.id)` |
| `hooks/useSmartRebooking.ts` | 44 | `.eq('user_id', user.id)` |
| `hooks/useCampaignHistory.ts` | 54, 85 | `.eq('user_id', user.id)` |
| `contexts/AlertsContext.tsx` | 37, 54 | overdue: `user.id`; bookings: `business_id: user.id` — **inconsistente com `tenantId` na linha 28** |

### Padrão misto no mesmo arquivo (copiado parcialmente)

| Arquivo | Evidência |
|---|---|
| `pages/Agenda.tsx` | Maioria usa `effectiveUserId` (L210+), mas deletes/mutações usam `user.id` (L533, 566, 601, 638) |
| `pages/Finance.tsx` | `queryUserId` correto (L140), mas `useMonthlyHistory(user?.id)` (L141) ignora staff tenant |
| `contexts/AlertsContext.tsx` | `tenantId` definido L28; queries L37 e L54 ignoram |

**Impacto:** Staff vê dados vazios, alertas errados, ou mutações falham silenciosamente. Owner routes já bloqueiam staff via `OwnerRouteGuard`, mas rotas compartilhadas (Agenda, CRM, Dashboard) não.

**Correção:** `utils/tenant.ts` → `export function resolveTenantId(companyId: string \| null, userId: string): string` usado em **todos** os pontos acima.

---

## DUP-004 — Coluna tenant: `user_id` vs `company_id`

**Problema:** Schema evoluiu; client filtra tabelas diferentes com nomes diferentes sem helper.

| Coluna | Arquivos que filtram |
|---|---|
| `user_id` | `services/scheduling.ts`, `finance.ts`, `crm.ts`, `team.ts`, `settings.ts`, `serviceSettings.ts`, `dashboard.ts`, `onboarding.ts` (counts), `publicBooking.ts`, `queue.ts`, + 18 pages/components inline |
| `company_id` | `services/catalog.ts` (products), `services/onboarding.ts` (onboarding_progress), `contexts/AlertsContext.tsx` L76, `components/CommissionsManagement.tsx` L188, `contexts/AuthContext.tsx` L126, `templates/page.tsx`, `templates/hook.ts` |

**Inconsistência crítica em `CommissionsManagement.tsx`:**
- L131–143: `business_settings` + RPC com **`user_id` / `p_user_id: user.id`**
- L188: `commission_payments` com **`.eq('company_id', user.id)`**

Mesmo componente, duas colunas tenant, mesma variável `user.id` — sem `companyId` do contexto.

**Correção:** Documentar mapa tabela→coluna tenant; longo prazo: migration unificando para `company_id` + view compat.

---

## DUP-005 — Auth / role checks duplicados (sem abstração)

**Problema:** `const isStaff = role === 'staff'` repetido em UI; lógica de guard duplicada entre rota e componente.

| Arquivo | Padrão |
|---|---|
| `App.tsx` | `ProtectedLayout`, `RequireAuth`, `OwnerRouteGuard`, `DevRouteGuard` |
| `pages/Dashboard.tsx` | L26 `isStaff` |
| `pages/Finance.tsx` | L99 `isStaff` + tab guard L185 |
| `pages/Products.tsx` | L115 `isOwner = role === 'owner'` |
| `pages/StaffInsights.tsx` | L48 redirect se owner |
| `components/Sidebar.tsx` | L15 `isStaff` + filter NAV |
| `components/BottomMobileNav.tsx` | L14 |
| `components/QuickActionsModal.tsx` | L19 |
| `components/MoreOptionsDrawer.tsx` | L18 |
| `components/ProfileModal.tsx` | L16 |
| `components/TrialBanner.tsx` | L15 `role === 'staff'` |
| `components/PaywallModal.tsx` | L16 |
| `contexts/AlertsContext.tsx` | L184 `role === 'staff'` skip |
| `hooks/useSmartNotifications.ts` | L59 |

**Impacto:** Nova rota owner-only pode esquecer guard no componente (ou vice-versa). StaffInsights faz redirect manual enquanto outras usam `OwnerRouteGuard`.

**Correção:** `useTenantRole(): { isOwner, isStaff, tenantId }` + lista única de rotas owner-only.

---

## DUP-006 — Settlement day de comissões (lógica triplicada)

Mesma query + lógica de “véspera do acerto” copiada:

| Arquivo | Linhas |
|---|---|
| `pages/Dashboard.tsx` | 45–60 |
| `components/CommissionsManagement.tsx` | 126–137, 48–73 (`calcCommissionPeriod`) |
| `contexts/AlertsContext.tsx` | 66–100 |

Todos leem `business_settings.commission_settlement_day_of_month`; Dashboard e CommissionsManagement usam `user.id`, AlertsContext usa `tenantId` (correto para staff alerts de owner).

---

## DUP-007 — RPC `get_commissions_due` com tenant divergente

| Arquivo | Linha | Parâmetro |
|---|---:|---|
| `contexts/AlertsContext.tsx` | 97 | `p_user_id: tenantId` |
| `components/CommissionsManagement.tsx` | 143 | `p_user_id: user.id` |

**Impacto:** Alertas e tela de comissões podem divergir se `user.id !== tenantId` (não deveria para owner, mas documentação do padrão está errada).

---

## DUP-008 — Normalização de telefone duplicada

| Arquivo | Função | Diferença |
|---|---|---|
| `services/crm.ts` | `normalizePhone`, `phonesMatch` | exportada, testada |
| `services/queue.ts` | `sanitizeQueuePhone`, `phonesMatch` (privada) | cópia quase idêntica L34–44 |

**Impacto:** Fix de matching (ex.: PT vs BR) precisa ser feito em 2 lugares.

---

## DUP-009 — Queries inline vs camada services (validação inconsistente)

**Services com Zod na borda:** `scheduling`, `catalog`, `crm`, `finance` (parcial), `queue`, `serviceSettings`, `recycleBin`, `publicBooking`.

**Arquivos com `supabase.from` direto (sem schema parse):**

| Camada | Arquivos |
|---|---|
| Pages | `Agenda.tsx`, `Dashboard.tsx`, `Clients.tsx`, `ClientCRM.tsx`, `Finance.tsx` (parcial), `QueueJoin.tsx`, `Login.tsx`, `Register.tsx`, `PublicBooking.tsx`, `StaffInsights.tsx`, `ProfessionalPortfolio.tsx`, `QueueManagement.tsx`, `QueueStatus.tsx`, `settings/CommissionsSettings.tsx`, `settings/GeneralSettings.tsx`, `settings/SubscriptionSettings.tsx`, `settings/SystemLogs.tsx` |
| Components | `CommissionsManagement.tsx`, `CommissionDetailReport.tsx`, `CommissionPaymentHistory.tsx`, `ProfessionalCommissionDetails.tsx`, `AppointmentWizard.tsx`, `AppointmentEditModal.tsx`, `TeamMemberForm.tsx`, `BusinessGalleryManager.tsx`, `ProfileModal.tsx`, `StaffEarningsCard.tsx`, `PublicLinkCard.tsx`, `dashboard/SetupCopilot.tsx`, `dashboard/modals/*`, `onboarding/Step*.tsx`, `appointment/ClientSelection.tsx`, `appointment/ScheduleSelection.tsx` |
| Hooks | `useSmartRebooking.ts`, `useCampaignHistory.ts`, `useMarketingOpportunities.ts`, `useAIOSDiagnostic.ts`, `useSemanticMemory.ts`, `use2FA.ts` |
| Contexts | `AlertsContext.tsx`, `AuthContext.tsx` (register insert) |

**Impacto:** Input validation existe em services novos (`types/*.ts` + Zod) mas pages legadas mutam DB sem parse — defense-in-depth só via RLS.

---

## DUP-010 — Mutações/delete sem filtro tenant explícito

| Arquivo | Linha | Evidência |
|---|---:|---|
| `pages/Agenda.tsx` | 530 | `finance_records.delete().eq('appointment_id', …)` — **sem** `user_id` |
| `pages/Agenda.tsx` | 533 | `appointments.delete().eq('id', …).eq('user_id', user.id)` — staff bug |
| `components/StaffEarningsCard.tsx` | 27–30 | só `.eq('professional_id', teamMemberId)` — confia 100% em RLS |
| `pages/ClientCRM.tsx` | 109–114 | update notes: filtra `user.id` não tenant |

**Impacto:** Depende exclusivamente de RLS; se policy falhar, IDOR por `appointment_id` / `client_id`.

---

## DUP-001 — Policies RLS finance_records (migrations)

| Arquivo | Policy |
|---|---|
| `supabase/migrations/20260307_us015b_multi_user_rls.sql` | `Finance: company isolation` FOR ALL |
| `supabase/migrations/20260417_staff_commission_rls.sql` | `Staff can view own commissions` FOR SELECT |
| `supabase/migrations/20260216_rls_phase4_financial.sql` | `Owner can manage finance_records` (legado) |

**Impacto:** Mesmo domínio financeiro com 3 policies empilhadas; evolução sem remoção.

---

## DUP-002 — CORS duplicado (Edge Functions)

| Arquivo | Linhas |
|---|---|
| `supabase/functions/create-checkout-session/index.ts` | 9–12 |
| `supabase/functions/send-appointment-reminder/index.ts` | 5–9 |

---

## DUP-011 — Criação de profile (dois caminhos)

| Arquivo | Caminho |
|---|---|
| `supabase/migrations/20260218_full_schema_fix.sql` | trigger `handle_new_user` |
| `contexts/AuthContext.tsx` | 291–308 insert manual em `profiles` no register |

**Impacto:** Race/divergência de campos (`role`, `company_id`, trial).

---

## DUP-012 — Validação de input: services com/sem Zod

**Com parse na borda:** `services/scheduling.ts`, `catalog.ts`, `crm.ts`, `queue.ts`, `serviceSettings.ts`, `recycleBin.ts`, `publicBooking.ts`.

**Sem parse (queries diretas):** `services/dashboard.ts`, `services/settings.ts`, `services/team.ts`, `services/onboarding.ts` (parcial).

**Pages/components:** maioria sem Zod — validação ad hoc (`alert`, checks inline).

**Bom (não duplicado):** `utils/passwordValidation.ts` centralizado.

---

## Lista consolidada — todos os arquivos afetados (42)

```
App.tsx
components/AppointmentEditModal.tsx
components/AppointmentWizard.tsx
components/BottomMobileNav.tsx
components/BusinessGalleryManager.tsx
components/CommissionDetailReport.tsx
components/CommissionPaymentHistory.tsx
components/CommissionsManagement.tsx
components/MoreOptionsDrawer.tsx
components/PaywallModal.tsx
components/ProfessionalCommissionDetails.tsx
components/ProfileModal.tsx
components/QuickActionsModal.tsx
components/Sidebar.tsx
components/StaffEarningsCard.tsx
components/TeamMemberForm.tsx
components/TrialBanner.tsx
components/dashboard/SetupCopilot.tsx
components/onboarding/StepServices.tsx
components/onboarding/StepTeam.tsx
contexts/AlertsContext.tsx
contexts/AuthContext.tsx
hooks/useCampaignHistory.ts
hooks/useDashboardData.ts
hooks/useMeuDiaData.ts
hooks/useSmartRebooking.ts
hooks/useSmartNotifications.ts
pages/Agenda.tsx
pages/ClientCRM.tsx
pages/Clients.tsx
pages/Dashboard.tsx
pages/Finance.tsx
pages/Products.tsx
pages/Reports.tsx
pages/StaffInsights.tsx
pages/settings/CommissionsSettings.tsx
services/catalog.ts
services/crm.ts
services/onboarding.ts
services/queue.ts
supabase/functions/create-checkout-session/index.ts
supabase/functions/send-appointment-reminder/index.ts
supabase/migrations/20260216_rls_phase4_financial.sql
supabase/migrations/20260307_us015b_multi_user_rls.sql
supabase/migrations/20260417_staff_commission_rls.sql
templates/hook.ts
templates/page.tsx
```

*(Migrations e Edge Functions incluídas por duplicação server-side; total client-focused: 39 TS/TSX + 3 infra.)*

---

## Prioridade de remediação

1. **P0:** DUP-003 — `resolveTenantId()` + substituir `user.id` nos 13 arquivos incorretos; corrigir `Agenda.tsx` mutações.
2. **P0:** DUP-004 / DUP-007 — alinhar `CommissionsManagement` para `companyId` e coluna tenant correta.
3. **P1:** DUP-009 — migrar queries inline críticas (CRM, Agenda delete, Commissions) para services com Zod.
4. **P1:** DUP-001 — migration única de policies finance.
5. **P2:** DUP-005, DUP-006, DUP-008 — hooks/utils compartilhados.

---

## Não encontrado (mantido)

- Funções de criptografia duplicadas
- Validação de senha duplicada (centralizada em `utils/passwordValidation.ts`)
