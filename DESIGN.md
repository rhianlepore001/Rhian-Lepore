---
name: AgendiX
description: O sistema operacional do salão — agenda, financeiro e equipe em interface elegante e eficiente.
colors:
  barber-accent: "#C9A24A"
  barber-accent-hover: "#DFC066"
  barber-bg: "#12100E"
  barber-card: "#1A1816"
  barber-surface: "#21201C"
  barber-text: "#F0EBE0"
  barber-text-secondary: "#A89A82"
  barber-text-muted: "#8F8574"
  barber-light-bg: "#E5E5E5"
  barber-light-card: "#FFFFFF"
  barber-light-accent: "#6B5010"
  barber-light-text: "#1A1610"
  beauty-accent: "#A78BFA"
  beauty-accent-hover: "#C4B5FD"
  beauty-bg: "#17132A"
  beauty-card: "#221F35"
  beauty-surface: "#2A2740"
  beauty-text: "#EEE8FF"
  beauty-text-secondary: "#B5A9D0"
  beauty-text-muted: "#9C90BC"
  beauty-light-bg: "#EBE5F5"
  beauty-light-card: "#FFFFFF"
  beauty-light-accent: "#6D28D9"
  beauty-light-text: "#1A1225"
  success: "#10B981"
  danger: "#EF4444"
  warning: "#F59E0B"
  info: "#60A5FA"
typography:
  display:
    fontFamily: "Chivo, sans-serif"
    fontSize: "clamp(24px, 5vw, 32px)"
    fontWeight: 800
    lineHeight: "1.1"
  heading:
    fontFamily: "Chivo, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
    fontSize: "14px"
    lineHeight: "1.5"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 500
    fontSize: "12px"
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  full: "9999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.barber-accent}"
    textColor: "{colors.barber-bg}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
    height: "44px"
  button-primary-beauty:
    backgroundColor: "{colors.beauty-accent}"
    textColor: "{colors.beauty-bg}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
    height: "44px"
  card-outlined:
    backgroundColor: "var(--color-card)"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  input-default:
    backgroundColor: "var(--color-input-bg)"
    textColor: "var(--color-text)"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
---

# Design System: AgendiX

> **Autoridade:** `design-system/tokens.css` (v1.1) é a fonte única de tokens. Este arquivo documenta o sistema para agentes e ferramentas impeccable. JSONs em `design-system/tokens/` são históricos.

## Overview

**Creative North Star: "A Banca"**

A bancada do profissional — cada ferramenta no lugar certo, visível sem esforço. O AgendiX não impressiona com dashboard genérico; reflete o salão: quem está agendado, quanto faturou, se está no lucro.

O sistema visual é **contido e operacional** (modo Operate). Accent carrega identidade (ouro barber, violeta beauty) só onde a ação acontece. Superfícies neutras aquecidas — nunca cinza puro. Tipografia direta: Chivo (títulos), Inter (corpo), JetBrains Mono (labels/dados). Profundidade por tom + glass-border inset; sombra sobe com interação.

**Key Characteristics:**
- Tokens semânticos via CSS variables (`--color-*`) em 4 combinações tema×modo
- `useBrutalTheme()` como API única — sem `isBeauty ? ... : ...` em componentes
- Elevação em 4 níveis (`--elevation-0..3`)
- Mobile-first: CTA principal visível em 390px
- WCAG AA calibrado nos tokens (text-muted corrigido em v1.1)
- Componentes canônicos em `components/ui/`

## Colors

Paleta committed: um accent saturado por tema, neutros aquecidos pelo hue do accent. Quatro combinações via `data-theme` + `data-mode` no `<html>`.

### Primary

- **Ouro Barber** (`#C9A24A` dark / `#6B5010` light): CTAs, estados ativos, badges. Hover: `#DFC066` / `#8B6914`.
- **Violeta Beauty** (`#A78BFA` dark / `#6D28D9` light): Mesmo papel no tema beauty. Hover: `#C4B5FD` / `#5B21B6`.

### Neutral

- **Barber dark:** bg `#12100E`, card `#1A1816`, surface `#21201C`, text `#F0EBE0`, secondary `#A89A82`, muted `#8F8574`.
- **Barber light:** bg `#E5E5E5`, card `#FFFFFF`, surface `#D8D8D8`, text `#1A1610`, secondary `#55524C`, muted `#6E6B64`.
- **Beauty dark:** bg `#17132A`, card `#221F35`, surface `#2A2740`, text `#EEE8FF`, secondary `#B5A9D0`, muted `#9C90BC`.
- **Beauty light:** bg `#EBE5F5`, card `#FFFFFF`, surface `#DDD4EF`, text `#1A1225`, secondary `#4A3D65`, muted `#6B5E86`.

### Semantic

- **Success** `#10B981` (light: `#047857`) — confirmações, saldos positivos.
- **Danger** `#EF4444` (light: `#DC2626`) — erros, cancelamentos.
- **Warning** `#F59E0B` (light: `#B45309`) — atenção.
- **Info** `#60A5FA` (light: `#2563EB`) — informação rara.

**The No-Pure-Gray Rule.** Neutros aquecidos pelo accent do tema. Cinza puro `#808080` proibido.

**The Accent Rarity Rule.** Accent em ≤10% da superfície por tela — CTAs, estados ativos, indicadores.

## Typography

**Display/Heading:** Chivo (700–800)
**Body:** Inter (400–500)
**Label/Data:** JetBrains Mono (500)

**Character:** Chivo dá personalidade aos títulos sem competir com Inter nos dados. JetBrains Mono marca horários, preços e labels técnicas.

### Hierarchy

- **Display** (800, clamp 24–32px, lh 1.1): PageHeader h1 — uma vez por tela.
- **H1** (700, 24px): Seção principal.
- **H2** (700, 20px): Título de card.
- **H3** (600, 18px): Sub-seção.
- **Body** (400, 16px mobile / 14px desktop, lh 1.5): Texto corrido, max 65ch.
- **Caption/Label** (500, 12px mono, tracking 0.05em): Timestamps, labels, valores tabulares.

**The Tabular Money Rule.** Valores monetários usam `font-variant-numeric: tabular-nums`.

**The Single-Display Rule.** Weight 800 só no PageHeader h1.

## Layout

- **Grid:** flex/stack mobile-first; sidebar fixa 256px em `md+`.
- **Container:** padding 16px mobile, 24–32px desktop.
- **Bottom nav:** fixa, glass background, safe-area-inset, botão central de ação (plus).
- **Breakpoints:** sm 640px, md 768px (sidebar), lg 1024px, xl 1280px.
- **Density:** barber mais compacto; beauty mais respirado (via `useBrutalTheme().density`).

## Elevation & Depth

Glass-border elevation: camadas definidas por tom + `inset 0 0 0 1px` semi-transparente. Sombras sobem com interação.

### Shadow Vocabulary

- **Rest (dark):** `0 12px 40px -12px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,245,230,0.12)`
- **Rest (light):** accent-tinted, ex. `0 8px 24px -8px rgba(100,80,30,0.14)`
- **Hover:** accent glow sutil + elevação
- **Modal:** `--elevation-3` + overlay `rgba(0,0,0,0.72)` + backdrop-blur

### Elevation Scale

| Nível | Uso |
|-------|-----|
| `--elevation-0` | Plano (sem sombra) |
| `--elevation-1` | Dropdown, popover |
| `--elevation-2` | Card destaque |
| `--elevation-3` | Modal |

**The Glass-By-Default Rule.** Cards em repouso = tom + borda inset. Sombra é resposta a hover/focus.

**The No-Double-Shadow Rule.** Não parear `border: 1px solid` com `box-shadow` blur ≥16px no mesmo elemento.

## Shapes

| Elemento | Radius mínimo |
|----------|---------------|
| Inputs, botões | `rounded-xl` (12px) |
| Cards, modais | `rounded-2xl` (16–24px) |
| Badges/pills | `rounded-full` |
| List rows | `rounded-lg` (8px) |

Barber tende a cantos mais angulares; beauty mais suaves — via `useBrutalTheme().radius`.

**Proibido:** `rounded-none` em cards; `rounded-sm/md` em botões/inputs; `border-radius: 32px+` em cards.

## Components

Componentes canônicos em `components/ui/`. Sempre via `useBrutalTheme().classes`.

### Buttons (`Button.tsx`)

- **Variants:** primary, secondary, ghost, danger, success, outline.
- **Sizes:** sm (44px mobile / 36px desktop), md (44px), lg (52px).
- **States:** hover brightness, active scale(0.97), disabled opacity 50%, loading spinner.
- **Focus:** ring-2 com offset.

### Cards (`Card.tsx`)

- **Variants:** `outlined` (default), `elevated`. Legados `accent`/`glow` mapeiam para `elevated`.
- **Padding:** 16–20px mobile, 20–32px desktop.
- **Clickable:** role="button", keyboard nav, focus ring.

### Inputs (`Input.tsx`)

- Height 44px, radius md/lg por tema.
- Focus: border accent + ring.
- Error: border danger + bg danger/10 + mensagem inline.

### Modal (`Modal.tsx`)

- Overlay blur + bg escuro 72%.
- Enter: fade + scale(0.95→1), 200–300ms ease-out.
- Close: 44px touch target.

### Navigation

- **Sidebar (desktop):** surface bg, item ativo com accent-dim.
- **Bottom nav (mobile):** glass, rounded-2xl, plus central accent.

### Badges (`Badge.tsx`)

- Pattern: bg-X/10, text-X, border-X/20.
- Variants: accent, danger, success, warning, neutral.

## Do's and Don'ts

### Do:

- **Do** usar `useBrutalTheme()` e `classes.*` — nunca hex hardcoded.
- **Do** manter contraste ≥4.5:1 texto principal, ≥3:1 texto grande.
- **Do** testar as 4 combinações tema×modo ao alterar tokens.
- **Do** garantir touch targets 44×44px em mobile.
- **Do** usar `tabular-nums` em valores monetários.
- **Do** respeitar `prefers-reduced-motion`.
- **Do** manter erros inline, próximos ao campo.

### Don't:

- **Don't** usar `isBeauty ? ... : ...` em componentes — use o hook.
- **Don't** usar cinza puro ou neutros frios sem hue do tema.
- **Don't** usar hero-metric template (big number + sparkline).
- **Don't** criar grids idênticos de ícone + heading + texto.
- **Don't** usar glassmorphism decorativo em cards em repouso.
- **Don't** usar kickers/eyebrows acima de cada seção.
- **Don't** usar `border-left` colorido >1px em cards/listas.
- **Don't** animar width/height/top/left — só transform e opacity.
- **Don't** confiar em `design-system/tokens/*.json` como fonte — são históricos.
