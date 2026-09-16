---
name: AgendiX Marketing
description: Vitrine universal — ficha de cliente no balcão. Não usa os temas de app barber/beauty.
colors:
  paper: "#E9E4D8"
  paper-2: "#F4EFE6"
  ink: "#241F1A"
  ink-soft: "#5A534A"
  ink-hover: "#3A342E"
  rule: "#C9C1B4"
  accent: "#241F1A"
  on-accent: "#F4EFE6"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontWeight: 800
    fontSize: "clamp(2.5rem, 8vw, 4.5rem)"
    lineHeight: "0.94"
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Archivo, sans-serif"
    fontWeight: 700
    fontSize: "clamp(2.125rem, 5.4vw, 3.25rem)"
  pillar:
    fontFamily: "Archivo, sans-serif"
    fontWeight: 800
    fontSize: "clamp(2.125rem, 5vw, 3.125rem)"
  display-sm:
    fontFamily: "Archivo, sans-serif"
    fontWeight: 800
    fontSize: "2.25rem"
  h3:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontWeight: 700
    fontSize: "1.25rem"
  price:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontWeight: 700
    fontSize: "1.75rem"
  lede:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontWeight: 400
    fontSize: "1.125rem"
  body:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontWeight: 400
    fontSize: "1.0625rem"
    lineHeight: "1.55"
  meta:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontWeight: 400
    fontSize: "0.9375rem"
rounded:
  none: "0"
  sm: "2px"
spacing:
  space-2: "8px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
  space-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "0.85rem 1.4rem"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.85rem 1.4rem"
    height: "48px"
---

# Design System: AgendiX Marketing (landing)

Superfície Persuade em `pages/Landing.tsx`. O app autenticado continua em `DESIGN.md` da raiz (barber/beauty). Esta ficha não herda ouro, violeta, Inter nem Chivo.

## Overview

**North star: a ficha do cliente no balcão.** Cartolina crua, tinta de carvão, foto grampeada. Uma marca para barbearia e salão. Whitespace. Sem “escolha o seu visual”.

## Colors

Restrained: papel quente + carvão. O acento **é** o carvão do botão. Sem ouro de barbearia, sem lavanda de salão, sem gradiente.

- Paper `#E9E4D8` — cartolina, mais oliva que o beige de template.
- Ink `#241F1A` — texto, regras fortes, CTA.
- Ink-soft `#5A534A` — corpo secundário, tintado no papel (nunca cinza puro).
- Rule `#C9C1B4` — filete de formulário.

## Typography

Archivo condensada (800) no display — cabeçalho de ficha, não cartaz industrial em caixa alta. Atkinson Hyperlegible no corpo (leitura no celular). Preços em tabular-nums na mesma família. Sem Inter, IBM Plex, Fraunces, Big Shoulders.

## Layout

Medida do corpo ~58ch. Mais espaço acima do H2 do que abaixo. Hero assimétrico (texto + print). Pilares em stack tipográfico, não grid de ícones. Preço em duas colunas iguais; no mobile o sticky some quando `#preco` entra.

## Elevation & Depth

Quase plano. A foto do produto tem uma sombra deslocada (foto sobre cartolina). Sem glass, sem halo de acento.

## Shapes

Canto 2px. Sem pill em botão de ação. A crease do hero é um arco SVG de 1.5px, não um card.

## Components

Botão primário: carvão cheio, texto papel. Ghost: filete. FAQ: `<details>`. Moldura de print: papel-2 + filete, caption abaixo (nunca overlay no print).

## Do's and Don'ts

- **Do** usar os prints DEMO reais.
- **Do** falar barbearia e salão na mesma frase.
- **Don't** aplicar `data-theme=barber` / beauty na LP.
- **Don't** Inter, gradiente roxo, glass, cards aninhados, depoimento fake, +40%.
