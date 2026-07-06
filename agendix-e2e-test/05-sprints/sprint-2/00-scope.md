# Sprint 2 — P1 Restantes + Quick Wins P2

**Sprint criada em**: 2026-07-06
**Status**: planejada
**Origem**: `04-bugs-e-achados/consolidado.md`

---

## 🎯 Objetivo da sprint

Fechar os P1 restantes de fluxo/domínio/copy/visual e os quick wins P2 — eliminando edge cases de auth, race conditions e inconsistências de copy.

---

## ✅ Critérios de aceite da sprint (DoD)

- [ ] P1s de fluxo (staff órfão, navigate em render, erro engolido, tutorialCompleted) fechados
- [ ] Race condition da fila fechada (constraint/RPC)
- [ ] Copy P2 padronizada
- [ ] Typecheck, lint, test, build passando

---

## 📦 Tasks

### TASK-201: Staff órfão sem fallback 'subscriber' (P1-02)
- **DoD**: `AuthContext` — se ownerProfile é null, `subscriptionStatus='canceled'` + UX clara. | **Estimativa**: S

### TASK-202: StaffOnboarding trata erro de markTutorialCompleted (P1-03)
- **DoD**: `markTutorialCompleted` retorna `{error}`; `handleStart` mostra erro e não navega em falha. | **Estimativa**: S

### TASK-203: OnboardingWizard navigate em useEffect (P1-04)
- **DoD**: `navigate('/')` movido para `useEffect` com `replace: true`. | **Estimativa**: XS

### TASK-204: tutorialCompleted inicia false (P1-06)
- **DoD**: `useState(false)` + loading cobre o gap sem flash nem lock. | **Estimativa**: S

### TASK-205: Páginas Termos/Privacidade (P1-07 — LGPD)
- **DoD**: rota pública `/termos` e `/privacidade` com texto placeholder digno; `Register.tsx` linka pra elas. | **Estimativa**: S

### TASK-206: Race condition fila — dedup atômico (C2)
- **DoD**: índice UNIQUE parcial por `(business_id, normalize_phone_digits(client_phone))` em status ativos OU RPC `join_queue_public` atômica. | **Estimativa**: M

### TASK-207: markAppointmentComplete idempotente (R-11)
- **DoD**: quick-complete usa a mesma RPC v3 com idempotency guard. | **Estimativa**: S

### TASK-208: Copy P2 (MRR, Liquidar, reserva, QueueStatus empty)
- **DoD**: "Receita recorrente (MRR)", "Dar baixa", padronizar "agendamento", empty state humano em QueueStatus. | **Estimativa**: S

### TASK-209: pt-PT → pt-BR na landing (P1-UI05/C7)
- **DoD**: "Bom te ver de novo" corrigido; `useTenantLocale` default pt-BR. | **Estimativa**: XS

### TASK-210: Hierarquia H1 dashboard (P1-UI02)
- **DoD**: H1 do dashboard em text-3xl (30px). | **Estimativa**: XS

---

## 🚫 Fora do escopo
- C3 (no_show vs waiting) — aguarda decisão de produto da Rhian
- P1-05 (RPC accept_public_booking) — requer mapeamento de callers primeiro

## ⚠️ Riscos
- TASK-204 mexe em auth boot — testar login dono, staff, recovery
- TASK-206 constraint pode conflitar com dados existentes — usar CREATE INDEX CONCURRENTLY se aplicável

## 📊 Métricas de saída
- P1 entregues: _/8 · P2 entregues: _/2
