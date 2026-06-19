# Smoke matrix — UI audit closeout

**Run:** `20260610_120000` | **Data:** 2026-06-10 | **Executor:** closeout agent  
**Viewport:** 390px | **Modos:** barber-dark, barber-light, beauty-dark, beauty-light

## Rotas críticas

| Rota | barber-dark | barber-light | beauty-dark | beauty-light | Notas |
|------|-------------|--------------|-------------|--------------|-------|
| `/#/login` | pass | pass | pass | pass | 4 modos S4 |
| `/#/` (dashboard) | pass | pass | pass | pass | PageHeader + hero KPI S5 |
| `/#/agenda` | pass | pass | pass | pass | TimeGrid + wizard S6 |
| `/#/financeiro` | pass | pass | pass | pass | ui/Table + modais S7 |
| `/#/clientes` | pass | pass | pass | pass | PageHeader + EmptyState + ui/Modal |
| `/#/configuracoes/ui-preview` | pass | pass | pass | pass | DS components incl. Checkbox |
| `/#/booking/:slug` | pass | pass | pass | pass | z-index semântico; text ≥12px |

## Verificações automatizadas (2026-06-10)

- `grep BrutalCard\|BrutalButton pages/` → 0 (exceto mocks de teste)
- `grep z-\[999\]\|z-\[200\] components/` → 0
- `npm run typecheck` → pass
- `npm run lint` → pass
- `npm run build` → pass
- `npm test -- --run` → pass

## P0 visual

Nenhum bloqueador identificado no escopo E0–E7.

## Deferred (E8 — não bloqueia closeout)

- `index.html` paletas obsidian/silk/brutal ainda referenciadas por `useBrutalTheme` (Tailwind CDN)
- Onboarding steps ainda recebem `accentColor` string (loading screen migrado para tokens)
- AppointmentWizard overlay custom (z-index semântico aplicado; migração ui/Modal full pendente polish)
