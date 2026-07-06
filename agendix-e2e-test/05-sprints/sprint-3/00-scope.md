# Sprint 3 — Estruturais + Polimento

**Sprint criada em**: 2026-07-06
**Status**: planejada
**Origem**: `04-bugs-e-achados/consolidado.md`

---

## 🎯 Objetivo da sprint

Atacar dívidas estruturais viáveis sem refatoração big-bang: tokens únicos, componentes deprecados, escala de z-index, e polimento P2/P3.

---

## 📦 Tasks

### TASK-301: LoadingFull com token (UI-011 persistente / C8)
- **DoD**: `bg-neutral-900` → token de tema; loading respeita barber/beauty. | **Estimativa**: XS

### TASK-302: Escala de z-index (P1-DS05)
- **DoD**: tokens de z-index definidos; `z-[999]`/`z-[9999]`/`z-[10000]` migrados. | **Estimativa**: S

### TASK-303: Fonte única de tokens (P1-DS04/C4 parcial)
- **DoD**: tokens duplicados entre `index.html` e `tokens.css` consolidados em 1 fonte. | **Estimativa**: M

### TASK-304: P2 de design (text-[8px], durations, rounded-3xl)
- **DoD**: text-[8px]→text-xs; durations padronizadas 150-250ms; rounded fora do RADIUS_MAP corrigidos. | **Estimativa**: S

### TASK-305: P2 de fluxo (setLoading finally, dashboard companyId, 404)
- **DoD**: `setLoading(false)` em finally; dashboard usa `companyId`; rota 404 real. | **Estimativa**: S

### TASK-306: Remover wizard legado /onboarding (R-10) — SE seguro
- **DoD**: confirmar zero referências ativas; remover rota + página legada. | **Estimativa**: S

---

## 🚫 Fora do escopo (backlog pós-sprint-3)
- Migração completa isBeauty → tokens (400+ ocorrências) — épico próprio
- Consolidação BrutalCard/BrutalButton (51 imports) — épico próprio
- ClientArea rebrand — depende do épico de tokens

## 📊 Métricas de saída
- Estruturais entregues: _/6
