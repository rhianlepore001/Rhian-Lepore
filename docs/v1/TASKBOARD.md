# AgendiX v1.0 — Taskboard (ARQUIVADO)

> **Ciclo v1.0 concluído.** Este board é histórico — não use como backlog ativo. Fonte atual: `graphify-out/GRAPH_REPORT.md` + `specs/active/`.

~~Atualize **Status** ao concluir cada tarefa. Prompts arquivados em `docs/archive/v1/prompts/`.~~

**Legenda:** `todo` | `doing` | `done` | `blocked`

---

## Onda 1 — Paralelo

| ID | Papel | Modelo | Tarefa | Status | Depende |
|----|-------|--------|--------|--------|---------|
| O1 | UI | Opus | Audit visual páginas críticas → atualizar `SPEC-ui-audit.md` | done | — |
| G1 | DB | GPT 5.5 | Unificar onboarding (G1) — sync flags, depreciar gate legado | done | — |
| C4 | Ship | Composer | Consolidar `lib/onboarding.ts` → `services/onboarding.ts` | done | G1 |

---

## Onda 2 — Agenda + design

| ID | Papel | Modelo | Tarefa | Status | Depende |
|----|-------|--------|--------|--------|---------|
| G3 | DB | GPT 5.5 | RPC delete appointment atômico (substituir 2 deletes na Agenda) | done | — |
| C1 | Ship | Composer | Sprint 4 Agenda — `useAppointments` + mutations, 0 supabase direto | done | G3 |
| O2 | UI | Opus | Spec visual página **Produtos v1** | done | — |
| O3 | UI | Opus | Wireflow **Dashboard Colaborador** (spec colaboradores) | done | — |

---

## Onda 3 — Produtos + polish

| ID | Papel | Modelo | Tarefa | Status | Depende |
|----|-------|--------|--------|--------|---------|
| G4 | DB | GPT 5.5 | Auditar RLS `products` + `product_sales` | done | O2 |
| C2 | Ship | Composer | `pages/Products.tsx` + rota `/produtos` | done | O2, G4 |
| C3 | Ship | Composer | Migrar Supabase direto: ServiceSettings, RecycleBin, Reports, QueueStatus | done | G5 |
| G5 | DB | GPT 5.5 | Inventário + prioridade páginas com supabase direto | done | — |
| C5 | Ship | Composer | Testes hook: useQueue, usePublicBooking, useScheduling | done | C1 |
| O5 | UI | Opus | Revisão mobile-first telas críticas | done | O1 |

---

## Fase 10 — Launch

| ID | Papel | Modelo | Tarefa | Status | Depende |
|----|-------|--------|--------|--------|---------|
| C6 | Ship | Composer | Atualizar `v1-hooks-migration-completion.md` | done | C1–C5 |
| Q1 | QA | Você + Composer | Validar 10 `.feature` de paridade (manual ou Playwright) | done | C1, C2 |
| Q2 | QA | Opus | Polish final pós-audit O1/O5 | done | Q1 |

---

## Já concluído (baseline)

| Item | Evidência |
|------|-----------|
| Fase 3 Booking público | `PublicBooking.tsx` sem queries diretas |
| Fase 4 Fila gestão | `QueueManagement.tsx` migrado |
| Fase 5 Financeiro | `Finance.tsx` migrado; G4 no service |
| G2 Fila atômica | `finish_queue_entry` em `services/queue.ts` |
| Data layer Produtos | `catalog.ts`, migration SQL, testes |
| Testes | 227 passando |
| C5 Testes hooks | `test/hooks/useQueue.test.ts`, `usePublicBooking.test.ts`, `useScheduling.test.ts` |

---

## Handoffs

| ID | Para | Nota | Arquivos |
|----|------|------|----------|
| G1 | C4 | Fonte canônica do onboarding é `onboarding_progress.is_completed`; `business_settings.onboarding_completed` fica como espelho temporário via migration/trigger. C4 deve consolidar chamadas restantes em `services/onboarding.ts`. | `supabase/migrations/20260607_sync_onboarding_flags.sql`, `contexts/AlertsContext.tsx`, `_reversa_sdd/gaps.md` |
| G3 | C1 | Usar `delete_appointment_with_finance(p_appointment_id)` no lugar dos deletes client-side em `Agenda.tsx`. A RPC só permite owner autenticado do agendamento, só para histórico (`Completed`/`Cancelled`) e apaga `finance_records` + `appointments` atomicamente. | `supabase/migrations/20260607_delete_appointment_with_finance.sql`, `pages/Agenda.tsx` |
| G4 | C2 | RLS de `products`/`product_sales` aprovado. Staff pode ler ativos e vender via RPC, mas não cria/edita catálogo; owner de outro tenant não lê nem vende. `sell_product` foi ajustada para preencher `finance_records.barber_name`. | `docs/v1/security-products.md`, `supabase/migrations/20260603_products_v1.sql`, `services/catalog.ts` |
| G5 | C3 | Prioridade C3: `ServiceSettings` + `ServiceModal`, `RecycleBin`, `Reports`, `QueueStatus`. `CommissionsSettings` e `ClientArea` ficam como rodada seguinte. | `docs/v1/supabase-direct-pages.md` |
| C2 | Q1 | Tela `/produtos` implementada: lista, cadastro/edição (owner), venda avulsa (owner+staff), estoque baixo, erros RPC mapeados. Staff oculta custo/margem e ações de catálogo. | `pages/Products.tsx`, `App.tsx`, `constants.ts` |
| C3 | — | Migração C3 concluída: 0 `supabase.from/rpc` em ServiceSettings, ServiceModal, RecycleBin, Reports, QueueStatus. Realtime mantido em QueueStatus. Tenant via `companyId ?? user.id`. | `services/serviceSettings.ts`, `services/recycleBin.ts`, `hooks/useServiceSettings.ts`, `hooks/useRecycleBin.ts`, `hooks/useReports.ts`, `hooks/useQueueStatus.ts`, `services/dashboard.ts`, `services/queue.ts` |
| Q2 | Composer | Polish final: P0 mojibake corrigido + `ui/Toast` canônico criado (destrava T2). Resto itemizado em 5 lotes (T1/T2/T3, mobile O5, paridade UI) para o Composer executar. | `components/ui/Toast.tsx`, `components/ui/index.ts`, `App.tsx`, `pages/Agenda.tsx`, `docs/v1/Q2-POLISH-HANDOFF.md` |
| SHIP | Composer | v1-ship: onboarding → `/onboarding-wizard`, auto-atribuição wizard, sell_product+appointmentId no checkout, T2 toast/confirm, QueueStatus som, 227/227 | `docs/v1/EAGLE-REVIEW.md`, `Login.tsx`, `AppointmentWizard.tsx`, `CheckoutModal.tsx`, `ConfirmModal.tsx` |
| UI-S4 | Ship | `/ui-audit code` S4 Login — 4 modos, sem `isBeauty`/hardcode, erro via `mapError` | done | `pages/Login.tsx`, `utils/mapError.ts`, `test/pages/Login.test.tsx` |
| UI-S5 | Ship | `/ui-audit code` S5 Dashboard — PageHeader+hero KPI, ≤3 secundários, banners `ui/Card`, 0 `BrutalCard` em dashboard/* | done | `pages/Dashboard.tsx`, `components/dashboard/*` |
| UI-S6 | Ship | `/ui-audit code` S6 Agenda — PageHeader, TimeGrid density, sticky 44px, mapError+toast retry, 0 Brutal* | done | `pages/Agenda.tsx`, `components/TimeGrid.tsx`, `components/AppointmentWizard.tsx` |
| UI-S7 | Ship | `/ui-audit code` S7 Financeiro — ui/Table+EmptyState, 0 BrutalCard, PageHeader+KPI tabular, modais comissão ui/Modal full | done | `pages/Finance.tsx`, `components/FinanceInsights.tsx`, `components/ui/Table.tsx`, `components/CommissionsManagement.tsx` |
| UI-S8 | Ship | `/ui-audit code` S8 Playbook deferred — guia Clients/Public Booking/Settings/Onboarding + spec EmptyState Clients | done | `.ui-audit/20260610_120000/DEFERRED-MIGRATION-PLAYBOOK.md`, `quick-wins/clients-empty-state.md` |
| UI-CLOSEOUT | Ship | Backlog user stories fechamento audit | done | `.ui-audit/20260610_120000/USER-STORIES-CLOSEOUT.md`, `verification/SMOKE-MATRIX.md` |
| UI-AUDIT-CLOSE | Ship | Encerramento audit run 20260610_120000 | done | `.ui-audit/20260610_120000/UI-REMEDIATION-SPEC.md` §13 |
| UI-CRITIQUE | Ship | Impeccable critique remediation — side-stripe em todo repo (0 border-l-4), dashboard distill, finance charts | done | `pages/*`, `components/*` (9 arquivos) |

---

## Critério v1.0 fechada

- [x] Agenda sem `supabase.from/rpc` (exceto Realtime)
- [x] Produtos com UI + rota
- [x] G1–G4 fechados
- [x] 10 parity `.feature` validados → `docs/v1/PARITY-REPORT.md` (gaps P0/P1 fechados em v1-ship)
- [x] typecheck + lint + build verdes
- [x] test 227/227 estável
