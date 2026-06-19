# Open Design — Briefs Fase 6 (runs pendentes)

**Run audit:** `20260610_120000` | **Projeto OD:** `agendix-ui-audit`  
**Referência canônica de tokens/composição:** `artifacts/screen-lock/login.html` (copiado de OD `login.html`)  
**Fonte de tokens:** `DESIGN-SYSTEM.md` + `design-system-lock.json` — **nunca** inventar paleta

---

## Artefatos rejeitados (não usar)

| Arquivo OD | Motivo |
|------------|--------|
| `index.html` | Matriz compact/spacious; eixo dark/light ausente |
| `agendix-login-4-themes.html` | Idem + UPPERCASE barber + sombra `6px 6px 0 #000` + ghost gradient |
| `DESIGN.md` (OD atual) | Documenta eixo errado — reescrever após próximo run alinhado |

---

## Bloco compartilhado (colar no início de **todo** prompt)

```
Projeto: AgendiX UI Audit — remediação craft (não rebranding).
Locale: pt-BR. Produto B2B salão/barbearia.

MATRIZ OBRIGATÓRIA (4 modos — NÃO confundir com compact/spacious):
  barber-dark | barber-light | beauty-dark | beauty-light

Cores FIXAS (DS Lock — copiar de login.html ou DESIGN-SYSTEM.md §1.2):
  barber-dark:  bg #121212, card #1E1E1E, accent #C29B40
  barber-light: bg #F5F1E8, card #FFFFFF, accent #A07A2A
  beauty-dark:  bg #1F1B2E, card #2E2B3B, accent #A78BFA
  beauty-light: bg #F7F5FF, card #FFFFFF, accent #7C3AED

Craft (Decisão A + B):
  barber: radius card 8px, button 8px, input 6px; input-h 40px; padding compacto
  beauty: radius card 16px, button 12px, input 8px; input-h 44px; padding respirado

Tipografia FIXA: Chivo (display), Inter (body), JetBrains Mono (KPI/números tabular-nums)

BANS (Impeccable product — refuse-and-rewrite):
  - Sem UPPERCASE em títulos/labels/botões (sentence case)
  - Sem ghost gradient overlay em cards
  - Sem side-stripe border-l-4 accent
  - Sem sombra brutalista (ex.: 6px 6px 0 #000)
  - Sem paleta/roxo Linear ou monocromático genérico
  - Accent ≤ 10% da superfície (CTA, seleção, focus, badge status)

**Barber light (obrigatório):** accent `#A07A2A`; nav ativa, bottom nav ativa, logo e CTA usam `var(--accent)` — nunca roxo ou cinza neutro no lugar do dourado.

Layout artifact:
  - HTML self-contained, 4 painéis [data-theme="…"] num grid (mobile 1 col, desktop 2×2)
  - theme-nav sticky no topo = OK só como chrome de audit (como login.html)
  - Mobile-first 390px; prefers-reduced-motion; focus-visible rings

Referência de composição (não copiar skin): od-reference.json
Implementação alvo: UI-REMEDIATION-SPEC.md §7.{N}
```

---

## Run 1 — Dashboard

| Campo | Valor |
|-------|-------|
| **screen** | `dashboard` |
| **output** | `dashboard.html` |
| **plugin** | `example-dashboard` |
| **design_system** | `linear-app` |
| **agent sugerido** | `opencode` ou `cursor-agent` (evitar `codex` até 2026-07-06) |
| **SPEC** | §7.2 + S5 |

### Prompt (`start_run`)

```
[Bloco compartilhado acima]

Tela: Dashboard AgendiX (/#/) — dono/staff mobile-first entre atendimentos.

Hierarquia (mobile 390px, depois desktop):
1. PageHeader: "Olá, Marina" · quarta, 10 jun · [CTA primário outline ghost à direita desk]
2. HERO metric full-width: "Faturamento hoje" — R$ 1.840,00 (JetBrains Mono tabular) + delta "↑ 12% vs ontem"
3. Grid KPI secundários (máx 3, compactos, SEM sparkline decorativa): Agendamentos · Ticket médio · Ocupação
4. Card outlined "Seu dia" / MeuDia — próximos 2–3 slots agenda
5. Banner outlined comissões pendentes (sem side-stripe) — ícone + copy sentence case

Shell: sidebar esquerda desktop + bottom nav mobile (5 itens, min-h 44px, aria-label).
Estados: SkeletonCard nos KPIs durante loading — NUNCA mostrar R$ 0,00 como placeholder.

Dados fictícios PT-BR realistas (Barbearia King SP). Copy sentence case.
Borrow de linear-app: page-header-with-primary-action, list-row-hover — NÃO copiar paleta purple Linear.

Entregar dashboard.html com matriz 4 temas igual login.html (painéis barber-dark/light, beauty-dark/light).
```

---

## Run 2 — Agenda

| Campo | Valor |
|-------|-------|
| **screen** | `agenda` |
| **output** | `agenda.html` |
| **plugin** | `example-dashboard` |
| **design_system** | `cal` |
| **agent sugerido** | `opencode` ou `cursor-agent` |
| **SPEC** | §7.3 + S6 |

### Prompt (`start_run`)

```
[Bloco compartilhado acima]

Tela: Agenda AgendiX (/#/agenda) — fluxo diário do barbeiro no celular.

Hierarquia:
1. PageHeader: "Agenda" · quarta, 10 jun · [Botão primário "Novo agendamento"]
2. TimeGrid — slots horários 09:00–19:00 com cards outlined por appointment
   - Status via Badge (confirmado / em atendimento / concluído) — SEM border-l-4
   - barber: slots densos py-2.5; beauty: py-3.5 respirado
3. Sticky bottom mobile: ação primária "Iniciar próximo" min-h 44px + safe-area
4. Indicador de modal/wizard (estado aberto): ui/Modal centrado "Novo agendamento" — focus trap implícito

Copy PT-BR; erros humanos (não error.message técnico).
Toast de erro exemplo com ação "Tentar novamente" (UI corner, não page-wide).

Borrow de cal: density de time grid, slot hover — NÃO copiar paleta cal.com.

Entregar agenda.html com matriz 4 temas (mesmo padrão login.html).
```

---

## Run 3 — Financeiro

| Campo | Valor |
|-------|-------|
| **screen** | `financeiro` |
| **output** | `financeiro.html` |
| **plugin** | `example-finance-report` |
| **design_system** | `stripe` |
| **agent sugerido** | `opencode` ou `cursor-agent` |
| **SPEC** | §7.4 + S7 |

### Prompt (`start_run`)

```
[Bloco compartilhado acima]

Tela: Financeiro AgendiX (/#/financeiro) — dados críticos de negócio, densidade permitida.

Hierarquia:
1. PageHeader: "Financeiro" · junho 2026 · [Filtro outline] [CTA "Registrar receita"]
2. KPI row (3 cards outlined): Receita · Despesas · Lucro — números JetBrains Mono tabular
3. ui/Table "Últimas movimentações":
   - <th scope="col"> semântico
   - sticky header; row hover surfaceHover; density.tableRowPy por tema
4. Seção "Comissões da equipe" — tabela secundária ou cards compactos
5. Hint de modal full (Checkout): barra superior + slots header/body/footer — ui/Modal size=full

Shell: sidebar + bottom nav (mesmo vocabulário dashboard).
Light mode legível: contraste body ≥ 4.5:1 nos 2 temas light.

Borrow de stripe: table-row-density, numeric-tabular-alignment — NÃO copiar paleta Stripe.

Entregar financeiro.html com matriz 4 temas (mesmo padrão login.html).
```

---

## Ordem de execução

1. **Dashboard** → validar tokens alinhados a `login.html`
2. **Agenda** → reutilizar shell/nav do dashboard
3. **Financeiro** → reutilizar KPI + table patterns

Após cada run aprovado: copiar para `artifacts/screen-lock/{screen}.html` e atualizar `screen-lock.json`.

## Comando MCP (exemplo)

```text
start_run:
  project: agendix-ui-audit
  agent: opencode
  plugin: example-dashboard
  inputs:
    brief: <prompt da seção acima>
    design_system: linear-app
```

## Pós-run

- Atualizar `od-runs.json` com runId, status, agent
- Reescrever `DESIGN.md` no OD espelhando matriz dark/light (não compact/spacious)
- Quando 4/4 aprovados: `"locked": true` em `screen-lock.json`
