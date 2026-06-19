---
target: design-system tokens + theme tokens (barber dark/light, beauty dark/light)
total_score: 17
p0_count: 3
p1_count: 2
timestamp: 2026-06-13T00:00:00Z
slug: design-system-tokens-css-and-theme-tokens
---

# Critique — AgendiX Theme System (Barber Dark/Light, Beauty Dark/Light)

**Targets:** `design-system/tokens.css`, `hooks/useBrutalTheme.ts`, `DESIGN.md`
**Register:** product
**Data:** 2026-06-13

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Badges e status semánticos claros |
| 2 | Match System / Real World | 3 | Convenções respeitadas, mas light themes não falam o idioma visual do negócio |
| 3 | User Control and Freedom | 3 | Troca de tema funciona |
| 4 | Consistency and Standards | 2 | Dark themes tem profundidade; light themes flat e genéricos. Inconsistência entre modos |
| 5 | Error Prevention | n/a | Nível de tokens |
| 6 | Recognition Rather Than Recall | 2 | No light: nada se destaca, tudo compete pelo mesmo peso |
| 7 | Flexibility and Efficiency | 3 | Sistema extensível por tema funciona |
| 8 | Aesthetic and Minimalist Design | 1 | Barber Dark flat, Beauty Dark genérico, Light themes sem hierarquia |
| 9 | Error Recovery | n/a | Nível de tokens |
| 10 | Help and Documentation | n/a | Nível de tokens |
| **Total** | | **17/30** | **Poor — overhaul visual significativa necessária** |

## Anti-Patterns Verdict

**LLM assessment:** Sim, parece AI-generated. Barber Dark = "VS Code dark com gold colado". Beauty Dark = "Tailwind violet-400 sobre purple-navy default". Light themes = "parchment wash" — o padrão de 2026 que o impeccable explicitamente proíbe.

**Deterministic scan:** Vazio (CSS-only, sem markup).

## Priority Issues

### [P0] Barber Dark: fundo flat sem profundidade, sem calor cromático
- `#121212` fundo + `#1E1E1E` card = ~5% luminância gap. Sem gradiente atmosférico.
- Neutros são cinza puro (`#A0A0A0`, `#525252`) sem tinte gold.
- Card parece "pasted on" sem camada perceptível.
- Gold accent flutua sem raiz cromática.

### [P0] Beauty Dark: roxo genérico sem profundidade
- `#1F1B2E` e `#A78BFA` são os valores default que toda AI gera para "dark purple".
- Sem gradiente atmosférico, sem variação tonal entre camadas.
- Accent neon grita sem cantar — sem sofisticação.

### [P0] Both Light themes: sem contraste, sem hierarquia, sem foco
- `text-secondary` barber light (#6B5E45 sobre #F5F1E8) = ~3.8:1 (falha WCAG AA).
- `text-muted` rgba(0,0,0,0.4) sobre parchment = ~2.5:1 (grave).
- Card branco sobre bg parchment = quase indistinguível (1.05:1).
- Nada se destaca, nada se recua.

### [P1] Neutros sem tinte cromático — violam No-Pure-Gray Rule
- `#121212`, `#1E1E1E`, `#252525`, `#525252`, `#A0A0A0` são cinzas puros sem desvio de hue.
- DESIGN.md diz "nunca cinza puro" mas os tokens são exatamente isso.

### [P1] Shadows em dark não criam separação perceptível
- Sombra preta sobre fundo preto é invisível.
- Inner border 0.08 opacity é imperceptível.
- Todos os cards recebem a mesma sombra — sem hierarquia de elevação.

## Persona Red Flags

- **Casey (Mobile/Sol)**: Texto muted em light é ilegível ao ar livre. Destroi a utilidade do light mode.
- **Alex (Barbeiro Power User)**: No dark, tudo se funde. Sem hierarquia de camada, sem foco/defoco.
- **Sam (Accessibility)**: Múltiplos contrastes WCAG AA falham: text-muted <3:1, text-secondary light ~3.8:1, focus rings 30% opacity.

## Minor Observations

- `gradient-bg` e `gradient-card` existem nos tokens mas não chegam aos componentes.
- `text-white/40` como muted é genérico — deveria ser tinte aquecido.
- Badge neutral em dark: contraste insuficiente.
- `shadow-promax-glass` em TODO card = sem hierarquia de elevação.

## Questions

- Se o beauty dark fosse fundo #1A1628 com card #25213A, já se sentiria diferente?
- Se o barber light tivesse gradiente sutil (warm → white), os cards se separariam?
- Se muted fosse warm brown (barber) / soft lavender (beauty) em vez de cinza, já resolveria 80%?