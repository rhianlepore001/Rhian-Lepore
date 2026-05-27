# Design — AgendiX

## Color

### Strategy

Committed: roxo/violeta (beauty) e dourado (barber) carregam 30–60% da identidade. O resto é neutro aquecido, nunca cinza puro.

### Barber Theme (Dark default)

- **Background:** `#0D0A08` (quente, quase marrom, nunca #000)
- **Card:** `#14110F` com borda `rgba(255,255,255,0.05)`
- **Surface:** `#1A1612` para elementos elevados
- **Text primary:** `#F5F1E8` (off-white aquecido)
- **Text secondary:** `#A69A85` (warm gray)
- **Text muted:** `rgba(255,255,255,0.35)`
- **Accent (gold):** `#C29B40` — destaques, CTAs, indicadores positivos
- **Accent hover:** `#D4AF50`
- **Borders:** `rgba(255,255,255,0.05)` — quase invisíveis, definem sem gritar

### Barber Theme (Light)

- **Background:** `#F5F1E8` (warm parchment)
- **Card:** `#FFFFFF`
- **Surface:** `#EDE9E0`
- **Text primary:** `#1A1A1A`
- **Text secondary:** `#6B5E45`
- **Text muted:** `rgba(0,0,0,0.40)`
- **Accent (gold):** `#A07A2A` (mais escuro para contraste no light)
- **Accent hover:** `#B8892F`
- **Borders:** `rgba(0,0,0,0.08)`

### Beauty Theme (Dark)

- **Background:** `#1E1B2E` (deep purple-navy)
- **Card:** `#252236` com borda `rgba(255,255,255,0.10)`
- **Surface:** `#3D3A4D`
- **Text primary:** `#F5F5FF` (off-white com tinte lilás)
- **Text secondary:** `#B8AED4`
- **Text muted:** `#7B6F96`
- **Accent (neon purple):** `#A78BFA` — destaques, CTAs
- **Accent hover:** `#C4B5FD`
- **Borders:** `rgba(255,255,255,0.08)`

### Beauty Theme (Light)

- **Background:** `#F7F5FF` (lavender mist)
- **Card:** `#FFFFFF`
- **Surface:** `#EDE8FF`
- **Text primary:** `#1A1225`
- **Text secondary:** `#5B4D7A`
- **Text muted:** `rgba(0,0,0,0.35)`
- **Accent (purple):** `#7C3AED`
- **Accent hover:** `#6D28D9`
- **Borders:** `rgba(124,58,237,0.12)`

### Semantic Colors

- **Success:** `#10B981` (emerald)
- **Danger:** `#EF4444` (red)
- **Warning:** `#F59E0B` (amber)
- **Info:** `#3B82F6` (blue, raro)

## Typography

### Font Family

- **Heading:** Inter (fallback: system-ui) — peso 700/800
- **Body:** Inter (fallback: system-ui) — peso 400/500
- **Label/Mono:** JetBrains Mono ou monospace — peso 500, usado para datas, horários, valores monetários

### Scale

| Token | Size | Line-height | Weight | Usage |
|-------|------|-------------|--------|-------|
| display | 32px | 1.1 | 800 | Título de página (mobile: 24px) |
| h1 | 24px | 1.2 | 700 | Seção principal |
| h2 | 20px | 1.25 | 700 | Card title |
| h3 | 18px | 1.3 | 600 | Sub-seção |
| body | 16px | 1.5 | 400 | Texto corrido (mínimo 16px no mobile) |
| body-sm | 14px | 1.5 | 400 | Descrições secundárias |
| caption | 12px | 1.4 | 500 | Labels, timestamps (uppercase opcional) |

### Rules

- Nunca < 12px em qualquer tela.
- Valores monetários em tabular nums (font-variant-numeric: tabular-nums).
- Line length máximo 65ch em textos longos.

## Spacing

### Scale (4pt base)

| Token | Value |
|-------|-------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 20px |
| space-6 | 24px |
| space-8 | 32px |
| space-10 | 40px |
| space-12 | 48px |
| space-16 | 64px |

### Rhythm

- Cards: padding interno 24px–32px (mobile: 16px–24px)
- Entre cards: 16px–24px
- Entre seções: 32px–48px
- Header de card: padding 20px–24px com border-bottom sutil

## Radius

| Token | Value |
|-------|-------|
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| full | 9999px |

**Usage:**
- Cards: `lg` (16px) ou `xl` (20px) para premium
- Buttons: `xl` (20px) ou `2xl` (24px)
- Inputs: `md` (12px) ou `lg` (16px)
- Badges/Avatares: `full`
- Modais: `xl` (20px) ou `2xl` (24px)

## Elevation / Shadows

### Light Mode

- **Card default:** `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)`
- **Card hover:** `0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)`
- **Card elevated:** `0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)`
- **Modal:** `0 24px 48px rgba(0,0,0,0.12), 0 12px 24px rgba(0,0,0,0.08)`

### Dark Mode

- **Card default:** sombra mínima ou nenhuma. Diferenciação via border + bg layer.
- **Card hover:** `0 4px 12px rgba(0,0,0,0.3)`
- **Card elevated:** `0 8px 24px rgba(0,0,0,0.4)`
- **Glow accent:** `0 0 20px rgba(accent, 0.15)` (uso parcimonioso)

## Tokens de Shadow (useBrutalTheme)

| Token | Barber Dark | Beauty Dark | Light (ambos) |
|-------|-------------|-------------|---------------|
| `shadow.card` | `shadow-promax-glass` | `shadow-promax-glass` | `shadow-soft` |
| `shadow.cardHover` | `hover:shadow-promax-depth` | `hover:shadow-neon` | `hover:shadow-soft-lg` |
| `shadow.elevated` | `shadow-promax-depth` | `shadow-neon-strong` | `shadow-soft-lg` |
| `shadow.modal` | `shadow-promax-glass` | `shadow-promax-glass` | `shadow-soft-lg` |
| `shadow.glow` | `shadow-gold` | `shadow-neon-strong` | `shadow-gold` / `shadow-neon` |
| `shadow.button` | `shadow-gold` | `shadow-neon` | `shadow-gold` / `shadow-neon` |

## Tokens de Focus (useBrutalTheme)

| Token | Barber Dark | Beauty Dark | Light (ambos) |
|-------|-------------|-------------|---------------|
| `focus.ring` | `ring-accent-gold/30` | `ring-beauty-neon/30` | `ring-accent-gold/40` / `ring-beauty-neon/30` |
| `focus.ringOffset` | `ring-offset-brutal-card` | `ring-offset-beauty-card` | `ring-offset-white` |

## Components

### BrutalCard

- Container com radius `lg`/`xl`, overflow hidden
- Camadas de craft: noise texture (2% opacity) + gradiente suave de cima para baixo (3% white)
- Header opcional: flex between, border-bottom sutil, bg `white/[0.02]`
- Content: padding padronizado (24px desktop, 16px mobile)
- Variants: default, accent (borda accent + shadow accent), glow (shadow glow forte)

### BrutalButton

- Variants: primary, secondary, danger, ghost, success, outline
- Sizes: sm (h-9), md (h-12), lg (h-15)
- Radius: `xl`/`2xl` (arredondado generoso)
- Loading state: spinner animado, disabled
- Icon support: antes ou depois do texto
- Hover: brightness + scale 0.97 (micro-interaction)
- Craft layers: noise 5% + gradiente hover (10% white, opacity 0 → 100%)

### Input

- Height: 48px mínimo (touch target)
- Radius: `md`/`lg`
- Border: 1px, cor do tema. Focus: border accent + ring-0 (sem outline padrão)
- Background: ligeiramente mais escuro que o card (inset feel)
- Label: caption size, uppercase, muted color
- Error: border red + bg red/10 + texto red. Próximo ao campo.

### Badge

- Radius: `full`
- Sizes: inline (px-2 py-0.5)
- Variants: accent, danger, success, warning, neutral
- Uppercase, letter-spacing wide, font-bold

### Table (desktop)

- Header: caption style, uppercase, muted
- Row: hover `bg-white/[0.03]` (dark) ou `bg-black/[0.02]` (light)
- Zebra: opcional, cores muito sutis (não preto/branco cru)
- Cell padding: 12px 16px
- Mobile: converte para cards de transação

### Modal

- Overlay: backdrop-blur-md, bg escuro com 70–80% opacity
- Container: radius `xl`, shadow elevated, max-width 90vw
- Animate-in: fade + zoom 95%
- Header: border-bottom, flex between com close button

### Toggle Switch

- Track: 48×24px, radius full
- Thumb: 20×20px, shadow sutil
- Transition: 200ms ease-out
- Checked: bg accent

## Motion

### Tokens

| Token | Duration | Easing |
|-------|----------|--------|
| fast | 150ms | ease-out |
| normal | 200ms | ease-out |
| slow | 300ms | ease-out-quart |
| enter | 300ms | ease-out-quart |
| exit | 200ms | ease-in |

### Rules

- Nunca animar width/height/top/left. Só transform e opacity.
- Hover em cards: translateY(-2px) + shadow elevation (desktop only)
- Press em buttons: scale(0.97)
- Stagger em listas: 30–50ms por item
- Reduced motion: disable todas as transições

## Responsive

### Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |

### Mobile-first

- Base: 320px–390px (iPhone SE / 13 mini)
- Todos os layouts começam mobile e escalam para cima
- Sidebar vira bottom nav ou hamburger < 768px
- Tabelas viram cards < 768px
- Fonte base: 16px (nunca menor — evita zoom do iOS)

## Theme Switching

- Barber: dark default, light option
- Beauty: dark default, light option
- Data attributes: `data-theme="barber|beauty"`, `data-mode="dark|light"`
- Transição entre temas: 300ms ease em background, color, border-color
