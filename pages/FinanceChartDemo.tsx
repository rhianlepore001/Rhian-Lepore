import React from 'react';
import { FinanceCashflowChart } from '../components/finance/FinanceCashflowChart';
import { Card } from '../components/ui/Card';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { bucketDaysByWeeks, type DayBucket } from '../utils/financeCashflow';

const SPIKE_DAYS: DayBucket[] = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  if (i === 2) return { key: String(day).padStart(2, '0'), label: String(day), day, receita: 520, despesas: 180, sobrou: 340 };
  if (i === 9) return { key: String(day).padStart(2, '0'), label: String(day), day, receita: 90, despesas: 40, sobrou: 50 };
  if (i === 22) return { key: String(day).padStart(2, '0'), label: String(day), day, receita: 360, despesas: 0, sobrou: 360 };
  return { key: String(day).padStart(2, '0'), label: String(day), day, receita: 0, despesas: 0, sobrou: 0 };
});

export const FinanceChartDemo: React.FC = () => {
  const { colors, accent } = useBrutalTheme();
  const weeks = bucketDaysByWeeks(SPIKE_DAYS, 2026, 8);
  const totals = SPIKE_DAYS.reduce(
    (acc, d) => {
      acc.receita += d.receita;
      acc.despesas += d.despesas;
      acc.sobrou = acc.receita - acc.despesas;
      return acc;
    },
    { receita: 0, despesas: 0, sobrou: 0 },
  );

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
            Barras sólidas — lê o mês esparso sem interpolar picos fantasmas.
          </p>
        </div>
        <Card
          title={
            <div>
              <h3 className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>Entradas e saídas</h3>
              <p className={`mt-0.5 text-xs ${colors.textMuted}`}>Setembro 2026</p>
            </div>
          }
          style={{ overflow: 'visible' }}
        >
          <FinanceCashflowChart
            days={SPIKE_DAYS}
            weeks={weeks}
            totals={totals}
            currencyRegion="PT"
            periodLabel="Setembro 2026"
            monthIndex={8}
          />
        </Card>
      </div>
    </div>
  );
};
