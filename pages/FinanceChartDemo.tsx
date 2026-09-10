import React from 'react';
import { FinanceCashflowChart } from '../components/finance/FinanceCashflowChart';
import { Card } from '../components/ui/Card';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

/** Preview público: mês esparso (pico isolado) — o caso real de uma barbearia. */
const SPIKE_DATA = Array.from({ length: 31 }, (_, i) => {
  const day = String(i + 1).padStart(2, '0');
  if (i === 2) return { name: day, receita: 520, despesas: 180 };
  if (i === 9) return { name: day, receita: 90, despesas: 40 };
  if (i === 22) return { name: day, receita: 360, despesas: 0 };
  return { name: day, receita: 0, despesas: 0 };
});

export const FinanceChartDemo: React.FC = () => {
  const { colors, accent } = useBrutalTheme();

  return (
    <div className="min-h-screen bg-theme-bg p-4 md:p-8" data-testid="finance-chart-demo">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <p className={`text-xs font-mono uppercase tracking-widest ${accent.text}`}>
            Preview · Finance Cashflow
          </p>
          <h1 className={`font-heading text-2xl font-bold ${colors.text}`}>
            Entradas e saídas
          </h1>
          <p className={`mt-1 text-sm ${colors.textSecondary}`}>
            Barras agrupadas — lê o mês esparso sem interpolar picos fantasmas.
          </p>
        </div>
        <Card
          title="Entradas e saídas"
          action={<span className={`text-xs font-medium ${colors.textMuted}`}>Setembro 2026</span>}
          style={{ overflow: 'visible' }}
        >
          <FinanceCashflowChart
            data={SPIKE_DATA}
            currencyRegion="PT"
            height={240}
            periodLabel="Setembro 2026"
          />
        </Card>
      </div>
    </div>
  );
};
