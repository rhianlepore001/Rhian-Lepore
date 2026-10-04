# WIP — Fin PR-C: gráfico Entradas e saídas + datas do mês no fuso

**PR:** https://github.com/rhianlepore001/Rhian-Lepore/pull/132 (draft)  
**Branch:** `cursor/fin-c-cashflow-chart-e4e7`  
**HEAD ao gravar este ficheiro:** `f422e7ff` (atualize após novos commits)  
**Escopo:** front-end only, **sem migrations**.

---

## Feito

### Gráfico
- [x] SVG próprio em `components/finance/FinanceCashflowChart.tsx` — recharts **saiu** da rota Financeiro (fica em Dashboard/Relatórios).
- [x] Barras sólidas; cores via `useThemeTokens()` em JS (nunca `var()` em atributos SVG).
- [x] Cantos arredondados só no topo (3 px); 2 px entre entrada e saída; grelha horizontal 3 linhas a 6% opacidade; eixo Y com 3 ticks compactos.
- [x] Mobile `<768`: semanas S1…S5, duas barras lado a lado (largo o suficiente para toque).
- [x] Desktop: dias, barra até 12 px, rótulo a cada 5 dias (+ 1.º e último).
- [x] Valor `> 0` ⇒ altura ≥ 2 px; barra única centrada quando só há entradas ou só saídas.
- [x] Totais grandes acima: Entradas, Saídas, Sobrou (negativo em cor danger com `−`).
- [x] Título «Entradas e saídas» + mês uma vez no card.
- [x] Toque/hover/focus mostra resumo (`1–6 set · Entradas … · Saídas … · Sobrou …`) **abaixo** do SVG (não tapa barras).
- [x] Tabela `sr-only` + `aria-label` com o resumo do mês.
- [x] Altura reservada (~340 px) para CLS; hint fixo quando nenhuma coluna está ativa.
- [x] Memo + layout pré-calculado (sem closure por barra em cada render).
- [x] `prefers-reduced-motion`: sem transition nas barras.

### Datas / dados
- [x] `getZonedMonthRange` → `[start, end)` ISO **com offset** via `resolveBusinessTimezone` + `zonedDateTimeToIso`.
- [x] Filtro client-side no mesmo intervalo (a RPC ainda faz `::TIMESTAMP` sem fuso — ver pendências).
- [x] Mês atual + anterior + fila em `Promise.all` (`useFinanceOverview`, `staleTime` 60s).
- [x] `get_monthly_finance_history` só com a aba Histórico aberta.
- [x] Fila: se `startDate` já tem `T`, usa `[start, end)` em vez de concatenar `T00:00:00`.

### Copy / formatação
- [x] Percentagens com vírgula (`+14,0%`).
- [x] Mês anterior fraco (< ~10% da receita atual **ou** < 5 lançamentos) → «Mês anterior com pouco movimento».
- [x] Dinheiro via `formatCurrency` na Visão geral e no Histórico (PT `331,00 €` / BR `R$ 331,00`).
- [x] Sem tipo de negócio hardcoded no fluxo novo (`getBusinessRemainderNoun` / copy existente; fallback «negócio» já existia).

### Testes / gates (último verde conhecido)
- [x] Unit: buckets (mês a meio da semana; 5 semanas parciais), intervalos Lisboa + São Paulo + DST março, %, Sobrou, layout `height ≥ 2`.
- [x] Chart render: barras com width/height; tooltip da semana.
- [x] `Finance.delete.test.tsx` atualizado para `useFinanceOverview`.
- [x] `npm run typecheck` / `lint` / `build` / `npx vitest run` → **1398/1398**.

### Artefactos
Prints em `/opt/cursor/artifacts/screenshots/fin-c/` (não versionados):
- `overview-390-light.png`, `overview-390-dark.png`, `overview-360-light.png`
- `overview-1440-light.png`, `overview-1440-dark.png`
- `week-tooltip-390-light.png`
- `small-previous-390-light.png`

E2E: `e2e/finance-cashflow.spec.ts` (tenant mockado, project `chromium-legacy`).

---

## Por fazer / riscos

1. **RPC sem fuso (bloqueado neste PR)** — `get_finance_stats` faz `p_start_date::TIMESTAMP` e alarga o fim ao dia civil. Sem migration, o cliente filtra `[start, end)` e agrega o gráfico/KPIs a partir das transações. Totais da RPC (`revenue_by_method`, comissões pendentes) podem vazar 1 dia na borda. Correção de verdade = migration/RPC `timestamptz`.
2. **Perf 4G / 4× CPU / PWA instalada** — não medido em Android real. CLS não medido com Web Vitals; só altura reservada.
3. **Header sticky** — no 390 o título do card («Entradas e saídas» + mês) pode ficar por baixo do header; totais + barras entram. Ajustar offset de scroll ou `scroll-margin-top` no card.
4. **graphify** — CLI não estava no ambiente; `graphify update .` não correu.
5. **Auto-crítica visual ~8,5/10** — no desktop os 3 totais ainda respiram (já há `md:max-w-2xl`); eixo Y usa nice-scale (ex.: 0/125/250 se o máximo é ~220, não força 0/250/500).
6. **`.env.local` dummy** — criado só para o Playwright local; **não commitar**.

---

## Ficheiros-chave

| Ficheiro | Papel |
|---|---|
| `utils/financeCashflow.ts` | intervalos TZ, buckets semana/dia, %, Sobrou, layout de barras |
| `components/finance/FinanceCashflowChart.tsx` | SVG |
| `hooks/useFinance.ts` | `useFinanceOverview` paralelo; history `enabled` |
| `pages/Finance.tsx` | consome overview + TZ |
| `components/MonthlyHistory.tsx` | `formatCurrency` + vírgula no % |
| `services/queue.ts` | intervalo ISO `[start, end)` |
| `test/utils/financeCashflow.test.ts` | TDD |

---

## Como retomar

```bash
git checkout cursor/fin-c-cashflow-chart-e4e7
# 1) scroll-margin no card do gráfico (título visível no 390)
# 2) se houver quota: medir LCP/CLS no e2e com CPU throttling
# 3) NÃO abrir migration neste PR
```
