# UI-REMEDIATION-SPEC — AgendiX

**Run:** `20260610_120000` | **Fase:** 7 ✅ | **Modo:** implementado (S4–S8 + closeout E0–E9)
**Register Impeccable:** `product` (app UI / dashboard B2B — design SERVE a tarefa)
**Fonte de verdade:** `DESIGN-SYSTEM.md` (DS Lock v1.0-audit) + `findings-consolidated.md` + código real (`hooks/useBrutalTheme.ts`, `components/ui/*`)
**Stack:** React 19 · Vite 6 · Tailwind (CDN, config inline em `index.html`) · `design-system/tokens.css` · `useBrutalTheme()`

> **Escopo:** remediação de **craft visual** nos 4 modos (barber/beauty × dark/light). Não é produto novo, não é rebranding.
> Marca, logo, fontes (Chivo/Inter/JetBrains Mono) e família de accent (gold/purple) **fixos**. Diferenciação por **radius (A)** + **density (B)**.

---

## 0. Screen Lock parcial + contratos textuais

**Estado Fase 6 (2026-06-10):** **Screen Lock 4/4 ✅** — `screen-lock.json` `"locked": true`. Artefatos em `artifacts/screen-lock/{login,dashboard,agenda,financeiro}.html`.

| Fonte | Papel |
|-------|-------|
| `artifacts/screen-lock/*.html` | **Referência de composição** (matriz 4 modos) — orienta hierarquia, densidade, estados e uso de accent. **NÃO é alvo final**: não reproduzir o HTML/CSS literalmente nem portar como markup de produção. |
| `UI-REMEDIATION-SPEC.md` §7 | **Contrato implementável** e **fonte primária** para code (todas as 4 telas). Em conflito com o screen-lock, **a SPEC prevalece**. |
| `artifacts/after/*.html` | Fallback local **descartável** — não usar |
| OD `index.html` / `agendix-login-4-themes.html` | **Rejeitados** — eixo compact/spacious errado (`screen-lock.json`) |

> **Papel do screen-lock:** referência visual, não entregável. O alvo final é o código React/Tailwind contra os contratos §7 + DS Lock. Os HTMLs do OD são prova de composição (o que "certo" parece nos 4 modos), não código a ser copiado — divergir do markup é esperado; divergir da SPEC não.

Runs concluídos via opencode (REST `/api/runs`). **Próximo gate:** Fase 8 harness-planner ou `/ui-audit code` (S1→S8).

A `.theme-nav` no HTML do OD é **chrome de audit** (trocar entre os 4 modos) — não entra em produção.

---

## 1. Barra de qualidade (Impeccable — register product)

O teste não é "parece feito por IA"; no produto, familiaridade é feature. O teste é: **um usuário fluente em Linear/Stripe/Notion/Fresha sentaria e confiaria nesta interface, ou travaria em cada componente sutilmente errado?** A ferramenta deve **desaparecer na tarefa** — barbeiro entre atendimentos, dono no dia do pagamento.

Princípios que governam todas as sprints:

1. **Consistência > surpresa.** Mesmo botão "salvar", mesmo card, mesmo modal em todas as telas. Se diferem em dois lugares, um está errado.
2. **Vocabulário de estado completo.** Todo componente interativo tem: `default · hover · focus · active · disabled · loading · error`. Não enviar metade.
3. **Skeleton > spinner** dentro de conteúdo. Spinner só dentro de `Button loading`.
4. **Empty states ensinam a interface**, não dizem "nada aqui".
5. **Accent ≤ 10% da superfície** — só CTA primário, seleção/estado ativo, focus ring, badge de status, progresso. Nunca decoração.
6. **Motion transmite estado** (150–250ms, ease-out). Sem sequência de carregamento de página, sem fade-in page-wide.
7. **Densidade é permitida** quando o usuário precisa de dados (tabelas financeiras, agenda) — mas hierarquia primeiro.

**Bans aplicados (refuse-and-rewrite), com ocorrência real no legado:**

| Ban Impeccable | Onde no código | Ação |
|---|---|---|
| Side-stripe `border-l-4` accent | `components/PublicLinkCard.tsx:110`, MeuDia, Queue | full border / leading icon / nada |
| Ghost gradient overlay em card | `components/BrutalCard.tsx:58-59` (`bg-gradient-to-b from-white/[0.02]`) | `Card` border **ou** shadow, nunca os dois + gradient |
| `border-radius` ≥ 24px em card por reflexo | `RADIUS_MAP` flat `rounded-2xl` (`useBrutalTheme.ts:282-289`) | radius por tema (barber `lg`, beauty `2xl`) |
| Fade-in uniforme page-wide | `Layout.tsx:48`, `EmptyState.tsx:26`, `modalContainer` (`useBrutalTheme.ts:458`) | motion só no que merece; reduced-motion real |
| UPPERCASE tracked label everywhere | `classes.label` (`useBrutalTheme.ts:439`), `classes.badge*`, "Avisos do Sistema" (`Dashboard.tsx:266`) | sentence case |
| Hero-metric template SaaS | `PremiumKpiCard` repetido (`Dashboard.tsx:60-104`) | 1 hero com hierarquia + secundários compactos |
| z-index arbitrário `999`/`200` | `ui/Modal.tsx:80`, `Modal.tsx:70`, toast `Dashboard` | escala semântica (DS Lock §1.7) |

---

## 2. Diagnóstico de causa raiz (system-level)

A genericidade **não** está em telas isoladas — é sistêmica. Quatro causas raiz; todo o resto são sintomas:

| # | Causa raiz | Evidência | Sintomas (findings) |
|---|------------|-----------|---------------------|
| **R1** | **Três fontes de estilo competindo** | `index.html:39-80` (paletas obsidian/silk/brutal inline) · `tokens.css` · `useBrutalTheme.ts` duplica hex em strings Tailwind (~497 ln) | UI-001, UI-019, UI-020 |
| **R2** | **Stack de componentes duplo** (`Brutal*` ~90 usos vs `ui/*` ~25%) | `BrutalCard`(~50) vs `ui/Card`(~18); `BrutalButton`(~40, `h-12`) vs `ui/Button`(`h-11`); 2 Modal; 2 EmptyState; 3 Skeleton | UI-002, 003, 006, 007, 022 |
| **R3** | **`isBeauty` hardcoded em ~80 arquivos** + páginas assumindo dark | `Login.tsx` (`#0A0A0A`, `text-white/15`), `ClientArea.tsx`; hook ainda ramifica `isBeauty` em `buttonPrimary/Secondary` etc. | UI-005, UI-008 |
| **R4** | **DS documentado ≠ DS usado** (MASTER.md + UiPreview catalogam `ui/*`, app usa `Brutal*`) | `pages/settings/UiPreview.tsx` | UI-033, drift risk |

**Consequência:** os "4 temas" são na prática **~40% implementados**; light mode quebra; cada tela parece a mesma skin com a cor trocada. A remediação ataca R1→R4 **antes** de tocar em telas — por isso a ordem (infra → telas).

---

## 3. Arquitetura alvo & paths

```
design-system/tokens.css          ← FONTE ÚNICA de cor/spacing/radius/shadow/z (4 modos)
index.html                        ← só CDN Tailwind + <link> tokens.css (sem paletas duplicadas)
hooks/useBrutalTheme.ts           ← lê tokens; RADIUS_MAP e DENSITY por ThemeVariant; sem uppercase, sem animate-in
components/ui/*                    ← Button, Input, Select, Textarea, Checkbox, Card, Modal, Table,
                                     EmptyState, PageHeader(novo), Sidebar, Badge, Toast, Skeleton
components/Brutal*.tsx             ← reexport @deprecated dos canônicos (compat até migração total)
components/Layout.tsx              ← density.pagePadding; sem fade-in page-wide; shell unificado settings
App.tsx                           ← LoadingFull → skeleton shell theme-aware
pages/{Login,Dashboard,Agenda,Finance}.tsx + componentes-filhos das telas críticas
```

**Verificação por sprint (obrigatório, AGENTS.md):** `npm run typecheck` · `npm run lint` · `npm run build` verdes; smoke em 390px nos 4 modos via rota real + `/configuracoes/ui-preview`.

---

## 4. Sprint outline & grafo de dependência

```
S1 tokens/hook (backbone) ──┬─► S2 componentes base ──┬─► S4 Login
                            │                         ├─► S5 Dashboard
                            └─► S3 AppShell+PageHeader ┼─► S6 Agenda
                                                       └─► S7 Financeiro ──► S8 playbook deferred
```

| Sprint | Nome | Entrega | Findings | Esforço |
|--------|------|---------|----------|---------|
| **S1** | Tokens + hook backbone | fonte única; `RADIUS_MAP`/`DENSITY` por tema; remove uppercase/fade-in; z-scale; limpa `index.html` | UI-001,005,019,020,026,027,032 | Alto |
| **S2** | Componentes base DS | Modal(focus-trap), Card(outlined/elevated), Button, Input/Select/Textarea/Checkbox, EmptyState, Skeleton, Toast, Badge canônicos; `Brutal*`→wrappers | UI-002,003,006,007,008,011,022,024 | Alto |
| **S3** | AppShell + PageHeader | `PageHeader` novo; `Layout` density + shell settings unificado; bottom nav 44px+aria; nav IA | UI-009,010,013 | Médio |
| **S4** | Login (tela 1) | 4 modos reais; mata `#0A0A0A`/hardcoded; copy sentence case | UI-005,001,029,030 | Médio |
| **S5** | Dashboard (tela 2) | PageHeader + 1 hero metric + KPIs secundários; banners outlined; fix link `/finance`→`/financeiro`; skeleton (sem flash $0) | UI-004,017,018,003,011,025 | Médio |
| **S6** | Agenda (tela 3) | TimeGrid density por tema; ações sticky bottom 44px; mapa de erro humano; toast com retry | UI-003,006,014,023,013 | Médio |
| **S7** | Financeiro (tela 4) | `ui/Table` (th semântico)+density; ~24 `BrutalCard`→`ui/Card`; modais custom→`ui/Modal size` | UI-003,006,016,028,005 | Alto |
| **S8** | Playbook telas deferred | guia migração (Clients, Public Booking, Settings, Onboarding) reusando S1–S3 | UI-012,031,033 | Baixo |

---

## 5. S1 — Backbone: tokens + hook (a sprint que mata a genericidade)

Sem isto, qualquer tela bonita volta a divergir. Três mudanças concretas no `useBrutalTheme.ts`:

### 5.1 `RADIUS_MAP` por tema (hoje flat — `useBrutalTheme.ts:282-289`)

```ts
// ANTES (flat — todos os temas iguais, viola Decisão A)
const RADIUS_MAP: BrutalThemeTokens['radius'] = {
  card: 'rounded-2xl', input: 'rounded-xl', button: 'rounded-2xl',
  badge: 'rounded-full', avatar: 'rounded-xl', modal: 'rounded-2xl',
};

// DEPOIS (per ThemeVariant — barber sharp / beauty soft)
const RADIUS_MAP: Record<ThemeVariant, BrutalThemeTokens['radius']> = {
  barber: { card:'rounded-lg', button:'rounded-lg', input:'rounded-md',
            modal:'rounded-xl', badge:'rounded-md', avatar:'rounded-lg' },
  beauty: { card:'rounded-2xl', button:'rounded-xl', input:'rounded-lg',
            modal:'rounded-2xl', badge:'rounded-full', avatar:'rounded-full' },
};
// consumo: const radius = RADIUS_MAP[theme];
```

### 5.2 `DENSITY` por tema (novo — não existe hoje)

```ts
export interface DensityTokens {
  pagePadding: string; cardPadding: string; sectionGap: string;
  inlineGap: string; tableRowPy: string; navItemPy: string;
  kpiMinHeight: string; touchMin: string;
}
const DENSITY_MAP: Record<ThemeVariant, DensityTokens> = {
  barber: { pagePadding:'p-3 md:p-6', cardPadding:'p-4 md:p-5',
            sectionGap:'space-y-4 md:space-y-5', inlineGap:'gap-2 md:gap-3',
            tableRowPy:'py-2.5', navItemPy:'py-2 px-3',
            kpiMinHeight:'min-h-[140px]', touchMin:'min-h-[44px] min-w-[44px]' },
  beauty: { pagePadding:'p-4 md:p-8', cardPadding:'p-5 md:p-8',
            sectionGap:'space-y-6 md:space-y-8', inlineGap:'gap-3 md:gap-4',
            tableRowPy:'py-3.5', navItemPy:'py-2.5 px-4',
            kpiMinHeight:'min-h-[160px]', touchMin:'min-h-[44px] min-w-[44px]' },
};
// exposto em BrutalThemeTokens como `density: DensityTokens`
```

### 5.3 Correções de craft no `classes` (mesmos arquivos/linhas)

| Item | Linha atual | De | Para |
|------|-------------|----|----|
| `label` UPPERCASE | `:439` | `uppercase tracking-wider` | sentence case, sem tracking; weight 600 |
| `badge*` UPPERCASE | `:442-446` | `uppercase` | sem uppercase |
| `card` motion | `:426` | `transition-all duration-500` | `transition-[box-shadow,transform] duration-200 ease-out` |
| `buttonPrimary` motion | `:430` | `duration-300` | `duration-150 ease-out` |
| `modalContainer` motion | `:458` | `animate-in fade-in zoom-in-95` (page-load reflex) | entrada via `data-state` + `prefers-reduced-motion` fallback; sem zoom decorativo |
| `tableRow` hardcode | `:448` | `rounded-lg ... hover:bg-white/[0.03]` | usar `colors.surfaceHover` + `density.tableRowPy` |
| `sidebarItemActive` side-stripe | `:454` | `before:` barra accent | estado via `accent.bgDim` + `accent.text` (sem stripe) |

### 5.4 Tokens / `index.html`

- `index.html:39-80`: remover paletas duplicadas (obsidian/silk/brutal extends que já existem em `tokens.css`); manter CDN + `<link rel="stylesheet" href="/design-system/tokens.css">`.
- `index.html:9`: `title` → `"AgendiX — Gestão do seu salão"` (UI-035).
- z-index: substituir `z-[999]`/`z-[200]` por escala semântica (`--z-modal:80`, `--z-toast:90`…) — DS Lock §1.7.
- `prefers-reduced-motion`: regra global cobrindo `.animate-in` (UI-027/MÉDIO-005).
- Light mode contraste: validar `--color-text-secondary`/`muted` ≥ 4.5:1 contra `--color-card` nos 2 light; bump para o ink se perto (Impeccable color rule). Barber light `#F5F1E8` fica (constraint), mas diferenciar barber/beauty light via **surface/card contrast + tipografia**, não intensificando o beige (UI-006).

---

## 6. S2 — Contratos de componente (state matrix obrigatória)

Path canônico `components/ui/{Component}.tsx`. Todo componente entrega as 7 colunas; "—" = N/A.

| Componente | default | hover | focus | active | disabled | loading | error |
|-----------|---------|-------|-------|--------|----------|--------|-------|
| **Button** | variant token | `brightness-110` | `ring-2 accent` offset | `scale-[0.97]` | `opacity-50 pointer-events-none` | spinner in-button + `aria-busy` | — |
| **Input/Select/Textarea** | border token | — | `accent.border` + ring | — | `opacity-50` | — | `dangerBorder` + `<p>` abaixo |
| **Checkbox** | border | — | ring | check anim ≤150ms | opacity | — | dangerBorder |
| **Card** | outlined (border) | `surfaceHover` (se clicável) | ring se interativo | — | — | `SkeletonCard` | — |
| **Modal** | centered + focus-trap | — | trap | — | — | body skeleton | — |
| **Table** | header+rows | row `surfaceHover` | row focus | selected `accent.bgDim` | — | row skeleton | EmptyState dentro |
| **Toast** | bottom-center mob/top-right desk | — | — | — | — | — | danger + ação retry |

### 6.1 Decisões de contrato

- **Button** — `variant: primary|secondary|outline|ghost|danger|success`; `size: sm|md|lg`; **sm = `min-h-[44px]` no mobile** (corrige `BrutalButton sm h-9`, UI-013/ALTO-003). Alturas tokenizadas (resolve `h-12` vs `h-11`, UI-006). 1 `primary` por view.
- **Card** — só `variant: outlined | elevated`. Remove `glow`, ghost gradient, side-stripe, nested (UI-003/008/MÉDIO-005). `outlined` = border **ou** shadow leve, nunca o stack ghost. Props: `title?`, `action?`, `variant`, `noPadding?`; padding de `density.cardPadding`.
- **Modal** — API única `open`/`onClose`; `focus-trap-react` (UI-002/a11y CRÍTICO-001, WCAG 2.4.3); `role="dialog"` + `aria-modal` + `aria-labelledby`; ESC + overlay close (salvo `preventClose`); default `size="lg"` (560px); `size="full"` com slots header/body/footer absorve modais custom (Checkout, Commission — UI-016). Sem `animate-in zoom`.
- **EmptyState** — API única `icon/title/description/action` (mata a dupla `message/ctaLabel`, UI-007). `title`=situação, `description`=próximo passo, `action`=verbo específico.
- **Skeleton/SkeletonCard** — shape único casando `radius.card` + `density.cardPadding`; substitui `SkeletonLoader` triplicado (UI-022). Sem spinner fullscreen exceto bootstrap de auth.
- **Toast** — `--z-toast`; auto-dismiss 4s (erro 6s); `action` opcional para retry (UI-023).
- **Deprecação compat:** `BrutalCard/BrutalButton/Modal(root)/EmptyState(root)/SkeletonLoader` reexportam dos canônicos com `@deprecated` JSDoc e mapeamento de props (`isOpen`→`open`, `accent`→`variant="elevated"`, `message`→`title`). Nada fora do escopo quebra import.

---

## 7. Contratos de tela (alvo final de implementação)

Estes contratos — não o HTML do screen-lock — são o **alvo final**. Composição textual + componentes alvo + decisão de hierarquia. Tokens/radius/density sempre de `useBrutalTheme()`. Cada tela é provada nos **4 modos** em 390px e desktop. O HTML em `artifacts/screen-lock/{tela}.html` é **referência visual** (como a composição certa parece), nunca markup a copiar.

### 7.1 Login — `pages/Login.tsx`
**Referência (não alvo):** `artifacts/screen-lock/login.html` — matriz `barber-dark|barber-light|beauty-dark|beauty-light`; tokens DS Lock; radius/density A+B aplicados.
**Problema:** `#0A0A0A`/`text-white/15` hardcoded, shell não usa `useBrutalTheme`, dark-only na prática (UI-005, inventory).
**Hierarquia:** 1 decisão clara — escolher segmento barber/beauty — depois form mínimo.
```
[ viewport centered · max-w-md · density.pagePadding ]
  Logo (fixo)
  H1 Chivo (sentence case)              ← "Entrar no AgendiX"
  Seleção segmento barber|beauty        ← mantém cards atuais (focus-visible já ok), tokens 4 modos
  Form: Input email, Input senha        ← h-10 barber / h-11 beauty, radius por tema
  Button primary full-width
  Link secundário (ghost): registrar / esqueci senha
```
- Beauty: cards mais altos, `density.cardPadding` maior, radius `2xl`. Barber: compacto, `lg`, copy direta.
- **Aceite:** `grep '#0A0A0A'` e `text-white/15` em `Login.tsx` = 0; sem `isBeauty` ternário; placeholder/muted light ≥ 4.5:1.

### 7.2 Dashboard — `pages/Dashboard.tsx` + `components/dashboard/*`
**Referência (não alvo):** `artifacts/screen-lock/dashboard.html` (run `b8dd8804`) — matriz 4 modos; hero metric + ≤3 KPIs secundários; barber-light com nav/CTA/logo em `--accent` dourado `#A07A2A`.
**Problema:** SetupCopilot, alerts, 2 banners, KPI grid e MeuDia competem na mesma dobra (`Dashboard.tsx:257-268`); KPI template repetido (`:60-104`); link comissões quebrado `navigate('/finance')` (`:225`, rota real `/financeiro`).
**Hierarquia (mobile-first 390px):**
```
PageHeader: "Olá, {nome}"  · {data} ................ [CTA primário]
┌── HERO metric — faturamento hoje ── full width ──┐   ← 1 número que importa, JetBrains Mono tabular
│   R$ ····   ↑ vs ontem · density.kpiMinHeight     │
└────────────────────────────────────────────────┘
[ KPI sec ][ KPI sec ][ KPI sec ]   ← grid-cols-1 sm:2 lg:3, máx 3 secundários (sem sparkline decorativa)
── 2ª dobra ──
MeuDia / SetupCopilot (Card outlined)
Banners comissão/unfinished → Card outlined, sem competir com hero, sem side-stripe
```
- Loading: `SkeletonCard` por KPI; **nunca** renderizar `R$ 0,00` como placeholder (UI-025/states MÉDIO-005).
- Banners: ícone X lucide + `aria-label` (a11y BAIXO-007); copy sentence case ("Avisos importantes", UI-029).
- **Aceite:** link comissões → `/financeiro`; `grep BrutalCard` em `Dashboard.tsx`+`components/dashboard/*` = 0; 1 hero + ≤3 secundários; 4 modos OK.

### 7.3 Agenda — `pages/Agenda.tsx` + `components/TimeGrid.tsx` + `AppointmentWizard.tsx`
**Referência (não alvo):** `artifacts/screen-lock/agenda.html` (run `6ba64967`) — matriz 4 modos; TimeGrid com densidade por tema, status via Badge, bottom nav 44px; barber-light dourado em nav/bottom nav/logo.
**Problema:** `BrutalCard/BrutalButton` heavy, `isBeauty` espalhado, erros técnicos crus (`Agenda.tsx:439` `Erro ao concluir...: ${message}`), toast sem retry (`:324,417,439`).
**Hierarquia:**
```
PageHeader: "Agenda" · {data} ........................ [Novo agendamento]
TimeGrid                                ← density por tema: barber slots densos (py-2.5), beauty respirado (py-3.5)
  slot → Card outlined; status via Badge (sem border-l-4)
[ sticky bottom mobile ] ação primária  ← min-h-[44px], dentro do safe-area
Wizard → ui/Modal (size md/lg) com focus-trap
```
- **Mapa de erro** (novo util) Supabase/JS → copy humana PT-BR: `"Não foi possível concluir o agendamento. Verifique sua conexão e tente de novo."` + código curto pra suporte (UI-014/copy ALTO-001).
- Toast de falha com ação **"Tentar novamente"** (UI-023).
- **Aceite:** `grep BrutalCard|BrutalButton` em Agenda/TimeGrid/Wizard = 0; nenhum `error.message` cru renderizado; toast de erro tem `action`.

### 7.4 Financeiro — `pages/Finance.tsx` + `components/FinanceInsights.tsx`
**Referência (não alvo):** `artifacts/screen-lock/financeiro.html` (run `11a9b3da`) — matriz 4 modos; KPI Receita/Despesas/Lucro tabular, tabela movimentações com `<th>`, seção comissões; barber-light dourado em nav/CTA/logo.
**Problema:** ~24 `BrutalCard`, modais custom (Checkout/Commission), tabelas sem `<th>` semântico (UI-028/a11y MÉDIO-006).
**Hierarquia (densidade permitida — register product):**
```
PageHeader: "Financeiro" · {período} ................. [filtro outline]
[ KPI faturamento ][ lucro ][ comissões ]   ← mesmo padrão do Dashboard
ui/Table                                    ← <th scope>, density.tableRowPy por tema, sticky header
  row → hover surfaceHover; selected accent.bgDim
Modais (Checkout/Commission) → ui/Modal size="full" + slots
```
- Light mode legível em dados densos nos 2 temas (contraste body ≥ 4.5:1).
- **Aceite:** `grep BrutalCard` em `Finance.tsx`+`FinanceInsights.tsx` = 0; tabelas com `<th scope=>`; modais custom usando `ui/Modal`.

---

## 8. Motion & acessibilidade (transversal)

- **Timing:** 150–250ms, `ease-out` (`cubic-bezier(0.16,1,0.3,1)`). Hover 150ms; active `scale-[0.97]` 100ms; focus instantâneo.
- **Sem page-load sequence.** Remover `animate-in fade-in duration-500` de `Layout.tsx:48` e `EmptyState.tsx:26`; stagger só em lista quando agrega.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` desliga `animate-in`/scale/parallax; mantém crossfade ≤150ms (UI-027).
- **Touch:** alvo mínimo 44px em mobile (Button sm, bottom nav, slots agenda) — WCAG 2.5.8.
- **Focus trap** em todo Modal; `:focus-visible` ring accent + offset.
- **Bottom nav:** `aria-label` por item, texto ≥12px ou `sr-only` (a11y ALTO-002).
- **Tabelas:** `<th scope="col|row">` (a11y MÉDIO-006).

---

## 9. Guia de voz / copy (PT-BR, B2B salão)

| Situação | Padrão |
|----------|--------|
| Criar | `Adicionar` (não "Cadastrar"/"Novo" misturados) — UI-015 |
| Editar | `Salvar alterações` |
| Destruir | `Excluir` |
| Fluxo multi-step | `Continuar` |
| Erro técnico | nunca expor `error.message`; copy humana + código suporte — UI-014 |
| Títulos/labels | sentence case; **sem UPPERCASE** ("Avisos importantes", "Seu dia") — UI-029 |
| Anglicismos | PT-BR; manter só termos consagrados (CRM); "Setup"→"Configuração inicial", "Ticket medio"→"Ticket médio" — UI-030 |
| Empty Clients | "Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda." — UI-012 |
| `<title>` | "AgendiX — Gestão do seu salão" — UI-035 |

---

## 10. Critérios de aceite por sprint (verificáveis)

**S1** — [x] `--z-modal`/`--z-toast` em tokens.css · [x] ui/Modal + ui/Toast usam escala semântica · [x] overlays legados migrados (Checkout, Wizard, PublicBooking) · [ ] `index.html` paletas obsidian/silk/brutal — **defer** (Tailwind CDN ainda referencia; ver sprints.md) · [x] `<link>` tokens.css no index.html · [x] light contrast documentado · [x] typecheck+lint+build verdes.

**S2** — [x] `ui/Modal` focus-trap + z-scale · [x] `ui/Checkbox` canônico · [x] side-stripe removido em escopo · [x] UiPreview × 4 temas incl. Checkbox · [x] Brutal* wrappers @deprecated · [x] typecheck+lint+build.

**S3** — [x] `ui/PageHeader` · [x] Layout density · [x] settings shell tokens · [x] bottom nav ≥44px.

**S4 Login** — [x] 4 modos · [x] sem hardcode dark · [x] sentence case.

**S5 Dashboard** — [x] hero + KPIs · [x] `/financeiro` · [x] 0 BrutalCard.

**S6 Agenda** — [x] density · [x] mapError+retry · [x] 0 Brutal*.

**S7 Financeiro** — [x] ui/Table · [x] mapError toasts · [x] modais ui/Modal · [x] 0 BrutalCard.

**S8** — [x] playbook deferred · [x] EmptyState Clients copy · [x] Clients/Settings/PublicBooking/Onboarding migrados (closeout).

---

## 11. Regressão — não quebrar o que não foi tocado

1. **Wrappers @deprecated** mantêm API antiga até migração total → telas fora do escopo seguem funcionando.
2. **Tokens aditivos** em `tokens.css` (não remover nomes ainda referenciados); remoção só das duplicatas mortas em `index.html`.
3. **Sem mudança de rota/contrato de dados** — HashRouter, props de página, queries Supabase/RLS/`company_id` intocados.
4. **`isBeauty` legado** só migrado nas 4 telas + shell; ternários remanescentes fora do escopo continuam (não remoção em massa neste ciclo).
5. **Gate por sprint:** typecheck+lint+build verdes; smoke nas rotas públicas (`/#/booking/:id`, `/#/queue/:id`) após S1–S3.
6. **Mobile-first:** validação em Chrome Android/390px antes de fechar cada sprint (CLAUDE.md gotcha #6).

---

## 12. Rastreabilidade Finding → Sprint → regra DS

| Finding | Sev | Sprint | DS rule |
|---------|-----|--------|---------|
| UI-001 três fontes | CRÍT | S1 | §1.1 fonte única |
| UI-002 modal sem trap | CRÍT | S2 | §3.4 |
| UI-003 dois Cards | CRÍT | S2/S5/S6/S7 | §3.3 |
| UI-004 dashboard sem hierarquia | CRÍT | S5 | §3.7 + §4.3 |
| UI-005 light mode | CRÍT | S1/S4/S7 | §1.2 + §6.2 |
| UI-006 botão alturas | ALTO | S2 | §3.1 |
| UI-008 accent decoração | ALTO | S1/S2 | §5 r.4 |
| UI-009 nav mobile IA | ALTO | S3 | §3.8 |
| UI-010 settings ilha | ALTO | S3 | §4.1 |
| UI-011 spinner global | ALTO | S2/S5 | §3.11 |
| UI-012 empty clients | ALTO | S8 | §3.6 |
| UI-013 touch/labels | ALTO | S3/S6 | §1.3 + §3.1 |
| UI-014 erros crus | ALTO | S6 | §9 copy |
| UI-016 modais custom | ALTO | S7 | §3.4 size=full |
| UI-017 KPI genérico | ALTO | S5 | §4.3 |
| UI-018 link quebrado | MÉD | S5 | rota válida |
| UI-019/020 escala/radius | MÉD | S1 | §1.4/§1.5 |
| UI-023 toast sem retry | MÉD | S6 | §3.10 |
| UI-026 z-999 | MÉD | S1 | §1.7 |
| UI-027/032 motion | MÉD/BX | S1/S3 | §2 reduced-motion |
| UI-028 th semântico | MÉD | S7 | §3.5 |
| UI-029/030 copy/PT-BR | MÉD | S4–S9 | §9 |
| UI-022 skeleton 3x | MÉD | S2 | §3.11 |
| UI-024 aria-busy | MÉD | S2 | §3.1 |
| UI-031 onboarding | MÉD | S8 | §4.1 |
| UI-033/035/036 | BX | S1/S8 | §1.1 / copy |

---

## 13. Gate

SPEC de remediação pronta — nível implementação. **Screen Lock 4/4 ✅** (login, dashboard, agenda, financeiro) como **referência visual** — `screen-lock.json` locked. Alvo final de implementação = contratos §7 + DS Lock.

**Ciclo crítico (S4–S8):** implementado — ver [TASKBOARD arquivado](../../docs/v1/TASKBOARD.md) UI-S4…UI-S8.

**Closeout (E0–E9):** concluído 2026-06-10 — ver [USER-STORIES-CLOSEOUT.md](./USER-STORIES-CLOSEOUT.md) · evidência em [verification/SMOKE-MATRIX.md](./verification/SMOKE-MATRIX.md).

**Status:** **Audit fechada** (escopo acordado E0–E7; E8 backlog pós-close).

**Deferred conhecido:** paletas Tailwind CDN em `index.html` · onboarding `accentColor` prop · AppointmentWizard overlay custom (z-index ok).
