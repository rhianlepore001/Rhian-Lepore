# Legacy Design System Inventory

**Run:** `20260610_120000` | **Fase:** 3.5

---

## Resumo

O AgendiX tem um **design system aspiracional bem documentado** (`design-system/MASTER.md`, tokens JSON → CSS) e uma **implementação legada paralela** (Brutal*, isBeauty, Tailwind CDN inline). O gap entre documentação e código é a causa raiz da genericidade.

---

## Camada 1 — Intencional (manter/refinar)

### Tokens (`design-system/`)

| Artefato | Status | Notas |
|----------|--------|-------|
| `tokens/primitives.json` | ✅ Intencional | Gold + Violet palettes |
| `tokens/semantic-*.json` (×4) | ✅ Intencional | barber/beauty × dark/light |
| `tokens/components.json` | ✅ Intencional | Classes por componente |
| `tokens.css` | ✅ Intencional | Output gerado — 4 temas completos |
| `MASTER.md` | ✅ Intencional | Regras claras; subutilizado na prática |

### Hooks

| Hook | Papel | Adoção |
|------|-------|--------|
| `useBrutalTheme()` | Tokens → classes Tailwind | ~60 arquivos |
| `useTheme()` | Toggle dark/light | Header/settings |
| `useDynamicBranding()` | data-theme + PWA meta | Root only |

### Componentes canônicos (`components/ui/`)

14 componentes com testes Vitest em vários:

Button, Input, Select, Card, Modal, Table, Tabs, Badge, EmptyState, Skeleton, ErrorState, ConfirmModal, Toast

**Status:** Canônicos por documentação; **~25% adoção** vs Brutal* legado.

### Tipografia (intencional)

| Token | Valor |
|-------|-------|
| Heading | Chivo 700/900 |
| Body | Inter 400/500/600 |
| Mono | JetBrains Mono |

### Cores accent (fixas — constraint user)

| Tema | Dark accent | Light accent |
|------|-------------|--------------|
| Barber | `#C29B40` gold | `#A07A2A` gold |
| Beauty | `#A78BFA` lavender | `#7C3AED` violet |

### Shell intencional

- `Layout.tsx` — sidebar + header + bottom nav
- `SettingsLayout.tsx` — sub-nav settings (visual divergente)
- `BrutalBackground.tsx` — gradient bg via CSS vars

---

## Camada 2 — Legado (migrar/deprecar)

### Componentes duplicados

| Legado | Canônico | Usos legado | Ação |
|--------|----------|-------------|------|
| `BrutalCard` | `ui/Card` | ~50 | Deprecar → Card |
| `BrutalButton` | `ui/Button` | ~40 | Deprecar → Button |
| `Modal.tsx` (root) | `ui/Modal` | ~15 | Merge + FocusTrap |
| `EmptyState.tsx` (root) | `ui/EmptyState` | ~10 | Unificar API |
| `SkeletonLoader` | `ui/Skeleton` | ~5 | Deprecar |

### Padrões legados visuais

| Padrão | Onde | Classificação |
|--------|------|---------------|
| `isBeauty ? 'text-beauty-neon' : 'text-accent-gold'` | ~80 arquivos | **Legado — ban** |
| `border-l-4 border-accent-*` | PublicLinkCard, Queue, MeuDia | **Legado — AI slop** |
| `bg-gradient-to-r from-neutral-900` hardcoded | PublicLinkCard, modais | **Legado — ignora tokens** |
| `rounded-2xl` everywhere | Global | **Legado — sem escala** |
| Ghost gradient overlay em BrutalCard | BrutalCard:59 | **Legado — Impeccable ban** |
| `animate-in fade-in` page-wide | Layout:48 | **Legado — reflexo AI** |

### Tailwind CDN inline (`index.html`)

| Conteúdo | Status |
|----------|--------|
| Paletas obsidian, silk, brutal | **Legado/morto** — conflita com tokens.css |
| `accent-gold`, `beauty-neon` extends | **Duplicata** — existe em tokens |
| Custom shadows `shadow-promax-*` | **Legado branded** — migrar para `--shadow-*` |
| `@media prefers-reduced-motion` | **Parcial** — intencional mas incompleto |

### `useBrutalTheme.ts` vs `tokens.css`

Hook duplica semantic tokens em strings Tailwind hardcoded (~497 linhas). **Drift risk:** JSON → CSS pode divergir do hook.

**Recomendação DS Lock:** hook lê `var(--color-*)` ou classes utilitárias geradas, não duplica hex.

---

## Camada 3 — Genérico (substituir na remediação)

Coisas que existem mas não carregam identidade barber/beauty:

1. **KPI card grid** — Dashboard PremiumKpiCard = template SaaS (sparkline + trend badge)
2. **SetupCopilot widget** — visual igual em barber/beauty (só accent muda)
3. **Login cards** — bonitos no dark; light não provado
4. **Settings BrutalCard stack** — mesmo card para tudo
5. **Bottom nav glass pill** — trendy mas genérico (blur + rounded-[28px])
6. **Uppercase micro-labels** — "AVISOS DO SISTEMA" admin-panel feel

---

## Inventário por tela crítica

### Dashboard (`pages/Dashboard.tsx`)
- **Usa:** useBrutalTheme ✅, BrutalCard via widgets, EmptyState legado, SkeletonLoader
- **Legado:** PremiumKpiCard custom (não ui/Card), isBeauty prop em DashboardHero
- **4 temas:** panelClass usa colors.* — **parcial OK**; banners hardcoded danger

### Agenda (`pages/Agenda.tsx`)
- **Usa:** BrutalCard heavy, BrutalButton, isBeauty espalhado
- **Legado:** TimeGrid custom, border-l-4 highlights
- **4 temas:** **fraco** — muitos branches isBeauty

### Login (`pages/Login.tsx`)
- **Usa:** cards segmento barber/beauty com focus-visible ✅
- **Legado:** `#0A0A0A`, `text-white/15`, não usa useBrutalTheme na shell
- **4 temas:** **dark only** na prática

### Financeiro (`pages/Finance.tsx`)
- **Usa:** BrutalCard (~24), BrutalButton, partial useBrutalTheme
- **Legado:** FinanceInsights cards, modais custom
- **4 temas:** **médio** — hook presente mas isBeauty persiste

---

## Matriz de maturidade DS

| Dimensão | Documentado | Implementado | Gap |
|----------|-------------|--------------|-----|
| 4 temas CSS | ✅ | ⚠️ ~40% telas | Alto |
| Componentes ui/* | ✅ | ⚠️ ~25% uso | Alto |
| Tipografia tokens | ✅ | ✅ ~70% | Baixo |
| Spacing scale | ✅ MASTER | ❌ arbitrário | Médio |
| Radius scale | ✅ MASTER | ❌ 4 variantes soltas | Médio |
| Motion/reduced | Parcial | Parcial | Médio |
| A11y modals | ui/Modal spec | ❌ no focus trap | Alto |

---

## O que NÃO tocar (constraints)

- Logo AgendiX e favicons
- Famílias de cor accent (gold / purple)
- Fontes Chivo + Inter (intencionais)
- Estrutura de rotas e features

---

## Recomendações para DESIGN-SYSTEM (Fase 5)

1. **Single source:** tokens.css + classes geradas; deprecar paletas index.html
2. **Single card/button/modal:** ui/* absorve Brutal* com variants
3. **Theme matrix test:** UiPreview + 4 telas críticas × 4 combinações = 16 screenshots gate
4. **Radius differentiation:** barber ligeiramente mais sharp, beauty mais soft — via token, não por arquivo
5. **Ban list enforcement:** side-stripe, ghost gradient, isBeauty ternaries
