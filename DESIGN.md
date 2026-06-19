---
name: AgendiX
description: O sistema operacional do salão — agenda, financeiro e equipe em uma interface elegante e eficiente.
colors:
  # Barber theme
  barber-bg: "#12100E"
  barber-card: "#1A1816"
  barber-surface: "#21201C"
  barber-accent: "#C29B40"
  barber-accent-hover: "#D4AF50"
  barber-text: "#F0EBE0"
  barber-text-secondary: "#A89A82"
  barber-text-muted: "#6B6252"
  barber-border: "rgba(255,245,230,0.08)"
  # Barber Light
  barber-light-bg: "#E8E0D0"
  barber-light-card: "#FFFFFF"
  barber-light-surface: "#DDD6C6"
  barber-light-accent: "#8B6914"
  barber-light-accent-hover: "#A07A2A"
  barber-light-text: "#1A1610"
  barber-light-text-secondary: "#5A4D38"
  barber-light-card-elevated: "#F5F3EE"
  # Beauty theme
  beauty-bg: "#17132A"
  beauty-card: "#221F35"
  beauty-surface: "#2A2740"
  beauty-accent: "#B794F6"
  beauty-accent-hover: "#C9B8FF"
  beauty-text: "#EEE8FF"
  beauty-text-secondary: "#B5A9D0"
  beauty-text-muted: "#8A7DA8"
  beauty-border: "rgba(200,180,255,0.10)"
  # Beauty Light
  beauty-light-bg: "#EBE5F5"
  beauty-light-card: "#FFFFFF"
  beauty-light-surface: "#DDD4EF"
  beauty-light-accent: "#6B21A8"
  beauty-light-accent-hover: "#5B21B6"
  beauty-light-text: "#1A1225"
  beauty-light-text-secondary: "#4A3D65"
  beauty-light-card-elevated: "#F3F0FA"
  # Semantic
  success: "#10B981"
  danger: "#EF4444"
  warning: "#F59E0B"
  info: "#3B82F6"
typography:
  heading:
    fontFamily: "Chivo, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 500
  display:
    fontFamily: "Chivo, sans-serif"
    fontSize: "clamp(24px, 5vw, 32px)"
    fontWeight: 800
    lineHeight: "1.1"
  h1:
    fontFamily: "Chivo, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "1.2"
  h2:
    fontFamily: "Chivo, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "1.25"
  h3:
    fontFamily: "Chivo, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1.3"
  body-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.5"
  caption:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "1.4"
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
  space-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.barber-accent}"
    textColor: "#000000"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
    height: "44px"
  button-primary-beauty:
    backgroundColor: "{colors.beauty-accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
    height: "44px"
  button-secondary-barber:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.barber-text}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
    height: "44px"
  button-secondary-beauty:
    backgroundColor: "rgba(255,255,255,0.10)"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
    height: "44px"
  input-default:
    backgroundColor: "var(--color-input-bg)"
    textColor: "var(--color-text)"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  card-outlined:
    backgroundColor: "var(--color-card)"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  card-elevated:
    backgroundColor: "var(--color-card)"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  badge-accent:
    backgroundColor: "var(--color-accent-dim)"
    textColor: "var(--color-accent)"
    rounded: "{rounded.md}"
    padding: "2px 8px"
    height: "auto"
---

# Design System: AgendiX

## 1. Overview

**Creative North Star: "A Banca"**

A bancada do profissional. Cada ferramenta no lugar certo, visível sem esforço, acessível sem excesso. O AgendiX não é um dashboard que impressiona — é o espelho do salão: reflete o que importa, sem distorção. O dono do salão olha de relance e sabe: quem está agendado, quanto faturou, se está no lucro.

O sistema visual é **contido e elegante**. Cores accent carregam a identidade (ouro no barber, violeta no beauty) e aparecem apenas onde a ação acontece. O resto é superfície neutra e aquecida — nunca cinza puro, nunca frio. A tipografia é direta (Chivo para títulos, Inter para corpo) sem ornamento. Sombras existem para indicar camada, não para impressionar. A interface some e o serviço fica.

Cada tema é uma boca do salão: barbearia, beleza, tatuagem, clínica — todos compartilham a mesma bancada, cada um com sua cor. A arquitetura é extensível por design; adicionar um tema novo é trocar accent, superfície e tom, nunca reestruturar.

**Key Characteristics:**
- Committed color: accent carrega 30–60% da identidade, o resto é neutro aquecido
- Contained elegance: componentes táteis sem peso excessivo, ações confiantes, dados contidos
- Mobile-first e mobile-only para a maioria dos usuários
- Glass-border elevation: bordas semi-transparentes definem camada; sombra sobe com interação
- Extensible theming: data-theme + data-mode, sem hardcoded business logic
- Progressive disclosure: configurações começam colapsadas, o usuário avança no seu ritmo

## 2. Colors

O sistema de cor é committed — um accent saturado carrega a identidade do tema em 30–60% da superfície. Cada tema de negócio (barber, beauty, e futuros: tatto, clínicas) define seu próprio accent, background, e tons de superfície. O neutro é aquecido pelo accent, nunca cinza puro.

### Primary

- **Ouro Barateado** (#C29B40, barber accent): O coração do tema barber. Quente, lustrado, sofisticado. Usado em CTAs primários, indicadores de estado ativo, badges de destaque eHighlights estruturais. Hover: #D4AF50. Variação light: #A07A2A.
- **Violeta Neon** (#A78BFA, beauty accent): O coração do tema beauty. Difuso, tecnológico, moderno. Mesmo papel: CTAs, estados ativos, destaques. Hover: #C4B5FD. Variação light: #7C3AED.

### Neutral

- **Carvão Quente** (#12100E, barber bg): Fundo principal do barber dark. Quase preto, mas com micro-tepidez. Nunca #000 puro.
- **Papel Parchment Escuro** (#E8E0D0, barber light bg): Fundo principal do barber light. Parchment aquecido com peso gold, escuro o suficiente para elevar cards brancos. Gap de luminancia bg→card >8%.
- **Noite Profunda** (#17132A, beauty bg): Fundo principal do beauty dark. Navy profundo com sutil desvio violeta.
- **Lavanda Escura** (#EBE5F5, beauty light bg): Fundo principal do beauty light. Lavanda com substancia violeta.
- **Painel** (#21201C barber / #2A2740 beauty dark / #DDD6C6 barber light / #DDD4EF beauty light): Superficie elevada para sidebars, toolbars, paineis. No dark, mais claro que card. No light, mais escuro que bg para hierarquia correta.
- **Cartão** (#1A1816 barber / #221F35 beauty): Superfície principal de conteúdo. Camada entre bg e surface.
- **Borda Vidro** (rgba(255,245,230,0.08) barber / rgba(200,180,255,0.10) beauty): Bordas quase invisíveis que definem sem gritar. O "plexiglass" do sistema.
- **Texto Principal** (#F0EBE0 dark / #1A1610 barber light / #1A1225 beauty light): High-contrast para leitura confortável.
- **Texto Secundário** (#A89A82 barber / #B5A9D0 beauty): Informação complementar. Contrast ≥4.5:1 verificado.
- **Texto Mudo** (#6B6252 barber / #8A7DA8 beauty): Labels inativos, placeholders. Nunca abaixo de 3:1 contra bg.

### Semantic

- **Esmeralda** (#10B981): Sucesso, confirmações, saldos positivos.
- **Vermelho Alerta** (#EF4444): Erro, cancelamentos, saldos negativos. Dark. Light: #DC2626.
- **Âmbar** (#F59E0B): Aviso, atenção. Light: #D97706.
- **Azul Info** (#3B82F6): Informação rara. Usado com moderação.

**The Extensível Rule.** Cada tema de negócio define: accent, accent-hover, accent-dim, bg, card, surface, text, text-secondary, text-muted, border. Adicionar um tema (tatto, clínica) é adicionar um bloco de tokens — nunca modificar a estrutura.

**The No-Pure-Gray Rule.** Neutros são aquecidos pelo accent do tema. `neutral-600` (#A0A0A0) no barber é warm gray; `beauty-text-secondary` (#B8AED4) carrega o violeta. Cinza puro (#808080 sem desvio de hue) é proibido em texto ou superfície.

## 3. Typography

**Display Font:** Chivo (sans-serif, weight 800)
**Body Font:** Inter (system-ui fallback, weight 400/500)
**Label/Mono Font:** JetBrains Mono (monospace, weight 500)

**Character:** Uma dupla funcional — Chivo tem personalidade geométrica suficiente para títulos sem competir com Inter nos dados. Inter é o trabalho: legível em 12px, tabular em valores monetários, neutro o suficiente para o dia a dia do barbeiro. JetBrains Mono marca horários, preços e labels técnicas com precisão de instrumento.

### Hierarchy

- **Display** (weight 800, clamp(24px, 5vw, 32px), line-height 1.1): Título de página. Usado uma vez por tela, no PageHeader. Nunca abaixo de 24px mobile.
- **H1** (weight 700, 24px, line-height 1.2): Seção principal dentro de uma página.
- **H2** (weight 700, 20px, line-height 1.25): Título de card ou sub-seção importante.
- **H3** (weight 600, 18px, line-height 1.3): Sub-seção dentro de card.
- **Body** (weight 400, 16px e 14px, line-height 1.5): Texto corrido. Mínimo 16px em mobile. Line length máximo 65ch.
- **Caption** (weight 500, 12px, line-height 1.4, letter-spacing 0.05em): Labels, timestamps, dados em mini-células. Monospace. Nunca abaixo de 12px.

**The Tabular Money Rule.** Qualquer valor monetário usa `font-variant-numeric: tabular-nums`. Alinhamento de colunas em financeiro é funcional, não decorativo.

**The Single-Display Rule.** Display weight (800) aparece apenas no PageHeader h1. Qualquer outro título usa weight 600–700. A hierarquia depende de peso e tamanho, não de acrescentar uma1080 weight extra.

## 4. Elevation

O AgendiX usa **glass-border elevation**: superfícies são camadas definidas por tom e borda semi-transparente, não por sombras pesadas. No dark mode, bordas `rgba(255,255,255,0.05–0.10)` criam o efeito "plexiglass" — visível o suficiente para separar, sutil o suficiente para não gritar. No light mode, sombras sutis complementam a definição de camada.

Sombras sobem com interação: cards planos em repouso ganham sombra em hover. O accent pode criar glow (gold glow no barber, neon glow no beauty), mas glow é reservado para momentos — botão CTA, card elevado, indicador de estado ativo. Nunca como decoração genérica.

### Shadow Vocabulary

- **Rest** (`0 12px 40px -12px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,245,230,0.12)` dark / `0 8px 24px -8px rgba(accent,0.12), 0 2px 6px rgba(0,0,0,0.06)` light): Card em repouso. A inner border (`inset 0 0 0 1px`) é o vidro; a sombra é apenas profundidade mínima.
- **Hover** (`0 8px 24px rgba(accent,0.08), 0 4px 8px rgba(0,0,0,0.4)` dark, `0 4px 12px rgba(accent,0.10)` light): Card sob hover ou foco. Transição de 200ms ease-out.
- **Elevated** (`0 16px 36px -12px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(accent,0.15)`: Card com destaque — inner border ganha cor do accent. Glow sutil.
- **Modal** (`0 24px 64px -16px rgba(accent,0.18)` no light): Modais usam overlay backdrop-blur-md e bg escuro 55%.
- **Accent Glow** (`0 0 10px rgba(accent,0.4), 0 0 20px rgba(accent,0.2)`): Reservado para CTAs, indicadores ativos e momentos determinados. Nunca em repouso genérico.

**The Glass-By-Default Rule.** Cards em repouso são definidos por tom + borda de vidro, não por sombra. Sombora aparece como resposta a interação (hover, focus, elevation).

**The No-Double-Shadow Rule.** Nunca parear `border: 1px solid` com `box-shadow` de blur ≥ 16px no mesmo elemento. Escolha: borda de vidro OU sombra definida. O card usa inner-border inset; o botão primário usa shadow glow. Misturar os dois é o padrão ghost-card proibido.

## 5. Components

Componentes são **contidos e elegantes** — táteis o suficiente para o barbeiro encontrar no celular, contidos o suficiente para não competir com o conteúdo. Cada componente tem estado default, hover, focus, active, disabled e loading.

### Buttons

- **Shape:** Generosamente arredondado (Barber: `xl` 20px, Beauty: `xl` 20px). Nunca pill em botões de ação — pill é para badges.
- **Primary:** Accent bg, text preto (barber) ou branco (beauty). Shadow glow sutil. Hover: brightness + scale(0.97). Height: 44px (touch target).
- **Secondary:** Bg `white/0.06` com borda `white/0.15` (barber) ou `white/0.10` (beauty). Texto principal. Hover: `white/0.10`.
- **Ghost:** Transparente, texto accent. Hover: `white/0.05`. Para ações secundárias e navegação.
- **Danger/Success/Outline:** Semantic com bg accent-dim + borda + texto colorido. Nunca bg sólido vermelho/verde em botões — é o pattern do AgendiX.
- **Loading:** Spinner animado, opacity 50%, pointer-events none.
- **Sizes:** sm (h-9 desktop, 44px mobile), md (h-11), lg (h-[52px]).

### Cards / Containers

- **Corner Style:** `lg` (Barber) ou `2xl` (Beauty). A diferença de radius entre temas é intencional — barber é mais angular, beauty é mais soft.
- **Background:** Card bg (`var(--color-card)`) com glass-border inset.
- **Shadow Strategy:** Glass-border em repouso, shadow elevation em hover. Ver seção de Elevation.
- **Border:** Inset `1px rgba` transparente — o vidro do sistema.
- **Internal Padding:** 16–20px mobile, 20–32px desktop.
- **Variants:** `outlined` (borda + sem shadow) e `elevated` (shadow + glass border). Nunca ambos como decoração.

### Inputs / Fields

- **Style:** Height 44px mínimo. Radius `md` (Barber) ou `lg` (Beauty). Borda 1px cor do tema.
- **Focus:** Border accent + ring 1px accent. Nunca outline padrão do browser.
- **Error:** Border vermelho + bg `danger/10` + texto vermelho próximo ao campo. Inline, nunca no topo.
- **Disabled:** Opacity 50%, cursor not-allowed.
- **Label:** Caption size (12px), monospace, uppercase opcional. Acima do campo, 6px de gap.

### Badges / Chips

- **Style:** Accent bg-dim + accent texto + accent borda-dim. Inline. Radius `md` (Barber) ou `full` (Beauty).
- **Variants:** accent, danger, success, warning, neutral. Todas seguem o pattern: bg-X/10, text-X-400, border-X/20.
- **Typography:** 12px, bold, tracking-wide.

### Navigation

- **Sidebar** (desktop): Fixed 256px, bg surface, border-right divider. Itens accent-dim quando ativos, `white/0.04` em hover. Logo com glow animado no accent.
- **Bottom Mobile Nav**: Fixed bottom, rounded-2xl, glass background (`bg/40 backdrop-blur-2xl`). Botão central de ação (plus) é accent com shadow-promax-depth.
- **Header**: Fixed top, height 64px mobile / 80px desktop. Card bg com border-bottom divider. Profile avatar circular.

### Modal

- **Overlay:** `backdrop-blur-md`, bg escuro 70–80% opacity.
- **Container:** Card bg, radius `xl` (Barber) ou `2xl` (Beauty), shadow elevated, max-width 560px (default).
- **Enter:** fade + scale(0.95→1), 200ms ease-out.
- **Header:** Border-bottom, flex between, close button 44px touch target.

### Toggle Switch

- **Track:** 44×24px (md), `rounded-full`. Unchecked: `bg-white/0.04` com `border white/10`. Checked: accent bg.
- **Thumb:** 20×20px white, shadow sutil. Transição 200ms ease-out.
- **Focus:** Ring accent 30%.

## 6. Do's and Don'ts

### Do:

- **Do** usar accent color apenas em CTAs, estados ativos e indicadores — menos de 10% da superfície por tela.
- **Do** manter contraste ≥4.5:1 para texto principal e ≥3:1 para texto grande (≥18px ou bold ≥14px).
- **Do** usar glass-border (`inset 0 0 0 1px rgba(...)`) para definir cards em dark mode. É a identidade visual do AgendiX.
- **Do** testar em 390px sem scroll. Se o CTA principal não está visível sem scroll, o layout está errado.
- **Do** usar `font-variant-numeric: tabular-nums` em qualquer valor monetário ou numérico em coluna.
- **Do** garantir touch targets de 44×44px mínimo em todos os interativos mobile.
- **Do** usar `prefers-reduced-motion: reduce` para desabilitar todas as animações.
- **Do** manter a diferença de radius entre temas: barber é mais angular (8–16px), beauty é mais suave (12–24px).
- **Do** repetir o mesmo vocabulário de componente entre telas. Se o botão "Salvar" parece diferente em duas telas, um está errado.

### Don't:

- **Don't** usar cinza puro (#808080) em texto ou superfície. Neutros são sempre aquecidos pelo accent do tema.
- **Don't** usar `border-left` ou `border-right` > 1px como faixa colorida em cards ou list items. Proibido.
- **Don't** parear `border: 1px solid` com `box-shadow` de blur ≥ 16px no mesmo elemento. Escolha um.
- **Don't** usar glassmorphism como decoração. Blur e transparência são para modais e overlays, nunca para cards em repouso.
- **Don't** usar display font (weight 800) fora do PageHeader h1. Nunca em labels, botões ou dados.
- **Don't** mostrar big numbers + sparklines como hero-metric template. O financeiro não é exportação de CSV.
- **Don't** criar identical-card grids com ícone + heading + texto repetidos infinitamente.
- **Don't** usar tiny uppercase tracked eyebrow acima de cada seção ("SOBRE", "PROCESSO", "PREÇOS"). Um kicker nomeado como sistema de marca é voz; eyebrow em cada seção é gramática de AI.
- **Don't** animar width, height, top ou left. Apenas transform e opacity.
- **Don't** usar hero-metric template: big number, small label, sparkline, gradient accent. SaaS cliché proibido pelo PRODUCT.md.
- **Don't** usar `border-radius: 32px+` em cards, sections ou inputs. Cards: max 16–20px. Pills: full.