# TASKS — Design System End-to-End

> Tarefas atômicas com dependências, critérios de verificação e gates.
> Gerado a partir de `spec.md` e `design.md`.

---

## Sumário

| Fase | Tarefas | Status |
|---|---|---|
| 1 — Fundação | T1-T3 | Pending |
| 2 — Componentes Base | T4-T9 | Pending |
| 3 — Layout e Navegação | T10-T12 | Pending |
| 4 — Light Mode | T13-T14 | Pending |
| 5 — Visualização | T15-T16 | Pending |

---

## Fase 1 — Fundação

### T1: Refinar `useBrutalTheme()` hook
**O que**: Garantir que o hook retorna classes corretas para os 4 estados. Adicionar `classes.tableRow` e `classes.tableHeader` se faltarem.
**Onde**: `hooks/useBrutalTheme.ts`
**Depende de**: —
**Reutiliza**: `design.md` seção 2.3, `design-system/tokens.css`
**Done when**:
- [ ] `classes.tableRow` existe e retorna string válida
- [ ] `classes.tableHeader` existe e retorna string válida
- [ ] Teste `useBrutalTheme.test.ts` passa para os 4 estados
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T2: Criar `DesignSystemProvider`
**O que**: Componente que orquestra `ThemeProvider` + `DynamicBranding` + injeção inicial de tokens.
**Onde**: `contexts/DesignSystemProvider.tsx` (novo)
**Depende de**: —
**Reutiliza**: `contexts/ThemeContext.tsx`, `components/DynamicBranding.tsx`
**Done when**:
- [ ] Provider renderiza `ThemeProvider` + `DynamicBranding` como children
- [ ] `App.tsx` usa `DesignSystemProvider` no lugar de `UIProvider` (ou junto)
- [ ] Zero regressão na inicialização
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T3: Atualizar `index.html` com anti-FOUC
**O que**: Script inline no `<head>` que lê `localStorage` e seta `data-mode` antes do React montar.
**Onde**: `index.html`
**Depende de**: —
**Reutiliza**: `spec.md` R-08, `dual-mode-theme/spec.md`
**Done when**:
- [ ] Script inline no `<head>` lê `agendix_color_mode` e seta `data-mode`
- [ ] Zero flash de tema na carga (testar com throttling 3G)
- [ ] `npm run build` completa sem erros

**Gate**: `npm run build`

---

## Fase 2 — Componentes Base

### T4: Refatorar `BrutalCard.tsx`
**O que**: Substituir toda lógica inline por `useBrutalTheme()`.
**Onde**: `components/BrutalCard.tsx`
**Depende de**: T1
**Reutiliza**: `design.md` seção 3.1
**Done when**:
- [ ] Zero `isBeauty = userType === 'beauty'`
- [ ] Usa `classes.card`, `classes.cardAccent`, `classes.cardGlow`
- [ ] Mantém camadas de craft (noise, gradient overlay)
- [ ] `forceTheme` prop usa `useBrutalTheme({ override: forceTheme })`
- [ ] Mobile shadow via hook
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T5: Refatorar `BrutalButton.tsx`
**O que**: Substituir variants hardcoded por `classes.button*` do hook.
**Onde**: `components/BrutalButton.tsx`
**Depende de**: T1
**Reutiliza**: `design.md` seção 3.2
**Done when**:
- [ ] Zero `isBeauty` inline
- [ ] Usa `classes.buttonPrimary`, `classes.buttonSecondary`, `classes.buttonGhost`, `classes.buttonDanger`
- [ ] Mantém props: `variant`, `size`, `icon`, `fullWidth`, `loading`
- [ ] `forceTheme` prop usa `useBrutalTheme({ override: forceTheme })`
- [ ] Camadas de craft (noise, inner glow) mantidas
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T6: Refatorar `Modal.tsx`
**O que**: Substituir estilos duplicados por `classes.modal*` do hook.
**Onde**: `components/Modal.tsx`
**Depende de**: T1, T5 (ModalFooter usa BrutalButton)
**Reutiliza**: `design.md` seção 3.3
**Done when**:
- [ ] Zero `isBeauty` inline
- [ ] Usa `classes.modalOverlay`, `classes.modalContainer`, `classes.modalHeader`
- [ ] `ConfirmModal` usa `classes.buttonPrimary` / `classes.buttonGhost`
- [ ] FocusTrap, ESC, portal mantidos
- [ ] `forceTheme` prop funciona
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T7: Refatorar `Header.tsx`
**O que**: Substituir `accentColor`/`bgColor` manual por `accent.*` e `colors.*` do hook.
**Onde**: `components/Header.tsx`
**Depende de**: T1
**Reutiliza**: `design.md` seção 3.4
**Done when**:
- [ ] Zero `isBeauty` inline
- [ ] Usa `accent.text`, `accent.bg`, `colors.bg`, `colors.divider`
- [ ] Theme toggle (Sun/Moon) funciona com `useTheme()`
- [ ] Notification badge usa `accent.bg`
- [ ] Profile menu usa `colors.bg` e `colors.border`
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T8: Refatorar `Sidebar.tsx`
**O que**: Substituir `themeColor` manual por `accent.*` e `colors.*` do hook.
**Onde**: `components/Sidebar.tsx`
**Depende de**: T1
**Reutiliza**: `design.md` seção 3.5
**Done when**:
- [ ] Zero `isBeauty` inline
- [ ] Item ativo usa `accent.bgDim`, `accent.text`, `accent.border`
- [ ] Item inativo usa `colors.textSecondary`
- [ ] Logout hover usa `colors.danger` (se existir) ou hardcoded red
- [ ] Mobile overlay mantido
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T9: Refatorar `Layout.tsx`
**O que**: Aplicar `colors.bg` dinamicamente e remover background fixo.
**Onde**: `components/Layout.tsx`
**Depende de**: T1
**Reutiliza**: `design.md` seção 3.6
**Done when**:
- [ ] Usa `colors.bg` no container raiz
- [ ] `BrutalBackground` continua como camada decorativa
- [ ] Light mode reflete no background
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

## Fase 3 — Layout e Navegação

### T10: Verificar consistência em componentes derivados
**O que**: Audit `components/` e `pages/` para encontrar mais ocorrências de `isBeauty` inline.
**Onde**: Todo o projeto
**Depende de**: T4-T9
**Reutiliza**: —
**Done when**:
- [ ] Lista de arquivos com `isBeauty` inline gerada
- [ ] Priorização: P0 (base), P1 (frequente), P2 (ocasional)
- [ ] `grep -r "userType === 'beauty'" components/ pages/` executado

**Gate**: Lista documentada em `STATE.md`

---

### T11: Atualizar componentes de alto impacto
**O que**: Refatorar os 5 componentes mais usados fora dos base.
**Onde**: A definir após T10 (provavelmente: `SettingsLayout`, `TabNav`, `ClientBookingCard`, `TeamMemberCard`, `AppointmentWizard`)
**Depende de**: T10
**Reutiliza**: `classes.*` do hook
**Done when**:
- [ ] 5 componentes refatorados
- [ ] Zero `isBeauty` inline nos 5
- [ ] `npm run typecheck` passa

**Gate**: `npm run typecheck`

---

### T12: Testar responsividade mobile
**O que**: Verificar todos os componentes base em 375px.
**Onde**: Browser DevTools
**Depende de**: T4-T9
**Reutiliza**: —
**Done when**:
- [ ] Cards legíveis sem zoom
- [ ] Botões com touch target ≥ 44px
- [ ] Zero scroll horizontal em páginas principais
- [ ] Sidebar funciona como drawer
- [ ] Bottom nav visível e funcional

**Gate**: Checklist visual manual

---

## Fase 4 — Light Mode

### T13: Verificar tokens CSS em light mode
**O que**: Garantir que `tokens.css` cobre todos os casos usados pelos componentes.
**Onde**: `design-system/tokens.css`
**Depende de**: T3
**Reutiliza**: `design-system/MASTER.md`
**Done when**:
- [ ] Variáveis `--color-*` consistentes nos 4 blocos
- [ ] Variáveis `--shadow-*` adaptadas para light
- [ ] Gradientes light mode são sutis (não saturados)
- [ ] `npm run build` passa

**Gate**: `npm run build`

---

### T14: Testar toggle em todas as páginas
**O que**: Navegar pelas páginas principais e alternar dark/light.
**Onde**: `/`, `/agenda`, `/finance`, `/clientes`, `/configuracoes/*`
**Depende de**: T4-T9, T13
**Reutiliza**: —
**Done when**:
- [ ] Toggle instantâneo (sem flash)
- [ ] Background muda corretamente
- [ ] Cards mantêm legibilidade
- [ ] Texto não fica invisível
- [ ] Bordas visíveis
- [ ] Inputs com focus ring visível

**Gate**: Checklist visual manual

---

## Fase 5 — Visualização

### T15: Gerar telas de referência Stitch MCP
**O que**: Gerar 4 telas de dashboard (Barber Dark, Barber Light, Beauty Dark, Beauty Light).
**Onde**: `.stitch/` ou diretório de assets
**Depende de**: T4-T9
**Reutiliza**: `design-system/MASTER.md`, `tokens.css`
**Done when**:
- [ ] 4 telas de dashboard geradas
- [ ] Cada tela mostra: header, sidebar, cards, botões, modal
- [ ] Export PNG para cada tela
- [ ] Telas salvas em `design-system/visuals/`

**Gate**: Arquivos PNG existem

---

### T16: Gerar componentes isolados Stitch MCP
**O que**: Gerar 4 componentes isolados (Card, Button, Modal, Input) nos 4 estados.
**Onde**: `.stitch/` ou diretório de assets
**Depende de**: T15
**Reutiliza**: —
**Done when**:
- [ ] 4 componentes × 4 estados = 16 variações geradas
- [ ] Export PNG para cada variação
- [ ] Telas salvas em `design-system/visuals/components/`

**Gate**: Arquivos PNG existem

---

## Dependências Gráficas

```
T1 ──┬── T4 ──┬── T10 ─── T11
     ├── T5 ──┤
     ├── T6 ──┤
     ├── T7 ──┤
     ├── T8 ──┤
     └── T9 ──┘

T2 (independente)
T3 (independente)

T12 depende de T4-T9
T13 depende de T3
T14 depende de T4-T9, T13
T15 depende de T4-T9
T16 depende de T15
```

---

## Execução Recomendada

**Batch 1 (paralelo)**: T1, T2, T3
**Batch 2 (paralelo)**: T4, T5, T6, T7, T8, T9
**Batch 3 (sequencial)**: T10 → T11
**Batch 4 (paralelo)**: T12, T13
**Batch 5 (sequencial)**: T14
**Batch 6 (sequencial)**: T15 → T16

---

## Rastreamento

| ID | Tarefa | Status | Responsável | Início | Fim |
|---|---|---|---|---|---|
| T1 | Refinar useBrutalTheme() | Pending | — | — | — |
| T2 | DesignSystemProvider | Pending | — | — | — |
| T3 | Anti-FOUC index.html | Pending | — | — | — |
| T4 | Refatorar BrutalCard | Pending | — | — | — |
| T5 | Refatorar BrutalButton | Pending | — | — | — |
| T6 | Refatorar Modal | Pending | — | — | — |
| T7 | Refatorar Header | Pending | — | — | — |
| T8 | Refatorar Sidebar | Pending | — | — | — |
| T9 | Refatorar Layout | Pending | — | — | — |
| T10 | Auditar componentes derivados | Pending | — | — | — |
| T11 | Atualizar alto impacto | Pending | — | — | — |
| T12 | Testar mobile | Pending | — | — | — |
| T13 | Verificar tokens light | Pending | — | — | — |
| T14 | Testar toggle | Pending | — | — | — |
| T15 | Stitch telas dashboard | Pending | — | — | — |
| T16 | Stitch componentes | Pending | — | — | — |

---

*Última atualização: 2026-05-03*
*Versão: 1.0*
