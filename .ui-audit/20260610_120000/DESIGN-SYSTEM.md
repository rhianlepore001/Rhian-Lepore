# AgendiX Design System — UI Audit Lock

**Run:** `20260610_120000` | **Versão:** 1.0-audit | **Status:** DS Lock  
**Stack:** React 19 + Vite + Tailwind CDN + `design-system/tokens.css`  
**Implementação canônica:** `components/ui/*` + `hooks/useBrutalTheme.ts`

> Este documento trava regras para as 4 telas críticas e todo código novo.  
> Cores de marca **não mudam**. Craft via radius (A) + density (B) por tema.

---

## 1. Tokens

### 1.1 Fonte única (pós-lock)

```
design-system/tokens/*.json  →  design-system/tokens.css  →  useBrutalTheme()
```

**Proibido após lock:** novas paletas em `index.html`, hex em `pages/`, ternários `isBeauty`.

### 1.2 Color (semantic — preservar hex existentes)

| Token CSS | Função | Barber dark | Barber light | Beauty dark | Beauty light |
|-----------|--------|-------------|--------------|-------------|--------------|
| `--color-bg` | Page bg | `#121212` | `#F5F1E8` | `#1F1B2E` | `#F7F5FF` |
| `--color-card` | Card surface | `#1E1E1E` | `#FFFFFF` | `#2E2B3B` | `#FFFFFF` |
| `--color-surface` | Secondary | `#252525` | `#EDE9E0` | `#3D3A4D` | `#EDE8FF` |
| `--color-accent` | CTA, active | `#C29B40` | `#A07A2A` | `#A78BFA` | `#7C3AED` |
| `--color-text` | Body | `#EAEAEA` | `#1A1A1A` | `#EAEAEA` | `#1A1225` |
| `--color-text-secondary` | Meta | `#A0A0A0` | `#6B5E45` | `#B8AED4` | `#5B4D7A` |
| `--color-text-muted` | Placeholder* | `#525252` | ≥ `#595959` | `#7B6F96` | ≥ `#5C5C5C` |
| `--color-danger` | Error | `#EF4444` | `#DC2626` | `#EF4444` | `#DC2626` |
| `--color-success` | Success | `#10B981` | `#059669` | `#10B981` | `#059669` |

\*Placeholder e muted em light mode: **mínimo 4.5:1** contra `--color-card` — bump toward ink se close.

**Color strategy:** Restrained — accent ≤ 10% viewport area.

**Novos tokens (OKLCH):** usar só para refinamento de contraste em light mode; não substituir família gold/violet.

### 1.3 Spacing scale (4px base)

| Token | Value | Uso |
|-------|-------|-----|
| `--space-1` | 4px | Icon gap tight |
| `--space-2` | 8px | Inline gap barber |
| `--space-3` | 12px | Input padding y barber |
| `--space-4` | 16px | Card padding barber mobile |
| `--space-5` | 20px | Card padding barber desktop |
| `--space-6` | 24px | Section gap barber |
| `--space-8` | 32px | Section gap beauty |
| `--space-10` | 40px | Page padding beauty desktop |

**Density (via `useBrutalTheme().density`):**

| Token | Barber | Beauty |
|-------|--------|--------|
| `pagePadding` | `p-3 md:p-6` | `p-4 md:p-8` |
| `cardPadding` | `p-4 md:p-5` | `p-5 md:p-8` |
| `sectionGap` | `space-y-4 md:space-y-5` | `space-y-6 md:space-y-8` |
| `inlineGap` | `gap-2 md:gap-3` | `gap-3 md:gap-4` |
| `tableRowPy` | `py-2.5` | `py-3.5` |
| `navItemPy` | `py-2 px-3` | `py-2.5 px-4` |
| `touchMin` | `min-h-[44px] min-w-[44px]` | idem |

### 1.4 Typography

| Role | Font | Size | Weight | Tracking | Case |
|------|------|------|--------|----------|------|
| Display | Chivo | clamp(1.75rem, 4vw, 2.5rem) | 900 | ≥ -0.03em | Sentence |
| H1 / Page title | Chivo | 1.5rem / 1.875rem md | 700 | -0.02em | Sentence |
| H2 / Section | Chivo | 1.125rem / 1.25rem md | 700 | -0.01em | Sentence |
| H3 / Card title | Chivo | 1rem / 1.125rem md | 700 | normal | Sentence |
| Body | Inter | 0.875rem / 1rem md | 400–500 | normal | — |
| Label | Inter | 0.75rem | 600 | normal | Sentence (**no uppercase**) |
| Mono / KPI | JetBrains Mono | 1.5rem–2rem | 700 | tabular-nums | — |
| Caption | Inter | 0.75rem | 400 | normal | — |

**Max line length:** 65–75ch prose; empty state titles max 32ch.

### 1.5 Radius (theme-aware — Decision A)

| Token | Barber | Beauty |
|-------|--------|--------|
| `radius.card` | `rounded-lg` | `rounded-2xl` |
| `radius.button` | `rounded-lg` | `rounded-xl` |
| `radius.input` | `rounded-md` | `rounded-lg` |
| `radius.modal` | `rounded-xl` | `rounded-2xl` |
| `radius.badge` | `rounded-md` | `rounded-full` |
| `radius.avatar` | `rounded-lg` | `rounded-full` |

**Implementação:** `RADIUS_MAP` em `useBrutalTheme.ts` deve ser `Record<ThemeVariant, Radius>` — hoje é flat; **migration required**.

### 1.6 Shadow

| Token | Uso | Barber dark | Beauty dark | Light (both) |
|-------|-----|-------------|-------------|--------------|
| `--shadow-card` | Card outlined | inset hairline + drop | idem purple tint | soft drop |
| `--shadow-elevated` | Modal, dropdown | `--shadow-modal` | idem | `--shadow-modal` |
| `--shadow-accent` | CTA hover only | gold glow | neon glow | reduced opacity |

**Ban:** glow on default cards; ghost gradient overlay.

### 1.7 Z-index scale

| Token | Value | Layer |
|-------|-------|-------|
| `--z-base` | 0 | Content |
| `--z-sticky` | 10 | Table header sticky |
| `--z-header` | 40 | Header, bottom nav |
| `--z-sidebar` | 50 | Sidebar overlay |
| `--z-dropdown` | 60 | Popovers |
| `--z-modal-backdrop` | 70 | Modal overlay |
| `--z-modal` | 80 | Modal content |
| `--z-toast` | 90 | Toast stack |
| `--z-tooltip` | 100 | Tooltips |

**Ban:** `z-[999]`, `z-[200]` — migrar para escala.

---

## 2. Semantic states

Duracao padrão: **150–250ms**, `ease-out` (cubic-bezier(0.16, 1, 0.3, 1)).

| State | Visual | Motion |
|-------|--------|--------|
| **default** | Token bg/border | — |
| **hover** | `surfaceHover` / opacity 0.9 | 150ms |
| **focus** | `ring-2` accent + offset | instant |
| **active** | `scale-[0.97]` buttons | 100ms |
| **disabled** | `opacity-50 pointer-events-none` | — |
| **loading** | Skeleton (content) / spinner (button only) | — |
| **error** | `status.danger` border + message below field | — |
| **success** | `status.success` border + toast | — |

**Loading hierarchy:**
1. Route change → layout skeleton
2. Section fetch → SkeletonCard
3. Button action → Button `loading` prop (spinner in button only)

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` — disable `animate-in`, `scale`, parallax; keep opacity crossfade ≤ 150ms.

---

## 3. Components

Path canônico: `components/ui/{Component}.tsx`  
Import: `import { Button, Card, ... } from '@/components/ui'`

### 3.1 Button

| Prop | Values |
|------|--------|
| `variant` | `primary` \| `secondary` \| `outline` \| `ghost` \| `danger` \| `success` |
| `size` | `sm` \| `md` \| `lg` — **sm = min 44px on mobile** |

| Variant | Uso |
|---------|-----|
| primary | 1 por view — CTA principal |
| secondary | Ações secundárias |
| outline | Filtros, toggles |
| ghost | Toolbar, icon actions |
| danger | Excluir, cancelar irreversível |

**Deprecated:** `components/BrutalButton.tsx` → wrapper until removed.

### 3.2 Input / Select / Textarea

- Height: barber `h-10`, beauty `h-11`
- Radius: from `radius.input`
- Error: border `status.dangerBorder` + `<p className={classes.error}>` abaixo
- Label: `classes.label` — sentence case

### 3.3 Card

| Variant | Visual | Uso |
|---------|--------|-----|
| `outlined` | border + `--shadow-card` | Default lists, settings |
| `elevated` | border + `--shadow-elevated` | Modals inner, featured KPI |

**Removed variants:** `glow`, ghost gradient, side-stripe.  
**Ban:** nested cards.

Props: `title?`, `action?`, `variant`, `noPadding?`

**Deprecated:** `components/BrutalCard.tsx`

### 3.4 Modal

| Prop | Rule |
|------|------|
| `open` | boolean (API única) |
| `size` | `sm` (400px) \| `md` (480px) \| `lg` (560px) \| `xl` (672px) \| `full` |
| Default max-width | **560px** (`lg`) |

- Centered viewport, padding `p-3 md:p-4`
- Backdrop: `classes.modalOverlay` (~70% black)
- **Focus trap obrigatório** (focus-trap-react)
- ESC + overlay click close (unless `preventClose`)
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`

**Deprecated:** `components/Modal.tsx` (merge FocusTrap into ui/Modal)

### 3.5 Table

- Use `components/ui/Table.tsx`
- Header: `classes.tableHeader`, sticky optional
- Row: `classes.tableRow` + hover
- Selected: `accent.bgDim` background
- Empty: `EmptyState` inside table container with CTA
- Density: `density.tableRowPy` per theme

### 3.6 EmptyState

Props: `icon`, `title`, `description?`, `action?` (ReactNode — usually Button)

Copy rules: title = situation; description = next step; action = verb specific ("Adicionar cliente").

**Deprecated:** `components/EmptyState.tsx` (message/ctaLabel API)

### 3.7 PageHeader

**Novo componente** — `components/ui/PageHeader.tsx` (a criar na remediação)

```
┌─────────────────────────────────────────────┐
│ Title + optional breadcrumb    [Primary CTA]│
│ Subtitle (optional)                         │
└─────────────────────────────────────────────┘
```

- Primary CTA **sempre** à direita (desktop) ou full-width abaixo title (mobile)
- 1 primary max
- Padding: `density.pagePadding`

### 3.8 Sidebar

- Item: `classes.sidebarItem` + active/inactive
- Density: `density.navItemPy`
- Mobile: overlay + same item component as desktop
- Settings: sub-nav `SettingsLayout` — **mesmos tokens**, mesma sidebar item height

### 3.9 Badge

Variants: `accent` \| `neutral` \| `success` \| `warning` \| `danger`  
Radius: `radius.badge`

### 3.10 Toast

- Position: bottom-center mobile, top-right desktop
- z-index: `--z-toast`
- Auto-dismiss: 4s default; error 6s
- Action button optional for retry

### 3.11 Skeleton

- `Skeleton` — line/block
- `SkeletonCard` — card placeholder matching `radius.card` + `density.cardPadding`
- **Ban:** fullscreen spinner except auth bootstrap

---

## 4. Layout

### 4.1 AppShell

```
BrutalBackground
├── TrialBanner (fixed top, z-header)
├── Sidebar (desktop, z-sidebar) — hidden on settings
├── Header (fixed, z-header)
├── main (density.pagePadding, max-w-7xl mx-auto)
│   └── PageHeader + content
└── BottomMobileNav (mobile, z-header) — hidden settings/billing
```

### 4.2 Content max-width

| Context | Max width |
|---------|-----------|
| Dashboard, lists | `max-w-7xl` (1280px) |
| Forms, settings | `max-w-3xl` (768px) |
| Modals | size map above |
| Finance tables | full width within max-w-7xl |

### 4.3 Grid

- KPI row: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — **max 3 secondary + 1 hero full width**
- Responsive: `repeat(auto-fit, minmax(280px, 1fr))` for card grids

---

## 5. Persistence rules (TODA tela)

1. **Modal:** centered, focus trap, max-width 560px default, same backdrop token
2. **Card:** only `outlined` | `elevated` — never mix variants in same visual group
3. **Primary CTA:** PageHeader right (or below title mobile) — never floating random
4. **Accent:** only CTA, active nav, focus, progress, status badge — not decoration
5. **Theme:** only via `data-theme` + `data-mode` — `useBrutalTheme()`, never `isBeauty` ternary
6. **Radius/density:** from theme token — barber sharp/compact, beauty soft/breathable
7. **Copy:** sentence case; action verbs specific; PT-BR consistent
8. **Touch:** 44px minimum interactive target on mobile
9. **Motion:** no page-wide fade-in; respect reduced motion
10. **Z-index:** semantic scale only

---

## 6. Migration map

### 6.1 Component deprecations

| Legado | Canônico | Ação |
|--------|----------|------|
| `components/BrutalCard.tsx` | `components/ui/Card.tsx` | Replace imports; map `accent` → `variant="elevated"` |
| `components/BrutalButton.tsx` | `components/ui/Button.tsx` | Replace; align sizes |
| `components/Modal.tsx` | `components/ui/Modal.tsx` | Merge FocusTrap; `isOpen` → `open` |
| `components/EmptyState.tsx` | `components/ui/EmptyState.tsx` | Map message→title, ctaLabel→action |
| `components/SkeletonLoader.tsx` | `components/ui/Skeleton.tsx` | Replace |

### 6.2 Critical screens (ordem)

| Ordem | Página | Arquivos principais | DS focus |
|-------|--------|---------------------|----------|
| 1 | Login | `pages/Login.tsx` | tokens 4 modos, remove `#0A0A0A` |
| 2 | Dashboard | `pages/Dashboard.tsx`, `components/dashboard/*` | PageHeader, hero KPI, Card |
| 3 | Agenda | `pages/Agenda.tsx`, `components/TimeGrid.tsx` | density, Table/Grid |
| 4 | Financeiro | `pages/Finance.tsx`, `components/FinanceInsights.tsx` | ui/Table, Modal |

### 6.3 Hook changes required

| File | Change |
|------|--------|
| `hooks/useBrutalTheme.ts` | `RADIUS_MAP` per theme; add `density` object |
| `index.html` | Remove duplicate palettes; keep CDN + link tokens.css only |
| `components/ui/Modal.tsx` | Add focus-trap-react |
| `components/Layout.tsx` | Remove page-wide `animate-in`; apply `density.pagePadding` |
| `App.tsx` | LoadingFull → skeleton shell + theme-aware |

### 6.4 Finding → DS rule mapping

| Finding | DS rule |
|---------|---------|
| UI-001 | §1.1 single source |
| UI-002 | §3.4 Modal focus trap |
| UI-003 | §3.3 Card canonical |
| UI-004 | §3.7 PageHeader + §4.3 hero KPI |
| UI-005 | §1.2 + migration 6.2 |
| UI-013 | §1.3 touchMin + §3.1 Button sm |
| UI-008 | §5 rule 4 accent restraint |

---

## 7. Validation checklist (pre-Screen Lock)

- [ ] UiPreview renders all components × 4 theme matrix
- [ ] Login artifact × 4 themes
- [ ] Dashboard artifact × 4 themes
- [ ] Agenda artifact × 4 themes
- [ ] Financeiro artifact × 4 themes
- [ ] No side-stripe, no ghost gradient, no z-999
- [ ] Lighthouse a11y ≥ 90 on Login + Dashboard (manual spot check)

---

## 8. Changelog

| Date | Change |
|------|--------|
| 2026-06-10 | Initial DS Lock from ui-audit run 20260610_120000 |
