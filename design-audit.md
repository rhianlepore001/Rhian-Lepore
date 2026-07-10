# AgendiX — Auditoria de Design System (pré-lançamento v1)

**Data:** 09 Jul 2026 · **Escopo:** 4 combinações visuais (barber/beauty × light/dark) · **Base:** React 19 + Tailwind v4 + `design-system/tokens.css`
**Método:** inventário exaustivo de `components/` e `pages/` (3 varreduras paralelas: hardcodes, modais, cards) + análise das fundações (`tokens.css`, `index.html`, `styles/tailwind.css`, `useBrutalTheme`, camada `components/ui/`).

---

## 1. Diagnóstico do estado atual

### 1.1 O que já está bom (não mexer)

O projeto **tem** um design system real, resultado do esforço "DS Lock":

- `design-system/tokens.css` — 4 combinações completas com tokens semânticos (`--color-card`, `--color-text-secondary`, `--shadow-modal`, `--z-modal`…).
- `hooks/useBrutalTheme.ts` — camada de consumo centralizada com `RADIUS_MAP` (barber sharp / beauty soft), `DENSITY_MAP` (barber compacto / beauty respirado), classes prontas de botão/badge/modal.
- `components/ui/` — Card canônico (2 variants), Button (6 variants, touch target 44px), Modal com FocusTrap + bottom-sheet mobile, ConfirmModal, Toast, Skeleton, EmptyState.
- Detalhes de qualidade já presentes: `tabular-nums` em números, `prefers-reduced-motion` respeitado, anti-FOUC de tema no `index.html`.

**O problema não é ausência de sistema — é adesão parcial e três fontes de verdade competindo.** O acabamento "simples" que se percebe vem de: (a) telas inteiras fora dos tokens, (b) 20 receitas de card e 4 dialetos de modal coexistindo, (c) contraste reprovado no texto terciário, (d) elevação e raio sem régua.

### 1.2 Problemas estruturais (com evidência)

#### A. Três fontes de verdade para os mesmos tokens

| Fonte | Conteúdo | Risco |
|---|---|---|
| `design-system/tokens.css` | Fonte "oficial" (auto-gerada de JSON) | — |
| `index.html:275-381` | **Cópia inline dos 4 blocos de tema** + tokens que só existem ali (`--color-focus-ring`, `--shadow-brutal*`, `--particle-color`, `--bg-gradient`) | Já divergiu: `index.html` não tem `--color-accent-dim`/`--color-accent-border`; `tokens.css` não tem `--color-focus-ring`. Editar um sem o outro quebra silenciosamente. |
| `styles/tailwind.css:9-63` | Terceira paleta com hex crus (`brutal-*`, `obsidian-*`, `silk-*`, `beauty-*`, `accent-gold*`) + 14 sombras nomeadas | Componentes que usam `bg-brutal-card`, `shadow-promax-glass` etc. **não reagem a tema/modo**. |

#### B. A "bridge" de light mode é uma dívida que mascara ~420 violações

`index.html:69-250` mantém ~80 regras CSS com `!important` remapeando classes dark hardcoded (`bg-neutral-900`, `bg-zinc-800`, `text-neutral-400`…) quando `data-mode="light"`. O comentário no próprio arquivo admite: *"Evita refatorar 50+ arquivos"*. Consequências:

- Especificidade com `!important` impede overrides legítimos.
- Cobertura incompleta: qualquer classe nova fora do mapa quebra o light mode silenciosamente.
- O inventário confirmou o tamanho do iceberg: **>422 ocorrências de `neutral-*` em 55+ arquivos**, ~72 de `zinc-*`, ~78 de `stone-*`.

#### C. Área pública do cliente inteira fora do sistema

`pages/ClientArea.tsx` (105 ocorrências combinadas de `stone-*`/`zinc-*`) e `components/ClientBookingCard.tsx` implementam a bifurcação beauty/barber com paletas cruas:

- `pages/ClientArea.tsx:304` — `rounded-2xl p-6 bg-white shadow-lg border border-stone-100` (beauty) vs `bg-zinc-900 border-zinc-800` (barber)
- `pages/ClientArea.tsx:256,264,274,406` — fundos `bg-[#050505]` / `bg-[#E2E1DA]` em hex direto

É a vitrine que o cliente final vê — e é a parte menos consistente do produto.

#### D. Quatro dialetos de modal coexistindo (54 instâncias)

| Dialeto | Qtd | Exemplos |
|---|---|---|
| `components/ui/Modal` (novo, prop `open`, bottom-sheet mobile, FocusTrap) | ~19 | CheckoutModal, Finance, Products, QueueManagement |
| `components/Modal` (legado, prop `isOpen`, sizes diferentes) | ~7 | GoalSettingsModal, ServiceSettings:192 |
| `ConfirmModal` (2 implementações: `ui/ConfirmModal` e embutida no legado) | ~9 | Agenda:1831, Finance:1075 |
| **Inline ad-hoc** (div fixed + overlay manual) | ~19 | ServiceModal:177, AppointmentEditModal:253, ClientCRM:553, PublicBooking:1465/1724, PaywallModal:23, AIOSStrategyModal:40, Agenda:1851 |

Divergências concretas entre eles:

- **Overlay:** token `--color-overlay` vs `bg-black/60` vs `bg-black/80` vs `bg-black/95` — 4 escurecimentos diferentes para a mesma função.
- **z-index:** `var(--z-modal)` (=80) vs `z-50` (`pages/Agenda.tsx:1851`) vs `z-[100]` (PaywallModal) vs `z-[999]` (`pages/Agenda.tsx:1631`) vs `z-[10000]` (`components/ServiceModal.tsx:177`). A escala `--z-*` existe e é ignorada.
- **Acessibilidade quebrada em 7+ modais:** sem FocusTrap, sem `aria-modal`, sem ESC — `PaywallModal.tsx:23`, `AIOSStrategyModal.tsx:40`, `pages/Agenda.tsx:1851`, `pages/ClientCRM.tsx:553`, `pages/PublicBooking.tsx:1465` e `:1724`.
- **Botão fechar:** ícone lucide 44px vs `rounded-full` pequeno vs **string literal `"X"`** (`components/ProfileModal.tsx`).
- **Raio:** `radius.modal` (token) vs `rounded-2xl` vs `rounded-3xl` vs `rounded-[2rem]` (`AIOSStrategyModal.tsx:50`).

#### E. 20 receitas distintas de card

O inventário identificou receitas A–T. As mais problemáticas:

- `pages/ClientCRM.tsx:381-395` — mini-KPIs `bg-neutral-900 p-3 border border-neutral-800` **sem raio**, dentro de um `<Card>` canônico (dois sistemas no mesmo componente visual).
- `components/GoalHistory.tsx:43-89` — recebe `isBeauty` como **prop** e monta 4 estilos locais com literais; não reage a light mode.
- `components/TeamMemberCard.tsx:51-58` — `bg-brutal-card border-white/5 shadow-promax-glass`, sem `useBrutalTheme`.
- `pages/settings/SubscriptionSettings.tsx:116` — card "Status da Conta" hardcoded ao lado de um grid de planos que usa `<Card>` corretamente — as duas abordagens na mesma página.
- `rounded-2xl` fixo ignorando `RADIUS_MAP` em 7+ locais (`pages/Dashboard.tsx:208`, `components/dashboard/SetupCopilot.tsx:252`, `components/membership/PlanCard.tsx:48`…): em barber, esses cards ficam mais arredondados que o padrão `rounded-lg` do tema.

#### F. Contraste WCAG — o texto terciário reprova nas 4 combinações

Verificação dos pares texto/fundo dos tokens atuais (razão mínima AA = 4,5:1 para texto normal):

| Token sobre `--color-card` | Combinação | Razão aprox. | Veredito |
|---|---|---|---|
| `--color-text` | todas | 12–16:1 | ✅ |
| `--color-text-secondary` | todas | 5,5–7,2:1 | ✅ |
| `--color-text-muted` `#6B6252` | barber dark | **~3,0:1** | ❌ |
| `--color-text-muted` `#7A7A75` | barber light | **~4,2:1** | ❌ |
| `--color-text-muted` `#8A7DA8` | beauty dark | **~3,9:1** | ❌ |
| `--color-text-muted` `#7B6E95` | beauty light | **~4,3:1** | ❌ |
| `--color-accent` | todas | 5,1–7,2:1 | ✅ |

O problema: `text-muted` não é decorativo no AgendiX — é usado em labels de KPI (`pages/Dashboard.tsx:225`), timestamps, contadores. Reprova AA em conteúdo significativo.

#### G. Cores de status cruas sem mediação de token (~230 ocorrências)

`--color-success/danger/warning` existem, mas o código usa `bg-green-500/20 text-green-400` (82 occ), `bg-red-500/10 text-red-400` (85 occ), `text-amber-400` (47 occ), e **azul informativo sem nenhum token** (42 occ — `pages/Agenda.tsx:1188`, `components/MonthlyHistory.tsx:72`). Além de inconsistente entre light/dark (o `green-400` fica ilegível sobre branco), impede ajuste global.

#### H. Sombras: tokens duplicados em literais + elevação sem régua

- `shadow-[0_32px_80px_rgba(0,0,0,0.7)]` re-implementa `--shadow-modal` em 5 arquivos de auth (`pages/Login.tsx:208`, `pages/Register.tsx:129`, `pages/StaffOnboarding.tsx:53`…).
- 15+ valores `shadow-[...]` únicos espalhados (`pages/Agenda.tsx:1254`, `components/PhoneInput.tsx:140`, `pages/ClientCRM.tsx:557`…).
- Mesmo nível de elevação com sombras diferentes: dropdowns usam `shadow-xl` (`SearchableSelect.tsx:115`) e `shadow-2xl` (`HelpButtons.tsx:162`); cards usam `shadow-sm`/`md`/`lg` conforme o arquivo (`pages/ClientArea.tsx:304,450,574`).

#### I. Miudezas de acabamento

- `text-[8px]` em 6 lugares (`components/GoalHistory.tsx:170`, `ProfessionalCommissionDetails.tsx:347`…) — abaixo do mínimo legível em celular.
- Raios arbitrários: `rounded-[24px]`, `[28px]`, `[32px]`, `[2rem]` (`BottomMobileNav.tsx:30`, `CommissionPaymentHistory.tsx:194`…).
- Hex em props Recharts (~25 occ em `pages/Finance.tsx:136-143`, `components/FinanceInsights.tsx:37-51`) — caso legítimo (lib não aceita `var()`), mas precisa de ponte JS.
- Micro-interações sem régua: `hover:scale-[1.01]`, `[1.02]`, `hover:-translate-y-0.5`, `hover:translate-y-[-2px]` — quatro convenções para "card clicável".

---

## 2. Problemas classificados por severidade

### 🔴 Crítico (bloqueia a percepção de qualidade da v1)

| # | Problema | Evidência |
|---|---|---|
| C1 | Acessibilidade quebrada em 7+ modais (sem FocusTrap/aria/ESC) | `PaywallModal.tsx:23`, `AIOSStrategyModal.tsx:40`, `Agenda.tsx:1851`, `ClientCRM.tsx:553`, `PublicBooking.tsx:1465,1724` |
| C2 | `--color-text-muted` reprova WCAG AA nas 4 combinações em texto significativo | tokens.css:81,128,174,221 |
| C3 | Área pública do cliente (ClientArea + ClientBookingCard) 100% fora dos tokens — light/dark e temas não funcionam de verdade lá | `ClientArea.tsx:256-574` (~105 occ) |
| C4 | Tokens duplicados em 3 fontes com divergência real | `index.html:275-381` vs `tokens.css` vs `tailwind.css:9-63` |

### 🟠 Alto

| # | Problema | Evidência |
|---|---|---|
| A1 | Dois componentes Modal + 19 modais inline; overlay/z-index/raio divergentes | catálogo §1.2-D |
| A2 | ~230 usos de cores de status cruas; azul "info" sem token | `Agenda.tsx:1188`, `Finance.tsx:836`, `QueueManagement.tsx:315` |
| A3 | 8 famílias de card fora do DS com branch `isBeauty` manual (não reagem a light) | `GoalHistory.tsx:43`, `TeamMemberCard.tsx:51`, `SubscriptionSettings.tsx:116`, `SmartRebooking.tsx:62`, `PlanCard.tsx:46` |
| A4 | Bridge `!important` de ~80 regras mascarando ~420 violações `neutral-*` | `index.html:69-250` |
| A5 | z-index fora da escala (`z-50` a `z-[10000]`) | `ServiceModal.tsx:177`, `Agenda.tsx:1631,1851` |

### 🟡 Médio

| # | Problema | Evidência |
|---|---|---|
| M1 | Sombras arbitrárias duplicando tokens; elevação sem régua | `Login.tsx:208`, `SearchableSelect.tsx:115` vs `HelpButtons.tsx:162` |
| M2 | `rounded-2xl` fixo ignorando `RADIUS_MAP` (7+ locais) + raios arbitrários | `Dashboard.tsx:208`, `BottomMobileNav.tsx:30` |
| M3 | Hex hardcoded em gráficos Recharts sem ponte de tokens | `Finance.tsx:136-143`, `FinanceInsights.tsx:37-51` |
| M4 | `BrutalCard` deprecated ainda em uso | `PaywallModal.tsx`, `security/TwoFactorSetup.tsx` |
| M5 | Empty states com 3 receitas diferentes | `ServiceSettings.tsx:90` (usa `inputBg`), `TeamSettings.tsx:147` (border-dashed), `ui/EmptyState` |

### 🔵 Polish

| # | Problema | Evidência |
|---|---|---|
| P1 | `text-[8px]` ilegível em badges | `GoalHistory.tsx:170` + 5 |
| P2 | Botão fechar como string `"X"` | `ProfileModal.tsx` |
| P3 | Micro-interações sem régua (4 convenções de hover) | §1.2-I |
| P4 | Partículas animadas de fundo (`body::before`) datam o visual; ruído em produto de gestão | `index.html:447-477` |
| P5 | Duplicação literal de blocos CSS no `index.html` (`.fragment-obsidian`, `.massive-text` definidos 2×) | `index.html:746-778` vs `843-867` |

---

## 3. Proposta: design system unificado (v1.1 dos tokens)

Princípio: **uma fonte de verdade, quatro saídas.** Tudo abaixo é implementável sobre a base atual (CSS vars + Tailwind v4 `@theme inline`) sem reescrever componentes que já usam `useBrutalTheme`/`ui/*`.

### 3.1 Escalas primitivas completas (50–950)

Dourado permanece a identidade barber; roxo a beauty. Tons recalibrados para contraste:

```css
/* Gold — quente, menos "mostarda" nos médios */
--gold-50:#FBF6E9; --gold-100:#F5EACB; --gold-200:#EBD79E; --gold-300:#DFC066;
--gold-400:#D2AC4E; --gold-500:#C9A24A; --gold-600:#A8842F; --gold-700:#8B6914;
--gold-800:#6B5210; --gold-900:#4A390C; --gold-950:#2E2408;

/* Violet — alinhado à escala perceptual do Tailwind, extremos adicionados */
--violet-50:#F5F3FF; --violet-100:#EDE9FE; --violet-200:#DDD6FE; --violet-300:#C4B5FD;
--violet-400:#A78BFA; --violet-500:#8B5CF6; --violet-600:#7C3AED; --violet-700:#6D28D9;
--violet-800:#5B21B6; --violet-900:#4C1D95; --violet-950:#2E1065;

/* Neutros TEMÁTICOS ordenados claro→escuro (a escala atual em tokens.css:43-53
   está invertida e incompleta). Sand = neutro quente (barber); Orchid = neutro
   frio-arroxeado (beauty). Um neutro por tema evita o cinza "morto" sob o dourado
   e o cinza "sujo" sob o roxo. */
--sand-50:#FAF8F4;  --sand-100:#F2EFE8; --sand-200:#E5E0D5; --sand-300:#CFC8B8;
--sand-400:#A89A82; --sand-500:#8A7F6C; --sand-600:#6B6252; --sand-700:#4A443A;
--sand-800:#2A2620; --sand-900:#1A1816; --sand-950:#12100E;

--orchid-50:#F8F6FC; --orchid-100:#EFEBF8; --orchid-200:#DDD4EF; --orchid-300:#C3B8DD;
--orchid-400:#9C90BC; --orchid-500:#7B6E95; --orchid-600:#5D5178; --orchid-700:#443A5E;
--orchid-800:#2A2740; --orchid-900:#221F35; --orchid-950:#17132A;
```

### 3.2 Correções de contraste (AA garantido nas 4 combinações)

Única mudança de valor em tokens existentes — o resto é reorganização:

| Token | Atual | Proposto | Razão nova (sobre card) |
|---|---|---|---|
| `--color-text-muted` barber dark | `#6B6252` | `#8F8574` | ~4,9:1 ✅ |
| `--color-text-muted` barber light | `#7A7A75` | `#6E6B64` | ~5,3:1 ✅ |
| `--color-text-muted` beauty dark | `#8A7DA8` | `#9C90BC` | ~5,0:1 ✅ |
| `--color-text-muted` beauty light | `#7B6E95` | `#6B5E86` | ~5,6:1 ✅ |

Regra editorial que acompanha: `text-muted` **só** para metadados curtos; nunca para instruções ou valores. Texto abaixo de 12px proibido (mata os `text-[8px]`).

### 3.3 Token novo: `info` (fecha a lacuna do azul)

```css
/* dark */  --color-info:#60A5FA; --color-info-bg:rgba(59,130,246,0.10); --color-info-border:rgba(59,130,246,0.25);
/* light */ --color-info:#2563EB; --color-info-bg:rgba(37,99,235,0.08);  --color-info-border:rgba(37,99,235,0.20);
```

Migra as ~42 ocorrências de `blue-*` e entra no `status` do `useBrutalTheme`.

### 3.4 Elevação com régua (4 níveis, substitui 20+ sombras)

```css
--elevation-0: none;                             /* outlined: só borda */
--elevation-1: /* dropdown, popover, card hover */
--elevation-2: /* card elevated (= --shadow-card atual) */
--elevation-3: /* modal, drawer (= --shadow-modal atual) */
```

Mapeamento: dropdown/popover → e1 (mata a divergência `shadow-xl` vs `shadow-2xl`); card padrão → e0 (borda) ou e2 (elevated); modal → e3. As sombras nomeadas do `tailwind.css` (`shadow-promax-*`, `shadow-neon*`, `shadow-heavy*`) ficam congeladas para remoção pós-launch.

### 3.5 Raio, tipografia e movimento

- **Raio:** a régua já existe (`RADIUS_MAP`). Ação é *enforcement*: proibir `rounded-*` literal em containers via lint (ver §4) e migrar os 7+ desvios. Valores arbitrários (`[28px]`, `[32px]`, `[2rem]`) são eliminados.
- **Tipografia:** escala fixa `12 / 13 / 14 / 16 / 18 / 22 / 28 / 36px` com line-heights `1.5 / 1.5 / 1.5 / 1.5 / 1.4 / 1.3 / 1.2 / 1.1`. Chivo só em headings e valores hero; Inter para todo o resto; JetBrains Mono apenas para números tabulares e labels técnicos. Nada abaixo de 12px.
- **Movimento:** `--duration-fast:150ms`, `--duration-base:200ms`, `--duration-slow:300ms`, `--ease-out:cubic-bezier(0.16,1,0.3,1)`. Card clicável: **uma** convenção — `hover:-translate-y-0.5` + e1, `active:translate-y-0 scale-[0.99]`.

### 3.6 Modal definitivo (1 componente, 3 variantes)

`components/ui/Modal` vence (já é o melhor: FocusTrap, bottom-sheet mobile, `preventClose`). Ações:

1. `components/Modal.tsx` legado vira re-export deprecado de `ui/Modal` (adaptando `isOpen`→`open`); os 7 usos migram.
2. Os 19 modais inline são envelopados em `ui/Modal` (o conteúdo interno não muda — só o casco).
3. `ConfirmModal` único (`ui/ConfirmModal`) com variantes `default` e `danger` (título + consequência + ação destrutiva vermelha à direita, Cancelar como secundário à esquerda).
4. Overlay, z-index e raio **sempre** via token — nenhum modal define os seus.

O modelo definitivo (confirmação / form / destrutivo) está demonstrado em `components-showcase.html`.

### 3.7 Ponte de tokens para gráficos

Hook `useChartColors()` que lê `getComputedStyle(document.documentElement)` e devolve `{ accent, success, danger, grid, axis, tooltip }` — resolve as ~25 ocorrências Recharts sem hack, reagindo a tema/modo.

---

## 4. Plano de implementação priorizado

Cada fase é entregável isoladamente; nada quebra o launch.

### Fase 0 — Fundações (0,5–1 dia) 🔴
1. **Unificar tokens:** mover para `tokens.css` o que só existe no `index.html` (`--color-focus-ring`, `--shadow-brutal*`, `--bg-gradient`, `--particle-color`) e **deletar o bloco duplicado** `index.html:275-381`. Zero mudança visual, elimina a divergência.
2. **Corrigir contraste:** os 4 valores de `--color-text-muted` (§3.2). Mudança de 4 linhas, ganha AA em centenas de textos.
3. **Adicionar tokens `info`** (§3.3) + entrada `status.info*` no `useBrutalTheme`.
4. **z-index:** trocar `z-50`/`z-[100]`/`z-[999]`/`z-[10000]` dos modais por `var(--z-modal)` (5 arquivos).

### Fase 1 — Modais (1–2 dias) 🔴🟠
5. Corrigir os 7 modais sem acessibilidade envelopando em `ui/Modal` (PaywallModal com `preventClose`, AIOSStrategy, Agenda History, ClientCRM edit, PublicBooking ×2, ProfileModal).
6. Migrar os 7 usos do `Modal` legado para `ui/Modal`; legado vira re-export deprecado.
7. Unificar `ConfirmModal`.

### Fase 2 — Cards e status (2–3 dias) 🟠
8. Migrar as 8 famílias de card fora do DS para `ui/Card` + `useBrutalTheme` (GoalHistory, TeamMemberCard, SubscriptionSettings status, SmartRebooking, PlanCard, ClientCRM mini-KPIs, SetupCopilot, Dashboard Clube) — remove os `isBeauty` ternários e os `rounded-2xl` fixos.
9. Migrar cores de status cruas → tokens (`status.*` do hook). Prioridade: Agenda, Finance, QueueManagement, Dashboard (telas mais vistas).
10. Substituir sombras arbitrárias por tokens de elevação (Login/Register/StaffOnboarding → `--elevation-3`).

### Fase 3 — Área pública do cliente (2–3 dias) 🔴 (pode ir em paralelo com F2)
11. `ClientArea.tsx` + `ClientBookingCard.tsx` + `ChatBubble.tsx`: substituir `stone-*`/`zinc-*`/hex por tokens com `useBrutalTheme({ override })`. É a maior migração única (~150 occ), mas mecânica.

### Fase 4 — Pós-launch (limpeza estrutural)
12. Migrar as ~420 ocorrências `neutral-*` restantes página a página; a cada página limpa, apagar as regras correspondentes da bridge. Meta: bridge zerada.
13. Remover paleta legada do `tailwind.css` (`brutal-*`, `promax-*`, `neon*`) quando os últimos consumidores migrarem.
14. `useChartColors()` para Recharts (§3.7).
15. Guard-rail: regra ESLint (`no-restricted-syntax` em className) bloqueando `bg-neutral-`, `bg-zinc-`, `bg-stone-`, `shadow-[`, `z-[`, `text-[8px]` em novos commits.
16. Polish: remover partículas de fundo, deduplicar CSS do `index.html`, `text-[8px]`→`text-xs`, botão "X" literal → ícone.

**Esforço total estimado até o launch (F0–F3): ~6–9 dias de dev.** F4 é contínua.

---

## 5. Entregáveis complementares

- **`dashboard-proposal.html`** — Dashboard redesenhado com os tokens propostos, switcher funcional das 4 combinações. Demonstra: hierarquia hero→KPIs→ação, elevação com régua, raio por tema, densidade por tema, contraste AA.
- **`components-showcase.html`** — Biblioteca padronizada: todos os modelos de card, o modal definitivo (confirmação / form / destrutivo), botões, inputs, badges, toasts, empty/loading states e a seção de Ajustes redesenhada — também com switcher.

Ambos são standalone (zero dependências externas) e usam exatamente a arquitetura de tokens do §3, ou seja, servem de referência de implementação direta.
