# BASELINE — filtro anti-duplicata da varredura UX-PRO

**Gerado em:** 2026-08-01 · **Fase 0 do** `docs/ux-pro/SUPER-PROMPT.md`
**Branch de trabalho:** `design/ux-pro-sweep` (criada de `integracao/colab-invite-queue` @ `972bb46e`)

Este arquivo consolida **tudo que já foi achado e resolvido** (`RESOLVIDO-###`) e **tudo que é dívida conhecida em aberto** (`CONHECIDO-###`). Crítico que repetir um `RESOLVIDO-###` sem evidência nova de regressão tem o achado descartado (§8.3). Item `CONHECIDO-###` **não é achado** — entra direto no plano da Fase 6.

Fontes: `MEMORY.md`, `audit-out/RELEASE-REPORT.md`, `.impeccable/critique/2026-07-12T14-05-29Z__*.md`, `design-system/tokens.css`, `scripts/check-design-debt.mjs`, verificação direta no código em 2026-08-01.

---

## 0. Estado do ambiente (linha de base medida, não presumida)

| Item | Estado em 2026-08-01 |
|---|---|
| `git rev-parse HEAD` | `972bb46e71edb39a8f88bd3ca104b4dc28e4f02f` |
| Grafo graphify (`GRAPH_REPORT.md`) | Construído do commit `972bb46e` → **fresco**, sem necessidade de `graphify update` |
| Branch de origem | `integracao/colab-invite-queue` (**não** `main`; merge-base com `main` = `7dd25cc4`) |
| `npm run typecheck` | ✅ verde |
| `npm run lint` (+ ratchet `check-design-debt`) | ✅ verde — "nenhuma violação nova" |
| `npm test -- --run` | ✅ **367/367** em 50 arquivos |
| `npm run build` | ✅ verde (aviso pré-existente de chunk > 500 kB em `index-*.js`, 1.001 MB) |
| Dev server | :3000 já estava ocupado por processo anterior → auditoria roda em **:3001** (server novo, com plugin `@tailwindcss/vite` carregado) |
| Contas de teste | `E2E_OWNER_EMAIL/PASS` e `E2E_STAFF_EMAIL/PASS` presentes em `.env.local` (valores nunca reproduzidos aqui) |

### 0.1 Trabalho em andamento pré-existente (NÃO é da varredura)

A árvore já estava suja quando a branch foi criada. Estes arquivos foram modificados **antes** da Fase 0 e devem ser excluídos do diff auditado na Fase 9:

`.env.example` · `MEMORY.md` · `components/AppointmentEditModal.tsx` · `components/appointment/ScheduleSelection.tsx` · `graphify-out/GRAPH_REPORT.md` · `graphify-out/graph.json` · `graphify-out/manifest.json` · `package.json` · `package-lock.json` · `pages/Agenda.tsx` · `pages/Finance.tsx` · `services/finance.ts` · `supabase/migrations/20260724_queue_staff_rls.sql` · `test/services/finance.test.ts`

**Consequência para a Fase 9:** o diff de auditoria é `git diff integracao/colab-invite-queue...design/ux-pro-sweep`, **não** `main...`. Usar `main` como base incluiria toda a feature de fila/convite de colaborador, que não é escopo desta varredura.

---

## 1. RESOLVIDO — já corrigido, não relatar de novo sem prova de regressão

### 1.1 Fundação de tokens (Design System v1.1 F0)

| ID | Item | Fonte |
|---|---|---|
| RESOLVIDO-001 | `design-system/tokens.css` é fonte única; bloco duplicado de tokens removido do `index.html` | MEMORY.md F0 |
| RESOLVIDO-002 | `--color-text-muted` recalibrado para WCAG AA (≥4.5:1 sobre `--color-card`) nas 4 combinações | tokens.css:120,184,246,308 |
| RESOLVIDO-003 | Token `--color-info` criado; escala `--elevation-0..3`; paletas sand/orchid/gold/violet 50–950 | tokens.css:15–98,148–152 |
| RESOLVIDO-004 | Escala de z-index em token (`--z-dropdown/sticky/drawer/modal/toast`) | tokens.css:16–21 |

### 1.2 Modais e a11y (F1)

| ID | Item | Fonte |
|---|---|---|
| RESOLVIDO-005 | `components/Modal` legado virou adapter deprecado sobre `ui/Modal` — casco único | MEMORY.md F1 |
| RESOLVIDO-006 | FocusTrap/aria/ESC nos 7 modais quebrados (Paywall, AIOSStrategy, Agenda history, ClientCRM edit, PublicBooking ×2, Profile) | MEMORY.md F1 |
| RESOLVIDO-007 | z-index de modal sempre `var(--z-modal)`; `ui/Modal` sincroniza `setModalOpen` via `useOptionalUI` | MEMORY.md F1 |
| RESOLVIDO-008 | `ui/Modal` vira bottom sheet abaixo de `md` | MEMORY.md Sprint 5 |
| RESOLVIDO-009 | Modais custom da fila e do form de planos migrados para `ui/Modal` | MEMORY.md Sprint 4 |
| RESOLVIDO-010 | Bug do modal da Agenda que fechava no mesmo clique (FocusTrap `clickOutsideDeactivates` × StrictMode) | MEMORY.md 24 Jun / 8 Jul |

### 1.3 Tokenização de superfícies (F2/F3)

| ID | Item | Fonte |
|---|---|---|
| RESOLVIDO-011 | 8 famílias de card fora do DS migradas para tokens (GoalHistory, TeamMemberCard, SmartRebooking, PlanCard, SubscriptionSettings, ClientCRM KPIs, SetupCopilot, Dashboard Clube) | MEMORY.md F2 |
| RESOLVIDO-012 | Cores de status cruas → tokens em Agenda/Finance/Dashboard/QueueManagement | MEMORY.md F2 |
| RESOLVIDO-013 | Sombras das telas de auth → `--elevation-3` | MEMORY.md F2 |
| RESOLVIDO-014 | `settings/*` + Finance/Reports tokenizados | MEMORY.md F3 |
| RESOLVIDO-015 | `ClientArea` seta `data-theme`/`data-mode` e consome tokens (saiu do stone/zinc hardcoded) | MEMORY.md F3 |
| RESOLVIDO-016 | QueueManagement, Reports, MembersList, JoinClub e settings frias no shell `PageHeader` + tokens | MEMORY.md Sprint 4 |
| RESOLVIDO-017 | Reports/Insights com Recharts lendo CSS vars; tooltip/grid/eixos/hover condicionados por tema | MEMORY.md F4 + RELEASE-REPORT §Correções 4 |
| RESOLVIDO-018 | Wizard "Novo Atendimento" (`AppointmentWizard`, `components/appointment/*`, `SearchableSelect`) e `pages/Agenda.tsx` migrados para tokens — corrige cards pretos ilegíveis no light | MEMORY.md 18 Jul (`75b1108`) |
| RESOLVIDO-019 | ~17 componentes com cores hardcoded → tokens (MoreOptionsDrawer, AppointmentEditModal, Header, BottomMobileNav, DashboardHero, AIOSDiagnosticCard, SaveFooter, CalendarPicker, SmartNotifications, AIAssistantChat, CommissionsManagement, BookingModeToggle, Finance, ClientCRM, Agenda, ServiceSettings, modais do dashboard) | MEMORY.md 26 Jun |
| RESOLVIDO-020 | `bg-neutral-900/80` → `color-mix(in srgb, var(--color-card) 80%, transparent)` | MEMORY.md 26 Jun |
| RESOLVIDO-021 | Dourado do clube unificado com o accent do tema | MEMORY.md Sprint 4 |

### 1.4 Tailwind estático e classes interpoladas

| ID | Item | Fonte |
|---|---|---|
| RESOLVIDO-022 | Migração Tailwind **CDN → build estático** (`@tailwindcss/vite`); config inline removida do `index.html` | MEMORY.md Sprint 5 + RELEASE-REPORT |
| RESOLVIDO-023 | **116 `hover:${...}` interpolados eliminados** em 43 arquivos (inclusive `hover:hover:` quebrado) | MEMORY.md Sprint 5 |
| RESOLVIDO-024 | 5 interpolações de **variante** que não geravam CSS corrigidas: `SettingsSwitch` (`peer-checked`/`peer-focus`), `ClientCRM` (`focus`), `AppointmentEditModal` (`placeholder`), `PublicBooking` (`selection`) | RELEASE-REPORT §Correções 2 |
| RESOLVIDO-025 | Interpolações da página pública `/book` → `theme-accent` (marca voltou a renderizar) | MEMORY.md Sprint 1 |
| RESOLVIDO-026 | Ratchet `scripts/check-design-debt.mjs` plugado no `npm run lint` — 7 anti-padrões vigiados, baseline commitado | MEMORY.md Sprint 5.1 |
| RESOLVIDO-027 | `check-design-debt.mjs` portável no Windows (`fileURLToPath` + separador `/`) | RELEASE-REPORT §Correções 1 |

### 1.5 Tipografia, feedback e microcopy

| ID | Item | Fonte |
|---|---|---|
| RESOLVIDO-028 | Sweep `text-[9px]/[10px]/[11px]` → `text-xs` (**250 ocorrências em 68 arquivos**); `text-[8px]` também | MEMORY.md Sprint 3 + Sistemático |
| RESOLVIDO-029 | ~20 `alert()`/`confirm()` da Agenda → `ConfirmModal`/`Toast`; `alert()` → `showToast` no geral | MEMORY.md Sprint 1/Staff mobile |
| RESOLVIDO-030 | Empty states unificados via `ui/EmptyState` com variante `bordered` (fila, CRM) | MEMORY.md F4 |
| RESOLVIDO-031 | `ui/SettingsRow` criado (label + ajuda + controle) e aplicado em `PublicBookingSettings` | MEMORY.md F4 |
| RESOLVIDO-032 | `LoadingFull` com tokens | MEMORY.md Sprint 3 |
| RESOLVIDO-033 | Mojibake do euro em `pages/Agenda.tsx` (`'â¬'` → `'€'`) | MEMORY.md 26 Jun |
| RESOLVIDO-034 | "Email" → "E-mail" em Login/Register/Clients/ClientArea/`mapError`; acentuação em `services/crm|queue|finance`, `settings/UiPreview` | MEMORY.md 26 Jun |
| RESOLVIDO-035 | Copy padronizada: agendamento / "Dar baixa" / "Receita-mês" | MEMORY.md Sprint 2 |
| RESOLVIDO-036 | `ConfirmModal` `text-neutral-300` → `var(--color-text-secondary)` (contraste no beauty) | RELEASE-REPORT §Correções 3 |
| RESOLVIDO-037 | Dieta de animação no `PublicBooking` (sem stagger/grayscale/rotate; feedback 200–300 ms) | MEMORY.md Sprint 5 |
| RESOLVIDO-038 | Fallback de `prefers-reduced-motion` por wildcard universal (`*, *::before, *::after`) | impeccable §What's Working 3 |

### 1.6 Layout e fluxo

| ID | Item | Fonte |
|---|---|---|
| RESOLVIDO-039 | Agenda v2 mobile: grade multi-coluna → **lista cronológica do dia** (acaba scroll lateral) | MEMORY.md 24 Jun |
| RESOLVIDO-040 | Agenda v2 desktop: alturas de linha uniformes (corrige espaçamento irregular e clique roubado) | MEMORY.md 24 Jun |
| RESOLVIDO-041 | Faixa de datas vira semana fixa + empty state "Nenhum agendamento neste dia" | MEMORY.md 24 Jun |
| RESOLVIDO-042 | Agenda: grade gestora `06:00`→`23:30`; horários `00:00`–`05:59` só aparecem se houver agendamento, no topo. Util `utils/agendaTimeSlots.ts` + testes | MEMORY.md 1 Ago |
| RESOLVIDO-043 | Dashboard F4: hero com sparkline 7d + meta do dia + mini-KPIs clicáveis; card de ocupação hora a hora | MEMORY.md F4 |
| RESOLVIDO-044 | Sidebar agrupada em Operação / Crescimento / Sistema | MEMORY.md F4 |
| RESOLVIDO-045 | Finance icon-chips + fix do gráfico entradas/saídas (RPC com contrato incompatível → agregação client-side) | MEMORY.md F4 |
| RESOLVIDO-046 | Shell de Ajustes sem `shadow-promax-glass` | MEMORY.md F4 |
| RESOLVIDO-047 | Staff na Agenda ganhou "Confirmar e cobrar" e "Faltou"; footer do modal com primário full-width | MEMORY.md 24 Jun + Staff mobile |
| RESOLVIDO-048 | Bottom nav `${colors.bg}/40` → `color-mix` | MEMORY.md Sistemático |
| RESOLVIDO-049 | `useTenantLocale`/`usePublicTenantLocale` — ponto único região→moeda/DDI, adotado em 5 telas; `buildWhatsAppLink` com DDI por região | MEMORY.md Sprint 5 |
| RESOLVIDO-050 | Fix do tema dark/light quebrado: `hooks/useColorMode.ts` como fonte única via `useSyncExternalStore`; toggle reflete em todos os componentes | MEMORY.md 26 Jun |

### 1.7 Itens da crítica `impeccable` (12 Jul) já pagos — verificado no código em 2026-08-01

| ID | Item | Verificação |
|---|---|---|
| RESOLVIDO-051 | "Excluir cliente" com `window.confirm()` nativo e botão icon-only sem nome acessível | **Corrigido**: `pages/ClientCRM.tsx:617` usa `<ConfirmModal>`; `:368` tem `aria-label="Desativar cliente"`; `:348`/`:378` também rotulados. Zero `confirm(` em `pages/**` e `components/**` |
| RESOLVIDO-052 | Padrão banido de faixa lateral (`border-l-4`/`border-l-2`) em Agenda:1155/:1329 e ClientCRM:526 | **Corrigido**: zero ocorrência de `border-l-4`/`border-l-2` em `pages/**` e `components/**` |
| RESOLVIDO-053 | Vocabulário pré-v1.1 em ClientCRM (`border-4`, `shadow-heavy`, `rounded-none`) e classe morta `shadow-neon-soft` | **Corrigido**: zero ocorrência dos 4 padrões em `pages/**` e `components/**` |

> ⚠️ Estes três eram `P1`/`P2` da crítica de 12 Jul. Se um crítico relatar qualquer um deles de novo, o achado é **descartado** salvo prova de linha atual.

---

## 2. CONHECIDO — dívida em aberto; entra no plano da Fase 6 sem passar pela crítica

### 2.1 Backlog F5 declarado (pós-launch do Design System v1.1)

| ID | Item | Estado verificado em 2026-08-01 |
|---|---|---|
| CONHECIDO-001 | Remover bridge `!important` do `index.html` | **Aberto** — 58 ocorrências de `!important` em `index.html` |
| CONHECIDO-002 | Paleta legada em `styles/tailwind.css` (dívida F5) | **Aberto** — a confirmar extensão no mapa M3 |
| CONHECIDO-003 | Criar `useChartColors()` para Recharts em vez de ler var manualmente por gráfico | **Aberto** |
| CONHECIDO-004 | Migrar `neutral-*`/`stone-*`/`zinc-*`/`slate-*`/`gray-*` restantes em `pages/` e `components/` | **Muito menor que o registrado**: **25 ocorrências em 12 arquivos** (MEMORY.md ainda fala de ~300 e de "~653 em ~75 arquivos" — número desatualizado) |
| CONHECIDO-005 | Aplicar `ui/SettingsRow` nas demais páginas de settings (hoje só `PublicBookingSettings`) | **Aberto** |
| CONHECIDO-006 | Falta validação visual manual nas 4 combinações (switcher + Chrome Android) | **Aberto** — esta varredura cumpre parte disso na Fase 2 |

### 2.2 Dívida estrutural de design system

| ID | Item | Fonte |
|---|---|---|
| CONHECIDO-007 | `useBrutalTheme()` é god node com **266 arestas** — maior acoplamento do repositório; estilo por hook JS em vez de token/`data-theme` | GRAPH_REPORT §God Nodes 1 |
| CONHECIDO-008 | `BrutalButton()` ainda é god node (28 arestas) convivendo com `ui/Button` (34 arestas) — duas famílias de botão | GRAPH_REPORT §God Nodes 8,10 |
| CONHECIDO-009 | Migração `isBeauty` (flag JS) → token pendente | MEMORY.md backlog estrutural |
| CONHECIDO-010 | Consolidação de `BrutalCard` pendente | MEMORY.md backlog estrutural |
| CONHECIDO-011 | `useBrutalTheme.classes.card` (fallback do `variant="default"` deprecado) pareia `border` + `shadow` no mesmo elemento — viola a regra "glass-border, nunca os dois". Único consumidor é `pages/settings/UiPreview.tsx` | impeccable §Minor 1 |
| CONHECIDO-012 | `design-system/MASTER.md` desatualizado (cita `BrutalCard`/`BrutalButton`, radius que o `RADIUS_MAP` atual não aplica) enquanto `DESIGN.md` é a fonte real | impeccable §Minor 4 |
| CONHECIDO-013 | Duas APIs para o mesmo padrão de footer de modal: `className="flex-1"` manual (`Finance.tsx`) vs prop `fullWidth` (`ClientCRM.tsx`) | impeccable §Minor 3 |
| CONHECIDO-014 | `Card` não tem prop `interactive`: `role="button"` + `onKeyDown` + hover-translate reimplementados à mão, sem `focus-visible:ring` temático | impeccable §P2 |
| CONHECIDO-015 | Opacidade do overlay do Modal em light (`0.55`) abaixo dos 0.70–0.80 documentados no `DESIGN.md` (dark cumpre com 0.72) | impeccable §Minor 2 + tokens.css:175,299 |

### 2.3 Hierarquia e densidade já apontadas

| ID | Item | Fonte |
|---|---|---|
| CONHECIDO-016 | Hero-metric com sparkline + badge de crescimento é o primeiro card do Dashboard — template que o `DESIGN.md` proíbe nominalmente e que contradiz o north star "A Banca" | impeccable §P1 |
| CONHECIDO-017 | Dashboard mobile empilha ~8 cards/banners de peso visual igual antes do conteúdo real | impeccable §8 + Persona Casey |
| CONHECIDO-018 | "Novo Agendamento" primário desaparece no mobile (`hidden md:flex`) — ação mais comum fica atrás de FAB → Quick Actions | impeccable §Persona Casey |
| CONHECIDO-019 | Botões do header da Agenda perdem o texto no mobile via `hidden md:inline` sem `aria-label` compensando — saem da árvore de acessibilidade | impeccable §Persona Sam |
| CONHECIDO-020 | Falta CTA no Dashboard para os cards que foram movidos | MEMORY.md 8 Jul (P2 do júri) |

### 2.4 Fluxos públicos e onboarding

| ID | Item | Fonte |
|---|---|---|
| CONHECIDO-021 | Slug não é criado no onboarding — dono fica sem link público até descobrir Ajustes → Agendamento | MEMORY.md 8 Jul (UX persona cliente) |
| CONHECIDO-022 | Tela final do booking diz "AGENDAMENTO CONFIRMADO" mas ainda depende de aprovação do dono | MEMORY.md 8 Jul |
| CONHECIDO-023 | Chips de categoria duplicados no booking público | MEMORY.md 8 Jul |
| CONHECIDO-024 | Deep-link com boot frio logado (ex.: `/#/agenda`) cai no wizard de onboarding — corrida no gate | MEMORY.md 8 Jul (P1 aberto) |

### 2.5 Comportamento e ambiente

| ID | Item | Fonte |
|---|---|---|
| CONHECIDO-025 | **Bug aberto:** sidebar de desktop aparecendo no mobile; inspeção não achou causa no código, suspeita de PWA/service worker cacheado. Se reaparecer na captura, investigar antes de culpar CSS | MEMORY.md 🔴 + SUPER-PROMPT §3.9 |
| CONHECIDO-026 | `ESC` do modal implementado por `onKeyDown` local em alguns pontos vs listener global do `Modal.tsx` | MEMORY.md 8 Jul (P2) |
| CONHECIDO-027 | `ConfirmModal` empilha "Cancelar" **abaixo** de Confirmar/Danger no mobile (`flex-col-reverse`) — deliberado (alcance do polegar) ou acidente do flex-reverse? Decisão nunca registrada | impeccable §Questions |
| CONHECIDO-028 | `ProfessionalSelector.tsx` aparenta ser dead code — avaliar remoção em vez de correção | MEMORY.md 18 Jul |
| CONHECIDO-029 | Dev server em :3000 fica **stale** se iniciado antes do `npm install` que trouxe `@tailwindcss/vite` → serve sem o plugin, layout colapsa. Não é bug de CSS | RELEASE-REPORT §Erro de layout |
| CONHECIDO-030 | Bundle `index-*.js` em 1.001 MB (aviso de chunk no build) — performance de carga, fora do escopo desta varredura mas registrado | build 2026-08-01 |

---

## 3. Anti-padrões vigiados pelo ratchet (não podem crescer)

`scripts/check-design-debt.mjs` conta por arquivo+padrão em `pages/` e `components/` e falha se passar do baseline commitado:

| Padrão | Regex |
|---|---|
| fonte sub-12px | `text-[9px]` `text-[10px]` `text-[11px]` |
| `text-white` hardcoded | `\btext-white\b` |
| `text-neutral-[3456]00` hardcoded | `\btext-neutral-[3456]00\b` |
| modal custom | `fixed inset-0` |
| sombra genérica | `shadow-(sm\|md\|lg\|xl\|2xl)` |
| hover interpolado | `hover:${` |
| `wa.me` com DDI fixo | `wa.me/55` |

Qualquer correção proposta que aumente uma dessas contagens é **automaticamente inválida** (§9, verificação técnica (d)).

---

## 4. Placar da auditoria anterior — o que ela mediu

| Agente | Nota | O que cobriu |
|---|---|---|
| A1 — Integridade & Merge | 9.5 | Conflitos, referências órfãs, sistema de estilo único, migrations |
| A2 — Funcional & Lógica | 9.0 → ~9.7 | Variáveis indefinidas, condições invertidas, 5 interpolações de variante |
| A3 — UI/UX & Usabilidade | 9.2 → ~9.6 | Tokens, bottom-sheet, focus-trap, a11y, 2 contrastes |
| A4 — Segurança & Multi-tenant | 9.2 | Vazamento cross-tenant no clube público |

**Leitura crítica:** nenhum dos quatro mediu **escala tipográfica, ritmo de espaçamento, alinhamento óptico, densidade ou hierarquia** — os cinco eixos que separam "funcional" de "desenhado". A3 mediu conformidade com o design system (tokens, focus-trap, contraste pontual), não rigor de composição. A crítica `impeccable` de 12 Jul, que mediu mais perto disso, fechou em **27/40 ("Acceptable — bom sistema, execução inconsistente nas páginas")** — e é a nota mais honesta disponível hoje.

Isso responde à pergunta do §1 do super-prompt: **as auditorias mediram a coisa errada**. A hipótese de trabalho desta varredura é que o design system está sólido (`components/ui/*` passou em scan determinístico com 0 findings) e o problema vive na **composição dentro das páginas**.

---

## 5. Diretrizes derivadas para as fases seguintes

1. **Não gastar crítica em conformidade de token** — RESOLVIDO-011 a RESOLVIDO-021 já cobriram isso; o ratchet vigia o resto. A crítica precisa medir composição.
2. **Escopo quente esperado:** `pages/Dashboard.tsx`, `pages/Agenda.tsx`, `pages/ClientCRM.tsx`, `pages/Finance.tsx`, `pages/PublicBooking.tsx` — as páginas consumidoras, que ficaram fora do scan determinístico de 12 Jul (`impeccable` §Anti-Patterns Verdict: "o scan limpo é real, mas escaneou o escopo errado").
3. **Correção sistêmica tem prioridade:** `CONHECIDO-007` (`useBrutalTheme` com 266 arestas) e `CONHECIDO-014` (`Card` sem `interactive`) são candidatos a apagar dezenas de achados de folha de uma vez.
4. **Evidência visual é obrigatória:** a crítica de 12 Jul não conseguiu capturar 390×844 (Playwright travado) e admitiu que toda a análise era de código. Esta varredura não repete isso.
