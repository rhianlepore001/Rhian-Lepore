# Sprints — AgendiX UI Remediation

**Run:** `20260610_120000` · **Fase:** 8 (harness-planner) · **Fonte:** `UI-REMEDIATION-SPEC.md` (§5–§12) + `DESIGN-SYSTEM.md` (DS Lock v1.0-audit)
**Referência visual (não alvo):** `artifacts/screen-lock/{login,dashboard,agenda,financeiro}.html` — `screen-lock.json` locked 4/4.
**Stack:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind (CDN) · `design-system/tokens.css` · `hooks/useBrutalTheme.ts`

> **Regra de ouro (harness):** entregável detalhado, implementação livre. Os critérios de aceite são objetivos e verificáveis. O HTML do screen-lock orienta composição; o alvo é o código React contra a SPEC §7.
> **Gate por sprint (obrigatório — AGENTS.md):** `npm run typecheck` · `npm run lint` · `npm run build` verdes + smoke 390px nos 4 modos (`barber-dark|barber-light|beauty-dark|beauty-light`) via rota real + `/configuracoes/ui-preview`.
> **Marca fixa:** barber accent dourado (`#C29B40` dark / `#A07A2A` light), beauty accent roxo (`#A78BFA` dark / `#7C3AED` light). Nunca trocar família de accent.

---

## Sprint 1: Backbone — tokens + hook
**Objetivo:** fonte única de design tokens; `RADIUS_MAP` e `DENSITY` por tema; remoção de uppercase/fade-in/z-index mágicos; `index.html` limpo. Sem isto, qualquer tela volta a divergir.
**Dependências:** nenhuma
**Findings:** UI-001, UI-005, UI-008, UI-019, UI-020, UI-026, UI-027, UI-032, UI-033, UI-035

### Features
- feat-101: `RADIUS_MAP` por `ThemeVariant` (barber sharp / beauty soft)
  - [ ] `RADIUS_MAP` é `Record<ThemeVariant, BrutalThemeTokens['radius']>` (passa `typecheck`)
  - [ ] barber usa `rounded-lg`/`rounded-md`/`rounded-xl`; beauty usa `rounded-2xl`/`rounded-xl`/`rounded-full` (conforme SPEC §5.1)
  - [ ] consumo via `RADIUS_MAP[theme]`; nenhum radius flat hardcoded remanescente em `useBrutalTheme.ts`
- feat-102: `DENSITY` por `ThemeVariant` (novo)
  - [ ] `DensityTokens` interface exportada com 8 campos (pagePadding, cardPadding, sectionGap, inlineGap, tableRowPy, navItemPy, kpiMinHeight, touchMin)
  - [ ] `DENSITY_MAP` é `Record<ThemeVariant, DensityTokens>` (barber compacto / beauty respirado, SPEC §5.2)
  - [ ] exposto em `BrutalThemeTokens` como `density: DensityTokens`
- feat-103: correções de craft em `classes` (`useBrutalTheme.ts`)
  - [ ] `classes.label` e `badge*` sem `uppercase`/`tracking-wider` (`grep "uppercase" useBrutalTheme.ts` na seção classes = 0)
  - [ ] `card` motion `transition-[box-shadow,transform] duration-200 ease-out` (sem `duration-500`)
  - [ ] `buttonPrimary` motion `duration-150 ease-out`
  - [ ] `tableRow` usa `colors.surfaceHover` + `density.tableRowPy` (sem `hover:bg-white/[0.03]` hardcoded)
  - [ ] `sidebarItemActive` via `accent.bgDim` + `accent.text` (sem `before:` side-stripe)
- feat-104: limpeza de `index.html` + z-scale + reduced-motion
  - [DEFER] `index.html` sem paletas duplicadas — **inviável sob Tailwind CDN**: as utilities (`bg-obsidian-*`, `text-accent-gold`…) vêm do `tailwind.config` inline e são usadas no app inteiro + dentro do `useBrutalTheme`. `tokens.css` só define CSS vars. Requer migração CDN→PostCSS (ciclo separado).
  - [DEFER] `grep -r "z-\[999\]\|z-\[200\]"` = 0 — ~20 arquivos; fazer junto da passada de validação (precisa de build verde).
  - [x] `@media (prefers-reduced-motion: reduce)` global cobre `.animate-in`/scale
  - [x] `<title>` = "AgendiX — Gestão do seu salão"
- feat-105: contraste light mode
  - [ ] `--color-text-secondary`/`muted` ≥ 4.5:1 contra `--color-card` em barber-light e beauty-light
  - [ ] diferenciação barber/beauty light por surface/card contrast + tipografia (não intensificar o beige `#F5F1E8`)

### Hints para o Coder
- Arquivos existentes: `hooks/useBrutalTheme.ts` (RADIUS_MAP `:282-289`, classes `:426-458`), `index.html` (`:9` title, `:39-80` paletas), `design-system/tokens.css`
- Interfaces chave: `ThemeVariant`, `BrutalThemeTokens`, `BrutalThemeTokens['radius']`
- Notas: tokens são ADITIVOS — não remover nomes ainda referenciados por telas fora do escopo (regressão §11.2). DS Lock §1.7 define a z-scale. Ver linhas exatas na SPEC §5.3.

---

## Sprint 2: Componentes base do Design System
**Objetivo:** componentes canônicos em `components/ui/*` com state matrix completa; `Brutal*` viram wrappers `@deprecated`. Renderizáveis no UiPreview nos 4 temas.
**Dependências:** Sprint 1
**Findings:** UI-002, UI-003, UI-006, UI-007, UI-008, UI-011, UI-022, UI-024

### Features
- feat-201: `ui/Modal` acessível
  - [ ] API única `open`/`onClose`; `focus-trap-react` ativo; `role="dialog"` + `aria-modal` + `aria-labelledby`
  - [ ] ESC + clique no overlay fecham (salvo `preventClose`); default `size="lg"` (560px); suporta `size="full"` com slots header/body/footer
  - [ ] usa `--z-modal`; sem `animate-in zoom`; respeita `prefers-reduced-motion`
- feat-202: `ui/Card` enxuto
  - [ ] só `variant: outlined | elevated`; props `title?`, `action?`, `variant`, `noPadding?`; padding de `density.cardPadding`
  - [ ] `grep "border-l-4"` e gradient/glow/nested em cards = 0
- feat-203: `ui/Button` tokenizado
  - [ ] `variant: primary|secondary|outline|ghost|danger|success`; `size: sm|md|lg`
  - [ ] `size="sm"` = `min-h-[44px]` no mobile; alturas tokenizadas (sem `h-12`/`h-11` divergentes)
  - [ ] estado loading com spinner in-button + `aria-busy`; hover `brightness-110`, active `scale-[0.97]`, focus `ring-2 accent`
- feat-204: inputs e seleção (`Input`/`Select`/`Textarea`/`Checkbox`)
  - [ ] focus `accent.border` + ring; disabled `opacity-50`; erro `dangerBorder` + `<p>` de mensagem abaixo
  - [ ] Checkbox com check anim ≤150ms
- feat-205: `EmptyState`, `Skeleton`/`SkeletonCard`, `Toast`, `Badge` canônicos
  - [ ] `EmptyState` API única `icon/title/description/action`
  - [ ] `SkeletonCard` shape casa `radius.card` + `density.cardPadding`; sem spinner fullscreen (exceto bootstrap auth)
  - [ ] `Toast` usa `--z-toast`; auto-dismiss 4s (erro 6s); `action` opcional; `Badge` sem uppercase
- feat-206: wrappers de deprecação
  - [ ] `BrutalCard`/`BrutalButton`/`Modal`(root)/`EmptyState`(root)/`SkeletonLoader` reexportam dos canônicos com `@deprecated` JSDoc
  - [ ] mapeamento de props: `isOpen`→`open`, `accent`→`variant="elevated"`, `message`→`title`
  - [ ] nenhum import fora do escopo quebra (typecheck + build verdes)
- feat-207: UiPreview cobre os componentes
  - [ ] `/configuracoes/ui-preview` renderiza todos os componentes novos × 4 temas sem erro

### Hints para o Coder
- Arquivos existentes: `components/ui/*` (existentes), `components/BrutalCard.tsx`, `components/BrutalButton.tsx`, `hooks/useBrutalTheme.ts` (S1: `density`, `radius`, `colors`, `accent`)
- Interfaces chave: `BrutalThemeTokens`, `DensityTokens` (S1), `ThemeVariant`
- Notas: instalar/usar `focus-trap-react` (confirmar no `package.json` antes — AGENTS.md). State matrix obrigatória: SPEC §6 tabela (7 colunas). Deprecação preserva API antiga (regressão §11.1).

---

## Sprint 3: AppShell + PageHeader
**Objetivo:** `PageHeader` reutilizável; `Layout` com density e shell de settings unificado; bottom nav acessível 44px; IA de navegação.
**Dependências:** Sprint 1, Sprint 2
**Findings:** UI-009, UI-010, UI-013, UI-027, UI-032

### Features
- feat-301: `ui/PageHeader`
  - [ ] props título + subtítulo + slot de ação; 1 CTA primário por view
  - [ ] CTA à direita no desktop, full-width no mobile
- feat-302: `Layout` density-aware
  - [ ] usa `density.pagePadding`; `grep "animate-in"` em `Layout.tsx` = 0 (remove `:48` fade-in)
  - [ ] shell de settings usa sidebar/tokens unificados (não "ilha" separada)
- feat-303: bottom nav acessível
  - [ ] cada item ≥44px (`density.touchMin`); `aria-label` por item; texto ≥12px ou `sr-only`
  - [ ] dentro do safe-area

### Hints para o Coder
- Arquivos existentes: `components/Layout.tsx` (`:48` fade-in), `App.tsx` (LoadingFull), `components/ui/Button.tsx` (S2), `hooks/useBrutalTheme.ts` (S1 density)
- Interfaces chave: `ui/PageHeader` (novo), `ui/Sidebar`, `ui/Button`
- Notas: após S3, rodar smoke nas rotas públicas (`/#/booking/:id`, `/#/queue/:id`) — regressão §11.5. HashRouter intocado.

---

## Sprint 4: Login (tela 1)
**Objetivo:** Login nos 4 modos reais, sem cor hardcoded, copy sentence case.
**Dependências:** Sprint 1, Sprint 2, Sprint 3
**Findings:** UI-005, UI-001, UI-029, UI-030
**Referência visual:** `artifacts/screen-lock/login.html`

### Features
- feat-401: shell do Login theme-aware
  - [ ] `grep "#0A0A0A"\|"text-white/15"\|"isBeauty"` em `pages/Login.tsx` = 0
  - [ ] usa `useBrutalTheme()` (radius/density por tema); funciona nos 4 modos em 390px e desktop
- feat-402: composição + copy
  - [ ] hierarquia: logo → H1 Chivo sentence case ("Entrar no AgendiX") → form mínimo
  - [ ] labels/botões sentence case; sem UPPERCASE; sem anglicismos fora dos consagrados

### Hints para o Coder
- Arquivos existentes: `pages/Login.tsx`, `components/ui/{Button,Input,Card}.tsx` (S2), `hooks/useBrutalTheme.ts`
- Interfaces chave: `useBrutalTheme`, `ui/Button`, `ui/Input`
- Notas: ver contrato SPEC §7.1. Supabase Auth via `useAuth()` intocado (não mexer em fluxo de auth). Referência de composição = `login.html` (não copiar markup).

---

## Sprint 5: Dashboard (tela 2)
**Objetivo:** hierarquia clara — 1 hero metric + ≤3 KPIs secundários; banners outlined; link de comissões corrigido; skeleton sem flash de R$ 0.
**Dependências:** Sprint 1, Sprint 2, Sprint 3
**Findings:** UI-004, UI-017, UI-018, UI-003, UI-011, UI-025
**Referência visual:** `artifacts/screen-lock/dashboard.html`

### Features
- feat-501: hierarquia de métricas
  - [ ] 1 hero metric (faturamento hoje, JetBrains Mono tabular) + no máx 3 KPIs secundários (sem sparkline decorativa)
  - [ ] PageHeader com 1 CTA primário
- feat-502: banners e link
  - [ ] banners de comissão/pendências em `ui/Card` outlined (sem side-stripe, sem competir com hero); ícone com `aria-label`
  - [ ] link de comissões navega para `/financeiro` (não `/finance`)
- feat-503: loading states
  - [ ] `SkeletonCard` por KPI; nunca renderiza `R$ 0,00` como placeholder
  - [ ] `grep "BrutalCard"` em `Dashboard.tsx` + `components/dashboard/*` = 0

### Hints para o Coder
- Arquivos existentes: `pages/Dashboard.tsx` (KPI `:60-104`, link `:225`, dobra `:257-268`), `components/dashboard/*`, `components/ui/{Card,PageHeader,Skeleton}.tsx` (S2/S3)
- Interfaces chave: `ui/Card`, `ui/PageHeader`, `ui/SkeletonCard`
- Notas: ver contrato SPEC §7.2. Rota real é `/financeiro` (HashRouter). Referência = `dashboard.html` (barber-light com nav/CTA/logo dourado).

---

## Sprint 6: Agenda (tela 3)
**Objetivo:** TimeGrid com densidade por tema; ações sticky 44px; mapa de erro humano; toast com retry.
**Dependências:** Sprint 1, Sprint 2, Sprint 3
**Findings:** UI-003, UI-006, UI-014, UI-023, UI-013
**Referência visual:** `artifacts/screen-lock/agenda.html`

### Features
- feat-601: TimeGrid + composição
  - [ ] densidade por tema (barber slots densos / beauty respirado via `density`)
  - [ ] slot → `ui/Card` outlined; status via `ui/Badge` (sem `border-l-4`)
  - [ ] ação primária sticky bottom mobile `min-h-[44px]` dentro do safe-area; Wizard via `ui/Modal`
  - [ ] `grep "BrutalCard\|BrutalButton"` em `Agenda.tsx`/`TimeGrid.tsx`/`AppointmentWizard.tsx` = 0
- feat-602: tratamento de erro humano
  - [ ] novo util mapeia erros Supabase/JS → copy PT-BR humana + código curto de suporte
  - [ ] nenhum `error.message` cru renderizado na tela (`grep` no JSX = 0)
  - [ ] toast de falha tem `action` "Tentar novamente"

### Hints para o Coder
- Arquivos existentes: `pages/Agenda.tsx` (`:324,417,439`), `components/TimeGrid.tsx`, `components/AppointmentWizard.tsx`, `components/ui/{Card,Badge,Modal,Toast,Button}.tsx` (S2)
- Interfaces chave: `ui/Modal`, `ui/Toast` (com `action`), `ui/Badge`; novo `mapError()` util (`utils/`)
- Notas: ver contrato SPEC §7.3 + guia de copy §9. Queries Supabase/`company_id`/RLS intocados.

---

## Sprint 7: Financeiro (tela 4)
**Objetivo:** `ui/Table` com `<th>` semântico e density; ~24 `BrutalCard` → `ui/Card`; modais custom (Checkout/Commission) → `ui/Modal size="full"`.
**Dependências:** Sprint 1, Sprint 2, Sprint 3
**Findings:** UI-003, UI-006, UI-016, UI-028, UI-005
**Referência visual:** `artifacts/screen-lock/financeiro.html`

### Features
- feat-701: tabela acessível
  - [ ] `ui/Table` com `<th scope="col|row">`; `density.tableRowPy` por tema; sticky header
  - [ ] row hover `surfaceHover`; selected `accent.bgDim`; EmptyState dentro quando vazio
- feat-702: migração de cards e modais
  - [ ] `grep "BrutalCard"` em `Finance.tsx` + `FinanceInsights.tsx` = 0
  - [ ] modais Checkout/Commission usam `ui/Modal size="full"` + slots header/body/footer
- feat-703: composição + legibilidade
  - [ ] KPI Receita/Despesas/Lucro tabular (mesmo padrão Dashboard); filtro outline no PageHeader
  - [ ] light mode legível em dados densos nos 2 temas (contraste body ≥ 4.5:1)

### Hints para o Coder
- Arquivos existentes: `pages/Finance.tsx`, `components/FinanceInsights.tsx`, `components/ui/{Table,Card,Modal,PageHeader}.tsx` (S2/S3)
- Interfaces chave: `ui/Table`, `ui/Modal` (`size="full"`), `ui/Card`
- Notas: ver contrato SPEC §7.4. Referência = `financeiro.html`. Densidade permitida (register product) — dados críticos.

---

## Sprint 8: Playbook das telas deferred
**Objetivo:** guia de migração documentado para telas fora do escopo crítico, reusando S1–S3. Sem implementação de tela — entrega documental + 1 quick win especificado.
**Dependências:** Sprint 1, Sprint 2, Sprint 3
**Findings:** UI-012, UI-031, UI-033

### Features
- feat-801: playbook de migração
  - [x] documento cobre Clients, Public Booking, Settings, Onboarding com passos reusando `ui/*` + tokens S1–S3
  - [x] cada tela lista os `Brutal*` a substituir e o componente canônico alvo
- feat-802: quick win EmptyState Clients
  - [x] especificação pronta do EmptyState de Clients com copy "Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda."

### Hints para o Coder
- Arquivos existentes: `components/ui/EmptyState.tsx` (S2), telas fora do escopo (Clients, Settings, Onboarding, Public Booking)
- Interfaces chave: `ui/EmptyState`, wrappers `@deprecated` (S2)
- Notas: ver SPEC §7 (deferred) + §9 copy. Entrega é guia documentado, não migração completa (esforço Baixo).

---

## Notas transversais (todas as sprints)

- **Motion:** 150–250ms `ease-out` (`cubic-bezier(0.16,1,0.3,1)`); sem page-load sequence; `prefers-reduced-motion` desliga animate-in/scale (SPEC §8).
- **A11y:** focus-trap em todo Modal; `:focus-visible` ring accent; touch ≥44px mobile; `<th scope>` em tabelas; bottom nav com `aria-label` (SPEC §8).
- **Copy (PT-BR):** `Adicionar`/`Salvar alterações`/`Excluir`/`Continuar`; sentence case; nunca expor `error.message` (SPEC §9).
- **Regressão:** wrappers @deprecated mantêm API antiga; tokens aditivos; sem mudança de rota/contrato de dados; smoke público após S1–S3; validação mobile 390px antes de fechar sprint (SPEC §11).
- **Rastreabilidade:** Finding → Sprint → DS rule em SPEC §12.
