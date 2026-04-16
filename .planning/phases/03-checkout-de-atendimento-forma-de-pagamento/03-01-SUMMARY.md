---
phase: 03-checkout-de-atendimento-forma-de-pagamento
plan: "01"
subsystem: database-schema
tags: [migration, types, schema, checkout, payments]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/20260413_checkout_fields.sql
    - types.ts Appointment interface com campos de checkout
  affects:
    - Plano 02 (CheckoutModal.tsx usa received_by, machine_fee_applied, machine_fee_percent)
    - Plano 03 (Settings Financeiro usa machine_fee_enabled, debit_fee_percent, credit_fee_percent)
tech_stack:
  added: []
  patterns:
    - "ADD COLUMN IF NOT EXISTS para migrations idempotentes"
    - "ON DELETE SET NULL para FK de team_members em appointments"
key_files:
  created:
    - supabase/migrations/20260413_checkout_fields.sql
  modified:
    - types.ts
decisions:
  - "payment_method adicionado na interface Appointment (existia no banco desde 20260218 mas faltava no tipo TypeScript)"
  - "ON DELETE SET NULL em received_by FK — se colaborador for deletado, received_by vira NULL sem quebrar appointment"
  - "Sem novas RLS policies — policy existente FOR ALL com get_auth_company_id() já cobre os novos campos"
metrics:
  duration: "~10min"
  completed_date: "2026-04-13"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 1
---

# Phase 03 Plan 01: Schema de Checkout — Migration SQL + Tipos TypeScript — Summary

**One-liner:** Migration com 6 colunas de checkout em appointments e business_settings + interface Appointment TypeScript atualizada para refletir os novos campos de pagamento.

---

## O que foi entregue

Migration SQL criada em `supabase/migrations/20260413_checkout_fields.sql` com 6 novos campos idempotentes (IF NOT EXISTS), e a interface `Appointment` em `types.ts` atualizada com 4 campos de pagamento (incluindo `payment_method` que existia no banco mas faltava no tipo).

---

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|---------|
| 1 | Criar migration SQL com novos campos de checkout | `39ef6f5` | `supabase/migrations/20260413_checkout_fields.sql` (criado) |
| 2 | Atualizar interface Appointment em types.ts | `e356477` | `types.ts` (modificado) |
| 3 | [BLOCKING] Aplicar schema no Supabase | CHECKPOINT | Aguardando ação humana |

---

## Artefatos Criados

### `supabase/migrations/20260413_checkout_fields.sql`

6 colunas adicionadas com `IF NOT EXISTS` (idempotente):

**Tabela `appointments`:**
- `received_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL`
- `machine_fee_applied BOOLEAN DEFAULT FALSE`
- `machine_fee_percent DECIMAL(5,2)`

**Tabela `business_settings`:**
- `machine_fee_enabled BOOLEAN DEFAULT FALSE`
- `debit_fee_percent DECIMAL(5,2) DEFAULT 0`
- `credit_fee_percent DECIMAL(5,2) DEFAULT 0`

### `types.ts` — Interface `Appointment`

Campos adicionados:
```typescript
payment_method?: string;        // 'pix' | 'cash' | 'debit' | 'credit' | null — já existe no banco (20260218)
received_by?: string | null;    // UUID → team_members.id — quem recebeu o pagamento
machine_fee_applied?: boolean;  // se taxa de maquininha foi aplicada
machine_fee_percent?: number | null; // percentual da taxa aplicada
```

---

## Verificação

- `grep -c "ADD COLUMN IF NOT EXISTS" supabase/migrations/20260413_checkout_fields.sql` → `6` ✅
- `grep "received_by" types.ts` → `received_by?: string | null;` ✅
- `npm run typecheck` → sem erros ✅
- Schema no Supabase → PENDENTE (Tarefa 3 — checkpoint humano)

---

## Deviações do Plano

### Auto-corrigido

**1. [Rule 2 - Missing Field] Adicionado payment_method na interface Appointment**
- **Encontrado durante:** Tarefa 2 — ao ler o `types.ts` atual no worktree
- **Problema:** A interface `Appointment` no worktree não tinha `payment_method`, mas o campo existe no banco desde `20260218_add_payment_method.sql`. O plano mencionava "payment_method pode já existir" como condicional.
- **Correção:** Adicionado `payment_method?: string` junto com os três novos campos
- **Arquivos modificados:** `types.ts`
- **Commit:** `e356477`

---

## Known Stubs

Nenhum stub — este plano entrega apenas schema SQL e tipos TypeScript, sem componentes UI.

---

## Threat Flags

Nenhuma nova superfície de segurança introduzida além do que está no threat model do plano:
- T-03-01: `ON DELETE SET NULL` aplicado em `received_by FK` ✅
- T-03-02: RLS de business_settings já restringe owner ✅
- T-03-03: Migration DDL sem dados sensíveis ✅

---

## Próximo Passo (BLOCKING)

**Tarefa 3 requer ação humana:** Aplicar o schema no Supabase Dashboard ou via CLI.

Ver seção CHECKPOINT REACHED abaixo para instruções detalhadas.

---

## Self-Check: PASSED

- `supabase/migrations/20260413_checkout_fields.sql` — FOUND ✅
- `types.ts` com `received_by` — FOUND ✅
- Commits `39ef6f5` e `e356477` — FOUND ✅
