# Fila Digital v2 — Tasks

**Spec:** `spec.md` · **Design:** `design.md` · **Context:** `context.md`  
**Status:** In Progress — T1–T15 no código; DevOps aplica migration antes do deploy  
**Gates do repo:** `npm run typecheck` · `npm run lint` · `npm run build` · `npm test`  
**Testes:** Vitest (unit) nas camadas types/services/hooks; E2E Playwright na fatia de UI (T15). Sem `TESTING.md` no repo — matriz abaixo.

| Camada | Teste exigido |
|--------|----------------|
| types / função pura | unit |
| services | unit |
| hooks | unit |
| migration SQL | review + unit da fórmula/contrato no service |
| páginas / componentes UI | unit leve se já houver padrão; e2e na tarefa que fecha o fluxo |
| só copy/rota | typecheck |

---

## Execution Plan

```
Phase 1 — Fundação (sequencial)
  T1 → T2 → T3 → T4 → T5

Phase 2 — Cliente (após T4 + T14; T5 só no board)
  T14 + T4 → T6 → T7 → T8
  T5 → T8 (board)

Phase 3 — Staff (paralelo após T5; T10 depois de T9)
  T5 ─┬→ T9 [P]
      ├→ T11 [P]
      └→ T12 [P]
           T9 + T10 + T11 + T12 → T13

Phase 4 — Fechamento
  T8 + T13 → T14 → T15
```

T6 depende de T4 + T14 (não de T5). T7 depende de T6; redirect de `/queue-status` entra em T7. T8 é só aba + panel (usa T5). T10 depende de T9. T13 integra a página staff.

---

## Task Breakdown

### T1: Tipos e schemas Zod da fila v2

**What:** Estender `types/queue.ts` com modo, pagamento, ticket, settings, board DTO (sem telefone), inputs de join/manual/settle.  
**Where:** `types/queue.ts`  
**Depends on:** None  
**Reuses:** `paymentMethodSchema` / `checkoutPaymentMethodSchema`  
**Requirement:** FILA-01, FILA-05, FILA-07  

**Done when:**

- [ ] Schemas cobrem `QueueMode`, `QueuePaymentStatus`, `QueueTicketStatus`, `QueueSettings`, `QueuePublicBoard`, `JoinQueueInput` com serviço + pagamento
- [ ] `QueuePublicBoard` não tem `client_phone`
- [ ] Typecheck limpo no arquivo

**Tests:** unit (parse Zod dos casos válidos/inválidos)  
**Gate:** `npm test -- test/types/queue.test.ts` (criar) + typecheck  
**Commit:** `adiciona tipos da fila digital v2`

---

### T2: Fórmula de ETA (puro)

**What:** `calcQueueEtaMinutes` — simulação de cadeiras, não média.  
**Where:** `services/queueEta.ts`  
**Depends on:** T1  
**Reuses:** nenhum (puro)  
**Requirement:** FILA-03  

**Done when:**

- [ ] Shared: ordena `joined_at, id`; 1 serving por cadeira; restante = `max(duration - elapsed, 0)`
- [ ] `per_professional`: 1 cadeira daquele pro
- [ ] Zero cadeiras → `null` (não inventa 1)
- [ ] Testes: 2×30 min + 1 staff livre shared ≈ 30 para o 2º; serving ocupa cadeira; per_pro não mistura filas

**Tests:** unit  
**Gate:** `npm test -- test/services/queueEta.test.ts`  
**Commit:** `adiciona cálculo de ETA da fila por cadeiras`

---

### T3: Migration schema + RLS + RPCs

**What:** Uma migration com colunas, `queue_payments`, settings, DROP insert público, policies, RPCs do design.  
**Where:** `supabase/migrations/20260906000001_queue_v2.sql`  
**Depends on:** T1  
**Reuses:** `normalize_phone_digits`, `get_auth_company_id`, `finish_queue_entry` (vira wrapper)  
**Requirement:** FILA-01, FILA-05, FILA-06, FILA-07  

**Done when:**

- [ ] Colunas novas + `queue_payments` + settings em `business_settings`
- [ ] `DROP POLICY "Public can join queue"`; `DROP POLICY "Queue: company isolation"`; staff UPDATE direto removido/SELECT-only
- [ ] RPCs: join, board, add_manual, update_status, confirm/cancel pay, set_mode, settings, close, settle
- [ ] `SET search_path = public`; `REVOKE ALL FROM PUBLIC`; grants explícitos
- [ ] `finish_queue_entry` delega a `settle_queue_ticket`
- [ ] Lock tenant em join + set_mode; `FOR UPDATE` nas mutations
- [ ] **Não aplica no banco remoto nesta tarefa** (arquivo versionado)

**Tests:** none (SQL); contratos cobertos em T4  
**Gate:** arquivo presente; typecheck inalterado  
**Commit:** `adiciona migration da fila digital v2`

---

### T4: Services da fila (RPCs + testes)

**What:** Trocar insert direto por RPCs; board, settings, pay, close, settle; `joinQueue` deixa de escrever na tabela.  
**Where:** `services/queue.ts`, `test/services/queue.test.ts`  
**Depends on:** T1, T2, T3  
**Reuses:** padrão de mock `supabase.rpc` já no teste  
**Requirement:** FILA-01, FILA-03, FILA-04, FILA-07, FILA-09  

**Done when:**

- [ ] `joinQueue` / `addManualQueueEntry` / `updateQueueStatus` / `finishQueueEntry` chamam RPC
- [ ] Novos: `fetchQueuePublicBoard`, `confirmQueuePayment`, `cancelQueuePayment`, `closeQueueTicket`, `settleQueueTicket`, `fetchQueueSettings`, `updateQueueSettings`, `setQueueMode`
- [ ] Mutations autenticadas **não** recebem `user.id` como tenant
- [ ] Testes existentes passam; novos cobrem RPC names + board DTO

**Tests:** unit  
**Gate:** `npm test -- test/services/queue.test.ts`  
**Commit:** `liga services da fila às RPCs v2`

---

### T5: Hooks da fila v2

**What:** Hooks para board, settings, confirm pay, close/settle, comandas.  
**Where:** `hooks/useQueue.ts`, `hooks/useQueueBoard.ts`, `test/hooks/useQueue.test.ts`  
**Depends on:** T4  
**Reuses:** TanStack já em `useQueue.ts`  
**Requirement:** FILA-02, FILA-05, FILA-06  

**Done when:**

- [ ] `useQueueBoard(businessId, phone)` poll 10s waiting / 5s calling|serving
- [ ] `useQueueSettings` / `useSetQueueMode` (owner)
- [ ] `useConfirmQueuePayment`, `useCancelQueuePayment`, `useCloseQueueTicket`, `useSettleQueueTicket`
- [ ] Invalidam `['queue', …]`

**Tests:** unit  
**Gate:** `npm test -- test/hooks/useQueue.test.ts`  
**Commit:** `adiciona hooks da fila digital v2`

---

### T6: Steps de serviço e pagamento (cliente) [P]

**What:** `QueueServiceStep` (catálogo público) + `QueuePayStep` (clube / balcão / Pix|MB WAY).  
**Where:** `components/queue/QueueServiceStep.tsx`, `components/queue/QueuePayStep.tsx`  
**Depends on:** T4, T14  
**Reuses:** `fetchPublicServices/Categories`, `PixDisplay`/`MbwayDisplay`, `useBrutalTheme`, `computeSubscriptionDiscount`  
**Requirement:** FILA-01, FILA-07, FILA-08  

**Done when:**

- [ ] Serviço igual booking (categoria + preço + duração)
- [ ] Assinante elegível vê 3 opções; teto estourado esconde clube
- [ ] Pix: copy “Aguarde a confirmação do pagamento.”
- [ ] Sem `isBeauty ? hex`; alvos ≥ 44px

**Tests:** unit (elegibilidade das opções de pagamento, função pura extraída)  
**Gate:** typecheck + teste da função de opções  
**Commit:** `adiciona steps de serviço e pagamento da fila`

---

### T7: Wizard QR `QueueJoin`

**What:** Fluxo serviço → identidade (`PublicClientContext`) → pagamento → `joinQueue` → `/minha-area/:slug?tab=fila`.  
**Where:** `pages/QueueJoin.tsx`  
**Depends on:** T6  
**Reuses:** `PhoneInput`, gate da ClientArea  
**Requirement:** FILA-01  

**Done when:**

- [ ] Logado na casa pula cadastro
- [ ] `?pro=` fixa profissional (sem seletor)
- [ ] Tema `data-theme`/`data-mode` como ClientArea
- [ ] Pro inativo: recusa com copy da casa (não “recepção”)
- [ ] `/queue-status/:id` redireciona para `/minha-area/:slug?tab=fila`

**Tests:** none (fluxo coberto no e2e T15)  
**Gate:** typecheck  
**Commit:** `reescreve entrada da fila pelo QR`

---

### T8: Aba Fila na Minha Área + recovery + redirect

**What:** `ClientQueuePanel` + tab Fila em `ClientArea`.  
**Where:** `components/queue/ClientQueuePanel.tsx`, `pages/ClientArea.tsx`  
**Depends on:** T5, T7  
**Reuses:** gate telefone da ClientArea  
**Requirement:** FILA-02, FILA-09  

**Done when:**

- [ ] Sem senha ativa e sem ter vindo do QR: aba bloqueada (copy da casa)
- [ ] Senha ativa por telefone destrava (limpar storage não perde a vez)
- [ ] Posição + primeiros nomes + política + ETA
- [ ] Sair da fila → ConfirmModal

**Tests:** unit do painel (estados bloqueado/ativo) se houver RTL no projeto; senão e2e T15  
**Gate:** typecheck  
**Commit:** `adiciona fila na área do cliente`

---

### T9: Card operacional do staff [P]

**What:** `QueueStaffCard` — labels, badges de pagamento, chamar / iniciar / confirmar Pix.  
**Where:** `components/queue/QueueStaffCard.tsx`  
**Depends on:** T5  
**Reuses:** tokens `status.*`, Button  
**Requirement:** FILA-05, FILA-07, FILA-08  

**Done when:**

- [ ] Primário “Iniciar atendimento” (`waiting→serving`); secundário “Chamar cliente”
- [ ] Badge: Pago / Clube / Pagar no balcão / Aguardando confirmação e pagamento
- [ ] Ação confirmar/cancelar Pix pendente (vira balcão)
- [ ] `companyId` — nunca `user.id`
- [ ] Alvos ≥ 44px, sem ícone solto como única ação

**Tests:** unit (mapeamento status → ações)  
**Gate:** typecheck + teste do mapper  
**Commit:** `adiciona card operacional da fila`

---

### T10: Checkout sheet + lista Comandas

**What:** Fechar comanda (editar itens ou só salvar) e lista `ticket_status=open`.  
**Where:** `components/queue/QueueCheckoutSheet.tsx`, `components/queue/QueueComandasList.tsx`  
**Depends on:** T9  
**Reuses:** blocos de `CheckoutModal` (métodos, produtos, receivedBy)  
**Requirement:** FILA-05  

**Done when:**

- [ ] paid/membership: banner “Pagamento já registrado”
- [ ] Finalizar chama `settle`; só fechar chama `close`
- [ ] Comandas editam serviços extras + produtos e settle depois
- [ ] Grava profissional logado

**Tests:** unit do payload settle/close  
**Gate:** typecheck + teste payload  
**Commit:** `adiciona fechamento de comanda da fila`

---

### T11: Entrada manual [P]

**What:** `QueueManualAddSheet` — staff/dono, pagamento estilo checkout.  
**Where:** `components/queue/QueueManualAddSheet.tsx`  
**Depends on:** T5  
**Reuses:** `PhoneInput`, métodos do CheckoutModal  
**Requirement:** FILA-04  

**Done when:**

- [ ] Nome + telefone + serviço obrigatórios; pro se modo per_professional
- [ ] Métodos iguais ao finalizar agendamento
- [ ] Staff pode abrir (não só dono)

**Tests:** none (contrato no service T4)  
**Gate:** typecheck  
**Commit:** `permite staff adicionar cliente na fila`

---

### T12: Ajustes e QRs do dono [P]

**What:** Settings (modo, sair/atraso) + QRs locais.  
**Where:** `components/queue/QueueSettingsSheet.tsx`, `components/queue/QueueQrSheet.tsx`  
**Depends on:** T5  
**Reuses:** lib `qrcode` (já no projeto)  
**Requirement:** FILA-06  

**Done when:**

- [ ] Troca de modo disabled com fila ativa + copy
- [ ] Shared: 1 QR da casa; per_pro: 1 por profissional ativo
- [ ] Download/print sem `api.qrserver.com`
- [ ] Sem slug: CTA criar slug
- [ ] Staff não vê o sheet

**Tests:** unit (URL do QR, lock do modo)  
**Gate:** typecheck + teste URL  
**Commit:** `adiciona ajustes e QR da fila para o dono`

---

### T13: Rewire `QueueManagement`

**What:** Página staff: uma coluna no mobile, companyId, cards, comandas, add, settings.  
**Where:** `pages/QueueManagement.tsx`  
**Depends on:** T9, T10, T11, T12  
**Reuses:** PageHeader, EmptyState  
**Requirement:** FILA-05, FILA-06  

**Done when:**

- [ ] Nenhuma mutation com `user.id` como businessId
- [ ] Staff vê/opera; modo per_pro destaca a própria fila; dono vê todas
- [ ] Sem glass/ícone-só; empty states canônicos

**Tests:** none (e2e T15)  
**Gate:** typecheck  
**Commit:** `reescreve operação da fila no staff`

---

### T14: Membership pura + teto no settle (cliente/staff)

**What:** Extrair `computeSubscriptionDiscount` e usar no pay step + settle.  
**Where:** `utils/subscriptionDiscount.ts`, hook existente só adapta  
**Depends on:** T1  
**Reuses:** regras de `useSubscriptionDiscount`  
**Requirement:** FILA-08  
**Nota:** fundação — roda depois de T1, antes de T6. Revalidação no settle é T10.  

**Done when:**

- [ ] Função pura testável; hook chama ela
- [ ] Teto estourou: não oferece clube; settle revalida

**Tests:** unit (`test/utils/subscriptionDiscount.test.ts` + existentes)  
**Gate:** `npm test -- test/utils/subscriptionDiscount.test.ts test/hooks/useSubscriptionDiscount.test.ts`  
**Commit:** `aplica teto do clube na fila`

---

### T15: Polish impecable + e2e + gates

**What:** Contraste, 44px, copy, e2e smoke mobile, gates completos.  
**Where:** superfícies T7–T13, `e2e/fila-digital-v2.spec.ts`  
**Depends on:** T8, T13  
**Reuses:** padrão e2e existente  
**Requirement:** todos P1  

**Done when:**

- [x] e2e: QR → serviço → join mock → aba fila; staff card ações
- [x] `typecheck` `lint` `build` `test` verdes
- [x] Sem “recepção”; sem qrserver; sem `isBeauty` ternário de cor

**DevOps:** aplicar `20260906000001_queue_v2.sql` no remoto **antes** do deploy do front. O banco de produção ainda é a fila v1 (`Public can join queue` INSERT true; sem `queue_payments`; sem RPCs v2). Tenant é TEXT (`profiles.id`, `queue_entries.business_id`). Sem a migration, o front novo quebra o join.

**Tests:** e2e  
**Gate:** full  
**Commit:** `fecha gates e e2e da fila digital v2`

---

## Parallel Execution Map

```
T1 → T14
T1 → T2 → T3 → T4 → T5
              T4 + T14 → T6 → T7 → T8
                    T5 ────────────┘
                    ├─ T9 [P] → T10
                    ├─ T11 [P]
                    └─ T12 [P]
                         T9+T10+T11+T12 → T13 → T15
                         T8 ────────────────────┘
```

---

## Task Granularity Check

| Task | Scope | Status |
|------|--------|--------|
| T1 tipos | 1 arquivo | OK |
| T2 ETA | 1 função + teste | OK |
| T3 migration | 1 arquivo SQL (coeso) | OK |
| T4 services | 1 service + teste | OK |
| T5 hooks | 2 arquivos + teste | OK |
| T6 steps | 2 componentes do mesmo fluxo | OK |
| T7 QueueJoin | 1 página | OK |
| T8 ClientArea+panel+redirect | 3 arquivos do mesmo fluxo cliente | OK (coeso) |
| T9 card | 1 componente | OK |
| T10 comanda | 2 componentes do fechamento | OK |
| T11 manual | 1 componente | OK |
| T12 settings+QR | 2 sheets do dono | OK |
| T13 page rewire | 1 página | OK |
| T14 discount | 1 util + hook | OK |
| T15 e2e/gates | fechamento | OK |

---

## Diagram ↔ Depends on

| Task | Depends on | Diagrama | Status |
|------|------------|----------|--------|
| T1 | — | início | Match |
| T2 | T1 | T1→T2 | Match |
| T3 | T1 | T1→T2→T3 (T3 não precisa T2 no corpo) | T3 só T1 — diagrama mostra T2 antes por ordem, não dependência. OK |
| T4 | T1,T2,T3 | T3→T4 (T2 para eta no board client) | Match |
| T5 | T4 | T4→T5 | Match |
| T6 | T4,T14 | T4+T14→T6 | Match |
| T7 | T6 | T6→T7 (+ redirect status) | Match |
| T8 | T5,T7 | T7→T8 e T5 | Match |
| T9 | T5 | T5→T9 | Match |
| T10 | T9 | T9→T10 | Match |
| T11 | T5 | T5→T11 | Match |
| T12 | T5 | T5→T12 | Match |
| T13 | T9–T12 | fan-in | Match |
| T14 | T1 | após T1, antes de T6 | Match |
| T15 | T8,T13 | final | Match |

T6/T9/T11/T12 são `[P]` e não dependem uns dos outros.

---

## Test Co-location

| Task | Camada | Exigido | Task diz | Status |
|------|--------|---------|----------|--------|
| T1 | types | unit | unit | OK |
| T2 | função pura | unit | unit | OK |
| T3 | SQL | none | none (contratos em T4) | OK |
| T4 | service | unit | unit | OK |
| T5 | hooks | unit | unit | OK |
| T6 | UI + regra pay | unit da regra | unit opções | OK |
| T7 | página | e2e no fechamento | e2e T15 | OK (merge forward) |
| T8 | página | e2e | e2e T15 | OK (merge forward) |
| T9 | UI mapper | unit | unit mapper | OK |
| T10 | payload | unit | unit | OK |
| T11 | UI | e2e / contrato T4 | none + T4 | OK |
| T12 | regra URL/lock | unit | unit | OK |
| T13 | página | e2e | e2e T15 | OK |
| T14 | util | unit | unit | OK |
| T15 | e2e | e2e | e2e | OK |

---

## Traceability

| ID | Tasks |
|----|--------|
| FILA-01 | T1, T3, T4, T6, T7 |
| FILA-02 | T5, T8 |
| FILA-03 | T2, T4 |
| FILA-04 | T4, T11 |
| FILA-05 | T1, T3, T9, T10, T13 |
| FILA-06 | T3, T5, T12, T13 |
| FILA-07 | T1, T3, T4, T6, T9 |
| FILA-08 | T6, T9, T14 |
| FILA-09 | T4, T8 |
