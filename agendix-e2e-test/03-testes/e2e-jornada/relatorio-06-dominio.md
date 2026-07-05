# Relatório Parcial — Agente 06 (Regras de Domínio)
# Frente: E2E — Lógica de Negócio

**Data**: 2026-07-05
**Auditor**: Agente 06 (loop 2 do agendix-e2e-test)
**Método**: auditoria estática — services, hooks, migrations, regras-dominio.md

---

## Sumário executivo

- **11 regras implícitas descobertas** (não documentadas antes)
- **4 conflitos doc vs código** identificados
- **2 P1 novos** não cobertos pelo Agent 03
- **1 estado de fila (`no_show`) inalcançável** por qualquer fluxo do sistema

---

## Regras descobertas pelo agente

| # | Regra | Bloco | Evidência | Severidade |
|---|---|---|---|---|
| R-01 | `createAgendaAppointment` cria appointments com `status: 'Confirmed'` sem passar por `Pending` | B1 | `services/scheduling.ts:355` | P2 |
| R-02 | `cancelAppointment` não gera registro financeiro; sem taxa de cancelamento configurável | B3 | `services/scheduling.ts:326-333` | P2 |
| R-03 | `resetExpiredCallingEntries` retorna `calling → waiting` após 5 min, nunca para `no_show` | D2 | `services/queue.ts:137-149` | P2 |
| R-04 | `fetchQueueEntries` inclui `completed` mas omite `cancelled` e `no_show` da view do barbeiro | D5 | `services/queue.ts:171` | P3 |
| R-05 | `get_commissions_due` não retorna campo `is_owner`; filtro `!item.is_owner` é ineficaz (`!undefined === true`) | C2/A4 | `CommissionsManagement.tsx:151,171` + `20260218_commissions_enhancement.sql` | **P1** |
| R-06 | `onboarding_progress.current_step` tem constraint `CHECK BETWEEN 1 AND 5` mas wizard tem 6 passos; `goToStep(6)` viola a constraint | E1 | `20260320_onboarding_wizard.sql:35` + `useOnboardingState.ts:31` | **P1** |
| R-07 | `appointments.status` usa PascalCase (Confirmed, Completed, Cancelled); `public_bookings.status` usa lowercase (pending, confirmed) | B1 | `services/scheduling.ts:228,265` | P2 |
| R-08 | Slug do staff gerado com `Math.random()` sem constraint UNIQUE em `team_members.slug` | A3 | `contexts/AuthContext.tsx:336` | P3 |
| R-09 | FK `onboarding_progress.company_id REFERENCES companies(id)` — tabela `companies` não existe; migration pode ter falhado | E3 | `20260320_onboarding_wizard.sql:30` | P1-validar |
| R-10 | Dois wizards coexistem: `/onboarding-wizard` (ativo, 6 passos) e `/onboarding` (legado, WizardEngine) | E | `App.tsx:165-176` | P3 |
| R-11 | `markAppointmentComplete` chama `complete_appointment` com 1 parâmetro (versão antiga, sem idempotency guard) | B2 | `services/scheduling.ts:318-324` | P2 |

---

## Achados detalhados por bloco

### Bloco A — Identidade e role

**Correto:**
- Registro sem `?company=` → `role: 'owner'` automaticamente. Regra A1 confirmada (`AuthContext.register():304`).
- Staff via link → `is_owner: false`, `commission_rate: 0`, entry criada em `team_members`. Regra A3 confirmada.

**Quebrado:**
- **A4/R-05 (P1)**: `get_commissions_due` (`20260218_commissions_enhancement.sql`) retorna campos: `professional_id`, `professional_name`, `photo_url`, `total_due`, `total_earnings_month`, `total_pending_records`. **Não retorna `is_owner`**. A interface `CommissionDue` em `CommissionsManagement.tsx:20` declara `is_owner: boolean`, mas o valor vem como `undefined`. O filtro `!item.is_owner` = `!undefined` = `true` → **todos passam, nenhum é filtrado**. Se o dono adicionou a si mesmo via onboarding com `commission_rate > 0`, aparece com comissão devida.

**Incerto:**
- A5 ("Você" na agenda do dono): não encontrado no código auditado. Provavelmente não implementado.

---

### Bloco B — Agendamento

**Correto:**
- `completeAppointment` → RPC `complete_appointment` v3 com 7 parâmetros, idempotency guard, validação de tenant.
- `deleteAppointmentWithFinance` → RPC.
- `createAppointment` (booking público) → RPC `create_secure_booking`.

**Quebrado:**
- **B1/R-01 (P2)**: `createAgendaAppointment` faz INSERT direto em `appointments` com `status: 'Confirmed'`. Pula o estado `Pending`. Inconsistente com booking público que inicia em `pending`.
- **B1/R-07 (P2)**: `appointments` usa PascalCase; `public_bookings` usa lowercase. Queries comparando entre tabelas precisam de cuidado.
- **B3/R-02 (P2)**: `cancelAppointment` só seta `status = 'Cancelled'`. Sem taxa, sem registro financeiro, sem reembolso. Regra de taxa de cancelamento não existe no produto.
- **B2/R-11 (P2)**: `markAppointmentComplete` (quick-complete de atrasados) chama `complete_appointment(p_appointment_id)` — versão de 1 parâmetro sem idempotency guard. Se chamado após checkout completo já feito via checkout modal, pode gerar segundo `finance_record`.

---

### Bloco C — Financeiro e comissão

**Correto:**
- `complete_appointment` v3 e `finish_queue_entry` criam `finance_records` atomicamente.
- `commission_payments` com RLS correto (owner escreve, staff vê os próprios).

**Quebrado:**
- **C2/R-05 (P1)**: Detalhado no Bloco A. `get_commissions_due` não filtra `is_owner`. Dono pode aparecer nas comissões devidas.

---

### Bloco D — Fila digital

**Correto:**
- `resetExpiredCallingEntries` retorna `calling → waiting` após 5 min (comportamento de "chame novamente").
- `finish_queue_entry` (`20260602_harden_queue_phone_dedup.sql`): atômico, normaliza telefone, cria client se não existe, cria appointment + finance_record, fecha com `status = 'completed'`.

**Quebrado:**
- **D2/R-03 (P2)**: Estado `no_show` existe no schema (`status VARCHAR(50) DEFAULT 'waiting' -- waiting, calling, serving, completed, cancelled, no_show`) mas é **inalcançável**. Nenhum serviço ou componente auditado transiciona para `no_show`. `resetExpiredCallingEntries` usa `waiting`, não `no_show`.
- **D5/R-04 (P3)**: `fetchQueueEntries` filtra por `in('status', ['waiting', 'calling', 'serving', 'completed'])` — entries `cancelled` e `no_show` do dia não aparecem na tela.
- **Race condition (Agent 03 confirmado)**: `findActiveQueueEntryByPhone` (SELECT sem FOR UPDATE) antes do INSERT. Duas requisições simultâneas do mesmo telefone podem ambas passar. Nível P2.

---

### Bloco E — Onboarding

**Correto:**
- `Onboarding.tsx` restaura passo salvo ao reabrir via `getOnboardingProgress` + dispatch. Regra E4 confirmada.

**Quebrado:**
- **E1/R-06 (P1 novo)**: O wizard `OnboardingWizard.tsx` define `TOTAL_STEPS = 6`. O passo 5 (StepMonthlyGoal) chama `onNext={() => goToStep(6)}`. Isso chama `upsertOnboardingStep(companyId, 6)` → `upsert_onboarding_progress(p_current_step=6)` → **viola constraint `CHECK (current_step BETWEEN 1 AND 5)`** → RPC retorna erro de constraint → `mutateAsync` lança exceção → wizard fica preso no passo 5. O step 6 (tela de Sucesso) nunca é renderizado.
  - `fetchOnboardingProgress` em `services/onboarding.ts:41` já clampeia o step retornado em `Math.min(Math.max(progress.current_step, 1), 5)` — se voltar ao wizard, reinicia no passo 5.
  - **Fix**: Alterar constraint para `BETWEEN 1 AND 6`, OU mapear `goToStep(6)` para `completeOnboarding()` diretamente sem persistir o passo 6.

- **E3/R-09 (P1-validar)**: `onboarding_progress.company_id UUID NOT NULL REFERENCES companies(id)`. Se `companies` não existe, a migration `20260320_onboarding_wizard.sql` falhou inteira. `AuthContext.register()` linha 313 chama `upsert_onboarding_progress` que falharia, retornando erro e bloqueando o registro. **Verificar no banco de produção urgente.**

- **E/R-10 (P3)**: Rota `/onboarding` (legado com WizardEngine) coexiste com `/onboarding-wizard` (ativo). Código legado acessível diretamente.

---

### Bloco F — Multi-tenant

**Correto:**
- `20260613_security_s2_public_rls.sql` revogou todas as policies públicas sem filtro de tenant (`profiles`, `services`, `team_members`, `business_settings`, `queue_entries`). Superfície pública foi fechada corretamente.
- Todos os services filtram por `companyId`.

**Nota importante**: este achado **contradiz parcialmente o Agent 03** — o P0-01/P0-02 (queue sem filtro) foi **fechado** por `20260613_security_s2_public_rls.sql`, migration posterior às que o Agent 03 auditou. Ver seção Cross-ref.

---

### Bloco G — Clientes

**Correto:**
- `finish_queue_entry` usa `normalize_phone_digits` no lookup de cliente — evita duplicatas por formatação diferente.
- Trigger `trg_mirror_public_client_to_crm` espelha `public_clients` para `clients` automaticamente.

---

## Validação que precisa ser manual

1. **R-09/E3**: `\d onboarding_progress` no Supabase SQL Editor — verificar se a FK `companies(id)` existe ou foi substituída.
2. **R-05/A4**: `SELECT name, commission_rate, is_owner FROM team_members WHERE is_owner = true AND commission_rate > 0` — verificar se algum dono tem comissão calculada.
3. **R-06/E1**: Testar o onboarding ao vivo — clicar "Próximo" no passo 5 (Meta) e observar se o passo 6 (Sucesso) é exibido ou se aparece erro.
4. **A5**: Verificar visualmente se o dono aparece como "Você" na agenda.
5. **D2/R-03**: Confirmar com Rhian: quando barber chama cliente e ele não aparece em 5 min, ele volta pra fila (`waiting`) ou deve virar `no_show`?

---

## Cross-ref com Agent 03

| Achado Agent 03 | Confirmação desta auditoria |
|---|---|
| P0-01: queue SELECT sem filtro business_id | ✅ **Resolvido** em `20260613_security_s2_public_rls.sql` — policy dropada (migration posterior à auditada pelo Agent 03) |
| P0-02: queue INSERT `WITH CHECK (true)` | ✅ **Resolvido** na mesma migration S2 |
| P0-03: deleteFinanceTransaction não-atômico | ✅ Confirmado — `services/finance.ts:98-144` ainda com 2 deletes |
| P1-01: cancelAppointment sem `.eq('user_id')` | ✅ Confirmado — linha 329 sem filtro tenant |
| P1-02: staff órfão → `subscriber` | ✅ Confirmado — `AuthContext.tsx:108-109` |
| P1-03: StaffOnboarding engole erro | ✅ Confirmado — `StaffOnboarding.tsx:29-33` sem try/catch |
| P2-01: calling → waiting (não no_show) | ✅ Confirmado como P2. Destrinchado como R-03 |

**Nota crítica para o orquestrador**: o Agent 03 auditou migrations `20260218_*` mas **não viu** a `20260613_security_s2_public_rls.sql`, que fecha os P0-01 e P0-02. O orquestrador deve **rebaixar P0-01 e P0-02 do Agent 03** para "resolvido" após validação SQL no banco vivo.

Fim do relatório do Agente 06.
