# SPEC: Finance — Aba Insights com Gráficos

**Status:** ready
**Criado:** 2026-04-19
**Prioridade:** média

---

## O que o cliente final vê

Nova aba "Insights" no TabNav do Finance (4ª aba, apenas para owner). Dividida em 4 seções:

**[A] KPI Strip**
3 métricas em linha horizontal compacta: Receita / Despesas / Lucro.
Cada métrica exibe valor formatado + delta `%` vs mês anterior (verde/vermelho).
Não são BrutalCards grandes — são células compactas em strip row.

**[B] Breakdown por Forma de Pagamento**
Lista com 4 métodos: PIX (BR) / MBway (PT) / Dinheiro / Cartão.
Cada linha: ícone + nome + barra horizontal proporcional + valor + % do total.
Barras preenchidas com `accentBg` em opacidade variável.

**[C] Top 5 Serviços por Receita**
`PieChart` donut (recharts) com legenda lateral.
Derivado de `transactions` no cliente — sem query nova.
Cores: 5 tons derivados do accent (gold ou beauty-neon) em opacidades decrescentes.

**[D] Visão Anual**
`BarChart` (recharts) com 12 meses de receita.
Toggle "Mostrar Despesas" → adiciona barra secundária (vermelha/neutra) sobreposta.
Abaixo do gráfico: 3 pills — **Melhor Mês** / **Pior Mês** / **Média Mensal**.

---

## Design System — Intent

**Zero dados novos.** Tudo derivado de props que Finance.tsx já possui:
- `summary` → KPI strip + breakdown pagamento
- `monthlyHistory` → visão anual
- `transactions` → top 5 serviços (via `useMemo`)

**Recharts já importado** em Finance.tsx (`BarChart`, `AreaChart` etc.).
Adicionar apenas `PieChart`, `Pie`, `Cell` ao import existente.

**Cores donut:** barber → `['#d4a843', '#c49333', '#b48323', '#a47313', '#946303']`
beauty → `['#a78bfa', '#9270e5', '#7d55d0', '#683abb', '#531fa6']`

---

## O que muda no sistema

### `pages/Finance.tsx`

1. **Tipo:** `type FinanceTabType = 'overview' | 'history' | 'commissions' | 'insights'`

2. **useEffect** (linha ~104): adicionar case para insights:
```ts
} else if (activeTab === 'insights') {
  if (monthlyHistory.length === 0) fetchMonthlyHistory();
  if (transactions.length === 0) fetchFinanceData();
}
```

3. **Render:** após bloco `activeTab === 'commissions'`, adicionar:
```tsx
{activeTab === 'insights' && !isStaff && (
  <FinanceInsights
    summary={summary}
    monthlyHistory={monthlyHistory}
    transactions={transactions}
    currencyRegion={currencyRegion}
    isBeauty={isBeauty}
    accentBg={accentBg}
    accentText={accentText}
  />
)}
```

4. **Import recharts:** adicionar `PieChart, Pie, Cell` ao import existente.
5. **Import componente:** `import { FinanceInsights } from '../components/FinanceInsights'`

### `components/FinanceInsights.tsx` (CRIAR)

```tsx
interface FinanceInsightsProps {
  summary: {
    revenue: number;
    expenses: number;
    profit: number;
    growth: number;
    previousMonthRevenue: number;
    revenueByMethod: { pix: number; mbway: number; dinheiro: number; cartao: number };
  };
  monthlyHistory: Array<{
    month: string;
    year: number;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  transactions: Array<{
    type: 'revenue' | 'expense';
    serviceName: string;
    amount: number;
  }>;
  currencyRegion: 'BR' | 'PT';
  isBeauty: boolean;
  accentBg: string;
  accentText: string;
}
```

**Derivações internas (useMemo):**

```ts
// Top 5 Serviços
const topServices = useMemo(() => {
  const map: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === 'revenue' && t.serviceName) {
      map[t.serviceName] = (map[t.serviceName] || 0) + t.amount;
    }
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));
}, [transactions]);

// Melhor / Pior / Média
const bestMonth  = monthlyHistory.reduce((a, b) => b.revenue > a.revenue ? b : a, monthlyHistory[0]);
const worstMonth = monthlyHistory.reduce((a, b) => b.revenue < a.revenue ? b : a, monthlyHistory[0]);
const avgRevenue = monthlyHistory.length > 0
  ? monthlyHistory.reduce((s, m) => s + m.revenue, 0) / monthlyHistory.length
  : 0;

// Breakdown pagamento
const totalByMethod = summary.revenueByMethod;
const totalRevenue  = summary.revenue || 1; // evitar divisão por zero
const methods = currencyRegion === 'PT'
  ? [
      { label: 'MBway',    value: totalByMethod.mbway   || 0 },
      { label: 'Dinheiro', value: totalByMethod.dinheiro || 0 },
      { label: 'Cartão',   value: totalByMethod.cartao   || 0 },
    ]
  : [
      { label: 'PIX',      value: totalByMethod.pix      || 0 },
      { label: 'Dinheiro', value: totalByMethod.dinheiro || 0 },
      { label: 'Cartão',   value: totalByMethod.cartao   || 0 },
    ];
```

**Seção [A] KPI Strip — layout:**
```
<div className="grid grid-cols-3 gap-3">
  {/* Receita */}
  <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Receita</p>
    <p className="text-xl font-heading text-white mt-1">{formatCurrency(summary.revenue, currencyRegion)}</p>
    <p className={`text-xs font-mono mt-1 ${summary.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {summary.growth > 0 ? '+' : ''}{summary.growth.toFixed(1)}% vs anterior
    </p>
  </div>
  {/* Despesas */} ...
  {/* Lucro */} ...
</div>
```

**Seção [B] Breakdown Pagamento:**
```
{methods.map(m => {
  const pct = totalRevenue > 0 ? (m.value / totalRevenue) * 100 : 0;
  return (
    <div key={m.label} className="flex items-center gap-3">
      <span className="text-xs font-mono text-neutral-400 w-16">{m.label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full">
        <div className={`h-full rounded-full ${accentBg} opacity-70`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-white w-12 text-right">{formatCurrency(m.value, currencyRegion)}</span>
      <span className="text-[10px] font-mono text-neutral-500 w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
})}
```

**Seção [C] Top 5 — PieChart donut:**
```
const DONUT_COLORS_BARBER  = ['#d4a843', '#c49333', '#b48323', '#a47313', '#946303'];
const DONUT_COLORS_BEAUTY  = ['#a78bfa', '#9270e5', '#7d55d0', '#683abb', '#531fa6'];
const COLORS = isBeauty ? DONUT_COLORS_BEAUTY : DONUT_COLORS_BARBER;

<PieChart width={160} height={160}>
  <Pie data={topServices} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
    {topServices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
  </Pie>
</PieChart>
```
Legenda lateral: lista com quadrado de cor + nome truncado + valor.

**Seção [D] Visão Anual:**
```tsx
const [showExpenses, setShowExpenses] = useState(false);

<BarChart data={monthlyHistory} ...>
  <Bar dataKey="revenue" fill={isBeauty ? '#a78bfa' : '#d4a843'} radius={[4,4,0,0]} />
  {showExpenses && <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} opacity={0.6} />}
</BarChart>
```
Pills abaixo: Melhor Mês / Pior Mês / Média Mensal com `formatCurrency`.

---

## O que NÃO muda

- Queries existentes — zero novas chamadas ao banco
- Abas Visão Geral, Histórico, Comissões — inalteradas
- Dados de `summary` e `monthlyHistory` já buscados por triggers existentes
- Staff não vê a aba (guard no TabNav via `!isStaff`)

---

## Edge cases

| Situação | Comportamento |
|---|---|
| `monthlyHistory` vazio | Seções C e D mostram `<div className="text-center text-neutral-500 text-sm py-8">Sem dados históricos ainda</div>` |
| `transactions` vazio | Seção C mostra empty state "Nenhum serviço registrado este mês" |
| Todos pagamentos = 0 | Barras de breakdown ficam em 0% sem erro (divisão por `totalRevenue \|\| 1`) |
| `topServices` com < 5 itens | Donut renderiza com os itens disponíveis |
| Acessar como staff | Aba não aparece no TabNav — renderização nem ocorre |

---

## Teste E2E

```
1. Finance como owner → ver 4ª aba "Insights"
2. Clicar → KPI strip com Receita / Despesas / Lucro e % delta
3. Breakdown: barras proporcionais, soma de % ≈ 100%
4. Top 5: donut renderiza, legenda com nomes
5. Visão anual: 12 barras, toggle "Mostrar Despesas" adiciona barras vermelhas
6. Pills: Melhor Mês / Pior Mês / Média exibindo valores corretos
7. Finance como staff → aba Insights não aparece no TabNav
8. Mobile 375px: seções empilham, gráficos responsivos
```

---

## Arquivos envolvidos

- `pages/Finance.tsx` — tipo + useEffect + render + imports
- `components/FinanceInsights.tsx` — CRIAR

---

## Done when

- [ ] 4 seções renderizando com dados reais
- [ ] Zero novas queries (apenas props de Finance.tsx)
- [ ] `topServices` derivado via `useMemo` de `transactions`
- [ ] Toggle despesas na Visão Anual funciona
- [ ] Pills Melhor/Pior/Média com valores corretos
- [ ] Staff não vê a aba
- [ ] Empty states para dados insuficientes
- [ ] Testado em mobile Chrome 375px
