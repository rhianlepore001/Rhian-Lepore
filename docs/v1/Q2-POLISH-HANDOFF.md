# Q2 — Polish Final: Handoff para Composer

> **Papel:** UI (Opus) · **Data:** 2026-06-07
> **Base:** `SPEC-ui-audit.md` (O1), `SPEC-mobile-first-audit.md` (O5), `PARITY-REPORT.md` (Q1)
> **Regra:** UI especifica/decide; Composer implementa o mecânico. Itens abaixo são fixes mecânicos ou de wiring — **não** exigem decisão de UX nova.

---

## ✅ Já feito no Q2 (por mim, UI)

- **P0 mojibake** corrigido: `pages/Agenda.tsx:427` → `'Solicitação recusada.'`.
- **Infra criada:** `components/ui/Toast.tsx` (`ToastProvider` + `useToast()`), exportado em `components/ui` e montado no `App.tsx`. **Desbloqueia o T2.** Verificado: typecheck/lint/build verdes.

---

## Lote 1 — T2: `alert()`/`confirm()` → `useToast()` + modal (P1)

API pronta: `const { showToast } = useToast();` → `showToast(msg, 'success'|'error'|'warning')`.
Para confirmações (`window.confirm`), usar `ui/Modal` (padrão já aplicado em `pages/Products.tsx` — modal de desativar).

| Arquivo | Ocorrências (aprox.) | Ação |
|---------|----------------------|------|
| `pages/Agenda.tsx` | linhas com `alert(`/`confirm(` (~18) | toasts + modais de confirmação |
| `pages/Finance.tsx` | 265,269,273,329,337,373,378,687,693,784,790 | idem |
| `pages/QueueManagement.tsx` | 89,110,152,156,194,298 | idem |
| `pages/PublicBooking.tsx` | 443,449,452,486,549 | idem (tema público: `useToast` funciona, é theme-aware) |

Também migrar os **toasts locais** já existentes para o canônico (remover código duplicado):
- `pages/Products.tsx` (toast próprio + cores cruas `bg-green-900/90`)
- `components/CommissionsManagement.tsx` (mesmo padrão copiado)

Depois: corrigir docs que citam API inexistente `useAlerts().showAlert` → `useToast()` em `CLAUDE.md` e `design-system/MASTER.md`.

## Lote 2 — T1: `text-[10px]`/`[11px]`/`[9px]` → `text-xs` (P1)

Mínimo do design system é `text-xs` (12px). Substituição mecânica:
- `pages/PublicBooking.tsx` (massivo — ~27 ocorrências; pior caso, é tela de conversão)
- `pages/Agenda.tsx`, `pages/Finance.tsx`, `pages/QueueManagement.tsx`
- `components/dashboard/MeuDiaWidget.tsx`, `components/StaffEarningsCard.tsx`, `pages/StaffInsights.tsx`

## Lote 3 — T3: sombras fora de token → token (P1/P2)

`shadow-lg`/`shadow-xl`/`shadow-2xl`/`hover:shadow-md` → `shadow-promax-glass`/`shadow-lite-glass`/`shadow-promax-depth`:
- `pages/QueueManagement.tsx` (209,263,324,383,435,505)
- `pages/PublicBooking.tsx` (1406,1660)
- `pages/Dashboard.tsx` (toast banner 213)
- `pages/Agenda.tsx` (`hover:shadow-md`)

## Lote 4 — O5 Mobile (P1)

1. **Zoom iOS (maior alavanca):** `components/ui/Input.tsx` size `md` usa `text-sm` (14px) → iOS dá zoom ao focar. Ajustar para 16px no mobile (`text-base md:text-sm`). Conserta todos os formulários de uma vez (inclui Products, Finance).
2. **Inputs crus `Finance.tsx`** (920,938,954,971) → migrar para `ui/Input`/`ui/Select` (tamanho + token + alvo).
3. **Ícones-botão `Agenda.tsx`** `p-1.5`/`p-1` (~24–30px) → `min-h-[44px] min-w-[44px]`.
4. **Checkboxes nativos `PublicBooking.tsx`** (950,958,1459,1467) → área tocável ≥44px (label clicável).
5. **Loading cru `QueueManagement.tsx`** (198) → `Skeleton` temático.

## Lote 5 — Itens de UI da paridade (Q1)

| Prioridade | Item | Arquivo | Ação |
|------------|------|---------|------|
| P2 | Som no cliente quando `calling` | `pages/QueueStatus.tsx` | chamar `audioRef.current?.play()` ao virar `calling` |
| P2 | Products D2: "Editar" duplicado (inline + menu ⋮) para owner | `pages/Products.tsx` | manter só um (sugiro `⋮` no mobile, inline no desktop) |
| P2 | Toast sem safe-area nos toasts locais | (resolvido ao migrar p/ `useToast`, que já tem safe-area) | — |

> **Fora do Q2 (não-UI):** gaps P0/P1 de paridade `02-onboarding` (wizard 5 vs 2 steps), `03-create-appointment` (auto-atribuição no wizard) e `10-products` cenário 4 (venda vinculada a `appointmentId`) são **lógica/Ship/DB** — não são polish visual. Precisam de decisão de produto + Composer/GPT, não entram no Q2.

---

## Sugestão de ordem
Lote 4.1 (Input/zoom) → Lote 1 (T2/toast) → Lote 2 (text-xs) → Lote 3 (sombras) → Lotes 4.2–4.5 → Lote 5.
Rodar `typecheck`/`lint`/`build`/`test` ao fim de cada lote.
