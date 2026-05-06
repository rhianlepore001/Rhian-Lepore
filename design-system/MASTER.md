# AgendiX — Design System MASTER

> Fonte da verdade para tokens visuais, padrões de componentes e regras do projeto.
> **Nunca** use valores hardcoded quando um token existir aqui.

---

## Índice

1. [Arquitetura de Tokens](#1-arquitetura-de-tokens)
2. [Hooks do Design System](#2-hooks-do-design-system)
3. [Temas](#3-temas)
4. [Color Palette](#4-color-palette)
5. [Tipografia](#5-tipografia)
6. [Spacing Scale](#6-spacing-scale)
7. [Border Radius Scale](#7-border-radius-scale)
8. [Shadow Tokens](#8-shadow-tokens)
9. [Border Patterns](#9-border-patterns)
10. [Componentes Canônicos](#10-componentes-canônicos)
11. [Padrões de Estado](#11-padrões-de-estado)
12. [Mapeamento Estático](#12-mapeamento-estático)
13. [Regras do-NÃO-fazer](#13-regras-do-não-fazer)
14. [Animações](#14-animações)
15. [Classes Globais](#15-classes-globais)
16. [Guia de Uso](#16-guia-de-uso)

---

## 1. Arquitetura de Tokens

O design system usa **3 camadas** de tokens, do mais bruto ao mais específico:

```
Primitive (valores crus: hex, rem)
    ↓
Semantic (significado por função: bg, text, accent)
    ↓
Component (estilos prontos: button-primary, card-accent)
```

### 1.1 Arquivos de Tokens

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `design-system/tokens/primitives.json` | Primitive | Cores, fontes, spacing, radius em valores crus |
| `design-system/tokens/semantic-barber-dark.json` | Semantic | Cores por função para barber dark |
| `design-system/tokens/semantic-barber-light.json` | Semantic | Cores por função para barber light |
| `design-system/tokens/semantic-beauty-dark.json` | Semantic | Cores por função para beauty dark |
| `design-system/tokens/semantic-beauty-light.json` | Semantic | Cores por função para beauty light |
| `design-system/tokens/components.json` | Component | Classes Tailwind prontas por componente |
| `design-system/tokens.css` | CSS Output | Variáveis CSS geradas dos JSONs |

### 1.2 Variáveis CSS (tokens.css)

As variáveis são aplicadas no `<html>` via `data-theme` e `data-mode`:

```html
<html data-theme="barber" data-mode="dark">
```

4 combinações suportadas:
- `data-theme="barber"` + `data-mode="dark"` (padrão)
- `data-theme="barber"` + `data-mode="light"`
- `data-theme="beauty"` + `data-mode="dark"`
- `data-theme="beauty"` + `data-mode="light"`

### 1.3 Regra de Ouro

> **Tokens JSON → CSS variables → Tailwind classes**
>
> Nunca use hex hardcoded. Nunca use `isBeauty ? ... : ...` em componentes.
> Use `useBrutalTheme()` que retorna classes prontas.

---

## 2. Hooks do Design System

### 2.1 `useBrutalTheme()` (Principal)

Substitui **todos** os `const isBeauty = userType === 'beauty'` espalhados.

```tsx
import { useBrutalTheme } from '@/hooks/useBrutalTheme';

function MeuComponente() {
  const { theme, mode, isBeauty, accent, colors, font, radius, classes } = useBrutalTheme();

  return (
    <div className={classes.card}>
      <span className={accent.text}>Destaque</span>
      <input className={classes.input} />
      <button className={classes.buttonPrimary}>Salvar</button>
    </div>
  );
}
```

#### API do Hook

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `theme` | `'barber' \| 'beauty'` | Tema atual |
| `mode` | `'dark' \| 'light'` | Modo de cor atual |
| `isBeauty` | `boolean` | true se beauty |
| `isBarber` | `boolean` | true se barber |
| `isDark` | `boolean` | true se dark |
| `isLight` | `boolean` | true se light |
| `colors` | `object` | Classes de cor de fundo, texto, borda |
| `accent` | `object` | Classes do accent (text, bg, border, shadow, ring) |
| `font` | `object` | Classes de fonte (heading, body, label, mono) |
| `radius` | `object` | Classes de border-radius |
| `classes` | `object` | **Classes Tailwind prontas** para cada componente |

#### Classes Prontas (classes.*)

```tsx
const { classes } = useBrutalTheme();

// Cards
classes.card           // Card padrão
classes.cardAccent     // Card com borda do accent
classes.cardGlow       // Card com glow do accent

// Botões
classes.buttonPrimary  // Botão primário (gradiente + shadow)
classes.buttonSecondary // Botão secundário
classes.buttonGhost    // Botão ghost (texto + hover)
classes.buttonDanger   // Botão de perigo

// Formulários
classes.input          // Input canônico
classes.inputFocus     // Focus ring do input
classes.label          // Label canônico (uppercase, mono)
classes.error          // Mensagem de erro

// Badges
classes.badgeAccent    // Badge com cor do accent
classes.badgeDanger    // Badge vermelho
classes.badgeSuccess   // Badge verde
classes.badgeWarning   // Badge amarelo
classes.badgeNeutral   // Badge neutro

// Tabela
classes.tableRow       // Linha de tabela
classes.tableHeader    // Cabeçalho de tabela

// Modal
classes.modalOverlay   // Backdrop do modal
classes.modalContainer // Container do modal
classes.modalHeader    // Header do modal
```

#### Para páginas públicas (sem auth)

```tsx
// Forçar tema sem usar useAuth()
const { accent, classes } = useBrutalTheme({ override: 'beauty' });
```

### 2.2 `useThemeTokens()` (Variáveis CSS)

Para casos que precisam do valor HEX em runtime (Chart.js, canvas, etc.):

```tsx
import { useThemeTokens } from '@/hooks/useThemeTokens';

function MeuGrafico() {
  const { accent, bg, card } = useThemeTokens();
  // accent = '#C29B40' (ou '#A78BFA' no beauty)
}
```

### 2.3 `useAccentColor()` (Helper Leve)

Quando só precisa da cor de destaque:

```tsx
import { useAccentColor } from '@/hooks/useBrutalTheme';

const accent = useAccentColor();
// accent.text, accent.bg, accent.border, etc.
```

---

## 3. Temas

O projeto tem **dois temas** que **nunca** devem se misturar:

| Atributo | Barber (brutal) | Beauty (elegante) |
|----------|-----------------|-------------------|
| Fundo principal | `bg-brutal-main` `#121212` | `bg-beauty-dark` `#1F1B2E` |
| Card | `bg-brutal-card` `#1E1E1E` | `bg-beauty-card` `#2E2B3B` |
| Surface | `bg-brutal-surface` `#252525` | — |
| Accent | `text-accent-gold` `#C29B40` | `text-beauty-neon` `#A78BFA` |
| Fonte | `font-mono` (JetBrains Mono) | `font-sans` (Inter) |
| Heading | `font-heading` (Chivo) | `font-heading` (Chivo) |
| Border padrão | `border border-white/5` | `border border-white/10` |
| Border accent | `border-accent-gold/60` | `border-beauty-neon/50` |

### Detecção de tema

```tsx
// ❌ NÃO FAÇA MAIS ISSO:
const { userType } = useAuth();
const isBeauty = userType === 'beauty';

// ✅ FAÇA ISSO:
const { isBeauty, accent, classes } = useBrutalTheme();
```

---

## 4. Color Palette

### Barber
```
brutal-main     #121212   Fundo global
brutal-card     #1E1E1E   Cards, modais, containers
brutal-surface  #252525   Hover states, inputs ativos
accent-gold     #C29B40   Botões primários, destaques
accent-goldHover #D4AF50  Hover de accent-gold
accent-goldDim  #8a6d2a   Versão dimmed/opacidade
```

### Beauty
```
beauty-dark     #1F1B2E   Fundo global
beauty-card     #2E2B3B   Cards, modais, containers
beauty-neon     #A78BFA   Botões primários, destaques (Lavender 400)
beauty-neonHover #C4B5FD  Hover de beauty-neon (Lavender 300)
beauty-acid     #8B5CF6   Accent secundário (Violet 500)
beauty-silver   #E9D5FF   Texto suave, ornamentos (Purple 200)
```

### Textos (ambos os temas)
```
text-primary    #EAEAEA   Texto principal
text-secondary  #A0A0A0   Texto secundário
text-muted      #525252   Labels, placeholders
```

### Públicas (booking pages)
```
obsidian-bg     #050505   Fundo public dark
obsidian-card   #0A0A0A   Cards public dark
silk-bg         #E2E1DA   Fundo public light
silk-card       #FFFFFF   Cards public light
silk-border     #CAC9BF   Bordas public light
silk-accent     #1D1D1F   Texto public light
silk-surface    #F5F4F0   Surface public light
```

---

## 5. Tipografia

### Fontes
```
font-heading / font-display  → Chivo 700/900      Títulos de impacto
font-body / font-sans        → Inter 400/500/600   Corpo do texto
font-mono                    → JetBrains Mono      Dados, labels, código
```

### Escala de tamanhos
| Classe | Tamanho | Uso |
|--------|---------|-----|
| `text-xs` | 12px | Labels mínimos (**nunca** usar `text-[10px]` ou `text-[11px]`) |
| `text-sm` | 14px | Corpo padrão |
| `text-base` | 16px | Corpo destaque |
| `text-lg` | 18px | Lead text |
| `text-xl` | 20px | Subtítulos |
| `text-2xl` | 24px | Títulos de card |
| `text-3xl` | 30px | Page heading |
| `text-4xl` | 36px | Hero heading |

> **Regra:** `text-xs` é o mínimo para qualquer texto visível. Proibido `text-[10px]` ou `text-[11px]`.

---

## 6. Spacing Scale

Base: `4px`

| Token Tailwind | Pixels | Uso típico |
|----------------|--------|------------|
| `p-1` / `gap-1` | 4px | Espaçamentos mínimos |
| `p-2` / `gap-2` | 8px | Ícone + texto |
| `p-3` / `gap-3` | 12px | Padding interno pequeno |
| `p-4` / `gap-4` | 16px | Padding de item |
| `p-5` / `gap-5` | 20px | Padding de seção |
| `p-6` / `gap-6` | 24px | Padding de card |
| `p-8` / `gap-8` | 32px | Padding de card desktop |
| `p-10` | 40px | Padding de seção grande |
| `p-12` | 48px | Padding de page |

---

## 7. Border Radius Scale

| Elemento | Classe |
|----------|--------|
| Páginas / containers | `rounded-2xl` ou `rounded-3xl` |
| Cards | `rounded-2xl` |
| Modais | `rounded-2xl` |
| Inputs | `rounded-xl` |
| Botões | `rounded-xl` ou `rounded-2xl` (BrutalButton usa `rounded-2xl`) |
| Itens de lista / rows | `rounded-lg` |
| Badges / pills | `rounded-full` |
| Avatar | `rounded-xl` (sm) ou `rounded-2xl` (md+) |

> **Regra:** `rounded-xl` é o mínimo para inputs e botões. `rounded-2xl` é o mínimo para cards e modais.

---

## 8. Shadow Tokens

**Usar SEMPRE os tokens abaixo. Proibido** `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`.

| Token | Quando usar |
|-------|-------------|
| `shadow-promax-glass` | Cards principais (desktop) |
| `shadow-promax-depth` | Cards com accent dourado |
| `shadow-lite-glass` | Cards no mobile |
| `shadow-gold` | Cards com glow dourado |
| `shadow-lite-gold` | Cards dourados no mobile |
| `shadow-neon` | Cards com glow neon (beauty) |
| `shadow-neon-strong` | Cards neon com destaque (beauty) |
| `shadow-soft` | Containers secundários |
| `shadow-soft-lg` | Modais / drawers |
| `shadow-heavy` | Brutalismo: `4px 4px 0px #000` |
| `shadow-heavy-sm` | Brutalismo leve: `2px 2px 0px #000` |
| `shadow-silk-shadow` | Booking light theme |

### Sombras inline para botões
```
Barber primary: shadow-[0_4px_20px_rgba(194,155,64,0.25)]
Beauty primary: shadow-[0_4px_20px_rgba(167,139,250,0.3)]
```

---

## 9. Border Patterns

```
Cards/containers barber:   border border-white/5
Cards/containers beauty:   border border-white/10
Inputs barber:             border border-neutral-700/60
Inputs beauty:             border border-white/10
Inputs focus barber:       focus:border-accent-gold/60
Inputs focus beauty:       focus:border-beauty-neon/50
Accent barber:             border-accent-gold/60
Accent beauty:             border-beauty-neon/50
```

> **Proibido:** `border-2 border-black` em cards ou inputs. `border border-neutral-800` em cards.

---

## 10. Componentes Canônicos

### Button (primário)
```tsx
// Usar sempre <BrutalButton variant="primary"> quando possível.
// Fallback inline barber:
"h-10 px-4 rounded-xl font-semibold text-sm bg-accent-gold text-black
 hover:bg-accent-goldHover transition-all active:scale-[0.98]
 shadow-[0_4px_14px_rgba(194,155,64,0.2)]"

// Fallback inline beauty:
"h-10 px-4 rounded-xl font-semibold text-sm bg-beauty-neon text-white
 hover:bg-beauty-neonHover transition-all active:scale-[0.98]
 shadow-[0_4px_14px_rgba(167,139,250,0.25)]"

// Ghost / secondary:
"h-10 px-4 rounded-xl font-semibold text-sm text-white
 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-all"
```

### Input canônico
```tsx
// Barber:
"w-full px-4 py-3 rounded-xl text-sm text-white bg-black/30
 border border-neutral-700/60 focus:outline-none focus:border-accent-gold/60
 focus:bg-black/50 transition-all font-mono placeholder:text-neutral-500"

// Beauty:
"w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5
 border border-white/10 focus:outline-none focus:border-beauty-neon/50
 focus:bg-white/8 transition-all font-sans placeholder:text-beauty-neon/30"
```

### Label canônico
```tsx
// Barber:
"text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono"

// Beauty:
"text-xs font-semibold uppercase tracking-wider text-neutral-400"
```

### Error state canônico
```tsx
// Barber:
"p-3.5 rounded-xl text-xs bg-red-500/8 border border-red-500/30 text-red-400 font-mono"

// Beauty:
"p-3.5 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-300"
```

### Card (via BrutalCard)
```tsx
// Sempre usar <BrutalCard> quando possível.
// Fallback manual barber:
"bg-brutal-card border border-white/5 rounded-2xl shadow-promax-glass overflow-hidden"

// Fallback manual beauty:
"bg-gradient-beauty border border-white/10 rounded-2xl shadow-promax-glass overflow-hidden"
```

### Modal (via Modal.tsx)
```tsx
// Sempre usar <Modal isOpen={...} onClose={...} size="lg">
// O Modal.tsx gerencia: portal, FocusTrap, ESC, backdrop, animação, overflow
```

### Badge / Pill
```tsx
// Neutro:
"px-2 py-0.5 rounded-full text-xs font-bold uppercase border"
// Accent barber:
"bg-accent-gold/20 text-accent-gold border-accent-gold/30"
// Accent beauty:
"bg-beauty-neon/20 text-beauty-neon border-beauty-neon/30"
// Danger:
"bg-red-500/10 text-red-400 border-red-500/20 rounded-full"
// Success:
"bg-emerald-500/10 text-emerald-400 border-emerald-500/20 rounded-full"
```

### Table Row
```tsx
"rounded-lg border border-white/5 hover:bg-white/[0.03] transition-colors"
```

### Table Header
```tsx
"text-xs font-mono uppercase tracking-wider text-neutral-500"
```

---

## 11. Padrões de Estado

### Hover
```
Cards:     hover:bg-white/[0.03] ou hover:border-accent-gold/40
Botões:    hover:brightness-110 ou hover:bg-accent-goldHover
Links:     hover:text-white ou hover:text-accent-gold
```

### Focus
```
Inputs:    focus:outline-none focus:border-accent-gold/60 focus:ring-0
Botões:    focus-visible:ring-2 focus-visible:ring-accent-gold/50
```

### Disabled
```
"opacity-50 cursor-not-allowed pointer-events-none"
```

### Loading
```tsx
// Usar <Loader2 className="w-4 h-4 animate-spin" /> do lucide-react
```

### Error (inline)
```
text-red-400 text-xs mt-1
```

---

## 12. Mapeamento Estático de Accent

**Proibido:** `ring-${accentColor}/30`, `border-${accentColor}`
**Obrigatório:** Usar mapeamento explícito ou `useBrutalTheme()`:

```tsx
// ✅ MODO RECOMENDADO (useBrutalTheme):
const { accent } = useBrutalTheme();
<div className={`${accent.ring} ${accent.border}`} />

// ✅ MODO LEGADO (mapeamento estático):
const accentClasses = {
  gold: {
    ring:   'ring-accent-gold/30',
    border: 'border-accent-gold/60',
    text:   'text-accent-gold',
    bg:     'bg-accent-gold/20',
    bgFill: 'bg-accent-gold',
  },
  neon: {
    ring:   'ring-beauty-neon/30',
    border: 'border-beauty-neon/60',
    text:   'text-beauty-neon',
    bg:     'bg-beauty-neon/20',
    bgFill: 'bg-beauty-neon',
  },
};

const accent = isBeauty ? accentClasses.neon : accentClasses.gold;
```

---

## 13. Regras do-NÃO-fazer

| ❌ Anti-padrão | ✅ Substituição |
|---------------|---------------|
| `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` | Token do projeto: `shadow-promax-glass`, `shadow-lite-glass`, etc. |
| `bg-zinc-900`, `bg-neutral-900` em cards | `bg-brutal-card` ou `bg-[#1E1E1E]` |
| `bg-stone-100` em cards | `bg-silk-card` ou `bg-white` |
| `border-2 border-black` em cards/inputs | `border border-white/5` (barber) ou `border border-white/10` (beauty) |
| `border border-neutral-800` em cards | `border border-white/5` |
| `border-${variavel}` dinâmico | `useBrutalTheme().accent.border` |
| `ring-${variavel}/30` dinâmico | `useBrutalTheme().accent.ring` |
| `text-[10px]`, `text-[11px]` | `text-xs` (12px mínimo) |
| `rounded-none` em cards | `rounded-2xl` mínimo |
| `rounded-sm`, `rounded-md` em botões/inputs | `rounded-xl` mínimo |
| Criar `fixed inset-0` em modal custom | Usar `<Modal>` de `components/Modal.tsx` |
| Criar FocusTrap manual sem Modal.tsx | Usar `<Modal>` que inclui FocusTrap |
| `shadow-xl` em modais | `shadow-promax-depth` |
| `bg-red-500/10 border-red-500` sem opacidade | `bg-red-500/8 border border-red-500/30` |
| Botão primário ad-hoc sem classe canônica | `classes.buttonPrimary` do hook |
| Input com `rounded-lg` apenas | `rounded-xl` mínimo |
| `isBeauty = userType === 'beauty'` em componente | `useBrutalTheme().isBeauty` |

---

## 14. Animações disponíveis

```
animate-fade-in         Fade in suave 0.3s
animate-slide-up        Slide de baixo pra cima
animate-slide-down      Slide de cima pra baixo
animate-scale-in        Scale de 95% → 100%
animate-pulse-neon      Pulse glow neon (beauty)
animate-shimmer         Skeleton loading shimmer
animate-haptic-click    Click haptic (mobile)
animate-shine           Shine effect em botões
```

---

## 15. Classes Globais (index.html)

```
.input-brutal           Input com focus gold ring
.input-beauty           Input com focus neon ring
.card-brutal-hover      Card com translateY(-2px) no hover
.card-beauty-hover      Card com neon border no hover
.glass-beauty           Glassmorphism para beauty
.glow-gold              Box shadow dourado
.glow-beauty            Box shadow neon
.brutal-card-enhanced   Card premium com gradiente e noise
.brutal-button-premium  Botão premium com shine animation
.skeleton               Skeleton barber
.skeleton-beauty        Skeleton beauty
.modal-enter            Animação de entrada de modal
```

---

## 16. Guia de Uso por Contexto

### Dashboard widget
```tsx
<BrutalCard title="Título" action={<BrutalButton size="sm">Ação</BrutalButton>}>
  {/* conteúdo */}
</BrutalCard>
```

### Modal de formulário
```tsx
<Modal isOpen={open} onClose={onClose} title="Título" size="lg"
  footer={<ModalFooter align="right">
    <BrutalButton variant="ghost" onClick={onClose}>Cancelar</BrutalButton>
    <BrutalButton variant="primary" onClick={onSave}>Salvar</BrutalButton>
  </ModalFooter>}
>
  {/* form fields */}
</Modal>
```

### Página de configurações (com hook)
```tsx
import { useBrutalTheme } from '@/hooks/useBrutalTheme';

export function MinhaPagina() {
  const { classes, accent, font } = useBrutalTheme();

  return (
    <div className={classes.card}>
      <div className={classes.modalHeader}>
        <h3 className={`${font.heading} text-lg ${accent.text}`}>Título</h3>
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

### Migrando código antigo

**ANTES (anti-padrão):**
```tsx
const { userType } = useAuth();
const isBeauty = userType === 'beauty';
const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

return (
  <div className={`${accentBg} ${accentText}`}>
    <button className={`${isBeauty ? 'rounded-3xl' : 'rounded-2xl'}`}>
      Clique
    </button>
  </div>
);
```

**DEPOIS (padrão design system):**
```tsx
const { accent, classes, radius } = useBrutalTheme();

return (
  <div className={`${accent.bg} ${accent.text}`}>
    <button className={`${classes.buttonPrimary} ${radius.button}`}>
      Clique
    </button>
  </div>
);
```

---

*Última atualização: 2025-05-02*
*Versão: 2.0 — Arquitetura de tokens + useBrutalTheme*
