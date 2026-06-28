# SPEC: Modernização UI — Tema Barber (Brutal)

**Status:** draft
**Criado:** 2026-04-16
**Prioridade:** alta
**Fase proposta:** Phase 6 (UI Polish — Barber Theme)

---

## Contexto

Feedback de cliente: o tema Barber (brutal) parece "anos 90" — fontes de computador antigo, parafusos nos cards, sombras de pixel art. O tema Beauty está moderno; o Barber precisa acompanhar.

O diagnóstico técnico identificou 7 padrões datados no tema Barber que serão removidos ou substituídos, sem tocar no tema Beauty.

---

## O que o usuário final vê

**Antes (situação atual):**
- Botões com fonte monospace, tudo em MAIÚSCULAS (ex: "SALVAR", "CONFIRMAR")
- Cards com 4 parafusos decorativos nos cantos
- Modais com borda preta grossa (4px) e sombra offset preta (`8px 8px 0px #000`)
- Separadores internos com borda tracejada preta
- Hover em botões com efeito de "elevar/pressionar" lateral (translate -2px/-2px)
- Títulos de cards em MAIÚSCULAS com espaçamento exagerado
- Input com foco mostrando sombra offset preta (`2px 2px 0px #000`)

**Depois (objetivo):**
- Botões com Inter (font-sans), case normal, bordas sutis 1px
- Cards sem parafusos — limpos, com profundidade via sombra real
- Modais com borda sutil (`border border-white/10`) e sombra `shadow-promax-depth`
- Separadores internos com `border-white/8` discreto
- Hover em botões com `brightness-110`, press com `scale(0.97)` — fluido
- Títulos de cards em case normal, sem tracking exagerado
- Input com foco mostrando ring dourado (`0 0 0 2px rgba(194,155,64,0.25)`)

O visual resultante é: **dark premium industrial** — não retro, não cyber, não anos 90. Referência: apps como Squire, Boulevard, Booksy Pro.

---

## O que muda no sistema

### Componentes React

- `components/BrutalButton.tsx`
  - Brutal base: `font-mono font-bold uppercase tracking-tight` → `font-sans font-semibold`
  - Brutal base: `border-2 border-black` → `border border-white/10`
  - Brutal base: adicionar `rounded-xl`
  - Brutal base: hover `translate(-2px,-2px)` → `hover:brightness-110`
  - Brutal base: active `translate(1px,1px)` → `active:scale-[0.97]`
  - Brutal variant `outline`: `border-2 border-black text-black` → `border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/5`
  - Manter: tamanhos, variantes de cor (primary gold, secondary, danger, ghost, success), lógica de loading

- `components/BrutalCard.tsx`
  - Remover: `import { Screw }` + os 4 `<Screw>` no JSX
  - Brutal title: remover `uppercase tracking-wider` → `tracking-normal`
  - Manter: glassmorphism, rounded-[28px], shadow-promax-glass/depth, accent/glow props

- `components/Modal.tsx`
  - Brutal `getModalStyles()`: `border-4 border-brutal-border shadow-[8px_8px_0px_0px_#000]` → `border border-white/10 shadow-promax-depth rounded-2xl`
  - Brutal `getHeaderStyles()`: `border-b-2 border-black border-dashed bg-neutral-900/50` → `border-b border-white/8 px-6 py-4`
  - Brutal title: remover `uppercase tracking-wider`
  - Brutal footer: `border-t-2 border-black border-dashed bg-neutral-900/50` → `border-t border-white/8`
  - Remover: os 4 dots decorativos (`w-2 h-2 bg-neutral-600 rounded-full`)

### CSS Global (`index.html` — bloco `<style>`)

- `.brutal-card-enhanced`: `border: 3px solid #000` + `box-shadow: 4px 4px 0px #000` → `border: 1px solid rgba(255,255,255,0.08)` + `box-shadow: promax-glass`
- `.brutal-card-enhanced:hover`: `translate(-2px,-2px)` + sombra offset → `translateY(-2px)` + `promax-depth`
- `.brutal-button-premium`: `border: 3px solid #000` + `box-shadow: 3px 3px 0px #000` → sem borda preta + `box-shadow: 0 4px 16px rgba(194,155,64,0.3)`
- `.brutal-button-premium:hover`: `translate(-1px,-1px)` → `brightness(1.08)`
- `.brutal-button-premium:active`: `translate(1px,1px)` → `scale(0.97)`
- `.brutal-header`: `border: 3px solid #000` + `box-shadow: 0 3px 0 0 #000` → `border-bottom: 1px solid rgba(255,255,255,0.06)`
- `.brutal-sidebar`: `border-right: 3px solid #000` → `border-right: 1px solid rgba(255,255,255,0.06)`
- `.input-brutal:focus`: `box-shadow: 2px 2px 0px #000` → `box-shadow: 0 0 0 2px rgba(194,155,64,0.25)`
- `.card-brutal-hover:hover`: `translate(-2px,-2px)` + `6px 6px 0px #000` → `translateY(-2px)` + `promax-depth`
- `.stat-card-brutal`: `border: 3px solid #000` + `box-shadow: 4px 4px 0px #000` → `border: 1px solid rgba(255,255,255,0.06)` + shadow suave
- Scrollbar: remover `border-left: 2px solid #000` e `border: 2px solid #000` do thumb — manter cores

---

## O que NÃO muda

- Tema Beauty — zero alterações
- Lógica de negócio dos componentes (props, eventos, estados)
- Cores: `#121212`, `#1E1E1E`, `#C29B40` (gold) — mantidas
- `rounded-[28px]` dos cards — mantido
- `shadow-promax-glass`, `shadow-promax-depth`, `shadow-gold` — mantidos e aproveitados
- Glassmorphism (`backdrop-blur`, gradientes sutis) — mantido
- Animações de entrada (`fade-in`, `scale-in`) — mantidas
- Tokens Tailwind no `<script>` — sem mudanças
- Componente `Screw.tsx` — arquivo permanece (apenas não é mais importado/usado)
- Temas Obsidian/Silk da página de agendamento público
- Acessibilidade: focus trap, aria-labels, ESC, tab order — sem regressão

---

## Edge cases

- **Usuário beauty com `forceTheme="barber"`** → mudanças afetam apenas a branch `isBeauty === false`; sem impacto
- **BrutalButton `variant="outline"`** → substituição de `border-black text-black` por gold garante legibilidade no tema escuro
- **Mobile** → `shadow-lite-gold` (cards mobile) não usa sombra offset; sem conflito
- **`disabled` state** → mudança de `disabled:opacity-70 disabled:grayscale` para `disabled:opacity-50` — ainda visível e acessível
- **`brutal-card-enhanced` via CSS** → usada em páginas diretas; atualizar junto com o componente para consistência

---

## Teste E2E

```
1. Acessar /#/login como usuário barber
2. Verificar: botões com fonte normal (não monospace), sem maiúsculas forçadas
3. Fazer login → Dashboard
4. Verificar: cards sem parafusos nos cantos
5. Verificar: títulos de cards em case normal
6. Abrir qualquer modal (ex: criar agendamento)
7. Verificar: borda discreta, sem sombra offset preta, sem tracejado
8. Hover em botão primário → deve brilhar levemente (não levantar)
9. Verificar input com foco → ring dourado sutil, não sombra offset
10. Acessar /#/configuracoes → verificar sidebar sem borda grossa preta
11. Testar em mobile (Chrome DevTools 390px) → visual consistente
12. Logar como usuário beauty → verificar ZERO mudanças no tema beauty
```

---

## Arquivos envolvidos

- `components/BrutalButton.tsx` — base styles + variant outline
- `components/BrutalCard.tsx` — remover Screw, remover uppercase título
- `components/Modal.tsx` — estilos brutal do modal, header, footer, dots
- `index.html` — bloco `<style>` com classes `.brutal-*`, `.card-brutal-*`, `.input-brutal:focus`, `.stat-card-brutal`, scrollbar

---

## Done when

- [ ] Nenhum botão do tema barber usa fonte monospace ou uppercase
- [ ] Nenhum card do tema barber exibe parafusos nos cantos
- [ ] Nenhum modal do tema barber usa borda `border-4` ou sombra offset `4px+ 0px #000`
- [ ] Nenhum separador interno usa `border-dashed`
- [ ] Hover de botão não usa `translate` — usa `brightness` ou `opacity`
- [ ] Focus de input mostra ring dourado, não sombra offset preta
- [ ] Tema Beauty: zero regressão visual confirmada
- [ ] Testado em mobile (390px) sem quebra de layout
- [ ] `npm run lint` passa sem erros
- [ ] `npm run typecheck` passa sem erros
