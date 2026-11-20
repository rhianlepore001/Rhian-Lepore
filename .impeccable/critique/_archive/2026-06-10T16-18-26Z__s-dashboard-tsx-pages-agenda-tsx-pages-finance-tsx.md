---
target: dashboard, agenda, financeiro, estilo genérico
total_score: 25
p0_count: 0
p1_count: 4
timestamp: 2026-06-10T16-18-26Z
slug: s-dashboard-tsx-pages-agenda-tsx-pages-finance-tsx
---
# Critique — Dashboard, Agenda, Financeiro + estilo genérico

**Targets:** `pages/Dashboard.tsx`, `pages/Agenda.tsx`, `pages/Finance.tsx`, `hooks/useBrutalTheme.ts`  
**Register:** product (AgendiX)  
**Data:** 2026-06-10

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeletons e banners ok; gráficos financeiros sem estado vazio claro |
| 2 | Match System / Real World | 3 | PT-BR bom; jargão residual ("A Distribuir", status em EN internamente) |
| 3 | User Control and Freedom | 3 | Banners dismissíveis; modais têm cancel |
| 4 | Consistency and Standards | 2 | Três fontes de estilo + botões inline na Agenda vs `ui/Button` |
| 5 | Error Prevention | 3 | ConfirmModal em ações destrutivas |
| 6 | Recognition Rather Than Recall | 2 | Agenda exige memorizar filtros/modais; uppercase reduz escaneabilidade |
| 7 | Flexibility and Efficiency | 2 | Sem atalhos; muitos cliques por agendamento |
| 8 | Aesthetic and Minimalist Design | 2 | Hero-metric + grid idêntico de KPIs; charts hardcoded dark |
| 9 | Error Recovery | 3 | Toasts com retry em Agenda |
| 10 | Help and Documentation | 2 | SetupCopilot no dashboard; resto pouco contextual |
| **Total** | | **25/40** | **Acceptable — melhorias significativas antes de confiança plena** |

## Anti-Patterns Verdict

**LLM assessment:** Não é "AI slop" puro — há identidade barber/beauty e migração para `ui/*`. Mas os tells acumulam: **hero-metric** (1 card hero + 3 SecondaryKpi idênticos no Dashboard), **side-stripe** (`border-l-4` em MeuDiaWidget e cards mobile do Financeiro), **uppercase tracked** massivo na Agenda (~20 ocorrências), gráficos Recharts com paleta fixa `#0a0a0a`/`#555` (quebra light mode e parece export CSV). A sensação final: SaaS genérico com skin dourada/roxa por cima.

**Deterministic scan (2 findings in scope):**
- `pages/Finance.tsx:701` — `border-l-4` em mobileRender de transações
- `components/dashboard/MeuDiaWidget.tsx:43` — `border-l-4` em item concluído

**Browser visualization:** Tentativa em `localhost:3000/#/dashboard` redirecionou para login (auth obrigatória). Overlay `detect.js` não injetado — fallback para review de código + CLI.

## Overall Impression

A base migrou na direção certa (`PageHeader`, `Card`, `Button`, `Table`), mas **a genericidade é sistêmica**: tokens competindo, padrões visuais repetidos (icon + label + número grande), e a Agenda ainda fala uma língua visual diferente (uppercase, botões ad hoc). A maior oportunidade: **unificar vocabulário de componente e remover tells de template SaaS** antes de polir telas individuais.

## What's Working

1. **Dashboard owner flow** — hero "Faturamento hoje" + CTA "Agendar" no header responde ao job-to-be-done (PRODUCT.md: ações antes de dados).
2. **Finance mobile** — `Table` com `mobileRender` e empty state acionável ("Registrar receita") ensina a interface.
3. **Migração ui/** — Dashboard, Agenda e Finance usam `components/ui/*`; Brutal* quase ausente nas páginas críticas.

## Priority Issues

### [P1] Side-stripe accent em cards operacionais
- **Why:** Ban Impeccable + UI-REMEDIATION-SPEC; leitura "AI card" em fluxos de alto uso (staff MeuDia, finance mobile).
- **Fix:** Trocar `border-l-4` por badge de status, dot leading, ou fundo semântico sutil (`successBg` sem stripe).
- **Command:** `$impeccable polish pages/Finance.tsx components/dashboard/MeuDiaWidget.tsx`

### [P1] Template hero-metric no Dashboard
- **Why:** 1 hero elevado + grid 3× SecondaryKpi (ícone arredondado + título + mono 2xl) = anti-reference explícita do PRODUCT.md.
- **Fix:** Manter 1 métrica hero; secundários compactos em linha ou lista densa; meta mensal não repetir em KPI + seção.
- **Command:** `$impeccable distill pages/Dashboard.tsx`

### [P1] Financeiro: charts desacoplados do tema
- **Why:** Tooltip `#0a0a0a`, grid `#555`, gradientes fixos — light mode quebra; parece planilha exportada.
- **Fix:** Ler cores de `useBrutalTheme()` / CSS vars; remover animação 1200ms; eixos com `colors.textMuted`.
- **Command:** `$impeccable colorize pages/Finance.tsx`

### [P1] Agenda: vocabulário visual inconsistente
- **Why:** `uppercase tracking-wider` em títulos, filtros e detalhes; botões `bg-emerald-500/10` inline vs `Button` — usuário não confia que "Faturar" e "Agendar" são a mesma família.
- **Fix:** Sentence case nos labels; mapear ações para `Button` variants; reduzir densidade de uppercase a badges de status only.
- **Command:** `$impeccable quieter pages/Agenda.tsx`

### [P2] Estilo genérico — três fontes de token
- **Why:** `index.html` paletas inline + `design-system/tokens.css` + `useBrutalTheme.ts` (~500 lin strings Tailwind) → drift entre telas e modos.
- **Fix:** Sprint S1 da UI-REMEDIATION-SPEC: tokens.css única fonte; hook só consome vars.
- **Command:** `$impeccable document hooks/useBrutalTheme.ts` then `$impeccable polish design-system/`

## Cognitive Load (Agenda + Finance)

Falhas: **chunking** (Agenda: filtro profissional + calendário + lista + ações por row >4 elementos), **minimal choices** (Finance: 4 tabs + filtros + modal nova transação com muitos campos visíveis), **visual hierarchy** (Dashboard: stack de banners competindo com hero). Score: **4+ falhas = carga alta na Agenda**; moderada no Dashboard/Finance.

## Persona Red Flags

**Alex (Power User):** Concluir agendamento na Agenda = 3+ cliques por linha (Info, Faturar, Cancelar separados); sem bulk; animação Recharts 1.2s atrasa scan mensal.

**Jordan (First-Timer):** "A Distribuir", labels `uppercase tracking-widest`, filtro "Todos" vs avatares sem legenda clara; detalhe do agendamento parece formulário técnico, não conversa de salão.

**Casey (Mobile / barbeiro):** Botões de ação na Agenda no meio da lista (zona média); Dashboard ok no hero; Finance cards mobile legíveis mas stripe chama atenção errada.

**Marcos (dono do salão — PRODUCT.md):** Meta mensal aparece 2× (KPI 33% + seção dedicada) — não vê "lucro ou prejuízo" de relance; precisa scroll.

**Rafael (staff entre atendimentos):** MeuDiaWidget stripe + estado "Próximo" em uppercase — distrai do cliente seguinte.

## Minor Observations

- Toast Dashboard usa `z-[200]` (fora da escala semântica DS Lock).
- `SetupCopilot` ainda recebe `isBeauty` prop em vez de tema via context.
- Agenda ~1700 linhas — manutenção impede consistência visual.
- Dev server com erro JSX em `CommissionDetailReport.tsx` bloqueia preview visual completo.

## Questions to Consider

- O dashboard precisa de 4 cards de métrica ou uma linha densa + 1 hero basta para o dono entre clientes?
- A Agenda poderia ter **uma** ação primária por slot (swipe ou menu) em vez de 3 botões inline?
- Financeiro: o gráfico é decisão diária ou relatório mensal — merece metade da viewport?
