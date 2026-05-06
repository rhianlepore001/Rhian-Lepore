# AgendiX — Design System

SaaS de gestão para barbearias e salões. Dois temas: **Barber** (industrial moderno) e **Beauty** (premium lavanda).

---

## Princípios

1. **Cores não mudam** — gold e lavanda são identidade da marca
2. **Brutalismo modernizado** — cantos arredondados, sem bordas retas puras
3. **Glass nas settings** — BrutalCard detecta `/configuracoes` e ativa backdrop-blur automático
4. **Mobile-first** — blur reduzido no mobile para performance

---

## Tokens de Cor

### Barber (tema dark industrial)
| Token | Valor | Uso |
|-------|-------|-----|
| `brutal.main` | `#121212` | background geral |
| `brutal.card` | `#1E1E1E` | fundo de card |
| `brutal.surface` | `#252525` | superfícies elevadas |
| `accent.gold` | `#C29B40` | cor primária / CTA |
| `accent.goldHover` | `#D4AF50` | hover dos CTAs |
| `text.primary` | `#EAEAEA` | texto principal |
| `text.secondary` | `#A0A0A0` | texto secundário |
| `text.muted` | `#525252` | texto desativado |

### Beauty (tema roxo premium)
| Token | Valor | Uso |
|-------|-------|-----|
| `beauty.dark` | `#1F1B2E` | background geral |
| `beauty.card` | `#2E2B3B` | fundo de card |
| `beauty.neon` | `#A78BFA` | cor primária / lavanda |
| `beauty.neonHover` | `#C4B5FD` | hover da cor primária |
| `beauty.acid` | `#8B5CF6` | variante mais escura |

---

## Border Radius

| Elemento | Classe | px |
|----------|--------|----|
| Card (`BrutalCard`) | `rounded-2xl` | 16px |
| Botão (`BrutalButton`) | `rounded-2xl` | 16px |
| Input | `rounded-xl` | 12px |
| Badge / Tag | `rounded-full` | pill |
| Nav pill (mobile) | `rounded-full` | pill |

> **Regra:** Sem `rounded-[28px]` — parece app infantil. Sem `rounded-none` — parece planilha.

---

## Sombras

| Token | Valor | Quando usar |
|-------|-------|-------------|
| `shadow-promax-glass` | `0 12px 40px -12px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)` | cards padrão |
| `shadow-neon` | `0 0 10px rgba(167,139,250,0.5), 0 0 20px rgba(167,139,250,0.3)` | accent beauty |
| `shadow-gold` | `0 0 10px rgba(194,155,64,0.4), 0 0 20px rgba(194,155,64,0.2)` | accent barber |
| `shadow-lite-glass` | `0 4px 12px rgba(0,0,0,0.5)` | mobile (performance) |

> **Evitar:** `shadow-heavy` (4px 4px offset) — brutalismo excessivo.

---

## Componentes

### BrutalCard

```tsx
// Uso padrão
<BrutalCard title="Título">conteúdo</BrutalCard>

// Com accent (borda colorida)
<BrutalCard accent>conteúdo</BrutalCard>

// Com glow
<BrutalCard glow>conteúdo</BrutalCard>

// Forçar tema
<BrutalCard forceTheme="barber">conteúdo</BrutalCard>
```

**Comportamento automático:**
- Em `/configuracoes/*` → glass mode (`bg-brutal-card/30 backdrop-blur-2xl`)
- Fora de settings → `bg-gradient-brutal` opaco
- Beauty → sempre `bg-gradient-beauty` com backdrop-blur

### BrutalButton

```tsx
// Variantes disponíveis
<BrutalButton variant="primary">Salvar</BrutalButton>
<BrutalButton variant="secondary">Cancelar</BrutalButton>
<BrutalButton variant="danger">Excluir</BrutalButton>
<BrutalButton variant="ghost">Ver mais</BrutalButton>
<BrutalButton variant="outline">Filtrar</BrutalButton>
<BrutalButton variant="success">Confirmar</BrutalButton>

// Tamanhos
<BrutalButton size="sm">Pequeno</BrutalButton>   // h-8
<BrutalButton size="md">Médio</BrutalButton>     // h-11 (padrão)
<BrutalButton size="lg">Grande</BrutalButton>    // h-14

// Com ícone e loading
<BrutalButton icon={<Plus />} loading={saving}>Adicionar</BrutalButton>
```

**Regras:**
- Sempre `rounded-2xl` — sem botões quadrados
- Primary barber: gradiente gold → não mudar cor
- Primary beauty: gradiente lavanda → não mudar cor

---

## Tipografia

| Role | Font | Classe |
|------|------|--------|
| Heading / Display | Chivo 700/900 | `font-heading` |
| Body | Inter 400/500/600 | `font-sans` |
| Code / Mono | JetBrains Mono | `font-mono` |

**Regras:**
- Títulos de cards: `font-heading text-lg md:text-xl font-bold tracking-tight`
- Labels uppercase: `text-xs uppercase tracking-widest font-bold text-neutral-500`
- Evitar `tracking-wider` em textos longos

---

## Glass Effect (Settings)

O `BrutalCard` detecta automaticamente a rota `/configuracoes` e ativa:

```css
/* Barber glass (auto em /configuracoes) */
background: rgba(30, 30, 30, 0.30);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.10);
```

O background do body (grid dourado sutil + gradientes radiais) aparece por trás dos cards.

---

## Gradientes de Fundo

| Contexto | Classe |
|----------|--------|
| Barber card padrão | `bg-gradient-brutal` |
| Beauty card padrão | `bg-gradient-beauty` |
| Overlay suave | `bg-gradient-promax` |
| Highlight de topo | `bg-gradient-to-b from-white/[0.03] to-transparent` |

---

## Padrões de Input

```tsx
// Barber
className="bg-brutal-surface border border-white/10 rounded-xl px-4 py-2.5 text-white
           focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 outline-none
           transition-all"

// Beauty
className="bg-beauty-card/50 border border-white/10 rounded-xl px-4 py-2.5 text-white
           focus:border-beauty-neon focus:ring-2 focus:ring-beauty-neon/20 outline-none
           transition-all"
```

---

## O que NÃO fazer

- `rounded-[28px]` → muito arredondado, parece app de criança
- `shadow-heavy` (4px offset) → brutalismo dos anos 90, fora do contexto
- Hardcoded hex (`#C29B40`) em JSX → usar tokens Tailwind (`text-accent-gold`)
- `border-2 border-black` → sem contraste suficiente no dark mode
- Botões com `rounded-none` ou `rounded-sm` → parece dashboard genérico
