# Checkout de Comanda — Tasks

**Design**: `.specs/features/checkout-comanda/design.md`
**Spec**: `.specs/features/checkout-comanda/spec.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation (Sequential)

Schema + RPC — tudo que o frontend depende.

```
T1 → T2 → T3
```

### Phase 2: Componentes Paralelos

Após tipos definidos, estes podem rodar em paralelo.

```
     ┌→ T4 [P] ─┐
T3 ──┼→ T5 [P] ─┼
     └→ T7 [P] ─┘
```

### Phase 3: Integração (Parcialmente Paralelo)

Wizard depende de AppointmentReview; Agenda depende de CheckoutModal.

```
T5 → T6
T4 → T8

T6 e T8 podem rodar em paralelo [P]
```

### Phase 4: Validação Final

Build + testes completos.

```
T9
```

---

## Task Breakdown

### T1: Migration — novos campos no schema

**What**: Criar migration SQL com novos campos em `appointments`, `business_settings`, `finance_records` + migrar `Cartão` → `Débito`
**Where**: `supabase/migrations/YYYYMMDD_checkout_comanda_fields.sql`
**Depends on**: None
**Reuses**: Padrao de migrations existentes em `supabase/migrations/`
**Requirement**: REQ-F2-01, REQ-F2-02, REQ-F2-03, REQ-F2-04, REQ-F2-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `appointments`: colunas `received_by`, `machine_fee_percent`, `machine_fee_amount`, `completed_by`, `completed_at` adicionadas
- [ ] `business_settings`: colunas `machine_fee_enabled`, `debit_fee_percent`, `credit_fee_percent` adicionadas
- [ ] `finance_records`: colunas `machine_fee_amount`, `commission_base` adicionadas
- [ ] UPDATE `appointments SET payment_method = 'Débito' WHERE payment_method = 'Cartão'`
- [ ] UPDATE `finance_records SET payment_method = 'Débito' WHERE payment_method = 'Cartão'`
- [ ] Migration formal para `commission_settlement_day_of_month` (coluna órfã)
- [ ] `npm run typecheck` passa (migration nao afeta TS, mas verifica que nada quebrou)

**Tests**: none
**Gate**: quick

---

### T2: RPC — atualizar `complete_appointment` para v2

**What**: Atualizar `complete_appointment` RPC com novos params e lógica de taxa de maquininha + commission_base
**Where**: `supabase/migrations/YYYYMMDD_complete_appointment_v2.sql`
**Depends on**: T1
**Reuses**: RPC existente em `20260301_cleanup_duplicate_finance_records.sql`
**Requirement**: REQ-F2-02, REQ-F2-03, REQ-F2-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Assinatura aceita: `p_payment_method`, `p_received_by`, `p_completed_by`, `p_machine_fee_percent`, `p_machine_fee_amount`
- [ ] UPDATE em `appointments` com todos os novos campos + `completed_at = NOW()`
- [ ] Se `machine_fee_enabled` no `business_settings` → `commission_base = price - machine_fee_amount`; senão `commission_base = price`
- [ ] `commission_value = commission_base * commission_rate / 100`
- [ ] INSERT em `finance_records` com `machine_fee_amount`, `commission_base`, `payment_method` (regressão do 20260301 que removeu payment_method)
- [ ] Idempotency guard mantido (nao cria finance_record duplicado)
- [ ] `npm run typecheck` passa

**Tests**: none
**Gate**: quick

---

### T3: TypeScript — atualizar interfaces

**What**: Atualizar tipos do Appointment, FinanceRecord e criar CheckoutData, BusinessSettings
**Where**: `types.ts`, `components/CheckoutModal.tsx` (tipos no proprio arquivo)
**Depends on**: T2
**Reuses**: Interface Appointment existente em `types.ts:26-40`
**Requirement**: REQ-F2-01, REQ-F2-02, REQ-F2-03, REQ-F2-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `Appointment` em `types.ts` ganha: `payment_method`, `received_by`, `machine_fee_percent`, `machine_fee_amount`, `completed_by`, `completed_at`
- [ ] `FinanceRecord` em `types.ts` ganha: `machine_fee_amount`, `commission_base`, `payment_method`, `appointment_id`, `professional_id`
- [ ] Interface `CheckoutData` criada (paymentMethod, receivedBy, machineFeePercent, machineFeeAmount, customPrice?)
- [ ] Interface `BusinessSettings` criada com campos existentes + novos (machine_fee_enabled, debit_fee_percent, credit_fee_percent)
- [ ] Agenda.tsx local Appointment interface atualizada para incluir novos campos
- [ ] `npm run typecheck` passa sem erros

**Tests**: none
**Gate**: quick

---

### T4: Criar componente CheckoutModal [P]

**What**: Criar modal de checkout com seleção de pagamento, campo "Recebido por", cálculo de taxa de maquininha
**Where**: `components/CheckoutModal.tsx`
**Depends on**: T3
**Reuses**: `Modal` de `components/Modal.tsx`, padrao de botoes de pagamento de `AppointmentReview.tsx:65-75`, `formatCurrency` de `utils/formatters.ts`, `BrutalButton`, `BrutalCard`
**Requirement**: REQ-F2-02, REQ-F2-03, REQ-F2-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Modal usa `<Modal>` base com size `lg`
- [ ] Exibe: cliente, servico, profissional (pre-preenchido, readOnly)
- [ ] Campo "Preço Final" editavel (permite cortesia = R$ 0)
- [ ] Seletor de forma de pagamento: BR (Pix, Dinheiro, Débito, Crédito), PT (Dinheiro, MBWay, Débito, Crédito)
- [ ] Quando Débito/Crédito: mostra taxa de maquininha (pre-preenchida de settings) + valor líquido em tempo real
- [ ] Quando Pix/Dinheiro/MBWay: campo de taxa NAO aparece
- [ ] Dropdown "Recebido por" com todos os colaboradores ativos + dono (obrigatorio)
- [ ] Validacao: bloqueia confirmacao sem pagamento e sem "Recebido por"
- [ ] EC-F2-01: campo vermelho + msg "Selecione a forma de pagamento"
- [ ] EC-F2-05: bloqueia se taxa > valor do servico
- [ ] EC-F2-04: permite valor zero (cortesia)
- [ ] `onConfirm(checkoutData: CheckoutData)` chamado apenas com dados validos
- [ ] Teste unitario: renderiza modal, seleciona pagamento, valida campos obrigatorios
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa

**Tests**: unit
**Gate**: quick

---

### T5: Modificar AppointmentReview — pagamento opcional + Débito/Crédito [P]

**What**: Tornar pagamento opcional na criação (default "Definir depois") e separar "Cartão" em "Débito" + "Crédito"
**Where**: `components/appointment/AppointmentReview.tsx`
**Depends on**: T3
**Reuses**: Padrao existente de botoes de pagamento em `AppointmentReview.tsx:65-75`
**Requirement**: REQ-F2-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Opcao "Definir depois" adicionada como default no seletor de pagamento
- [ ] "Cartão" substituido por "Débito" + "Crédito" (BR: 4 botoes, PT: 4 botoes)
- [ ] `paymentMethod` aceita `''` (string vazia = "Definir depois") alem dos valores existentes
- [ ] Nenhuma validacao bloqueia criacao sem forma de pagamento
- [ ] Teste existente `AppointmentReview.test.tsx` atualizado para novos botoes + "Definir depois"
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] Test count: testes existentes + novos passam

**Tests**: unit
**Gate**: quick

---

### T6: Modificar AppointmentWizard — propagar pagamento opcional

**What**: Ajustar estado inicial de paymentMethod para vazio + passar "Definir depois" como NULL para RPC
**Where**: `components/AppointmentWizard.tsx`
**Depends on**: T5
**Reuses**: Estado `paymentMethod` existente em `AppointmentWizard.tsx:62`
**Requirement**: REQ-F2-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Estado inicial `paymentMethod` muda de `'Dinheiro'` para `''` (string vazia)
- [ ] Quando `paymentMethod === ''` → `p_payment_method = NULL` na chamada `create_secure_booking`
- [ ] Quando `paymentMethod !== ''` → `p_payment_method = paymentMethod` (comportamento existente)
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa

**Tests**: unit
**Gate**: quick

---

### T7: Modificar CommissionsSettings — seção taxa de maquininha [P]

**What**: Adicionar seção de configuração de taxa de maquininha (toggle + campos débito/crédito)
**Where**: `pages/settings/CommissionsSettings.tsx`
**Depends on**: T3
**Reuses**: Padrao de upsert em `CommissionsSettings.tsx:89-97`
**Requirement**: REQ-F2-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Novo card: toggle "Repassar taxa de maquininha ao colaborador?" (Sim/Nao)
- [ ] Campos: "Taxa débito (%)" e "Taxa crédito (%)"
- [ ] Se toggle = Nao → campos de taxa ficam desabilitados
- [ ] Persistir `machine_fee_enabled`, `debit_fee_percent`, `credit_fee_percent` em `business_settings` via upsert
- [ ] Buscar valores existentes ao carregar (select + preencher state)
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa

**Tests**: unit
**Gate**: quick

---

### T8: Modificar Agenda — integrar CheckoutModal + status visual [P]

**What**: Botão "Concluir" abre CheckoutModal; badge "Pago via [método]" em concluídos; bloquear cancelamento de concluído
**Where**: `pages/Agenda.tsx`
**Depends on**: T4
**Reuses**: Estrutura de modais existente (showNewAppointmentModal pattern)
**Requirement**: REQ-F2-02, REQ-F2-06, EC-F2-02, EC-F2-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Estado novo: `checkoutAppointment: Appointment | null`
- [ ] Botão "Concluir" (line ~1578) abre CheckoutModal em vez de chamar RPC direto
- [ ] Novo handler `handleCheckoutConfirm(checkoutData)` → chama `complete_appointment` RPC v2 com todos os params
- [ ] Fallback client-side (lines 759-827) atualizado para incluir novos campos
- [ ] Badge "Pago via [método]" em agendamentos com status Completed
- [ ] Botão "Concluir" desaparece quando status = Completed (ja existe parcialmente)
- [ ] EC-F2-02: se acessar conclusao de ja concluido → toast "Este atendimento já foi finalizado."
- [ ] EC-F2-03: cancelar agendamento Completed → bloqueia com toast "Este agendamento já foi finalizado. Fale com o dono."
- [ ] Fetch `business_settings` (machine_fee_enabled, debit/credit_fee_percent) para passar ao CheckoutModal
- [ ] Fetch `team_members` ativos para dropdown "Recebido por" (ja existe parcialmente)
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa

**Tests**: unit
**Gate**: quick

---

### T9: Validação final — build + testes completos

**What**: Rodar suite completa de verificacao apos todas as mudancas
**Where**: N/A (validacao)
**Depends on**: T6, T8
**Reuses**: NONE
**Requirement**: ALL

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem errors
- [ ] `npm run build` completa sem erros
- [ ] `npm test` — todos os testes passam
- [ ] Nenhum teste existente foi deletado silenciosamente
- [ ] Test count: >= contagem anterior + testes novos de T4, T5

**Tests**: none
**Gate**: full

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (Parallel):
  T3 complete, then:
    ├── T4 [P]  (CheckoutModal)
    ├── T5 [P]  (AppointmentReview)
    └── T7 [P]  (CommissionsSettings)

Phase 3 (Parallel):
  T4, T5 complete, then:
    ├── T6 [P]  (depends on T5 only)
    └── T8 [P]  (depends on T4 only)

Phase 4 (Sequential):
  T6, T8 complete:
    T9 ──→ Done
```

**Parallelism constraint:** Tasks marcadas [P] satisfazem:
- Sem dependencias nao-resolvidas
- Testes unitarios sao parallel-safe (Vitest + jsdom)
- Sem estado mutavel compartilhado entre tasks [P] da mesma fase

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Migration — novos campos no schema | 1 migration file | ✅ Granular |
| T2: RPC — atualizar complete_appointment v2 | 1 RPC function | ✅ Granular |
| T3: TypeScript — atualizar interfaces | 1-2 files (types.ts) | ✅ Granular |
| T4: Criar componente CheckoutModal | 1 component + tests | ✅ Granular |
| T5: Modificar AppointmentReview | 1 component modify | ✅ Granular |
| T6: Modificar AppointmentWizard | 1 component modify | ✅ Granular |
| T7: Modificar CommissionsSettings | 1 component modify | ✅ Granular |
| T8: Modificar Agenda — integrar CheckoutModal | 1 page modify | ✅ Granular |
| T9: Validação final | verification | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | No incoming arrows | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 [P] | ✅ Match |
| T5 | T3 | T3 → T5 [P] | ✅ Match |
| T7 | T3 | T3 → T7 [P] | ✅ Match |
| T6 | T5 | T5 → T6 [P] | ✅ Match |
| T8 | T4 | T4 → T8 [P] | ✅ Match |
| T9 | T6, T8 | T6, T8 → T9 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Required Test Type | Task Says | Status |
|---|---|---|---|---|
| T1 | SQL migration | none | none | ✅ OK |
| T2 | SQL RPC | none | none | ✅ OK |
| T3 | TypeScript types | none | none | ✅ OK |
| T4 | React component | unit | unit | ✅ OK |
| T5 | React component modify | unit | unit | ✅ OK |
| T6 | React component modify | unit | unit | ✅ OK |
| T7 | React component modify | unit | unit | ✅ OK |
| T8 | React page modify | unit | unit | ✅ OK |
| T9 | Verification only | none | none | ✅ OK |

**Notas:** Projeto nao tem TESTING.md formal. Tipo de teste derivado dos padroes existentes (Vitest + jsdom + @testing-library/react). T6 (Wizard) e T7 (CommissionsSettings) podem ter testes simples focados na logica de estado, sem necessidade de testar UI complexa.
