# Sprint 1 — Execution Guide (Foundation)

**Objetivo:** Elevar o Design System do AgendiX para premium, com foco no dark mode e preservação do light mode funcional.

**Duração:** 2 semanas (pode comprimir para 1 semana se agentes trabalharem em paralelo)

**Skills ativas:** `impeccable`, `design-system`, `ui-styling`, `ui-ux-pro-max`

---

## Contexto Já Estabelecido

- `PRODUCT.md` criado na raiz do projeto
- `DESIGN.md` criado na raiz do projeto
- `docs/stories/uiux-redesign-premium/specs/design-system-spec.md` atualizado com regra do dual mode

---

## Fluxo de Execução por Componente

Para cada componente (`BrutalCard`, `BrutalButton`, `Modal`):

```
1. SHAPE   → /impeccable shape [Componente]
2. CRAFT   → /impeccable craft [Componente]
3. AUDIT   → /impeccable audit [Componente]
4. POLISH  → /impeccable polish [Componente]
```

---

## Semana 1 — Tokens + BrutalCard + BrutalButton

### Dia 1–2: Tokens (`useBrutalTheme.ts`)
**Responsável:** @dev + @architect
**Skills:** `design-system`

- Refinar `COLOR_MAP` dark (barber + beauty) — elevar contraste, saturar acentos
- Adicionar tokens de shadow: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` (valores reais, não utilities genéricas)
- Adicionar tokens de focus ring: `focusRing` para inputs e buttons
- Verificar `RADIUS_MAP`: garantir consistência com DESIGN.md
- **Validação:** `npm run typecheck` + `npm test` (useBrutalTheme.test.ts)

### Dia 3–5: BrutalCard
**Responsável:** @dev
**Skills:** `impeccable shape` → `impeccable craft` → `ui-styling`

- Shape: glassmorphism sutil, header refinado, camadas de craft
- Craft: implementar com tokens do `useBrutalTheme`
- Manter classes esperadas pelos testes: `rounded-2xl`, `bg-brutal-card`, `bg-beauty-card`
- **Validação:** `npm test` (BrutalCard.test.tsx)

### Dia 5–7: BrutalButton
**Responsável:** @dev
**Skills:** `impeccable shape` → `impeccable craft` → `ui-styling`

- Shape: estados (default, hover, active, disabled, loading), micro-interactions
- Craft: implementar com tokens, hover brightness, active scale
- Manter variantes: primary, secondary, danger, ghost, success, outline
- **Validação:** `npm test` (BrutalButton.test.tsx)

---

## Semana 2 — Modal + CSS Global + QA

### Dia 8–10: Modal
**Responsável:** @dev
**Skills:** `impeccable shape` → `impeccable craft`

- Shape: overlay backdrop-blur, container com radius xl, header/footer clean
- Craft: implementar com tokens, manter focus-trap, ESC, aria
- **Validação:** `npm test` (Modal.test.tsx)

### Dia 10–12: CSS Global (`index.html`)
**Responsável:** @dev-css (sub-agente)
**Skills:** `impeccable document` → `impeccable polish`

- Revisar bloco `<style>` do `index.html`
- `.brutal-card-enhanced`: border sutil + shadow real
- `.input-brutal:focus`: ring com cor do tema
- Scrollbar: remover bordas pretas grossas, usar estilo sutil
- **Validação:** Visual regression em ambos os temas

### Dia 12–14: QA + Light Mode Check
**Responsável:** @qa
**Skills:** `impeccable audit` + `ui-ux-pro-max --domain ux`

- `npm run typecheck`
- `npm run lint`
- `npm test` (todos)
- Light mode funcional check: renderiza sem crash, contraste 4.5:1
- Mobile check: Chrome DevTools 390px
- A11y check: focus rings, tab order, aria-labels

---

## Checklist de Entrega do Sprint 1

- [ ] `useBrutalTheme.ts` refinado com novos tokens de shadow/focus
- [ ] `BrutalCard.tsx` redesenhado (sem Screw, header premium, glass sutil)
- [ ] `BrutalButton.tsx` redesenhado (fonte sans, hover brightness, active scale)
- [ ] `Modal.tsx` redesenhado (borda sutil, sombra real, sem tracejado)
- [ ] CSS global revisado (`index.html`)
- [ ] Light mode funcional (não quebrou)
- [ ] Zero hardcode de cor em componentes
- [ ] Todos os testes passando
- [ ] DESIGN.md atualizado com tokens finais
- [ ] Handoff escrito para Sprint 2 (Dashboard)

---

## Regra de Ouro do Sprint 1

> **"Se você está escrevendo uma cor hex ou uma classe Tailwind de cor diretamente no JSX, você está fazendo errado."**
>
> Tudo deve vir de `const { colors, accent, classes } = useBrutalTheme()`.

---

## Próximo Passo

Delegar execução para @dev (Dex) com contexto completo.
