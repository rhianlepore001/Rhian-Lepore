# Story: Finalização das lacunas de hooks/specs da migração v1.0

## Status

**Parcial — C1–C5 concluídos · Fase 10 (Q1/Q2) pendente**

Atualizado em 2026-06-07 (tarefa C6).

---

## Resumo executivo

A migração Strangler Fig avançou das Fases 0–9 para um estado **launch-ready parcial**:

| Sprint | Tarefa | Resultado |
|--------|--------|-----------|
| C1 | Agenda → `useScheduling` + `services/scheduling` | ✅ 0 `from/rpc` na página (Realtime ok) |
| C2 | `pages/Products.tsx` + rota `/produtos` | ✅ UI + `useCatalog` |
| C3 | ServiceSettings, RecycleBin, Reports, QueueStatus | ✅ 0 `from/rpc` (Realtime em QueueStatus ok) |
| C4 | `lib/onboarding.ts` → `services/onboarding.ts` | ✅ Single path |
| C5 | Testes de hook | ✅ `useQueue`, `usePublicBooking`, `useScheduling` |

**Pendente para v1.0 fechada:** paridade Q1, polish Q2, rodada 2 de migração (CommissionsSettings, ClientArea, CRM, etc.).

---

## Contexto (estado anterior — superado)

> O diagnóstico abaixo descrevia o código **antes** de C1–C5. Mantido como histórico.

- `pages/Agenda.tsx` era monolítica com Supabase direto → **migrada (C1)**.
- `pages/Finance.tsx` misturava service e página → **migrada (baseline Fase 5)**.
- `pages/PublicBooking.tsx` e `QueueManagement.tsx` → **migradas (baseline Fases 3–4)**; Realtime permanece na página.
- Produtos v1 sem rota → **resolvido (C2)**.
- ServiceSettings/Reports/RecycleBin/QueueStatus com Supabase direto → **resolvido (C3)**.
- Onboarding dual-path → **resolvido (G1 + C4)**.

---

## Matriz de migração — páginas críticas

Legenda: ✅ migrado · 🟡 parcial (Realtime/auth/storage justificado) · ❌ pendente

| Página / componente | Service | Hook | `from/rpc` na UI | Notas |
|---------------------|---------|------|------------------|-------|
| `Agenda.tsx` | `scheduling.ts` | `useScheduling.ts` | ✅ (só Realtime) | Delete via RPC `delete_appointment_with_finance` |
| `Finance.tsx` | `finance.ts` | `useFinance.ts` | ✅ | — |
| `PublicBooking.tsx` | `publicBooking.ts` | `usePublicBooking.ts` | 🟡 Realtime | — |
| `QueueManagement.tsx` | `queue.ts` | `useQueue.ts` | 🟡 Realtime | — |
| `QueueStatus.tsx` | `queue.ts` | `useQueueStatus.ts` | 🟡 Realtime | Queries/RPC movidas para service |
| `Products.tsx` | `catalog.ts` | `useCatalog.ts` | ✅ | Rota `/#/produtos` |
| `ServiceSettings.tsx` | `serviceSettings.ts` | `useServiceSettings.ts` | ✅ | Tenant: `companyId ?? user.id` |
| `ServiceModal.tsx` | `serviceSettings.ts` | hooks do domínio | ✅ | Storage via service |
| `RecycleBin.tsx` | `recycleBin.ts` | `useRecycleBin.ts` | ✅ | RPCs tipadas |
| `Reports.tsx` | `dashboard.ts` | `useReports.ts` | ✅ | `selectedMonth/Year` ainda não filtra RPC |
| `Dashboard.tsx` | `dashboard.ts` | `useDashboardData.ts` | ❌ | 2 queries diretas restantes |
| `ClientCRM.tsx` | `crm.ts` | `useCrm.ts` | ❌ | Hook existe; página não consome |
| `Clients.tsx` | parcial | parcial | ❌ | Lista + upload direto |
| `ClientArea.tsx` | — | — | ❌ | Rodada 2 (G5) |
| `QueueJoin.tsx` | parcial | parcial | ❌ | Join público |
| `CommissionsSettings.tsx` | parcial | parcial | ❌ | Rodada 2 (G5) |
| `CommissionsManagement.tsx` | — | — | ❌ | RPC direto no componente |
| Onboarding steps | parcial | `useOnboardingState` | ❌ | `StepServices`, `StepTeam`, `StepBusinessHours` |

### Bordas justificadas (não migrar na v1)

- **Auth:** `Login`, `Register`, `ForgotPassword`, `UpdatePassword` — `supabase.auth.*`
- **Storage/upload:** `GeneralSettings`, fotos em CRM/Clients — `supabase.storage`
- **Edge Functions:** `SubscriptionSettings` — `supabase.functions.invoke`
- **Realtime:** `Agenda`, `PublicBooking`, `QueueManagement`, `QueueStatus`, `ClientArea` — `supabase.channel()`

---

## Services e hooks — inventário atual

### Services (`services/`)

| Arquivo | Domínio | Teste |
|---------|---------|-------|
| `scheduling.ts` | Agenda, checkout, delete atômico | ✅ `test/services/scheduling.test.ts` |
| `queue.ts` | Fila + status público | ✅ `test/services/queue.test.ts` |
| `finance.ts` | Financeiro | ✅ `test/services/finance.test.ts` |
| `publicBooking.ts` | Booking público | ✅ `test/services/publicBooking.test.ts` |
| `crm.ts` | CRM | ✅ `test/services/crm.test.ts` |
| `catalog.ts` | Produtos | ✅ `test/services/catalog.test.ts` |
| `onboarding.ts` | Onboarding (canônico pós-C4) | ✅ `test/services/onboarding.test.ts` |
| `dashboard.ts` | Dashboard + Reports/insights | parcial |
| `settings.ts` | Configurações | parcial |
| `team.ts` | Equipe | parcial |
| `serviceSettings.ts` | Serviços/categorias/upsells | — (C3) |
| `recycleBin.ts` | Lixeira | — (C3) |

### Hooks com TanStack Query (`hooks/`)

| Hook | Cobertura de teste |
|------|-------------------|
| `useScheduling.ts` | ✅ `test/hooks/useScheduling.test.ts` |
| `useQueue.ts` | ✅ `test/hooks/useQueue.test.ts` |
| `usePublicBooking.ts` | ✅ `test/hooks/usePublicBooking.test.ts` |
| `useFinance.ts` | — |
| `useCatalog.ts` | — |
| `useDashboardData.ts` | parcial (`useDashboardData.test.tsx` legado) |
| `useOnboardingState.ts` | ✅ `test/hooks/useOnboardingState.test.ts` |
| `useSettings.ts` / `useTeam.ts` | parcial |
| `useServiceSettings.ts` | — (C3) |
| `useRecycleBin.ts` | — (C3) |
| `useReports.ts` | — (C3) |
| `useQueueStatus.ts` | — (C3) |

---

## Escopo por fase — progresso

### Fase 1 - Auth/Onboarding

- [x] Service canônico `services/onboarding.ts` (C4)
- [x] Sync flags G1 (`onboarding_progress` vs `business_settings`)
- [x] `useOnboardingState` sem Supabase direto
- [ ] Onboarding wizard steps (`StepServices`, `StepTeam`, `StepBusinessHours`) ainda com `from/rpc`

### Fase 2 - Agenda/Checkout

- [x] `pages/Agenda.tsx` → `useScheduling` (C1)
- [x] RPC `delete_appointment_with_finance` (G3)
- [x] Realtime na página (permitido)

### Fase 3 - Booking Público

- [x] `PublicBooking.tsx` → `usePublicBooking` (baseline)
- [x] Realtime na página

### Fase 4 - Fila

- [x] `QueueManagement.tsx` → `useQueue` (baseline)
- [x] `QueueStatus.tsx` → `useQueueStatus` + `services/queue.ts` (C3)
- [ ] `QueueJoin.tsx` — Supabase direto

### Fase 5 - Financeiro/Comissões

- [x] `Finance.tsx` migrado (baseline)
- [ ] `CommissionsSettings.tsx`, `CommissionsManagement.tsx`

### Fase 6 - CRM

- [ ] `ClientCRM.tsx`, `Clients.tsx` — hook existe, página não migrada

### Fase 7 - Dashboard

- [x] `useDashboardData` + `services/dashboard.ts` (maioria)
- [x] `Reports.tsx` → `useReports` (C3)
- [ ] `Dashboard.tsx` — 2 queries diretas
- [ ] `StaffInsights.tsx`

### Fase 8 - Configurações

- [x] `ServiceSettings` + `ServiceModal` (C3)
- [x] `RecycleBin` (C3)
- [x] Team/Settings hooks em uso parcial
- [ ] `CommissionsSettings` (rodada 2)

### Fase 9 - Produtos

- [x] `pages/Products.tsx` + rota lazy (C2)
- [x] RLS auditado (G4)

### Fase 10 - Polish/QA/Lançamento

- [ ] Q1 — paridade 10 `.feature` → `docs/v1/PARITY-REPORT.md`
- [ ] Q2 — polish UI pós O1/O5
- [x] typecheck + lint + build verdes (2026-06-07)
- [ ] test 227/227 estável (1 flaky em `Login.test.tsx` — timeout)

---

## Critérios de aceite — checklist v1.0

- [x] Agenda sem `supabase.from/rpc` (exceto Realtime)
- [x] Produtos com UI + rota
- [x] G1–G4 fechados (onboarding, delete atômico, RLS produtos, inventário G5)
- [ ] 10 parity `.feature` validados (Q1)
- [ ] typecheck + lint + test verdes (test: 226/227 — flaky Login)

---

## Rodada 2 recomendada (pós-launch ou C7)

Prioridade conforme `docs/v1/supabase-direct-pages.md`:

1. `CommissionsSettings.tsx` + `CommissionsManagement.tsx`
2. `ClientArea.tsx`
3. `ClientCRM.tsx` + `Clients.tsx`
4. `QueueJoin.tsx`
5. Onboarding steps (`StepServices` → reutilizar `useServiceSettings`)
6. `Dashboard.tsx` / `StaffInsights.tsx` — eliminar queries diretas restantes

---

## Plano de testes obrigatório

```bash
npm run typecheck   # ✅ 2026-06-07
npm run lint        # ✅ 2026-06-07
npm run build       # ✅ 2026-06-07
npm test -- --run   # ⚠️ 226/227 (Login.test.tsx timeout flaky)
```

---

## Dev Agent Record

### Agent Model Used

Composer 2.5 (C6 — atualização documental pós C1–C5)

### Completion Notes List

- Story saiu de **Draft** para **Parcial — C1–C5 concluídos**.
- Matriz de migração reflete grep real em `pages/` e `components/` (2026-06-07).
- C3 adicionou 4 services/hooks novos sem alterar banco.
- Tenant pattern documentado: `companyId ?? user.id` nas rotas autenticadas.
- Realtime permanece nas páginas conforme regra v1 (`supabase.channel()` permitido).
- Próximo passo crítico: **Q1** (paridade Gherkin) em chat paralelo.

### File List (C1–C5 + C3)

**Novos / alterados na migração:**

- `services/scheduling.ts`, `hooks/useScheduling.ts`, `pages/Agenda.tsx`
- `services/catalog.ts`, `hooks/useCatalog.ts`, `pages/Products.tsx`, `App.tsx`
- `services/onboarding.ts`, `hooks/useOnboardingState.ts`
- `services/serviceSettings.ts`, `hooks/useServiceSettings.ts`
- `services/recycleBin.ts`, `hooks/useRecycleBin.ts`
- `services/dashboard.ts` (+ `fetchClientInsights`), `hooks/useReports.ts`
- `services/queue.ts` (+ status público), `hooks/useQueueStatus.ts`
- `types/serviceSettings.ts`, `types/recycleBin.ts`, `types/dashboard.ts` (+ ClientInsights)
- `pages/settings/ServiceSettings.tsx`, `components/ServiceModal.tsx`
- `pages/settings/RecycleBin.tsx`, `pages/Reports.tsx`, `pages/QueueStatus.tsx`
- `test/hooks/useScheduling.test.ts`, `useQueue.test.ts`, `usePublicBooking.test.ts`
- `supabase/migrations/20260607_delete_appointment_with_finance.sql`
- `supabase/migrations/20260607_sync_onboarding_flags.sql`
- `docs/v1/supabase-direct-pages.md`, `docs/v1/security-products.md`

### Change Log

| Data | Agente | Mudança |
|------|--------|---------|
| 2026-06-07 | C6 | Story atualizada com status real pós C1–C5; matriz de migração; rodada 2 documentada |

---

## Referências

- Taskboard v1 (arquivado): `docs/v1/TASKBOARD.md`
- Inventário Supabase direto: `docs/v1/supabase-direct-pages.md`
- Paridade: `_reversa_sdd/migration/parity_tests/*.feature`
- Prompts v1 (arquivado): `docs/archive/v1/prompts/README.md`
