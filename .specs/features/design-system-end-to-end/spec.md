# SPEC — Design System End-to-End

> Feature slug: `design-system-end-to-end`
> Escopo: Complex (arquitetura, padronização, visualização)
> Autor: OpenCode
> Data: 2026-05-03

---

## 1. Contexto

O AgendiX possui um design system parcialmente implementado:
- `design-system/MASTER.md` com tokens de 3 camadas
- `design-system/tokens.css` com variáveis CSS para 4 estados (barber/beauty × dark/light)
- `hooks/useBrutalTheme.ts` com classes prontas
- `contexts/ThemeContext.tsx` com toggle dark/light

**Problema crítico**: Os componentes base **não consomem** o design system. Cada um faz sua própria verificação `isBeauty = userType === 'beauty'`, criando lógica duplicada, inconsistências visuais e dívida técnica.

**Objetivo**: Criar um design system end-to-end onde:
- Todo componente consome tokens via `useBrutalTheme()`
- 4 estados visuais (Barber Dark/Light, Beauty Dark/Light) são consistentes
- Mobile e desktop têm padrões definidos
- Cards, modais, sessões, hooks, formulários, tabelas, badges seguem arquitetura única
- Visualização de referência é gerada via Stitch MCP

---

## 2. Análise da Arquitetura UI Atual

### 2.1 Componentes Base Auditados

| Componente | Usa `useBrutalTheme()` | Problema |
|---|---|---|
| `BrutalCard.tsx` | ❌ Não | `isBeauty` inline, lógica de glass duplicada |
| `BrutalButton.tsx` | ❌ Não | `isBeauty` inline, variants hardcoded |
| `Modal.tsx` | ❌ Não | `isBeauty` inline, estilos duplicados por tema |
| `Header.tsx` | ❌ Não | `isBeauty` inline, `accentColor`/`bgColor` manual |
| `Sidebar.tsx` | ❌ Não | `isBeauty` inline, `themeColor` manual |
| `Layout.tsx` | ❌ Não | Não usa hook, background fixo para barber |

### 2.2 Padrões quebrados encontrados

1. **Anti-padrão `isBeauty` inline**: 6 componentes base fazem `const isBeauty = userType === 'beauty'` em vez de usar `useBrutalTheme().isBeauty`
2. **Classes hardcoded**: `text-accent-gold`, `bg-beauty-neon` espalhados em vez de `accent.text`, `accent.bg`
3. **Mobile detection duplicada**: `useUI().isMobile` misturado com `window.innerWidth` no hook
4. **Glassmorphism inconsistente**: Settings usa glass, dashboard usa gradiente, modal usa os dois
5. **Light mode não aplicado**: Tokens CSS existem, mas componentes usam classes hardcoded para dark apenas

### 2.3 O que funciona bem

- `useBrutalTheme()` hook está bem arquitetado com `ACCENT_MAP`, `COLOR_MAP`, `classes.*`
- `tokens.css` tem as 4 combinações completas
- `ThemeContext` toggle funciona (DOM mutation, sem re-render)
- `BrutalBackground` como camada decorativa separada é boa arquitetura

---

## 3. Requisitos

### 3.1 Funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| R-01 | Todo componente base deve consumir `useBrutalTheme()` — zero `isBeauty` inline | P0 |
| R-02 | `BrutalCard` deve usar `classes.card`, `classes.cardAccent`, `classes.cardGlow` do hook | P0 |
| R-03 | `BrutalButton` deve usar `classes.buttonPrimary`, `classes.buttonSecondary`, etc. do hook | P0 |
| R-04 | `Modal` deve usar `classes.modalOverlay`, `classes.modalContainer`, `classes.modalHeader` do hook | P0 |
| R-05 | `Header` e `Sidebar` devem usar `accent.*` e `colors.*` do hook | P0 |
| R-06 | `Layout` deve aplicar `colors.bg` dinamicamente e remover background fixo | P0 |
| R-07 | Light mode deve refletir em todos os componentes (tokens CSS + classes do hook) | P1 |
| R-08 | Mobile: shadows otimizadas (`shadow-lite-glass` vs `shadow-promax-glass`) via hook | P1 |
| R-09 | Criar `DesignSystemProvider` que orquestra `ThemeProvider` + injeção de tokens | P1 |
| R-10 | Gerar telas de referência com Stitch MCP para os 4 estados visuais | P2 |

### 3.2 Não-funcionais

| ID | Requisito |
|---|---|
| R-11 | Zero regressão visual em dark mode (estado atual) |
| R-12 | Toggle dark/light ≤ 16ms (manipulação DOM, não re-render) |
| R-13 | Anti-FOUC: modo salvo antes do React montar |
| R-14 | Mobile first: todos os componentes testados em 375px |
| R-15 | `npm run typecheck && npm run lint && npm run build` sem erros |

---

## 4. Arquitetura Alvo

```
App.tsx
  └── DesignSystemProvider
        ├── ThemeProvider (dark/light toggle)
        ├── DynamicBranding (data-theme injection)
        └── children

Componente qualquer
  └── useBrutalTheme()
        ├── theme (barber/beauty)
        ├── mode (dark/light)
        ├── accent.* (cores de destaque)
        ├── colors.* (cores de fundo, texto, borda)
        ├── classes.* (classes Tailwind prontas)
        └── font.* / radius.*
```

**Regra de Ouro**: Nenhum componente acessa `useAuth().userType` para decisões visuais. Só `useBrutalTheme()`.

---

## 5. Estados Visuais (4 combinações)

| Estado | Fundo | Card | Accent | Texto | Uso |
|---|---|---|---|---|---|
| Barber Dark | `#121212` | `#1E1E1E` | `#C29B40` (gold) | `#EAEAEA` | Padrão barbearia |
| Barber Light | `#F5F1E8` | `#FFFFFF` | `#A07A2A` | `#1A1A1A` | Modo claro barbearia |
| Beauty Dark | `#1F1B2E` | `#2E2B3B` | `#A78BFA` (neon) | `#EAEAEA` | Padrão salão |
| Beauty Light | `#F7F5FF` | `#FFFFFF` | `#7C3AED` | `#1A1225` | Modo claro salão |

---

## 6. Componentes Canônicos (padrão)

### Card
```tsx
const { classes } = useBrutalTheme();
<div className={classes.card}>...</div>
```

### Button
```tsx
const { classes } = useBrutalTheme();
<button className={classes.buttonPrimary}>...</button>
```

### Modal
```tsx
const { classes, accent } = useBrutalTheme();
<div className={classes.modalOverlay}>
  <div className={classes.modalContainer}>
    <div className={classes.modalHeader}>...</div>
  </div>
</div>
```

### Input
```tsx
const { classes } = useBrutalTheme();
<input className={classes.input} />
```

---

## 7. Mobile vs Desktop

| Aspecto | Mobile (< 768px) | Desktop (≥ 768px) |
|---|---|---|
| Card shadow | `shadow-lite-glass` | `shadow-promax-glass` |
| Card padding | `p-6` | `p-8` |
| Modal size | `max-w-sm` | `max-w-lg` / `max-w-2xl` |
| Header height | `h-16` | `h-20` |
| Sidebar | Drawer overlay | Fixed left |
| Bottom nav | Visível | Oculto |
| Font scale | `text-lg` títulos | `text-xl` títulos |

---

## 8. Fora de Escopo

- Criar novos tokens Tailwind (os existentes são suficientes)
- Alterar lógica de negócio ou queries
- Adicionar novas páginas
- Migrar para shadcn/ui ou outra library
- Sincronização de tema entre abas (BroadcastChannel)
- Detecção automática `prefers-color-scheme`

---

## 9. Critérios de Aceitação

- [ ] Zero `isBeauty = userType === 'beauty'` em componentes base
- [ ] Zero `text-accent-gold` ou `bg-beauty-neon` hardcoded em componentes base
- [ ] Toggle dark/light muda visual de todos os componentes instantaneamente
- [ ] Mobile 375px: cards legíveis, botões tocáveis (min 44px), zero scroll horizontal
- [ ] Desktop: hierarquia visual clara, cards com profundidade, sombras consistentes
- [ ] 4 estados visuais (Barber Dark/Light, Beauty Dark/Light) funcionam sem regressão
- [ ] Telas de referência Stitch MCP geradas para os 4 estados
- [ ] `npm run typecheck && npm run lint && npm run build` passam

---

## 10. Rastreabilidade

| ID | Requisito | Componente | Status |
|---|---|---|---|
| DS-01 | R-01 | BrutalCard.tsx | Pending |
| DS-02 | R-01 | BrutalButton.tsx | Pending |
| DS-03 | R-01 | Modal.tsx | Pending |
| DS-04 | R-01 | Header.tsx | Pending |
| DS-05 | R-01 | Sidebar.tsx | Pending |
| DS-06 | R-01 | Layout.tsx | Pending |
| DS-07 | R-02 | BrutalCard (classes.*) | Pending |
| DS-08 | R-03 | BrutalButton (classes.*) | Pending |
| DS-09 | R-04 | Modal (classes.*) | Pending |
| DS-10 | R-05 | Header/Sidebar (accent.*) | Pending |
| DS-11 | R-06 | Layout (colors.bg) | Pending |
| DS-12 | R-07 | Light mode em todos | Pending |
| DS-13 | R-08 | Mobile shadows | Pending |
| DS-14 | R-09 | DesignSystemProvider | Pending |
| DS-15 | R-10 | Stitch MCP visualização | Pending |

**Coverage**: 15 requisitos, 15 mapeados, 0 unmapped ✅
