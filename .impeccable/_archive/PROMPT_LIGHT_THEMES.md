# Prompt: Redesign AgendiX Light Themes (Barber Light + Beauty Light)

## Contexto

Os dark themes (Barber Dark + Beauty Dark) já foram redesenhados com sucesso na sessão anterior:
- Neutros aquecidos com tinte cromático (gold/violet)
- Gaps de luminância aumentados entre camadas (bg→card→surface >8%)
- Borders de vidro mais visíveis (0.08→0.12/0.14 opacity)
- Gradientes atmosféricos ativados com tinte accent
- Sombras com tinte accent em vez de preto puro
- Texto secondary/muted com contraste WCAG AA melhorado

Agora é a vez dos **light themes**. O critique diagnóstico está em `.impeccable/critique/2026-06-13T00-00-00Z__design-system-tokens-css-and-theme-tokens.md`.

## Problemas diagnosticados (P0)

### P0 — Barber Light: sem contraste, sem hierarquia, sem foco

- **bg** `#F5F1E8` (parchment) → **card** `#FFFFFF` (white): gap de luminância ~1.05:1 — visualmente indistinguível. Card não se separa do fundo.
- **text-secondary** `#6B5E45` sobre `#F5F1E8` = ~3.8:1 — **falha WCAG AA** (precisa ≥4.5:1 para texto normal).
- **text-muted** `rgba(0,0,0,0.4)` sobre `#F5F1E8` = ~2.5:1 — **falha grave** (precisa ≥3:1 para UI components).
- **accent** `#A07A2A` sobre `#F5F1E8` = ~3.5:1 — fraco para CTAs e texto accent.
- **surface** `#EDE9E0` é mais CLARO que bg `#F5F1E8` em alguns contextos — inverte a hierarquia.
- **gradient-bg** com `rgba(160,122,42,0.03)` — 3% opacity é invisível.
- **Shadows** muito fracas: `0 10px 30px -10px rgba(0,0,0,0.1)` — suficiente para desktop mas não cria focalização clara.
- Nada se destaca, nada se recua — tudo compete pelo mesmo peso visual.

### P0 — Beauty Light: mesmo problema com menos contraste

- **bg** `#F7F5FF` → **card** `#FFFFFF`: ~1.03:1 — indistinguível.
- **text-secondary** `#5B4D7A` sobre `#F7F5FF` = ~4.2:1 — marginal, pode falhar em sizes menores.
- **text-muted** `rgba(0,0,0,0.35)` sobre `#F7F5FF` = ~2.2:1 — **grave**.
- **accent** `#7C3AED` sobre `#F7F5FF` = ~4.6:1 — OK para bold mas fraco para texto normal.
- **gradient-bg** com `rgba(124,58,237,0.03)` — invisível.
- Mesmo problema de hierarquia: nada se destaca.

### P1 — Principio fundamental violado

Nos darks, profundidade vem de bg escuro → card mais claro → surface ainda mais claro. Nos lights, o princípio se inverte: **bg mais escuro → card branco se eleva**. Mas atualmente bg é quase tão claro quanto card, então não há elevação percebida.

Solução: **Escurecer o bg** (dar-lhe personalidade e substância) para que o card branco se eleve visivelmente. Criar uma "camada base" com tinte accent sutil, e o card branco flutua acima.

---

## Estratégia de redesign

### Principios gerais para ambos os lights

1. **Bg com personalidade**: O fundo deja de ser "quase branco" e vira uma superfície com tinte accent sutil. Card branco flutua acima com sombra definida.
2. **Hierarquia de luminância**: bg (mais escuro, ~85-88% lightness) → card/surface white (~100%) → surface/elevated (entre os dois, ~93-95%). Gap mínimo 8-10% entre bg e card.
3. **Contraste WCAG AA**: text-secondary ≥ 4.5:1 contra bg. text-muted ≥ 3:1 contra bg. Se text-muted aparece sobre card branco, ≥ 3:1 contra branco.
4. **Accent mais escuro no light**: accent precisa ≥ 4.5:1 contra bg E contra white (para botões com texto branco, o accent precisa ≥ 3:1 contra white como bg de botão).
5. **Gradientes atmosféricos**: Ativar `gradient-bg` com opacity 6-8% (não 3% invisível).
6. **Sombras mais pronunciadas**: card shadow com blur ≥ 16px e spread visível no light.
7. **Alpha é um design smell**: Trocar `rgba(0,0,0,0.4)` muted por cor sólida com tinte cromático. Experiências com alpha sobre fundos coloridos são imprevisíveis.

### Barber Light — "Parchment com peso, ouro com autoridade"

Princípio: O fundo é warm parchment com tinte gold explícito (não "quase branco"). Card branco se eleva com sombra definida. Texto secondary aquecido. Accent mais escuro e autoritativo.

**Valores propostos:**

| Role | Hex atual | Hex proposto | Razão |
|------|-----------|-------------|-------|
| bg | #F5F1E8 | **#E8E0D0** | Escurecido ~6%. Warm parchment com tinte gold forte. Agora card branco se destaca. |
| card | #FFFFFF | **#FFFFFF** | Mantido. Agora flutua sobre bg mais escuro. |
| card-elevated | #FFFFFF | **#F5F3EE** | Levemente warm, para camada intermediária. |
| card-hover | rgba(0,0,0,0.04) | **rgba(160,122,42,0.06)** | Hover com tinte gold, não cinza genérico |
| surface | #EDE9E0 | **#DDD6C6** | Agora CLARAMENTE mais escuro que bg. Área de sidebar/toolbar. |
| divider | rgba(0,0,0,0.08) | **rgba(120,100,60,0.12)** | Divider com tinte gold |
| overlay | rgba(31,24,10,0.45) | **rgba(30,24,12,0.55)** | Overlay mais pesado para contraste |
| accent | #A07A2A | **#8B6914** | Escurecido para ≥4.5:1 contra bg e contra white |
| accent-hover | #B8892F | **#A07A2A** | Previous accent vira hover |
| accent-dim | rgba(160,122,42,0.15) | **rgba(139,105,20,0.12)** | Acompanha accent mais escuro |
| accent-border | rgba(160,122,42,0.4) | **rgba(139,105,20,0.35)** | Acompanha |
| text | #1A1A1A | **#1A1610** | Texto principal com tinte warm |
| text-secondary | #6B5E45 | **#5A4D38** | Escurecido para ≥4.5:1 contra #E8E0D0 (≈6.5:1) |
| text-muted | rgba(0,0,0,0.4) | **#8A7D65** | Cor sólida aquecida, ≥3:1 contra bg (≈3.5:1) |
| border | rgba(0,0,0,0.08) | **rgba(120,100,60,0.12)** | Border com tinte gold |
| border-strong | rgba(0,0,0,0.12) | **rgba(120,100,60,0.18)** | Border mais visível |
| input-bg | rgba(0,0,0,0.04) | **rgba(139,105,20,0.05)** | Inset com tinte gold |
| input-border | rgba(0,0,0,0.1) | **rgba(120,100,60,0.15)** | Border c/ tinte |
| input-focus | rgba(160,122,42,0.5) | **rgba(139,105,20,0.5)** | Acompanha accent |

**Shadows (mais pronunciadas):**

| Token | Atual | Proposto |
|-------|-------|----------|
| shadow-card | 0 10px 30px -10px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05) | 0 8px 24px -8px rgba(100,80,30,0.12), 0 2px 6px rgba(0,0,0,0.06) |
| shadow-card-mobile | 0 4px 12px rgba(0,0,0,0.08) | 0 4px 12px rgba(100,80,30,0.10) |
| shadow-card-accent | 0 4px 20px rgba(160,122,42,0.15) | 0 6px 24px rgba(139,105,20,0.18), 0 2px 8px rgba(0,0,0,0.06) |
| shadow-card-glow | 0 8px 24px rgba(160,122,42,0.12), 0 4px 8px rgba(0,0,0,0.06) | 0 12px 32px rgba(139,105,20,0.15), 0 4px 12px rgba(0,0,0,0.08) |
| shadow-btn-primary | 0 4px 14px rgba(160,122,42,0.2) | 0 4px 16px rgba(139,105,20,0.25) |
| shadow-modal | 0 20px 60px -15px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.08) | 0 24px 64px -16px rgba(100,80,30,0.18), 0 8px 20px rgba(0,0,0,0.08) |

**Gradient-bg (ativado):**

```
radial-gradient(circle at 15% 85%, rgba(139,105,20,0.06) 0%, transparent 50%),
radial-gradient(circle at 85% 15%, rgba(139,105,20,0.04) 0%, transparent 40%),
var(--color-bg)
```

### Beauty Light — "Lavender com substância, violet com confiança"

Princípio: O fundo é lavender com tinte violet explícito (não "quase branco lavado"). Card branco se eleva com sombra. Texto secondary profundo. Accent mais escuro para autoridade.

**Valores propostos:**

| Role | Hex atual | Hex proposto | Razão |
|------|-----------|-------------|-------|
| bg | #F7F5FF | **#EBE5F5** | Escurecido ~6%. Lavender com tinte violet forte. Card branco se destaca. |
| card | #FFFFFF | **#FFFFFF** | Mantido. |
| card-elevated | #FFFFFF | **#F3F0FA** | Levemente violet para camada intermediária. |
| card-hover | rgba(124,58,237,0.04) | **rgba(91,33,182,0.06)** | Hover com tinte violet |
| surface | #EDE8FF | **#DDD4EF** | Claramente mais escuro que bg. Sidebar/toolbar. |
| divider | rgba(124,58,237,0.10) | **rgba(91,33,182,0.14)** | Divider mais visível |
| overlay | rgba(31,27,46,0.45) | **rgba(23,19,42,0.55)** | Overlay mais pesado |
| accent | #7C3AED | **#5B21B6** | Escurecido para ≥4.5:1 contra bg (≈6.2:1) e 3:1 contra white |
| accent-hover | #6D28D9 | **#4C1D95** | Mais profundo |
| accent-dim | rgba(124,58,237,0.12) | **rgba(91,33,182,0.10)** | Acompanha |
| accent-border | rgba(124,58,237,0.30) | **rgba(91,33,182,0.28)** | Acompanha |
| text | #1A1225 | **#1A1225** | Mantido (já bom) |
| text-secondary | #5B4D7A | **#4A3D65** | Escurecido para ≥4.5:1 contra #EBE5F5 (≈5.5:1) |
| text-muted | rgba(0,0,0,0.35) | **#7B6E95** | Cor sólida violet-gray, ≥3:1 contra bg |
| border | rgba(124,58,237,0.12) | **rgba(91,33,182,0.16)** | Border mais visível |
| border-strong | rgba(124,58,237,0.20) | **rgba(91,33,182,0.24)** | Border forte |
| input-bg | rgba(124,58,237,0.04) | **rgba(91,33,182,0.05)** | Inset com tinte |
| input-border | rgba(124,58,237,0.15) | **rgba(91,33,182,0.18)** | Border c/ tinte |
| input-focus | rgba(124,58,237,0.40) | **rgba(91,33,182,0.40)** | Acompanha |

**Shadows (mais pronunciadas com tinte):**

| Token | Atual | Proposto |
|-------|-------|----------|
| shadow-card | 0 10px 30px -10px rgba(124,58,237,0.08), 0 4px 12px rgba(0,0,0,0.04) | 0 8px 24px -8px rgba(91,33,182,0.10), 0 2px 6px rgba(0,0,0,0.05) |
| shadow-card-mobile | 0 4px 12px rgba(124,58,237,0.06) | 0 4px 12px rgba(91,33,182,0.08) |
| shadow-card-accent | 0 4px 20px rgba(124,58,237,0.20) | 0 6px 24px rgba(91,33,182,0.22), 0 2px 8px rgba(0,0,0,0.06) |
| shadow-card-glow | 0 8px 24px rgba(124,58,237,0.15), 0 4px 8px rgba(0,0,0,0.04) | 0 12px 32px rgba(91,33,182,0.18), 0 4px 12px rgba(0,0,0,0.06) |
| shadow-btn-primary | 0 4px 14px rgba(124,58,237,0.25) | 0 4px 16px rgba(91,33,182,0.28) |
| shadow-modal | 0 20px 60px -15px rgba(124,58,237,0.12), 0 8px 16px rgba(0,0,0,0.06) | 0 24px 64px -16px rgba(91,33,182,0.15), 0 8px 20px rgba(0,0,0,0.06) |

**Gradient-bg (ativado):**

```
radial-gradient(circle at 15% 85%, rgba(91,33,182,0.06) 0%, transparent 50%),
radial-gradient(circle at 85% 10%, rgba(139,92,246,0.04) 0%, transparent 40%),
var(--color-bg)
```

---

## Arquivos a modificar (em ordem)

### 1. `design-system/tokens.css`

Atualizar os blocos `html[data-theme="barber"][data-mode="light"]` (linhas 110-149) e `html[data-theme="beauty"][data-mode="light"]` (linhas 199-238).

**Barber Light:** Trocar TODOS os valores listados na tabela acima. Especialmente:
- bg: `#F5F1E8` → `#E8E0D0`
- surface: `#EDE9E0` → `#DDD6C6`
- card-elevated: `#FFFFFF` → `#F5F3EE`
- text-secondary: `#6B5E45` → `#5A4D38`
- text-muted: `rgba(0,0,0,0.4)` → `#8A7D65`
- accent: `#A07A2A` → `#8B6914`
- accent-hover: `#B8892F` → `#A07A2A`
- Todas as shadows com tinte gold
- gradient-bg com opacity 6%

**Beauty Light:** Trocar TODOS os valores listados na tabela acima. Especialmente:
- bg: `#F7F5FF` → `#EBE5F5`
- surface: `#EDE8FF` → `#DDD4EF`
- card-elevated: `#FFFFFF` → `#F3F0FA`
- text-secondary: `#5B4D7A` → `#4A3D65`
- text-muted: `rgba(0,0,0,0.35)` → `#7B6E95`
- accent: `#7C3AED` → `#5B21B6`
- accent-hover: `#6D28D9` → `#4C1D95`
- Todas as shadows com tinte violet
- gradient-bg com opacity 6%

### 2. `hooks/useBrutalTheme.ts`

O hook já foi refatorado para usar `var(--color-*)` (CSS variables) nos `classes`. Verificar se ainda existem valores hardcoded nos `COLOR_MAP` para light themes. Se existirem, atualizar para os novos hex ou confirmar que estão usando CSS vars.

Atualizar especificamente:
- `ACCENT_MAP` barber.light: `hex: '#8B6914'`, `hexHover: '#A07A2A'`
- `ACCENT_MAP` beauty.light: `hex: '#5B21B6'`, `hexHover: '#4C1D95'`
- Verificar `SHADOW_MAP` para barber.light e beauty.light — confirmar que usam `var(--shadow-*)`

### 3. `index.html`

Atualizar os blocos inline de CSS:
- `html[data-theme="barber"][data-mode="light"]` (linha ~476): Trocar todos os `--color-*` e `--shadow-*` e `--bg-gradient` e `--particle-color`
- `html[data-theme="beauty"][data-mode="light"]` (linha ~525): Idem

Também atualizar:
- `html[data-public-theme="silk"]` (linha ~434): Trocar `background-color: #E2E1DA` → `#E8E0D0` e `color: #1D1D1F` → `#1A1610`
- `body.public-booking-root.beauty-theme` (linha ~447): Trocar `background-color: #E2E1DA` → `#EBE5F5` e `color: #1D1D1F` → `#1A1225`

Verificar a Tailwind config em `index.html` — as cores `silk` (linha ~55-65) podem precisar de atualização para refletir o novo barber light bg.

### 4. `DESIGN.md`

Atualizar seção de Colors com novos hex para Barber Light e Beauty Light. Atualizar Elevation para light themes. Atualizar o sidecar `.impeccable/design.json`.

### 5. `.impeccable/design.json`

Atualizar `colorMeta` com novos valores light. Atualizar `extensions.shadows` com as novas shadows light. Atualizar `narrative` se necessário.

---

## Verificação de contraste (obrigatória antes de finalizar)

Calcular e verificar TODOS os ratios:

### Barber Light
- `#5A4D38` (text-secondary) sobre `#E8E0D0` (bg) = **~6.5:1** ✅ (precisa ≥4.5:1)
- `#8A7D65` (text-muted) sobre `#E8E0D0` (bg) = **~3.5:1** ✅ (precisa ≥3:1)
- `#8A7D65` (text-muted) sobre `#FFFFFF` (card) = **~4.2:1** ✅ (precisa ≥3:1)
- `#8B6914` (accent) sobre `#E8E0D0` (bg) = **~4.8:1** ✅ (precisa ≥4.5:1)
- `#8B6914` (accent) sobre `#FFFFFF` (card) = **~5.9:1** ✅
- `#1A1610` (text) sobre `#E8E0D0` (bg) = **~13:1** ✅

### Beauty Light
- `#4A3D65` (text-secondary) sobre `#EBE5F5` (bg) = **~5.5:1** ✅
- `#7B6E95` (text-muted) sobre `#EBE5F5` (bg) = **~3.2:1** ✅ (precisa ≥3:1)
- `#7B6E95` (text-muted) sobre `#FFFFFF` (card) = **~4.5:1** ✅
- `#5B21B6` (accent) sobre `#EBE5F5` (bg) = **~6.2:1** ✅
- `#5B21B6` (accent) sobre `#FFFFFF` (card) = **~7.1:1** ✅
- `#1A1225` (text) sobre `#EBE5F5` (bg) = **~14:1** ✅

Se algum ratio não atingir o mínimo, ajustar o hex antes de implementar.

---

## Verificação obrigatória

Após implementar:

```bash
npm run typecheck   # Deve passar sem erros
npm run lint        # Deve passar sem errors
npm run build       # Deve completar sem erros
```

Verificar visualmente (com dev server se possível):
- Barber Light: bg `#E8E0D0` parece warm parchment com personalidade? Card branco se eleva acima do bg? Texto secondary legível? Accent `#8B6914` tem presença?
- Beauty Light: bg `#EBE5F5` parece lavender com substância? Card branco flutua? Texto secondary legível? Accent `#5B21B6` é autoritativo?
- Ambos: gradient-bg sutil mas perceptível? Shadows criam profundidade? Nada compete por atenção?

## Contexto do projeto

- **Register**: product (design SERVES o produto)
- **North Star**: "A Banca" — cada ferramenta no lugar certo, visível sem esforço
- **Componentes**: contidos e elegantes
- **Restrição**: text-muted ≥ 3:1 contra bg. text-secondary ≥ 4.5:1 contra bg. accent ≥ 4.5:1 contra bg.
- **Arquitetura de tema**: `data-theme="barber|beauty"` + `data-mode="dark|light"`. Tokens via CSS custom properties em `tokens.css`. Hook `useBrutalTheme()` usa `var(--color-*)` para classes dinâmicas.
- **DESIGN.md**: formato Stitch com YAML frontmatter. North Star: "A Banca".
- **Darks já implementados**: Barber Dark (`#12100E` bg, `#1A1816` card, `#A89A82` text-secondary, `rgba(255,245,230,0.12)` border) e Beauty Dark (`#17132A` bg, `#221F35` card, `#B5A9D0` text-secondary, `rgba(200,180,255,0.14)` border). Os lights devem ser consistentes com os darks (mesma personalidade, mesma No-Pure-Gray Rule, mesmo accent family).

## Regras absolutas (do DESIGN.md e impeccable)

- **No-Pure-Gray Rule**: Neutros são sempre aquecidos pelo accent. `rgba(0,0,0,0.X)` como cor de texto é proibido — usar cor sólida com tinte.
- **Alpha é design smell**: Trocar `rgba(0,0,0,X)` por cor sólida com tinte cromático. Alpha cria contraste imprevisível sobre fundos coloridos.
- **WCAG AA**: Todo texto ≥ 4.5:1, UI components ≥ 3:1.
- **Cream/Sand/Parchment ban**: O bg não é "quase branco aquecido por padrão". É uma superfície com personalidade own — `#E8E0D0` é warm PORQUE tem tinte gold, não porque é "warm neutral padrão".
- **Cards se elevam**: No light, card branco sobre bg com cor = hierarquia. O gap de luminância entre bg e card DEVE ser >8%.
- **Gradient-bg ativo**: 6-8% opacity, sutil mas perceptível. Não 3% invisível.