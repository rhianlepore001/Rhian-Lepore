# AgendiX — Design System MASTER

> Fonte da verdade para tokens visuais, padrões de componentes e regras do projeto.
> **Nunca** use valores hardcoded quando um token existir aqui.

---

## 1. Temas

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
const { userType } = useAuth();
const isBeauty = userType === 'beauty';
```

---

## 2. Color Palette

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

## 3. Tipografia

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

## 4. Spacing Scale

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

## 5. Border Radius Scale

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

## 6. Shadow Tokens

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

## 7. Border Patterns

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

## 8. Componentes Canônicos

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

## 9. Padrões de Estado

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

## 10. Mapeamento Estático de Accent (para evitar interpolação dinâmica)

**Proibido:** `ring-${accentColor}/30`, `border-${accentColor}`
**Obrigatório:** Usar mapeamento explícito:

```tsx
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

// Uso:
const accent = isBeauty ? accentClasses.neon : accentClasses.gold;
// <div className={`${accent.ring} ${accent.border}`}>
```

---

## 11. Regras do-NÃO-fazer

| ❌ Anti-padrão | ✅ Substituição |
|---------------|---------------|
| `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` | Token do projeto: `shadow-promax-glass`, `shadow-lite-glass`, etc. |
| `bg-zinc-900`, `bg-neutral-900` em cards | `bg-brutal-card` ou `bg-[#1E1E1E]` |
| `bg-stone-100` em cards | `bg-silk-card` ou `bg-white` |
| `border-2 border-black` em cards/inputs | `border border-white/5` (barber) ou `border border-white/10` (beauty) |
| `border border-neutral-800` em cards | `border border-white/5` |
| `border-${variavel}` dinâmico | Mapeamento estático (ver seção 10) |
| `ring-${variavel}/30` dinâmico | Mapeamento estático (ver seção 10) |
| `text-[10px]`, `text-[11px]` | `text-xs` (12px mínimo) |
| `rounded-none` em cards | `rounded-2xl` mínimo |
| `rounded-sm`, `rounded-md` em botões/inputs | `rounded-xl` mínimo |
| Criar `fixed inset-0` em modal custom | Usar `<Modal>` de `components/Modal.tsx` |
| Criar FocusTrap manual sem Modal.tsx | Usar `<Modal>` que inclui FocusTrap |
| `shadow-xl` em modais | `shadow-promax-depth` |
| `bg-red-500/10 border-red-500` sem opacidade | `bg-red-500/8 border border-red-500/30` |
| Botão primário ad-hoc sem classe canônica | Ver seção 8 (Button) |
| Input com `rounded-lg` apenas | `rounded-xl` mínimo |

---

## 12. Animações disponíveis

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

## 13. Classes Globais (index.html)

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

## 14. Guia de Uso por Contexto

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

### Página de configurações
```tsx
<BrutalCard title="Seção" noPadding>
  <div className="p-6 space-y-4">
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">
        Campo
      </label>
      <input className="w-full px-4 py-3 rounded-xl text-sm text-white bg-black/30
        border border-neutral-700/60 focus:outline-none focus:border-accent-gold/60
        focus:bg-black/50 transition-all font-mono mt-1" />
    </div>
  </div>
</BrutalCard>
```
