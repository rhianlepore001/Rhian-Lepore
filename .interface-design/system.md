# AgendiX — Interface Design System

SaaS de gestão para barbearias e salões (Brasil e Portugal). Dois temas: **Barber** (industrial, escuro, dourado) e **Beauty** (premium, lavanda, elegante).

---

## Direção

**Quem:** Barbeiro ou esteticista no celular, entre atendimentos. Mundo de cadeira de couro, espelho com moldura, agenda na parede.

**Sentimento:** Frio como espelho. Preciso como corte afiado. A copy faz o trabalho emocional — a estrutura é mínima e confiante.

**Assinatura:** Copy direta dentro de componentes ("Feito pra quem vive da cadeira."). Tipografia grossa e uppercase fazem o visual; o texto faz a personalidade.

---

## Paleta

### Tema Barber
| Token | Valor | Uso |
|-------|-------|-----|
| `bg-brutal-main` | `#0A0A0A` | Background principal |
| `bg-[#111111]` | `#111111` | Cards e painéis |
| `bg-[#1C1C1C]` | `#1C1C1C` | Painel de formulário |
| `accent-gold` | `#C29B40` | Acento primário barber |
| `accent-goldHover` | variante hover | Botão hover |

### Tema Beauty
| Token | Uso |
|-------|-----|
| `bg-beauty-dark` | Background principal beauty |
| `bg-[#1A162A]` | Painel decorativo |
| `bg-beauty-card` | Card/formulário |
| `beauty-neon` | Acento primário beauty (lavanda) |
| `beauty-neonHover` | Botão hover |
| `beauty-silver` | Texto secundário beauty |

---

## Profundidade

**Estratégia: border-only** — sem sombras decorativas. Bordas definem estrutura sem chamar atenção.

- Separação padrão: `border-neutral-800` / `border-white/5`
- Hover: `border-accent-gold/40` (barber) / `border-beauty-neon/40` (beauty)
- Linha de acento: `h-[1px]` ou `w-1` com opacidade 0 → 100 no hover
- Sombras apenas em modais split: `shadow-[0_32px_80px_rgba(0,0,0,0.7)]`

---

## Superfícies (escala de elevação)

```
Page       #0A0A0A   — canvas base
Panel      #111111   — cards, painéis decorativos
Form       #1C1C1C   — formulários, inputs
Input      black/30  — campos de entrada (inset)
Modal      #1C1C1C + border border-white/5
```

---

## Tipografia

- **Headings:** `font-heading` uppercase, `tracking-tight`, peso 700
- **Labels/metadata:** `font-mono` uppercase, `tracking-widest` ou `tracking-[0.25em]`
- **Copy de produto:** `text-sm` sem uppercase — tom humano, não técnico
- **Botões:** `font-semibold tracking-wide` (barber) / sem mono (beauty)

---

## Espaçamento

Base unit: `7` (28px) — padding interno de cards e painéis (`p-7`).

| Contexto | Valor |
|----------|-------|
| Padding card | `p-7` |
| Gap interno | `gap-4`, `gap-2` |
| Separação de seção | `mt-10`, `mb-12` |
| Micro gap | `gap-1.5`, `gap-2` |

---

## Padrões de componente

### Gateway (seleção de segmento)
- Grid 2 colunas com `gap-px bg-neutral-900` (divisor de 1px entre cards)
- Cards com foto de fundo: `opacity-35` → `opacity-50` no hover, `bg-gradient-to-t from-black`
- Linha de acento: `absolute top-0 left-0 w-1 h-full`, `opacity-0 group-hover:opacity-100`
- Conteúdo: logo + heading uppercase + copy em `text-sm text-neutral-400` + "Entrar →"
- CTA de registro: `border-t border-neutral-900` + botão full-width `border border-neutral-700`

### Login split card
- Max width `max-w-3xl`, dois painéis: decorativo (w-2/5) + formulário (flex-1)
- Painel decorativo: `bg-[#111111]` barber / `bg-[#1A162A]` beauty, linha `h-[2px]` no topo
- Inputs: `bg-black/30 border border-neutral-700/60` — inset, escuro
- Botão primário: `bg-accent-gold text-black` (barber) / `bg-beauty-neon text-white` (beauty)
- Screws: detalhe brutalismo só no tema barber

### Botão primário (barber)
```
bg-accent-gold text-black hover:bg-accent-goldHover
shadow-[0_4px_20px_rgba(194,155,64,0.25)]
hover:shadow-[0_6px_24px_rgba(194,155,64,0.4)]
h-12 rounded-xl font-semibold text-sm tracking-wide
```

### Botão primário (beauty)
```
bg-beauty-neon text-white hover:bg-beauty-neonHover
shadow-[0_4px_20px_rgba(167,139,250,0.3)]
rounded-3xl (raio maior que barber)
```

### Botão secundário / CTA outline
```
border border-neutral-700 hover:border-neutral-500
text-white font-mono uppercase tracking-widest
hover:bg-white/[0.03]
py-4 w-full
```

---

## Radius

| Contexto | Barber | Beauty |
|----------|--------|--------|
| Cards gateway | nenhum | nenhum |
| Cards formulário | `rounded-2xl` | `rounded-3xl` |
| Inputs | `rounded-xl` | `rounded-xl` |
| Botões | `rounded-xl` | `rounded-xl` a `rounded-3xl` |

---

## Animações

- Hover transitions: `duration-150` (cores) / `duration-200` a `duration-300` (opacidade)
- Arrow translate: `group-hover:translate-x-1 transition-transform duration-150`
- Foto hover: `opacity-35 group-hover:opacity-50 transition-opacity duration-300`
- Spinner loading: `border-t-transparent animate-spin`

---

## Branding

- Nome do produto: **AgendiX**
- Temas: `barber` e `beauty`
- Logo: `<AgenXLogo>` — componente SVG com monograma "A" em moldura quadrada arredondada
- Versão: "AgendiX • v2.0" no rodapé das telas auth
