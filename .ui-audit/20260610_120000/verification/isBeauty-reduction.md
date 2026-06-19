# isBeauty reduction — fase 1 closeout

**Run:** `20260610_120000` | **Data:** 2026-06-10

## Meta fase 1

0 ternários `beauty-neon|accent-gold` em `pages/` para telas migradas no closeout.

## Migrados neste closeout

| Arquivo | Mudança |
|---------|---------|
| `pages/Clients.tsx` | `useBrutalTheme().accent` + tokens; removido `isBeauty` hardcode |
| `pages/OnboardingWizard.tsx` | loading screen via `colors.bg` / tokens |

## Permanece (backlog E8)

- `pages/OnboardingWizard.tsx` — prop `accentColor` nos steps (componentes onboarding/)
- Demais pages com `isBeauty` fora do escopo crítico/deferred

## Próximo passo

Refatorar `components/onboarding/*` para usar `useBrutalTheme().accent` internamente e remover prop `accentColor`.
