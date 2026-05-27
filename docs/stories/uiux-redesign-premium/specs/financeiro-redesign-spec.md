# Spec: Financeiro Redesign

## Objetivo

Elevar o módulo Financeiro de nota 5/10 para 9/10. Transformar tabelas genéricas em visualizações de dados ricas, adicionar KPIs com indicadores de tendência, gráficos de barras/linhas/pizza e uma experiência mobile em cards premium.

---

## Scope

### In
- `pages/Finance.tsx` — layout, tabs, resumo, tabela, modais.
- `components/CommissionsManagement.tsx` — gestão de comissões.
- `components/FinanceInsights.tsx` — insights e análises.
- `components/MonthlyHistory.tsx` — histórico mensal.
- `components/TabNav.tsx` — navegação por abas (ajustar estilo).

### Out
- Backend RPCs (`get_finance_stats`, `get_monthly_finance_history`, etc.).
- Lógica de cálculo de comissões.

---

## Technical Approach

1. **KPI Cards com Tendência**
   - Criar `FinanceKpiCard`: título, valor principal, comparação vs mês anterior, seta de tendência (↑/↓) e cor semântica.
   - Usar tokens do Design System para cores (verde/vermelho/amarelo).
   - Cards em grid responsivo: 1 coluna mobile, 2–4 colunas desktop.

2. **Gráficos Refinados**
   - Área chart de receita vs despesa: gradientes suaves, linhas arredondadas, tooltip premium.
   - Adicionar pie chart de métodos de pagamento (Pix, Cartão, Dinheiro, MBWay) quando houver dados.
   - Recharts já está no projeto; manter configuração atual e ajustar cores aos tokens.

3. **Tabela Desktop Premium**
   - Zebra-striping com `bg-white/[0.02]` e `bg-white/[0.04]` alternados.
   - Hover state em cada linha (`hover:bg-white/[0.06]`).
   - Header com fonte `font-mono uppercase tracking-wider`.
   - Badges de tipo (Receita/Despesa) e status (Pago/Pendente) usando tokens do Design System.

4. **Mobile: Cards de Transação**
   - Em mobile, substituir tabela por cards verticais com:
     - Valor em destaque (cor semântica).
     - Data/hora, descrição, profissional, cliente.
     - Ações (Liquidar, Excluir) em botões icon+texto.
   - Swipe-friendly: manter botões visíveis (não esconder atrás de swipe para evitar descoberta ruim).

5. **Redução de Ruído**
   - Remover botões "AJUDA" genéricos. Manter `InfoButton` apenas em métricas complexas (ex: Lucro Líquido, Margem).
   - Consolidar ações de filtro e exportar em um dropdown compacto.

---

## Component List

| Componente | Descrição |
|------------|-----------|
| `FinanceKpiCard` | Card com valor, comparação e seta de tendência |
| `TrendIndicator` | Componente reutilizável (↑/↓ + %) |
| `ZebraTable` | Tabela desktop com zebra-striping e hover |
| `TransactionCardMobile` | Card premium de transação para mobile |
| `PaymentMethodPie` | Gráfico de pizza de métodos de pagamento |

---

## Data Requirements

- `finance_records` (via RPC `get_finance_stats`).
- `team_members` (para nome do profissional).
- `appointments` (para receitas vinculadas).
- Nenhuma mudança no schema.

---

## Acceptance Criteria

- [ ] KPIs exibem tendência correta vs mês anterior.
- [ ] Gráficos renderizam em mobile e desktop sem overflow.
- [ ] Tabela desktop com zebra-striping e hover states.
- [ ] Mobile exibe cards de transação completos (sem perda de dados).
- [ ] Testes existentes (`FinancialSettings.test.tsx`) passam.
- [ ] `npm run typecheck` e `npm run lint` limpos.
- [ ] Dark/Light ok para ambos os temas.

---

## Estimativa

**Tamanho:** L (1 sprint)  
**Justificativa:** Muitos estados, gráficos complexos e necessidade de manter dual view (tabela vs cards). Risco de regressão em cálculos financeiros.
