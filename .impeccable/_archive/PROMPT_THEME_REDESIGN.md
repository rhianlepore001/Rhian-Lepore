# Prompt: Redesign AgendiX Theme Colors & Elevation (Darks First, Then Lights)

## Sessão anterior

Critique completo foi executado em 2026-06-13. Score: 17/30 (Poor). O snapshot está em `.impeccable/critique/2026-06-13T00-00-00Z__design-system-tokens-css-and-theme-tokens.md`.

## Problemas diagnosticados (P0 e P1)

### P0 — Barber Dark: fundo flat sem profundidade, sem calor cromático
- `#121212` fundo + `#1E1E1E` card = gap de apenas ~5% luminância. Cards não se separam do bg.
- Neutros são cinza puro (`#A0A0A0`, `#525252`) — violam a No-Pure-Gray Rule do DESIGN.md.
- Gold accent (`#C29B40`) flutua sem raiz cromática nos neutros.
- Inner border `rgba(255,255,255,0.05)` imperceptível.
- `gradient-bg` existe nos tokens mas não chega aos componentes.

### P0 — Beauty Dark: roxo genérico sem profundidade
- `#1F1B2E` e `#A78BFA` são os valores default que toda AI gera para "dark purple SaaS".
- Sem gradiente atmosférico, sem variação tonal entre camadas.
- Accent neon grita sem cantar — falta sofisticação.

### P0 — Both Light themes: sem contraste, sem hierarquia, sem foco
- `text-secondary` barber light (`#6B5E45` sobre `#F5F1E8`) = ~3.8:1 (falha WCAG AA).
- `text-muted` `rgba(0,0,0,0.4)` sobre parchment = ~2.5:1 (grave).
- Card branco sobre bg parchment quase indistinguível (1.05:1 luminância).
- Nada se destaca, nada se recua — tudo compete.

### P1 — Neutros sem tinte cromático em ambos darks
- `#121212`, `#1E1E1E`, `#252525`, `#525252`, `#A0A0A0` = cinza puro sem desvio de hue.
- DESIGN.md diz "nunca cinza puro" mas tokens são exatamente isso.

### P1 — Shadows em dark não criam separação perceptível
- Sombra preta sobre fundo preto = invisível.
- Inner border 0.08 opacity imperceptível.
- Todos os cards recebem a mesma sombra — sem hierarquia de elevação.

## Decisões do usuário

1. **Começar pelos darks**, depois lights.
2. **Cores E elevação juntos** — são inseparáveis.
3. **Objetivo**: profundidade cromática (gradientes, ramps tonais), hierarquia visual (foco/defoco), personalidade atmosférica (o fundo deve sentir como "salão premium", não "VS Code dark mode").
4. **North Star**: "A Banca" — cada ferramenta no lugar certo, visível sem esforço.
5. **Componentes**: contidos e elegantes.
6. **Register**: product (design serve o produto).
7. **4 temas**: Barber Dark, Barber Light, Beauty Dark, Beauty Light. Os dois darks primeiro.

## Estratégia de redesign (por tema)

### Barber Dark — "Ouro sobre carvão quente"

Princípio: Neutros aquecidos em direção ao gold (hue ~75, chroma 0.01-0.03). Fundo com tinte marrom sutil. Cards se separam por luminância (gap >8%), não por sombra. Gradient atmosférico ativo.

**Valores propostos (OKLCH → hex):**

| Role | OKLCH proposto | Hex atual | Hex proposto | Nota |
|------|---------------|-----------|-------------|------|
| bg | oklch(13% 0.015 70) | #121212 | #12100E | Fundo com tinte marrom quente |
| card | oklch(19% 0.015 70) | #1E1E1E | #1A1816 | +6% luminância sobre bg, tinte gold |
| surface | oklch(22% 0.018 70) | #252525 | #21201C | Layer elevada, tinte mais quente |
| text | oklch(93% 0.008 75) | #EAEAEA | #F0EBE0 | Off-white aquecido (não cinza puro) |
| text-secondary | oklch(72% 0.02 70) | #A0A0A0 | #A89A82 | Warm gray com tinte gold explícito |
| text-muted | oklch(45% 0.015 70) | #525252 | #6B6252 | Warm brown-muted, legível |
| border | rgba warm | rgba(255,255,255,0.05) | rgba(255,245,230,0.08) | Border de vidro aquecida |
| border-strong | rgba warm | rgba(255,255,255,0.1) | rgba(255,245,230,0.14) | Border mais visível |
| input-bg | rgba warm | rgba(0,0,0,0.3) | rgba(20,16,10,0.5) | Inset feel aquecido |
| accent | — | #C29B40 | #C29B40 | Manter (gold é forte) |
| accent-hover | — | #D4AF50 | #D4AF50 | Manter |
| gradient-bg | — | não usado | radial-gradient(circle at 10% 90%, rgba(194,155,64,0.08) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(194,155,64,0.05) 0%, transparent 40%) | ATIVAR no bg dos layouts |

**Mudanças de elevação:**
- Inner border: `rgba(255,245,230,0.08)` → `rgba(255,245,230,0.12)` (mais visível)
- Shadow card: manter `shadow-promax-glass` mas trocar inner border
- Shadow card hover: adicionar tinte gold sutil: `0 8px 24px rgba(194,155,64,0.08), 0 4px 8px rgba(0,0,0,0.4)`
- Shadow elevated: inner border com `rgba(194,155,64,0.15)` (accent sutil na borda)
- Shadow modal: manter `shadow-promax-glass` com inner border atualizada

### Beauty Dark — "Violeta profundo, neon intencional"

Princípio: Fundo mais profundo e saturado (mais chroma violet). Cards com tinte violet sutil. Accent mais quente/sophisticado (menos "Tailwind default"). Gradient atmosférico violet ativo.

**Valores propostos (OKLCH → hex):**

| Role | OKLCH proposto | Hex atual | Hex proposto | Nota |
|------|---------------|-----------|-------------|------|
| bg | oklch(15% 0.035 280) | #1F1B2E | #17132A | +chroma violet, mais profundo |
| card | oklch(22% 0.03 280) | #2E2B3B | #221F35 | +6% luminância, tinte violet |
| surface | oklch(27% 0.028 280) | #3D3A4D | #2A2740 | Layer mais clara com tinte |
| text | oklch(93% 0.01 285) | #EAEAEA | #EEE8FF | Off-white com sopro violet |
| text-secondary | oklch(70% 0.04 280) | #B8AED4 | #B5A9D0 | Warm violet-gray |
| text-muted | oklch(42% 0.03 280) | #7B6F96 | #8A7DA8 | Mais legível, menos lavado |
| border | rgba violet | rgba(255,255,255,0.10) | rgba(200,180,255,0.10) | Border com tinte violet |
| border-strong | rgba violet | rgba(255,255,255,0.15) | rgba(200,180,255,0.16) | Mais visível |
| input-bg | rgba violet | rgba(255,255,255,0.05) | rgba(167,139,250,0.06) | Inset com tinte |
| accent | — | #A78BFA | #B794F6 | Mais quente, menos "Tailwind violet-400" |
| accent-hover | — | #C4B5FD | #C9B8FF | Hover mais luminoso |
| gradient-bg | — | parcial | radial-gradient(circle at 10% 90%, rgba(167,139,250,0.10) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(139,92,246,0.06) 0%, transparent 40%) | ATIVAR com mais opacidade |

**Mudanças de elevação:**
- Inner border: `rgba(200,180,255,0.10)` → `rgba(200,180,255,0.14)`
- Shadow card hover: `0 0 12px rgba(167,139,250,0.12), 0 8px 24px rgba(0,0,0,0.4)` (violet glow sutil)
- Shadow elevated: inner border com `rgba(167,139,250,0.15)`
- Accent shadow: manter neon mas com accent atualizado

### Both Light themes (FASE 2 — não fazer agora)

As direções gerais (desenhar na próxima sessão):

**Barber Light**: bg com gradiente warm → white. Text secondary `#5A4D38` (≥4.5:1). Text muted `rgba(0,0,0,0.55)`. Card com shadow elevado. Accent mais escuro `#8B6914`.

**Beauty Light**: bg com gradiente lavender sutil. Text secondary mais escuro. Accent `#5B21B6`. Mais sombra e contraste.

## Arquivos a modificar (em ordem)

1. **`design-system/tokens.css`** — Valores hex das CSS custom properties para os 2 darks. Trocar hex values nos blocos `:root` e `html[data-theme="barber"][data-mode="dark"]` e `html[data-theme="beauty"][data-mode="dark"]`. Também atualizar `gradient-bg` e `gradient-card`.

2. **`hooks/useBrutalTheme.ts`** — Atualizar `COLOR_MAP` com novos hex values para `barber.dark` e `beauty.dark`. Atualizar `SHADOW_MAP` com shadows com tinte accent. Atualizar `ACCENT_MAP` com accent colors novos (beauty accent `#B794F6`/`#C9B8FF`). Atualizar classes com shadow profissional.

3. **`index.html`** — Atualizar Tailwind config `obsidian` e `beauty` com novos hex. Atualizar shadow definitions. Atualizar gradient definitions. Atualizar CSS inline para overrides de tema dark.

4. **`DESIGN.md`** — Atualizar seção de Colors com novos hex para barber dark e beauty dark. Atualizar elevação.

5. **`.impeccable/design.json`** — Atualizar colorMeta com tonalRamps, shadows, e narrative.

## Verificação obrigatória

Após implementar:

```bash
npm run typecheck   # Deve passar sem erros
npm run lint        # Deve passar sem errors
npm run build       # Deve completar sem erros
```

Verificar visualmente (se possível com dev server):
- Barber Dark: cards se separam do bg? Texto secondary é legível? Gold accent se conecta com neutros aquecidos?
- Beauty Dark: fundo sente profundidade violet? Card se separa com tinte? Accent não parece "Tailwind default"?
- Ambos: gradient-bg está visível e sutil (não gritando)? Inner borders são perceptíveis mas não pesadas?

## Contexto do projeto

- **Register**: product (design SERVES o produto, não é brand landing)
- **Restrição**: `text-muted` precisa ≥3:1 contra bg. `text-secondary` precisa ≥4.5:1.
- **Arquitetura de tema**: `data-theme="barber|beauty"` + `data-mode="dark|light"` no `<html>`. Tokens via CSS custom properties em `tokens.css`. Hook `useBrutalTheme()` retorna classes Tailwind estáticas.
- **Regras do AGENTS.md**: multi-tenant (company_id), HashRouter (links `/#/rota`), mobile-first (390px), React.lazy + Suspense.
- **DESIGN.md atualizado**: está em formato Stitch com YAML frontmatter. North Star: "A Banca".