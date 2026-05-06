# DESIGN — Design System End-to-End

> Arquitetura de UI, padrões de componentes e decisões de design.
> Companion do `spec.md` — foco em COMO implementar, não O QUE.

---

## 1. Princípios de Arquitetura

### 1.1 Separação de Responsabilidades

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PRIMITIVE     │────▶│    SEMANTIC     │────▶│   COMPONENT     │
│   (hex, rem)    │     │  (bg, text,     │     │  (card, button, │
│                 │     │   accent)       │     │   modal)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     tokens.css               useBrutalTheme()      classes.*
```

### 1.2 Regra de Ouro

> **Nenhum componente acessa `useAuth().userType` para decisões visuais.**
>
> Todo acesso visual passa por `useBrutalTheme()`.

### 1.3 Mobile First

- Base: mobile (375px)
- Escalonamento: `md:` (768px) e `lg:` (1024px)
- Touch targets mínimos: 44px
- Fonte mínima: `text-xs` (12px)

---

## 2. Estrutura de Tokens

### 2.1 Camadas

```
tokens.css (Primitive + Semantic)
    ↓
useBrutalTheme() (Semantic + Component)
    ↓
Componente React (Component)
```

### 2.2 Variáveis CSS por Estado

As 4 combinações são aplicadas no `<html>` via `data-theme` + `data-mode`:

```html
<html data-theme="barber" data-mode="dark">
```

As variáveis `--color-*` e `--shadow-*` mudam automaticamente. Componentes usam classes Tailwind que referenciam essas variáveis, OU usam `classes.*` do hook.

### 2.3 Hook `useBrutalTheme()`

```tsx
interface BrutalThemeTokens {
  theme: 'barber' | 'beauty';
  mode: 'dark' | 'light';
  isBeauty: boolean;
  isBarber: boolean;
  isDark: boolean;
  isLight: boolean;

  accent: {
    text: string;       // ex: 'text-accent-gold'
    bg: string;         // ex: 'bg-accent-gold'
    bgDim: string;      // ex: 'bg-accent-gold/20'
    bgHover: string;    // ex: 'hover:bg-accent-goldHover'
    border: string;     // ex: 'border-accent-gold/60'
    borderDim: string;  // ex: 'border-accent-gold/20'
    shadow: string;     // ex: 'shadow-gold'
    shadowStrong: string; // ex: 'shadow-promax-depth'
    ring: string;       // ex: 'ring-accent-gold/30'
    hex: string;        // ex: '#C29B40'
    hexHover: string;   // ex: '#D4AF50'
  };

  colors: {
    bg: string;         // ex: 'bg-brutal-main'
    card: string;       // ex: 'bg-brutal-card'
    surface: string;    // ex: 'bg-brutal-surface'
    text: string;       // ex: 'text-text-primary'
    textSecondary: string;
    textMuted: string;
    border: string;
    divider: string;
    overlay: string;
    inputBg: string;
    inputBorder: string;
  };

  font: {
    heading: string;    // 'font-heading'
    body: string;       // 'font-sans'
    label: string;      // 'font-mono' (barber) / 'font-sans' (beauty)
    mono: string;       // 'font-mono'
  };

  radius: {
    card: 'rounded-2xl';
    input: 'rounded-xl';
    button: 'rounded-2xl';
    badge: 'rounded-full';
    avatar: 'rounded-xl';
    modal: 'rounded-2xl';
  };

  classes: {
    card: string;
    cardAccent: string;
    cardGlow: string;
    buttonPrimary: string;
    buttonSecondary: string;
    buttonGhost: string;
    buttonDanger: string;
    input: string;
    inputFocus: string;
    label: string;
    error: string;
    badgeAccent: string;
    badgeDanger: string;
    badgeSuccess: string;
    badgeWarning: string;
    badgeNeutral: string;
    tableRow: string;
    tableHeader: string;
    modalOverlay: string;
    modalContainer: string;
    modalHeader: string;
  };
}
```

---

## 3. Padrões por Componente Base

### 3.1 BrutalCard

**ANTES (anti-padrão)**:
```tsx
const { userType } = useAuth();
const isBeauty = userType === 'beauty';
// lógica duplicada de glass, gradient, border, shadow
```

**DEPOIS (padrão)**:
```tsx
const { classes, accent } = useBrutalTheme();

// Card padrão
<div className={classes.card}>...</div>

// Card com accent
<div className={classes.cardAccent}>...</div>

// Card com glow
<div className={classes.cardGlow}>...</div>
```

**Camadas visuais do card**:
1. Container: `classes.card` (bg, border, radius, shadow)
2. Noise overlay: `bg-noise opacity-[0.02]` (sempre)
3. Gradient overlay: `bg-gradient-to-b from-white/[0.03] to-transparent` (sempre)
4. Conteúdo: padding `p-6 md:p-8`

### 3.2 BrutalButton

**ANTES**:
```tsx
const variants = {
  primary: isBeauty
    ? 'bg-gradient-to-r from-beauty-neon to-beauty-acid...'
    : 'bg-gradient-to-r from-accent-gold to-accent-goldHover...'
};
```

**DEPOIS**:
```tsx
const { classes } = useBrutalTheme();

<button className={classes.buttonPrimary}>...</button>
<button className={classes.buttonSecondary}>...</button>
<button className={classes.buttonGhost}>...</button>
<button className={classes.buttonDanger}>...</button>
```

**Variantes suportadas**:
- `buttonPrimary`: gradiente accent + shadow + hover brightness
- `buttonSecondary`: bg transparente + border + hover
- `buttonGhost`: texto accent + hover bg sutil
- `buttonDanger`: vermelho + border

### 3.3 Modal

**ANTES**:
```tsx
const getModalStyles = () => {
  if (isBeauty) { /* estilos beauty */ }
  else { /* estilos barber */ }
};
```

**DEPOIS**:
```tsx
const { classes, accent } = useBrutalTheme();

// Overlay
<div className={classes.modalOverlay} />

// Container
<div className={classes.modalContainer}>
  <div className={classes.modalHeader}>
    <h3 className={`font-heading text-lg ${accent.text}`}>Título</h3>
  </div>
</div>
```

### 3.4 Header

**ANTES**:
```tsx
const isBeauty = userType === 'beauty';
const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
const bgColor = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
```

**DEPOIS**:
```tsx
const { accent, colors } = useBrutalTheme();

// Accent text
<span className={accent.text}>...</span>

// Accent bg
<span className={accent.bg}>...</span>

// Background do header
<header className={`${colors.bg} backdrop-blur-2xl border-b ${colors.divider}`}>
```

### 3.5 Sidebar

**ANTES**:
```tsx
const isBeauty = userType === 'beauty';
const themeColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
```

**DEPOIS**:
```tsx
const { accent, colors } = useBrutalTheme();

// Item ativo
<Link className={`${accent.bgDim} ${accent.text} ${accent.border}`}>...</Link>

// Item inativo
<Link className={`text-text-secondary hover:${colors.text}`}>...</Link>
```

### 3.6 Layout

**ANTES**:
```tsx
// Background fixo para barber (ignora light mode)
<BrutalBackground />
<div className="bg-transparent text-theme-text">
```

**DEPOIS**:
```tsx
const { colors } = useBrutalTheme();

<div className={`${colors.bg} text-text-primary`}>
  <BrutalBackground />
  {/* conteúdo */}
</div>
```

**Nota**: `BrutalBackground` continua como camada decorativa (z-0), mas o container raiz agora usa `colors.bg` do hook, respeitando light mode.

---

## 4. Mobile vs Desktop

### 4.1 Breakpoints

| Token | Valor | Uso |
|---|---|---|
| `sm` | 640px | Raramente usado |
| `md` | 768px | Desktop threshold |
| `lg` | 1024px | Layout expansivo |
| `xl` | 1280px | Max-width containers |

### 4.2 Shadow Adaptativo

```tsx
// No hook useBrutalTheme
const commonMobileShadow = isMobile() ? 'shadow-lite-glass' : 'shadow-promax-glass';
```

- Mobile: sombra leve (performance, legibilidade em ambientes claros)
- Desktop: sombra profunda (profundidade, hierarquia)

### 4.3 Padding Adaptativo

```tsx
// Card
<div className="p-6 md:p-8">...</div>

// Modal
<div className="p-5 md:p-6">...</div>

// Header
<div className="h-16 md:h-20">...</div>
```

### 4.4 Grid Responsivo

```tsx
// Dashboard widgets
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

// Finance tables
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## 5. Dark vs Light Mode

### 5.1 Toggle

```tsx
const { toggleMode } = useTheme();

<button onClick={toggleMode}>
  {mode === 'dark' ? <Moon /> : <Sun />}
</button>
```

### 5.2 Transição

```css
/* index.html */
body {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

### 5.3 Regras por modo

| Elemento | Dark | Light |
|---|---|---|
| Fundo | `#121212` / `#1F1B2E` | `#F5F1E8` / `#F7F5FF` |
| Card | `#1E1E1E` / `#2E2B3B` | `#FFFFFF` |
| Texto | `#EAEAEA` | `#1A1A1A` / `#1A1225` |
| Border | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.08)` |
| Input bg | `rgba(0,0,0,0.3)` | `rgba(0,0,0,0.04)` |
| Shadow | Profunda, escura | Suave, clara |

---

## 6. Padrões de Estado

### 6.1 Hover

```tsx
// Cards
<div className={`${classes.card} hover:bg-white/[0.03] hover:border-accent-gold/40`}>

// Botões
<button className={`${classes.buttonPrimary} hover:brightness-110`}>

// Links
<a className="text-text-secondary hover:text-white">
```

### 6.2 Focus

```tsx
// Inputs
<input className={`${classes.input} focus:outline-none focus:${accent.border} focus:ring-0`} />

// Botões
<button className="focus-visible:ring-2 focus-visible:ring-accent-gold/50">
```

### 6.3 Disabled

```tsx
<button className="opacity-50 cursor-not-allowed pointer-events-none">
```

### 6.4 Loading

```tsx
import { Loader2 } from 'lucide-react';
<Loader2 className="w-4 h-4 animate-spin" />
```

---

## 7. Componentes Derivados (páginas)

### 7.1 Regra para novos componentes

Todo novo componente deve:
1. Importar `useBrutalTheme` de `@/hooks/useBrutalTheme`
2. Desestruturar apenas o que precisa: `{ classes, accent, colors }`
3. Usar `classes.*` para estilos de componente
4. Usar `accent.*` para cores de destaque
5. Usar `colors.*` para cores de fundo/texto/borda

### 7.2 Exemplo: Novo Widget

```tsx
import { useBrutalTheme } from '@/hooks/useBrutalTheme';

export function NovoWidget() {
  const { classes, accent, colors } = useBrutalTheme();

  return (
    <div className={classes.card}>
      <div className={classes.modalHeader}>
        <h3 className={`font-heading text-lg ${accent.text}`}>Título</h3>
      </div>
      <div className="p-6 space-y-4">
        <label className={classes.label}>Campo</label>
        <input className={classes.input} placeholder="Digite aqui..." />
        <p className={classes.error}>Mensagem de erro</p>
        <button className={classes.buttonPrimary}>Salvar</button>
      </div>
    </div>
  );
}
```

---

## 8. Decisões de Design

### D-DS-001: Por que não usar CSS-in-JS ou Styled Components?

**Decisão**: Manter Tailwind CSS com classes utilitárias + variáveis CSS.
**Motivo**: O projeto já usa Tailwind extensivamente. CSS-in-JS adicionaria bundle size e runtime overhead. Variáveis CSS são nativas, zero runtime cost.

### D-DS-002: Por que `useBrutalTheme()` retorna strings e não objetos de estilo?

**Decisão**: Retornar classes Tailwind prontas (strings).
**Motivo**: Tailwind processa classes em build time. Templates literais com interpolação (`className={`bg-${color}`}`) não funcionam. Strings estáticas garantem que o purge funcione.

### D-DS-003: Onde fica a lógica de mobile?

**Decisão**: No hook `useBrutalTheme()`, função interna `isMobile()`.
**Motivo**: Centralizar a detecção evita inconsistências. Shadow adaptativa é decisão de design system, não de componente.

### D-DS-004: O que acontece com `forceTheme`?

**Decisão**: Manter `forceTheme` prop em componentes base, mas implementar via `useBrutalTheme({ override: 'beauty' })`.
**Motivo**: Páginas públicas (booking) precisam forçar tema sem auth. O hook já suporta `override`.

### D-DS-005: Glassmorphism nas settings — mantém ou remove?

**Decisão**: Mantém, mas implementado via `classes.card` do hook.
**Motivo**: O efeito visual é bom. O problema era a lógica duplicada, não o efeito em si.

---

## 9. Visualização com Stitch MCP

### 9.1 Telas de Referência

Gerar 4 telas principais:
1. **Dashboard Barber Dark** — métricas, cards, sidebar
2. **Dashboard Barber Light** — mesmo conteúdo, modo claro
3. **Dashboard Beauty Dark** — mesmo conteúdo, tema beauty
4. **Dashboard Beauty Light** — mesmo conteúdo, modo claro beauty

### 9.2 Componentes Isolados

Gerar 4 componentes isolados:
1. **Card** — padrão, accent, glow
2. **Button** — primary, secondary, ghost, danger
3. **Modal** — overlay, container, header, footer
4. **Input** — default, focus, error

### 9.3 Fluxo de Geração

```
Prompt Stitch → Design System Tokens → High-fidelity Screen →
Export PNG → Referência visual para implementação
```

---

## 10. Métricas de Sucesso

| Métrica | Target | Como medir |
|---|---|---|
| Zero `isBeauty` inline | 0 ocorrências | `grep -r "userType === 'beauty'" components/` |
| Zero hex hardcoded | 0 ocorrências | `grep -r "#C29B40\|#A78BFA" components/` |
| Consistência de cards | 100% | Todos os cards usam `classes.card` |
| Toggle performance | ≤ 16ms | DevTools Performance |
| Build sem erros | Pass | `npm run typecheck && npm run lint && npm run build` |

---

*Última atualização: 2026-05-03*
*Versão: 1.0 — Arquitetura de UI End-to-End*
