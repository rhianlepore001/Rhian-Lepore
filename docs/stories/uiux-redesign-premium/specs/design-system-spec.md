# Spec: Design System Premium

## Objetivo

Transformar o Design System do AgendiX em uma base visual premium e coesa, eliminando padrões datados do tema barber (parafusos, sombras offset pretas, fontes monospace em botões) e elevando a consistência do tema beauty. Este spec é o fundamento que desbloqueia todos os outros módulos do redesign.

---

## Scope

### In
- `hooks/useBrutalTheme.ts` — tokens de cor, radius, sombra, tipografia, classes.
- `components/BrutalCard.tsx` — estrutura, header, glassmorphism, animações.
- `components/BrutalButton.tsx` — variantes, estados, loading, ícones.
- `components/Modal.tsx` — overlay, container, header, footer, acessibilidade.
- `components/SkeletonLoader.tsx` — consistência com novos tokens.
- Bloco `<style>` do `index.html` — classes globais `.brutal-*`, `.input-brutal`, scrollbar.

### Out
- Lógica de negócio dos componentes (props, eventos, estados internos).
- Páginas e features específicas.
- Backend / Supabase.

---

## Technical Approach

1. **Tokens (`useBrutalTheme`)**
   - Manter `ACCENT_MAP`, `COLOR_MAP`, `FONT_MAP` e adicionar novos tokens de sombra (`shadow-promax-glass`, `shadow-promax-depth`).
   - Garantir que `radius.card = 'rounded-2xl'` e `radius.button = 'rounded-2xl'` permaneçam.
   - Adicionar tokens para `focusRing` em inputs.

2. **BrutalCard**
   - Remover `import { Screw }` e os 4 elementos `<Screw>` do JSX.
   - Manter `rounded-2xl`, glassmorphism (`backdrop-blur`, gradientes sutis) e as props `accent`, `glow`, `animate`.
   - Header: remover `uppercase tracking-wider` do título, usar `tracking-tight`.
   - Garantir que classes CSS esperadas pelos testes (`rounded-2xl`, `bg-brutal-card`, `bg-beauty-card`) sejam preservadas.

3. **BrutalButton**
   - Base: trocar `font-mono font-bold uppercase tracking-tight` para `font-sans font-semibold` no tema barber. Beauty já usa `font-sans`.
   - Borda: `border-2 border-black` → `border border-white/10` (barber dark).
   - Hover: `translate(-2px,-2px)` → `hover:brightness-110`.
   - Active: `translate(1px,1px)` → `active:scale-[0.97]`.
   - Variant `outline`: ajustar para `border-accent-gold/30 text-accent-gold` no barber.
   - Manter lógica de `loading`, `icon`, `fullWidth`, `disabled`.

4. **Modal**
   - Brutal: `border-4 border-brutal-border shadow-[8px_8px_0px_0px_#000]` → `border border-white/10 shadow-promax-depth rounded-2xl`.
   - Header: `border-b-2 border-black border-dashed` → `border-b border-white/8`.
   - Footer: `border-t-2 border-black border-dashed` → `border-t border-white/8`.
   - Remover os 4 dots decorativos no header.
   - Manter `focus-trap`, `ESC`, `aria-labelledby`, `role="dialog"`.

5. **CSS Global (`index.html`)**
   - `.brutal-card-enhanced`: border sutil + `shadow-promax-glass`.
   - `.brutal-button-premium`: sem borda preta, shadow real.
   - `.input-brutal:focus`: ring dourado/lavanda (`0 0 0 2px rgba(194,155,64,0.25)`).
   - Scrollbar: remover bordas pretas grossas.

---

## Component List

| Componente | Mudança Principal |
|------------|-------------------|
| `BrutalCard` | Remover Screw, ajustar header/title, manter glass |
| `BrutalButton` | Fonte sans, hover brightness, active scale |
| `Modal` | Borda sutil, sombra real, remover tracejado/dots |
| `SkeletonLoader` | Ajustar cores aos novos tokens |
| `useBrutalTheme` | Novos tokens de shadow/focus, manter radius |

---

## Data Requirements

Nenhuma — todos os componentes são puramente apresentacionais.

---

## Dual Mode Strategy (Dark-first)

**Decisão arquitetural:** Dark mode é prioridade no Sprint 1. Light mode permanece funcional (MVP) — não quebrar, mas não aprimorar.

**Regra técnica obrigatória (zero exceções):**
1. Todo CSS em componentes deve vir do `useBrutalTheme` (`colors.*`, `accent.*`, `classes.*`).
2. **NUNCA** hardcode cor dark/light diretamente em JSX ou CSS.
3. **NUNCA** remover tokens de light mode do `COLOR_MAP` ou `ACCENT_MAP`.
4. Light mode testado ao final do sprint: deve renderizar sem crash, com contraste mínimo 4.5:1.
5. Redesign premium do light mode agendado para Sprint futuro (pós-dashboard), pois basta trocar valores no `COLOR_MAP` sem tocar em componentes.

**Risco mitigado:** Como todos os componentes usam tokens, o redesenho do light mode no futuro é só trocar o mapa de cores — zero refatoração de componentes.

---

## Skills de Design Aplicadas

| Fase | Skill | Comando / Uso |
|------|-------|---------------|
| Contexto | `impeccable` | `/impeccable teach` — já produziu PRODUCT.md + DESIGN.md |
| Tokens | `design-system` | `skill: design-system` — arquitetura 3 camadas (primitive → semantic → component) |
| Componentes | `ui-styling` | `skill: ui-styling` — implementação com Tailwind + shadcn/ui |
| Shape | `impeccable` | `/impeccable shape BrutalCard` → `/impeccable shape BrutalButton` → `/impeccable shape Modal` |
| Craft | `impeccable` | `/impeccable craft BrutalCard` → `/impeccable craft BrutalButton` → `/impeccable craft Modal` |
| Audit | `impeccable` + `ui-ux-pro-max` | `/impeccable audit` + `skill: ui-ux-pro-max --domain ux` (contrastes, touch targets) |
| Polish | `impeccable` | `/impeccable polish` em cada componente antes de merge |

---

## Acceptance Criteria

- [ ] `npm run typecheck` passa sem erros.
- [ ] `npm run lint` passa sem erros.
- [ ] `npm test` passa — `BrutalCard.test.tsx`, `BrutalButton.test.tsx`, `Modal.test.tsx`, `useBrutalTheme.test.ts` verdes.
- [ ] **Light mode funcional:** Renderiza sem crash, contraste mínimo 4.5:1 verificado.
- [ ] **Zero hardcode:** Nenhuma cor hardcoded em componentes — tudo via `useBrutalTheme`.
- [ ] Mobile (390px): botões e cards consistentes.
- [ ] Acessibilidade: focus rings visíveis, tab order preservado.
- [ ] Tokens documentados em DESIGN.md.

---

## Estimativa

**Tamanho:** L (1 sprint de 2 semanas)  
**Justificativa:** Alto risco de regressão devido à centralidade dos componentes. Cada mudança afeta dezenas de consumidores.
