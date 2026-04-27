# PLANO — Finalização do Light Mode (End-to-End)

> Spec: `.specs/features/dual-mode-theme/spec.md`
> Tasks anteriores (T-01 a T-04): infraestrutura ✅ pronta
> Data: 2026-04-27
> Escopo: **completar a cobertura visual do Light Mode em toda a árvore autenticada**

---

## 1. Diagnóstico — o que está pronto vs o que falta

### ✅ Pronto (infraestrutura)
- Variáveis CSS para os 4 estados (`barber/beauty` × `dark/light`) em `index.html`
- Anti-FOUC inline script (linha 839 do `index.html`)
- `ThemeContext` com `useSyncExternalStore` (sem re-render desnecessário)
- Toggle no `Header` ligado ao Context
- Sync do `<meta name="theme-color">` no `useDynamicBranding.ts`
- Bridge CSS parcial em `index.html` (linhas 237–296) traduzindo:
  - `text-white`, `text-neutral-300/400/500` → tokens
  - `border-neutral-700/800`, `border-white/10|5` → token de borda
  - `bg-neutral-800/900` → `--color-card`
  - `bg-brutal-card`, `bg-brutal-main`, `bg-beauty-card`, `bg-beauty-dark` → `--color-card`
  - Inputs (`bg-neutral-800`, `bg-black/20`) → `--color-bg`

### ❌ Faltando (gap real do Light Mode)

| Gap | Arquivos afetados | Impacto visual |
|---|---|---|
| `bg-black`, `bg-black/20\|30\|40` sem bridge | **61** componentes | Fundo preto chapado dentro de cards claros |
| `bg-neutral-950` sem bridge | 11 | Backdrops de modal/seção pretos no light |
| `bg-stone-*`, `bg-zinc-*` (paleta antiga) | 14 | Inconsistência no Beauty light |
| `shadow-[*_#000000]` (sombras brutalistas) | 10 (Agenda, ClientCRM, ServiceModal, TeamMemberForm…) | Sombra preta dura sobre fundo claro = fica feio |
| Gradientes `from-black\|neutral-900\|stone-900\|zinc-900` | 15 | Gradientes invertidos quebrados |
| Hex inline (`#171717`, `#050505`, `#121212`) em JSX/recharts | 6 ocorrências catalogadas | Tooltips/avatares pretos no light |
| Tokens semânticos ausentes | — | Sem `--shadow-brutal`, `--color-card-elevated`, `--color-card-hover`, `--color-divider` |
| Classes `hover:bg-*` específicas não mapeadas | espalhado | Estados de hover invisíveis no light |
| Estados de seleção/ativo (`ring-*`, `bg-accent-gold/10`) | espalhado | Contraste insuficiente em light |
| Componentes "densos" não auditados visualmente | Agenda (23), CommissionsManagement (28), ProfessionalCommissionDetails (33), Finance (14), ClientCRM (17), ClientArea (20) | Risco alto de quebra |

> **Nota:** `pages/PublicBooking.tsx` (38 ocorrências) **fica fora** — rota pública tem tema próprio (R-07).

---

## 2. Estratégia

Manter a abordagem **bridge-first** (não refatorar 134 arquivos). Onde a bridge não consegue resolver — sombras, gradientes, hexes inline — fazer **refactor cirúrgico** trocando para tokens semânticos.

**Princípio:** componente continua escrito em "linguagem dark" (familiaridade do dev), mas o CSS global traduz para light. Refactor só quando a tradução não é possível via seletor CSS.

---

## 3. Tokens semânticos novos (a adicionar no `index.html`)

Adicionar nos 4 blocos `:root, html[data-theme=...][data-mode=...]`:

```css
/* Nova superfície elevada (cards dentro de cards) */
--color-card-elevated: <valor por estado>;

/* Hover/active states */
--color-card-hover: <valor por estado>;

/* Divisor sutil (linha entre seções) */
--color-divider: <valor por estado>;

/* Sombra brutalista — preta no dark, neutra translúcida no light */
--shadow-brutal: <valor por estado>;
--shadow-brutal-sm: <valor por estado>;

/* Backdrop de modal/overlay */
--color-overlay: <valor por estado>;
```

**Mapeamento por estado:**

| Token | Barber Dark | Barber Light | Beauty Dark | Beauty Light |
|---|---|---|---|---|
| `--color-card-elevated` | `#1A1A1A` | `#FFFFFF` | `#2A2540` | `#FFFFFF` |
| `--color-card-hover` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` |
| `--color-divider` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| `--shadow-brutal` | `8px 8px 0 0 #000` | `4px 4px 0 0 rgba(160,122,42,0.35)` | `8px 8px 0 0 #000` | `4px 4px 0 0 rgba(124,58,237,0.25)` |
| `--shadow-brutal-sm` | `2px 2px 0 0 #000` | `2px 2px 0 0 rgba(160,122,42,0.25)` | `2px 2px 0 0 #000` | `2px 2px 0 0 rgba(124,58,237,0.18)` |
| `--color-overlay` | `rgba(0,0,0,0.7)` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | `rgba(31,27,46,0.4)` |

---

## 4. Bridges CSS adicionais (em `index.html`)

Adicionar ao bloco existente (linhas ~237–296):

```css
/* Pretos chapados → superfície de card */
html[data-mode="light"] .bg-black,
html[data-mode="light"] .bg-neutral-950 {
  background-color: var(--color-card) !important;
}

/* Pretos translúcidos → tinta sutil */
html[data-mode="light"] .bg-black\/20,
html[data-mode="light"] .bg-black\/30,
html[data-mode="light"] .bg-black\/40,
html[data-mode="light"] .bg-black\/50 {
  background-color: rgba(0,0,0,0.04) !important;
}

/* Paleta antiga stone/zinc → mesmas regras */
html[data-mode="light"] .bg-stone-900,
html[data-mode="light"] .bg-stone-800,
html[data-mode="light"] .bg-zinc-900,
html[data-mode="light"] .bg-zinc-800 {
  background-color: var(--color-card) !important;
}

/* Cards dentro de cards (elevação) */
html[data-mode="light"] .bg-brutal-card-elevated,
html[data-mode="light"] .bg-beauty-elevated {
  background-color: var(--color-card-elevated) !important;
}

/* Hover states */
html[data-mode="light"] .hover\:bg-black\/5:hover,
html[data-mode="light"] .hover\:bg-neutral-900:hover,
html[data-mode="light"] .hover\:bg-stone-900:hover {
  background-color: var(--color-card-hover) !important;
}

/* Divisores */
html[data-mode="light"] .border-black\/10,
html[data-mode="light"] .border-stone-800,
html[data-mode="light"] .border-zinc-800 {
  border-color: var(--color-divider) !important;
}

/* Texto sobre superfícies escuras vira escuro */
html[data-mode="light"] .text-neutral-200,
html[data-mode="light"] .text-stone-200,
html[data-mode="light"] .text-zinc-200 {
  color: var(--color-text) !important;
}
```

---

## 5. Refactors cirúrgicos (não dá pra resolver com bridge)

### 5.1 — Sombras brutalistas hardcoded
**Problema:** `shadow-[8px_8px_0px_0px_#000000]` — não há como sobrescrever via CSS classe.
**Solução:** trocar por classe utilitária `.shadow-brutal` (já consumindo o token).

Adicionar em `index.html`:
```css
.shadow-brutal { box-shadow: var(--shadow-brutal); }
.shadow-brutal-sm { box-shadow: var(--shadow-brutal-sm); }
```

**Arquivos a refatorar (10):**
- `pages/Agenda.tsx:1892`
- `pages/ClientCRM.tsx:560`
- `components/ServiceModal.tsx:231,239,243`
- `components/TeamMemberForm.tsx:149`
- `components/GoalHistory.tsx:45`
- + 4 outros via `grep -rE "shadow-\[.*#000" components pages`

Trocar `shadow-[8px_8px_0px_0px_#000000]` → `shadow-brutal`.
Trocar `shadow-[2px_2px_0px_0px_#000000]` → `shadow-brutal-sm`.

### 5.2 — Hex inline em JSX (recharts/inline style)
| Arquivo | Linha | De | Para |
|---|---|---|---|
| `components/CommissionShareModal.tsx` | 100 | `backgroundColor: '#171717'` | `backgroundColor: 'var(--color-card)'` |
| `components/FinanceInsights.tsx` | 326 | `background: '#171717'` (Recharts tooltip) | `background: 'var(--color-card)'`, `border: '1px solid var(--color-divider)'` |
| `components/dashboard/DashboardHero.tsx` | 45 | `border-[#121212]` | `border-[color:var(--color-bg)]` (sintaxe Tailwind arbitrary) |

### 5.3 — Gradientes escuros hardcoded
Auditar 15 ocorrências (`grep -rE "from-(black\|neutral-9\|stone-9\|zinc-9)"`). Onde o gradiente é decorativo (hero, cards), trocar `from-black` → `from-[color:var(--color-bg)]` ou condicionar ao mode via `dark:` prefix se Tailwind dark mode estiver configurado — caso contrário, usar duas variantes via `data-mode` no CSS.

> Decisão de implementação: NÃO adicionar `darkMode: 'class'` no Tailwind agora — vai bagunçar o sistema atual baseado em `data-theme`. Usar arbitrary values com `var()`.

---

## 6. Auditoria visual obrigatória (componentes densos)

Páginas/componentes com >15 ocorrências dark — testar **manualmente em light mode** após bridges:

1. `pages/Agenda.tsx` (23) — calendário, modais de slot, drag/drop
2. `pages/ClientArea.tsx` (20) — fluxo cliente logado
3. `pages/ClientCRM.tsx` (17) — lista + drawer de cliente
4. `pages/Finance.tsx` (14) — gráficos Recharts, tabelas
5. `components/CommissionsManagement.tsx` (28)
6. `components/ProfessionalCommissionDetails.tsx` (33)
7. `components/CommissionPaymentHistory.tsx` (17)

Para cada um, verificar:
- [ ] Contraste de texto (WCAG AA: 4.5:1 corpo, 3:1 títulos)
- [ ] Bordas visíveis (não somem em fundo claro)
- [ ] Estados hover/focus/active visíveis
- [ ] Ícones com cor adequada (não ficar dourado-pálido sumindo)
- [ ] Recharts (cores de série, grid, tooltip)
- [ ] Modais (overlay, fechamento, sombra)

---

## 7. Tarefas finais — sequência de execução

```
T-05  Adicionar tokens semânticos novos nos 4 blocos CSS    (15 min)
T-06  Estender bridge CSS (bg-black, neutral-950, stone, zinc, hover, etc)  (30 min)
T-07  Criar utilitárias .shadow-brutal e .shadow-brutal-sm  (5 min)
T-08  Refactor 10 arquivos com shadow-[*#000*] → .shadow-brutal*  (30 min)
T-09  Refactor 3 hexes inline (CommissionShareModal, FinanceInsights, DashboardHero)  (10 min)
T-10  Refactor gradientes escuros decorativos (15 ocorrências)  (45 min)
T-11  Auditoria visual nos 7 componentes densos              (60 min — varredura humana)
T-12  Ajustes pontuais resultantes da auditoria              (variável)
T-13  Verificação WCAG AA dos 4 estados                      (20 min)
T-14  Smoke test PWA (theme-color em mobile real)            (10 min)
```

**Estimativa total:** ~4 horas úteis (sem T-12, que depende dos achados de T-11).

---

## 8. Critérios de aceitação adicionais (complementam spec.md §Critérios)

- [ ] Nenhum `bg-black` chapado visível em qualquer tela autenticada no Light Mode
- [ ] Nenhuma sombra preta dura sobre fundo claro (sombra brutalista usa cor temática translúcida)
- [ ] Recharts tooltips/grids legíveis nos 4 estados
- [ ] Modais (Overlay, ServiceModal, CheckoutModal, AppointmentEditModal, etc.) sem fundo preto chapado em light
- [ ] Inputs/selects com borda visível em light (≥ rgba(0,0,0,0.1))
- [ ] Hover de itens de lista perceptível em light (não invisível)
- [ ] Estados ativos (ex: tab selecionada) com contraste ≥ 3:1
- [ ] Todos os 7 componentes densos passam revisão visual
- [ ] WCAG AA atendido em texto corpo (4.5:1) e títulos (3:1) nos 4 estados
- [ ] Toggle continua respondendo em ≤ 16ms (sem regressão de R-05)

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Bridge CSS ficar gigante e lenta | Manter agrupamento por seletor; usar `:where()` se passar de 200 linhas |
| Refactor de shadow quebrar visual no dark | A nova classe `.shadow-brutal` resolve `var(--shadow-brutal)` que continua `8px 8px 0 0 #000` no dark — visual idêntico |
| Componentes não auditados quebrarem em produção | Habilitar feature flag `?light-preview=1` no toggle por 48h em staging antes de release |
| Recharts não respeita CSS vars dentro de props JS | Trocar para `getComputedStyle(document.documentElement).getPropertyValue('--color-card')` num helper `useThemeColor()` |

---

## 10. O que **não** está neste plano (próximas fases)

- `prefers-color-scheme` automático
- Sincronização entre abas (BroadcastChannel)
- Light Mode nas rotas públicas (`/booking/*`)
- Toggle de modo por componente
- Migração para Tailwind `darkMode: 'class'` (refactor maior, fora do escopo)
