# SPEC: Modernização UI — Tema Barber (Brutal → Dark Premium Industrial)

**ID:** ui-barber-modernization
**Status:** done
**Criado:** 2026-04-16
**Prioridade:** alta
**Fase proposta:** Phase 6 (UI Polish — Barber Theme)
**Fonte:** specs/active/ui-modernizacao-tema-barber.md

---

## Contexto

O tema Barber (brutal) parece "anos 90" — fontes monospace, maiúsculas forçadas, parafusos decorativos, sombras offset pixel-art. O tema Beauty já está moderno. O Barber precisa evoluir para **dark premium industrial** sem regredir o Beauty.

---

## Requisitos

| ID | Requisito | Arquivo |
|----|-----------|---------|
| R-01 | Botões barber: sem `font-mono`, sem `uppercase` | BrutalButton.tsx |
| R-02 | Botões barber: `border-2 border-black` → `border border-white/10` + `rounded-xl` | BrutalButton.tsx |
| R-03 | Botões barber: hover translate → `brightness-110` | BrutalButton.tsx |
| R-04 | Botões barber: active translate → `scale-[0.97]` | BrutalButton.tsx |
| R-05 | Botões barber: `disabled:opacity-70 disabled:grayscale` → `disabled:opacity-50` | BrutalButton.tsx |
| R-06 | Botão outline barber: `border-black text-black` → `border-accent-gold/30 text-accent-gold` | BrutalButton.tsx |
| R-07 | Cards barber: remover import + JSX dos 4 `<Screw>` | BrutalCard.tsx |
| R-08 | Cards barber: título `uppercase tracking-wider` → `tracking-normal` | BrutalCard.tsx |
| R-09 | Modal barber: `border-4 border-brutal-border shadow-[8px_8px_0px_0px_#000]` → `border border-white/10 shadow-promax-depth rounded-2xl` | Modal.tsx |
| R-10 | Modal barber: header `border-b-2 border-black border-dashed bg-neutral-900/50` → `border-b border-white/8 px-6 py-4` | Modal.tsx |
| R-11 | Modal barber: título `uppercase tracking-wider` → remover | Modal.tsx |
| R-12 | Modal barber: footer `border-t-2 border-black border-dashed bg-neutral-900/50` → `border-t border-white/8` | Modal.tsx |
| R-13 | Modal barber: remover 4 dots decorativos (`w-2 h-2 bg-neutral-600 rounded-full`) | Modal.tsx |
| R-14 | CSS `.brutal-card-enhanced`: border 3px + shadow offset → border 1px rgba + shadow suave | index.html |
| R-15 | CSS `.brutal-card-enhanced:hover`: translate X/Y → `translateY(-2px)` + promax-depth | index.html |
| R-16 | CSS `.brutal-button-premium`: border 3px + shadow offset → shadow gold suave | index.html |
| R-17 | CSS `.brutal-button-premium:hover/active`: translate → brightness/scale | index.html |
| R-18 | CSS `.brutal-header`: border 3px + box-shadow → border-bottom 1px sutil | index.html |
| R-19 | CSS `.brutal-sidebar`: border-right 3px → 1px sutil | index.html |
| R-20 | CSS `.input-brutal:focus`: shadow offset → ring dourado `0 0 0 2px rgba(194,155,64,0.25)` | index.html |
| R-21 | CSS `.card-brutal-hover:hover`: translate + offset → translateY + depth | index.html |
| R-22 | CSS `.stat-card-brutal`: border 3px + shadow offset → border 1px + shadow suave | index.html |
| R-23 | CSS Scrollbar: remover `border-left: 2px solid #000` e `border: 2px solid #000` | index.html |
| R-24 | CSS Mobile: atualizar override `!important` no `brutal-card-enhanced/brutal-button-premium` | index.html |

---

## O que NÃO muda

- Tema Beauty — zero alterações
- Lógica de negócio (props, eventos, estados)
- Cores: `#121212`, `#1E1E1E`, `#C29B40`
- `rounded-[28px]` dos cards
- `shadow-promax-glass`, `shadow-promax-depth`, `shadow-gold`
- Glassmorphism e animações de entrada
- Tokens Tailwind
- `Screw.tsx` — arquivo permanece (não é mais importado)
- Temas Obsidian/Silk da página pública
- Acessibilidade: focus trap, aria-labels, ESC, tab order

---

## Done when

- [x] Nenhum botão barber usa `font-mono` ou `uppercase`
- [x] Nenhum card barber exibe parafusos
- [x] Nenhum modal barber usa `border-4` ou sombra offset ≥4px
- [x] Nenhum separador usa `border-dashed`
- [x] Hover de botão usa `brightness` (não `translate`)
- [x] Focus de input mostra ring dourado (não shadow offset)
- [x] Tema Beauty: zero regressão visual
- [x] Testado em mobile 390px
- [x] `npm run lint` passa
- [x] `npm run typecheck` passa
