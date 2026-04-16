# TASKS: Modernização UI — Tema Barber

**Feature:** ui-barber-modernization
**Criado:** 2026-04-16
**Escopo:** Large | Design: pulado (mudanças mecânicas) | Paralelo: não (mesmo arquivo por task)

---

## Skills de Frontend Ativas

As tasks T-001 a T-004 devem ser executadas com as seguintes skills ativas.
Antes de implementar qualquer mudança, declarar o checkpoint obrigatório.

### `interface-design` — Skill principal
Toda mudança visual deve passar pelo checkpoint obrigatório antes de codar:
```
Intent:     quem usa, o que faz, como deve sentir
Palette:    cores usadas e POR QUÊ pertencem ao mundo do produto
Depth:      estratégia de profundidade e POR QUÊ se encaixa no intent
Surfaces:   escala de elevação e POR QUÊ esta temperatura de cor
Typography: tipografia e POR QUÊ se encaixa no intent
Spacing:    unidade base
```
Estratégia de profundidade escolhida: **Subtle shadows** — sombras suaves que levantam sem gritar.
Não misturar com offset-shadows ou border-only.

### `frontend-design` — Direção estética
Direção declarada: **dark premium industrial** (não retro, não cyber, não brutalist pixel-art).
Referência: Squire, Boulevard, Booksy Pro.
Antes de cada mudança perguntar: *"Esta escolha poderia existir em outro contexto? Se sim, não é específica o suficiente."*

---

## Checkpoint `interface-design` para este projeto

```
Intent:     Barbeiro no celular, gerenciando agenda entre clientes — precisa de velocidade e confiança.
Palette:    #121212 (aço escovado), #1E1E1E (metal gunmetal), #C29B40 (ouro envelhecido) —
            cores de uma barbearia premium física: couro, metal, luz âmbar.
Depth:      Subtle shadows — sombras reais com opacidade baixa. Sem offset pixel-art.
Surfaces:   Base #121212 → cards #1E1E1E → modais ligeiramente mais claros via backdrop-blur.
            Diff entre níveis: sutil (rgba borders, não cor diferente).
Typography: font-sans (Inter já no projeto) para UI. Sem monospace em elementos interativos.
Spacing:    Base 4px. Componentes em múltiplos de 4/8/16/24.
```

---

## T-001 — BrutalButton.tsx: base styles + variant outline

**Refs:** R-01, R-02, R-03, R-04, R-05, R-06
**Arquivo:** `components/BrutalButton.tsx`
**Depende de:** —

### Checkpoint `interface-design` (declarar antes de codar)
```
Depth:  hover com brightness-110 — luz vem DE DENTRO do botão, não move o objeto no espaço.
        active com scale(0.97) — feedback tátil de pressão, não deslocamento físico.
        Consistente com "subtle shadows" — sem translate.
Borders: border-white/10 em vez de border-black. Borda existe como separação de superfície,
         não como decoração visual.
```

### Teste `frontend-design` (aplicar após implementar)
- **Swap test:** se trocar `hover:brightness-110` por `hover:translate(-2px)`, volta ao visual "anos 90"? Sim → a mudança é necessária e específica.
- **Estados:** default, hover, active, disabled — todos presentes e distintos.

### O que fazer

Em `getBaseStyles()` branch `else` (barber):
- `font-mono font-bold uppercase tracking-tight` → `font-sans font-semibold`
- `border-2 border-black` → `border border-white/10`
- Adicionar `rounded-xl`
- `hover:translate-x-[-2px] hover:translate-y-[-2px]` → `hover:brightness-110`
- `active:translate-y-1 active:translate-x-1 active:shadow-none` → `active:scale-[0.97]`
- `disabled:opacity-70 disabled:grayscale` → `disabled:opacity-50`
- Remover `disabled:hover:translate-x-0 disabled:hover:translate-y-0`

Em `getVariantStyles()` variant `outline` branch barber:
- `border-2 border-black text-black hover:bg-black/5` → `border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/5`

### Verificação
- `npm run typecheck` sem erros
- Branch barber: botão sem mono/uppercase, hover brilha (não levanta)
- Branch beauty: zero mudança

---

## T-002 — BrutalCard.tsx: remover Screw + corrigir título

**Refs:** R-07, R-08
**Arquivo:** `components/BrutalCard.tsx`
**Depende de:** —

### Checkpoint `interface-design` (declarar antes de codar)
```
Intent:     Cards são superfícies de conteúdo — devem sumir no background e deixar o dado aparecer.
            Parafusos chamam atenção para si mesmos, roubam foco do conteúdo.
Depth:      Remover decoração explícita (Screws). Profundidade já existe via shadow-promax-glass/depth.
Typography: Títulos em case normal — uppercase em títulos de card é padrão de UI kit genérico dos anos 2010.
            tracking-normal mantém legibilidade sem dramatismo desnecessário.
```

### Teste `interface-design` — The Mandate
- **Squint test:** com olhos desfocados, parafusos saltavam visualmente? Sim → remoção correta.
- **Swap test:** se trocar `tracking-normal` por `tracking-wider uppercase`, a hierarquia piora? Avaliar após.

### O que fazer

- Remover linha `import { Screw } from './Screw';`
- Remover bloco JSX `{!isBeauty && (<> <Screw .../> x4 </>)}`
- Em `getTitleClass()` branch barber: `uppercase tracking-wider` → `tracking-normal`

### Verificação
- `npm run typecheck` sem erros
- Cards barber: sem parafusos, títulos em case normal
- Beauty: zero mudança

---

## T-003 — Modal.tsx: estilos brutais modernizados

**Refs:** R-09, R-10, R-11, R-12, R-13
**Arquivo:** `components/Modal.tsx`
**Depende de:** —

### Checkpoint `interface-design` (declarar antes de codar)
```
Intent:     Modal é uma superfície elevada sobre o canvas — deve comunicar elevação via shadow,
            não via borda grossa que "isola" o elemento aggressivamente.
Depth:      shadow-promax-depth já existe no sistema — usar. Não inventar nova shadow.
            border border-white/10 = separação whisper-quiet (rgba, não solid hex #000).
Borders:    border-b border-white/8 para header/footer. Separadores internos mais sutis que a borda externa.
            Jamais border-dashed — tracejado é padrão debug/formulário antigo.
Surfaces:   Modal sobre backdrop: backdrop-blur + bg-brutal-card já estabelece elevação.
            Dots decorativos são ruído visual sem significado semântico — remover.
```

### Teste `interface-design` — The Mandate
- **Squint test:** borda 4px preta saltava? Sim → border sutil é a resposta correta.
- **Signature test:** o modal resultante se parece com Squire/Boulevard? Ou ainda parece template?
- **Token test:** `border-white/10`, `shadow-promax-depth`, `border-white/8` — todos do sistema existente. Sem hex avulso.

### O que fazer

Em `getModalStyles()` branch barber:
- Substituir: `border-4 border-brutal-border shadow-[8px_8px_0px_0px_#000000]`
- Por: `border border-white/10 shadow-promax-depth rounded-2xl`

Em `getHeaderStyles()` branch barber:
- Substituir: `border-b-2 border-black border-dashed px-6 py-4 bg-neutral-900/50`
- Por: `border-b border-white/8 px-6 py-4`

No JSX do título (branch barber):
- Remover `uppercase tracking-wider` da className condicional

No JSX do footer (branch barber):
- Substituir: `border-t-2 border-black border-dashed bg-neutral-900/50`
- Por: `border-t border-white/8`

Remover bloco JSX dos 4 dots decorativos (branch `!isBeauty`):
```jsx
{!isBeauty && (
  <>
    <div className="absolute top-2 left-2 w-2 h-2 bg-neutral-600 rounded-full" />
    <div className="absolute top-2 right-2 w-2 h-2 bg-neutral-600 rounded-full" />
    <div className="absolute bottom-2 left-2 w-2 h-2 bg-neutral-600 rounded-full" />
    <div className="absolute bottom-2 right-2 w-2 h-2 bg-neutral-600 rounded-full" />
  </>
)}
```

### Verificação
- `npm run typecheck` sem erros
- Modal barber: borda sutil, sem tracejado, sem dots, sem sombra offset
- Modal beauty: zero mudança

---

## T-004 — index.html: atualizar classes CSS brutalismo

**Refs:** R-14 a R-24
**Arquivo:** `index.html`
**Depende de:** —

### Checkpoint `interface-design` (declarar antes de codar)
```
Depth:      Estratégia unificada: subtle shadows com opacidade baixa.
            Regra: nenhuma sombra offset com coordenadas X/Y fixas (pixel-art).
            Todas as sombras devem usar blur + opacidade (0 Xpx Ypx blur rgba(...)).
Borders:    Nenhuma borda solid #000. Todas passam para rgba com opacidade ≤ 0.08.
            Scrollbar: borda é decoração agressiva — remover, manter apenas cor de fundo.
Motion:     translate X/Y → translateY (vertical apenas) para hover de cards.
            brightness/scale para botões — nenhum deslocamento lateral.
Dark mode:  Sombras com menos opacidade em dark (já estamos em dark — ajustar para rgba(0,0,0,X)).
```

### Teste `frontend-design` — Direção estética
Após cada bloco CSS alterado, perguntar: *"Esta sombra/borda poderia estar no Squire ou Boulevard?"*
Se a resposta for "parece interface de blog 2012" — a opacidade ainda está alta demais.

### Mudanças

**`.input-brutal:focus`** (linha ~397):
```css
/* ANTES */
box-shadow: 2px 2px 0px 0px #000000;
/* DEPOIS */
box-shadow: 0 0 0 2px rgba(194,155,64,0.25);
```

**`.card-brutal-hover:hover`** (linha ~410):
```css
/* ANTES */
transform: translate(-2px, -2px);
box-shadow: 6px 6px 0px 0px #000000;
/* DEPOIS */
transform: translateY(-2px);
box-shadow: 0 8px 32px rgba(0,0,0,0.5);
```

**`.brutal-card-enhanced`** (linha ~451):
```css
/* ANTES */
border: 3px solid #000;
box-shadow: 4px 4px 0px 0px #000000, inset 0 1px 0 rgba(194,155,64,0.1);
/* DEPOIS */
border: 1px solid rgba(255,255,255,0.08);
box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(194,155,64,0.06);
```

**`.brutal-card-enhanced:hover`** (linha ~476):
```css
/* ANTES */
transform: translate(-2px, -2px);
box-shadow: 6px 6px 0px 0px #000000, inset 0 1px 0 rgba(194,155,64,0.2);
/* DEPOIS */
transform: translateY(-2px);
box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(194,155,64,0.12);
```

**`.brutal-button-premium`** (linha ~501):
```css
/* ANTES */
border: 3px solid #000;
box-shadow: 3px 3px 0px 0px #000000, inset 0 1px 0 rgba(255,255,255,0.2);
/* DEPOIS */
border: none;
box-shadow: 0 4px 16px rgba(194,155,64,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
```

**`.brutal-button-premium:hover`** (linha ~527):
```css
/* ANTES */
transform: translate(-1px, -1px);
box-shadow: 4px 4px 0px 0px #000000, inset 0 1px 0 rgba(255,255,255,0.3);
/* DEPOIS */
transform: none;
filter: brightness(1.08);
box-shadow: 0 6px 20px rgba(194,155,64,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
```

**`.brutal-button-premium:active`** (linha ~534):
```css
/* ANTES */
transform: translate(1px, 1px);
box-shadow: 2px 2px 0px 0px #000000, inset 0 1px 0 rgba(0,0,0,0.2);
/* DEPOIS */
transform: scale(0.97);
filter: brightness(1.0);
box-shadow: 0 2px 8px rgba(194,155,64,0.2);
```

**`.brutal-sidebar`** (linha ~542):
```css
/* ANTES */
border-right: 3px solid #000;
/* DEPOIS */
border-right: 1px solid rgba(255,255,255,0.06);
```

**`.brutal-header`** (linha ~551):
```css
/* ANTES */
border: 3px solid #000;
box-shadow: 0 3px 0 0 #000, inset 0 -1px 0 rgba(194,155,64,0.1);
/* DEPOIS */
border: none;
border-bottom: 1px solid rgba(255,255,255,0.06);
box-shadow: none;
```

**`.stat-card-brutal`** (linha ~601):
```css
/* ANTES */
border: 3px solid #000;
box-shadow: 4px 4px 0px 0px #000000;
/* DEPOIS */
border: 1px solid rgba(255,255,255,0.06);
box-shadow: 0 4px 16px rgba(0,0,0,0.3);
```

**Scrollbar** (linha ~305–313):
```css
/* ANTES */
::-webkit-scrollbar-track { border-left: 2px solid #000; }
::-webkit-scrollbar-thumb { border: 2px solid #000; }
/* DEPOIS — remover apenas as bordas, manter backgrounds */
::-webkit-scrollbar-track { /* remover border-left */ }
::-webkit-scrollbar-thumb { border-radius: 2px; /* remover border */ }
```

**Mobile override** (linha ~649–654):
```css
/* ANTES */
box-shadow: 2px 2px 0px 0px #000000 !important;
/* DEPOIS */
box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
```

### Verificação
- Visual: nenhuma borda solid #000, nenhuma sombra com coordenadas X/Y offset
- Hover/active: movimento apenas em Y (cards) ou nenhum (botões)
- Scrollbar: sem borda preta

---

## T-005 — Gate: lint + typecheck + The Mandate checks

**Refs:** todos
**Depende de:** T-001, T-002, T-003, T-004

### Comandos
```bash
npm run lint
npm run typecheck
```

### The Mandate (`interface-design`) — aplicar no resultado final

**Swap test:**
- Trocar `brightness-110` por `translate(-2px)` nos botões — o visual piora para "anos 90"? ✓
- Trocar `border border-white/10` por `border-2 border-black` nos modais — parece mais datado? ✓
Se as trocas pioram o design, as escolhas estão certas.

**Squint test:**
- Com olhos desfocados: hierarquia ainda legível? Nada grita? ✓

**Signature test:**
- Identificar 5 elementos onde a direção "dark premium industrial" aparece:
  1. Botões: brightness hover em vez de translate
  2. Cards: sem parafusos, sombra real
  3. Modal: borda rgba, shadow-promax-depth
  4. Inputs: ring dourado no foco
  5. Separadores: white/8 discreto em vez de tracejado preto

**Token test:**
- Nenhum hex avulso introduzido nas tasks. Tudo mapeia para tokens existentes ou rgba do sistema.

### Checklist visual (Chrome DevTools)
1. Login como barber → botões: sem monospace, sem uppercase
2. Dashboard → cards: sem parafusos, títulos em case normal
3. Abrir modal → borda sutil, sem tracejado, sem dots, sem sombra offset
4. Hover botão primário → brilha (não levanta)
5. Focus input → ring dourado, não shadow offset preta
6. Sidebar → borda fina
7. Mobile 390px → sem quebra de layout
8. Login como beauty → ZERO mudança visual

### Verificação
- `lint` e `typecheck` passam sem erros
- The Mandate: todos os checks passam
- Checklist Done When da spec: todos ✓

---

## Status

| Task | Status | Arquivo(s) | Skill check |
|------|--------|-----------|-------------|
| T-001 | done | BrutalButton.tsx | interface-design checkpoint + swap/states tests |
| T-002 | done | BrutalCard.tsx | interface-design checkpoint + squint/swap tests |
| T-003 | done | Modal.tsx | interface-design checkpoint + squint/signature/token tests |
| T-004 | done | index.html | interface-design checkpoint + frontend-design direction test |
| T-005 | done | — (gate) | The Mandate completo + lint/typecheck |
