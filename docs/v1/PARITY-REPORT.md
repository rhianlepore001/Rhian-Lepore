# AgendiX v1.0 — Parity Report (Q1)

> **Data:** 2026-06-07  
> **Validador:** Composer (Q1)  
> **Fonte:** `_reversa_sdd/migration/parity_tests/*.feature`  
> **Método:** Mapeamento cenário → implementação + testes Vitest (227 passando). Gherkin não executado via Cucumber; evidência inferida de services, pages e testes unitários/componente. Cenários E2E/RLS marcados **manual**.

---

## Resumo executivo

| Arquivo | Cenários | Pass | Manual | Fail | Status arquivo |
|---------|----------|------|--------|------|----------------|
| 01-auth-login.feature | 8 | 3 | 5 | 0 | **manual** |
| 02-onboarding.feature | 4 | 1 | 2 | 1 | **fail** |
| 03-create-appointment.feature | 5 | 1 | 2 | 2 | **fail** |
| 04-checkout.feature | 6 | 4 | 2 | 0 | **manual** |
| 05-public-booking.feature | 6 | 5 | 1 | 0 | **pass** |
| 06-queue.feature | 10 | 6 | 4 | 0 | **manual** |
| 07-finance.feature | 10 | 5 | 5 | 0 | **manual** |
| 08-crm.feature | 5 | 5 | 0 | 0 | **pass** |
| 09-staff-permissions.feature | 6 | 2 | 4 | 0 | **manual** |
| 10-products.feature | 7 | 3 | 3 | 1 | **fail** |
| **Total** | **67** | **35** | **28** | **4** | — |

**Baseline de testes:** 227 testes Vitest passando (`npm test -- --run`, 34 arquivos).

**Bloqueadores de paridade (fail):** 4 cenários — **fechados em v1-ship (2026-06-07)**.

| Prioridade | Gap | Status v1-ship |
|------------|-----|----------------|
| P0 | Wizard 5-step | ✅ Login/Register/ProtectedLayout → `/onboarding-wizard` |
| P0 | Auto-atribuição AppointmentWizard | ✅ 1 pro auto-select + RPC multi-pro |
| P1 | sell_product + appointmentId | ✅ CheckoutModal vende produtos com `appointmentId` |
| P2 | Som QueueStatus calling | ✅ `audioRef.play()` on status transition |

---

## 01-auth-login.feature — **manual**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Login bem-sucedido de owner | manual | `AuthContext.login` + `pages/Login.tsx` — redirect `/` sem teste E2E |
| 2 | Login staff com herança | **pass** | `test/contexts/AuthContext.test.tsx` — `"inherits owner subscription and business data for staff"` |
| 3 | Rate limit excedido | **pass** | `AuthContext.test.tsx` — `"should handle login rate limit"` |
| 4 | Rate limit RPC fail-open | **pass** | `AuthContext.test.tsx` — `"should fail open when login rate limit RPC is unavailable"` |
| 5 | Staff sem owner (fallback) | manual | `contexts/AuthContext.tsx` L106–110 — sem teste |
| 6 | Filtro `company_id` em queries | manual | Services usam `companyId`; RLS em migrations — sem teste cross-tenant sistemático |
| 7 | Trial ativo | manual | `isSubscriptionActive` em `AuthContext.tsx` — sem unit test |
| 8 | Trial expirado | manual | Idem acima |

---

## 02-onboarding.feature — **fail**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Source of truth = `onboarding_progress` | **pass** | `AuthContext.test.tsx` — onboarding_progress sobrescreve legado |
| 2 | Redirect para `/onboarding` se incompleto | manual | `pages/Login.tsx` L57–58, `App.tsx` `ProtectedLayout` — sem E2E |
| 3 | Wizard 5 steps, retoma step 3 | **fail** | Spec exige 5 steps. Rota `/onboarding` usa `WizardEngine` com **2 steps** (`components/onboarding/WizardEngine.tsx` L26–31). Fluxo 5-step existe em `/onboarding-wizard` mas login não redireciona para lá |
| 4 | Staff → `/staff-onboarding` | manual | `pages/Login.tsx` L49–50 — sem teste |

---

## 03-create-appointment.feature — **fail**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Wizard + `create_secure_booking` + `Confirmed` + evento | **pass** | `test/services/scheduling.test.ts` `createAppointment`; `AppointmentWizard.tsx` L127–142 |
| 2 | Colisão de horário | manual | `AppointmentWizard.tsx` L144–151 alerta em falha — sem teste de colisão |
| 3 | Auto-atribuição com 1 profissional | **fail** | Auto-select só em modal inline da Agenda (`Agenda.tsx` L270–274), **não** no `AppointmentWizard` |
| 4 | Auto-atribuição multi-pro via RPC | **fail** | `getFirstAvailableProfessional` usado em `PublicBooking.tsx` L525–527, **não** no wizard interno |
| 5 | Slots 30 min, 8h–20h | manual | Hardcoded em `Agenda.tsx` L596–600; wizard usa RPC `get_available_slots` — sem teste |

---

## 04-checkout.feature — **manual**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Checkout atômico via `complete_appointment` | **pass** | `test/services/scheduling.test.ts`, `components/CheckoutModal.test.tsx` |
| 2 | Taxa débito 2.5% | **pass** | `scheduling.test.ts` `calcMachineFee`; `CheckoutModal.test.tsx` assert `p_machine_fee_amount: 1.75` |
| 3 | Taxa crédito 4% | **pass** | `scheduling.test.ts` `calcMachineFee(100, 'credit', 4)` |
| 4 | Desconto percentual no checkout | manual | Desconto aplicado na **criação** (`AppointmentWizard.tsx`, `Agenda.tsx`), não no modal de checkout |
| 5 | Preço customizado + label | manual | `CheckoutModal` edita preço (testado); label "Preço Customizado" só em `Agenda.tsx` display |
| 6 | Sem fallback client-side | **pass** | `CheckoutModal.test.tsx` — `"quando RPC falha..."` |

---

## 05-public-booking.feature — **pass**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Cliente cria booking `pending` | **pass** | `test/services/publicBooking.test.ts` `submitPublicBooking` |
| 2 | Duplicata por telefone | **pass** | `get_active_booking_by_phone` em `publicBooking.test.ts` |
| 3 | Aceitar + match telefone 3 formatos | **pass** | `resolveClientForBookingAcceptance` (`services/publicBooking.ts`); `crm.test.ts` `phonesMatch` |
| 4 | Aceitar + criar cliente | **pass** | `resolveClientForBookingAcceptance`; `mirror_public_client_to_crm` |
| 5 | Cliente edita booking (`is_edit`) | **pass** | `publicBooking.test.ts` edit scenario |
| 6 | Aceitar editado → INSERT novo appointment | **pass** | `publicBooking.test.ts` — `"cria appointment aceito sem atualizar historico original"` |

**Nota:** Aceitar booking E2E (owner vê pending → confirmed) não testado em browser.

---

## 06-queue.feature — **manual**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Cliente entra na fila `waiting` | **pass** | `test/services/queue.test.ts` `joinQueue` |
| 2 | Duplicata por telefone | **pass** | `queue.test.ts` `"bloqueia entrada duplicada"` |
| 3 | Owner chama → `calling` + som | manual | Status testado; áudio no owner (`QueueManagement.tsx` L104–105). Cliente: `QueueStatus.tsx` cria `audioRef` mas **nunca chama `.play()`** |
| 4 | Timeout calling → waiting | **pass** | `queue.test.ts` `resetExpiredCallingEntries` |
| 5 | Finalização atômica RPC | **pass** | `queue.test.ts` `finishQueueEntry`; migration `20260530_finish_queue_entry_atomic.sql` |
| 6 | Rollback on finance INSERT fail | manual | Transação SQL only — sem simulação de falha |
| 7 | RPC anti-spoofing tenant | manual | SQL checks `business_id = get_auth_company_id()` — sem teste automatizado |
| 8 | Não comparecimento `no_show` | manual | `QueueManagement.tsx` L298 — sem unit test |
| 9 | Tempo estimado 3×20 min | **pass** | `queue.test.ts` `calcEstimatedWaitMinutes(3) === 60` |
| 10 | Fallback polling 10s | **pass** | `hooks/useQueueStatus.ts` `refetchInterval: 10_000` |

---

## 07-finance.feature — **manual**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Staff vê só `professional_id` próprio | **pass** | `finance.test.ts` `filterStaffTransactions`; `Finance.tsx` L183, L219 |
| 2 | Staff não vê Comissões/Histórico/Insights | manual | `Finance.tsx` L420–428 oculta tabs — verificar UI |
| 3 | Comissão com maquininha | **pass** | `finance.test.ts` `calcCommission` → base 97, value 38.8 |
| 4 | Settlement day 31 em abril | **pass** | `finance.test.ts` `calcSettlementDate(2026, 3, 31)` → day 30 |
| 5 | Pagar comissões em lote | manual | `CommissionsManagement.tsx` L296 `mark_commissions_as_paid` — sem teste |
| 6 | Transação manual expense | manual | `createFinanceRecord` em `finance.ts` — sem teste |
| 7 | Deletar receita deleta appointment | **pass** | `finance.test.ts` `deleteFinanceTransaction` |
| 8 | Export CSV Histórico | manual | `Finance.tsx` L282–297 — sem teste |
| 9 | Region BR — R$, PIX | **pass** | `CheckoutModal.tsx` L132–136; `Finance.tsx` L559–562 |
| 10 | Region PT — EUR, MBWay | **pass** | `CheckoutModal.tsx` L125–128 |

---

## 08-crm.feature — **pass**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | 8 visitas → Silver | **pass** | `crm.test.ts` `calcLoyaltyTier(8)` |
| 2 | 3 visitas → Bronze | **pass** | `crm.test.ts` |
| 3 | 35 visitas → Platinum | **pass** | `crm.test.ts` |
| 4 | Deduplicação telefone | **pass** | `crm.test.ts` `phonesMatch`, `createClient` rejects duplicate |
| 5 | Sync `public_clients` → CRM | **pass** | `crm.test.ts` `syncPublicClientsToCrm` |

---

## 09-staff-permissions.feature — **manual**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Staff não acessa `/fila` | manual | `App.tsx` `OwnerRouteGuard` L117–125 — sem teste |
| 2 | Staff vê só seus agendamentos | **pass** | `scheduling.ts` L230–231 staff filter; `useScheduling.test.ts` |
| 3 | Staff não cancela `Completed` | manual | `Agenda.tsx` L447–449 — sem teste |
| 4 | Financeiro por `professional_id` | **pass** | `finance.test.ts`, `Finance.tsx` |
| 5 | Multi-tenant isolation | manual | RLS migrations — sem teste cross-tenant app |
| 6 | RPC anti-spoofing | manual | Migrations RPC ownership checks — sem prova automatizada |

---

## 10-products.feature — **fail**

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Cadastrar produto `is_active=true` | **pass** | `catalog.test.ts` `createProduct`; `pages/Products.tsx` |
| 2 | Venda avulsa + estoque + `product_sales` | **pass** | `catalog.test.ts` `sellProduct` RPC |
| 3 | Estoque insuficiente | manual | SQL raises `insufficient_stock`; `Products.tsx` L66–68 — sem unit test |
| 4 | Produto vinculado a atendimento | **fail** | `sell_product` aceita `p_appointment_id` (`catalog.ts` L78–81) mas **nenhuma UI** passa `appointmentId` (`CheckoutModal`, `Agenda`, `Products.tsx` usam `null`) |
| 5 | Staff vende, não edita catálogo | **pass** | `Products.tsx` guards `isOwner`; `docs/v1/security-products.md` |
| 6 | RLS multi-tenant | manual | `catalog.test.ts` filtra `company_id`; prova completa em `security-products.md` |
| 7 | RPC anti-spoofing tenant | manual | `security-products.md` — owner Y não vende produto tenant X |

---

## Gaps prioritários

| Prioridade | Gap | Arquivo | Ação sugerida |
|------------|-----|---------|---------------|
| P0 | Wizard 5-step vs 2-step em `/onboarding` | 02 | Alinhar spec com produto ou redirecionar login para `/onboarding-wizard` |
| P0 | Auto-atribuição no `AppointmentWizard` | 03 | Portar lógica de `Agenda.tsx` / `PublicBooking.tsx` para o wizard |
| P1 | Venda de produto vinculada a atendimento | 10 | UI no checkout/agenda passando `appointmentId` para `sell_product` |
| P2 | Som de notificação no cliente (`QueueStatus`) | 06 | Chamar `audioRef.current?.play()` quando status → `calling` |
| P2 | Trial/subscription unit tests | 01 | Testar `isSubscriptionActive` |
| P3 | 28 cenários **manual** | vários | Checklist E2E abaixo |

---

## Checklist manual (Q2 / pós-launch)

- [ ] Login redirects: owner → `/` ou `/onboarding`; staff → `/staff-onboarding`
- [ ] Staff bloqueado em `/fila`, `/configuracoes`, marketing
- [ ] Booking público E2E (`/book/:slug`)
- [ ] Fila: join → status → owner chama → cliente vê `calling` + som
- [ ] Comissões: pagamento em lote em `CommissionsManagement`
- [ ] Produto: venda com estoque insuficiente (mensagem UI)
- [ ] Cross-tenant: `finish_queue_entry`, `sell_product` (Supabase)

---

## Veredicto Q1

Validação **concluída** com evidência documentada. **2 arquivos pass**, **6 manual**, **3 fail** (4 cenários bloqueadores). Suite automatizada verde (227/227). Paridade funcional completa **não** atingida — gaps P0/P1 devem ser endereçados antes de fechar v1.0.
