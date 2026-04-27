# TASKS — dual-mode-theme

> Gerado em: 2026-04-26
> Spec: `.specs/features/dual-mode-theme/spec.md`
> Escopo: Large (4 componentes, 1 contexto novo, 1 hook modificado, 1 HTML modificado)

---

## Dependências entre Tasks

```
T-01 (anti-FOUC script)
  └─→ T-02 (ThemeContext — lê o atributo que T-01 setou)
        └─→ T-03 (Header toggle — consome ThemeContext)
              └─→ T-04 (theme-color meta tag sync)
```

---

## T-01 — Anti-FOUC: script inline no `<head>`

**O que:** Adicionar script inline no `index.html` antes do bundle React que lê `agendix_color_mode` do localStorage e injeta `data-mode` no `<html>` imediatamente, antes do primeiro paint.

**Onde:** `index.html` — dentro do `<head>`, antes de qualquer `<script src>` ou `<link>` de stylesheet.

**Reqs cobertos:** R-08, R-03

**Feito quando:**
- Script existe no `<head>` antes do bundle
- Sem localStorage → `data-mode="dark"` (padrão)
- Com localStorage `"light"` → `data-mode="light"` aplicado antes do paint
- Verificável via DevTools → recarregar → inspecionar `<html>` no primeiro paint

**Status:** `[x]`

---

## T-02 — Criar `contexts/ThemeContext.tsx`

**O que:** Context React que expõe `{ mode, toggleMode }` onde:
- `mode`: `"dark" | "light"` — lido do atributo atual do DOM (não useState)
- `toggleMode()`: inverte `data-mode` no `document.documentElement` + salva em localStorage

**Onde:** `contexts/ThemeContext.tsx` [NOVO]

**Reqs cobertos:** R-02, R-05

**Detalhe técnico:**
```ts
// Não usar useState — leitura é sempre do DOM
const toggleMode = () => {
  const next = document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-mode', next);
  localStorage.setItem('agendix_color_mode', next);
};
```

**Feito quando:**
- `ThemeProvider` criado e exportado
- `useTheme()` hook exportado
- `toggleMode` funciona sem re-render da árvore

**Status:** `[x]`

---

## T-03 — Adicionar `ThemeProvider` no `App.tsx` + toggle no `Header.tsx`

**O que:**
1. Envolver a árvore com `ThemeProvider` em `App.tsx`
2. Adicionar botão de toggle no `Header.tsx` com ícone Sol/Lua, animação de rotação CSS, consumindo `useTheme()`

**Onde:**
- `App.tsx` — adicionar `ThemeProvider` no wrapping
- `components/Header.tsx` — botão toggle

**Reqs cobertos:** R-01, R-04, R-10

**Visual do botão:**
- Ícone: 🌙 (dark) / ☀️ (light) — via SVG embutido ou Lucide (verificar se já existe no projeto)
- Animação: `rotate` 180° em 200ms no toggle
- Posição: ao lado do botão de notificação, visível em mobile e desktop

**Feito quando:**
- Botão renderiza no Header
- Clicar troca o modo instantaneamente (visualmente — fundo muda)
- Ícone anima na troca

**Status:** `[x]`

---

## T-04 — Sync do `<meta name="theme-color">` com o modo ativo

**O que:** Após o toggle, atualizar o `<meta name="theme-color">` para refletir a cor de fundo do modo atual. Isso afeta a barra de status do Android/iOS quando o app é adicionado à tela inicial (PWA).

**Onde:** `hooks/useDynamicBranding.ts` — adicionar lógica de sync do theme-color baseada no `data-mode` atual

**Reqs cobertos:** R-09

**Mapeamento:**
| tema + modo | theme-color |
|---|---|
| barber + dark | `#121212` |
| barber + light | `#F5F1E8` |
| beauty + dark | `#1F1B2E` |
| beauty + light | `#F7F5FF` |

**Feito quando:**
- Trocar de modo → inspecionar `<meta name="theme-color">` no DevTools → valor atualizado
- Funciona para ambos os temas

**Status:** `[x]`

---

## T-05 — Tokens semânticos novos nos 4 blocos CSS

**O que:** Adicionar `--color-card-elevated`, `--color-card-hover`, `--color-divider`, `--color-overlay`, `--color-text-muted`, `--shadow-brutal`, `--shadow-brutal-sm`, `--shadow-brutal-md` em cada um dos 4 blocos `data-theme/data-mode`.

**Onde:** `index.html` — bloco de variáveis CSS (linhas ~317–377)

**Status:** `[x]`

---

## T-06 — Bridge CSS estendida

**O que:** Cobrir `bg-black`, `bg-black/10..90`, `bg-neutral-950`, `bg-stone-*`, `bg-zinc-*`, hovers (`hover:bg-black/5`, `hover:bg-neutral-700`…), bordas (`border-black`, `border-stone-*`, `border-zinc-*`), textos claros, cards elevados, ring states e gradientes (`from-/to-` para cores escuras).

**Onde:** `index.html` — após bloco bridge existente (linhas ~292+)

**Status:** `[x]`

---

## T-07 — Utilitárias `.shadow-brutal*`

**O que:** Criar classes `.shadow-brutal`, `.shadow-brutal-sm`, `.shadow-brutal-md`, `.bg-card`, `.bg-card-elevated`, `.bg-overlay`, `.border-divider`, `.text-muted` que consomem os tokens.

**Onde:** `index.html` — após blocos de tokens

**Status:** `[x]`

---

## T-08 — Refactor sombras hardcoded

**O que:** Substituir `shadow-[*_#000000]` por `shadow-brutal*` (consome token).

**Arquivos refatorados:**
- `components/GoalHistory.tsx:45`
- `components/ServiceModal.tsx:231,239,243,287` (4 ocorrências)
- `components/TeamMemberForm.tsx:149`
- `pages/Agenda.tsx:1892`
- `pages/ClientCRM.tsx:560,635` (2 ocorrências)

**Status:** `[x]`

---

## T-09 — Refactor hex inline

**O que:** Substituir cores hardcoded em JSX/props JS por `var(--color-*)` ou leitura via `getComputedStyle`.

**Arquivos refatorados:**
- `components/CommissionShareModal.tsx:100` — `'#171717'` → leitura dinâmica de `--color-card`
- `components/FinanceInsights.tsx:326` — Recharts Tooltip usa tokens
- `components/dashboard/DashboardHero.tsx:45` — `border-[#121212]` → `border-[color:var(--color-bg)]`

**Status:** `[x]`

---

## T-10 — Toggle no Header reativado

**O que:** Descomentar botão Sol/Lua no `Header.tsx` (estava em comentário desde T-03).

**Onde:** `components/Header.tsx:150-173`

**Status:** `[x]`

---

## T-11 — Validação técnica

- [x] `npm run typecheck` — passa (corrigido cast `useSyncExternalStore<ColorMode>`)
- [x] `npm run build` — passa (build em 20.68s)

---

## Checklist Final de Validação Visual

- [ ] **4 estados visuais**: Barber Dark, Barber Light, Beauty Dark, Beauty Light — todos corretos
- [ ] **Persistência**: F5 mantém o modo
- [ ] **Anti-FOUC**: recarregar lento (throttle CPU 4x) não mostra flash branco/escuro
- [ ] **Rotas públicas**: `/booking/*` não é afetado pelo toggle
- [ ] **PWA**: `theme-color` sincronizado
- [ ] **Mobile**: toggle acessível e funcional em 306px de largura
- [ ] **Auditoria visual**: Agenda, ClientArea, ClientCRM, Finance, CommissionsManagement, ProfessionalCommissionDetails, CommissionPaymentHistory — todos OK em Light Mode
- [ ] **Recharts**: tooltips e grid coerentes nos 4 estados
- [ ] **Modais**: overlay e sombras corretos no Light Mode
- [ ] **WCAG AA**: contraste ≥ 4.5:1 corpo, ≥ 3:1 títulos nos 4 estados
