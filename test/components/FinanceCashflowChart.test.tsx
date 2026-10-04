import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FinanceCashflowChart } from '@/components/finance/FinanceCashflowChart';
import { UIProvider } from '@/contexts/UIContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { bucketDaysByWeeks, type DayBucket } from '@/utils/financeCashflow';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function wrap(ui: React.ReactNode) {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <UIProvider>{ui}</UIProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function daysFixture(): DayBucket[] {
  return [
    { key: '01', label: '1', day: 1, receita: 330, despesas: 30, sobrou: 300 },
    { key: '02', label: '2', day: 2, receita: 0, despesas: 0, sobrou: 0 },
    { key: '03', label: '3', day: 3, receita: 1, despesas: 0, sobrou: 1 },
  ];
}

describe('FinanceCashflowChart', () => {
  it('mostra empty state quando não há movimentação', () => {
    const empty: DayBucket[] = [
      { key: '01', label: '1', day: 1, receita: 0, despesas: 0, sobrou: 0 },
    ];
    render(
      wrap(
        <FinanceCashflowChart
          days={empty}
          weeks={bucketDaysByWeeks(empty, 2026, 8)}
          totals={{ receita: 0, despesas: 0, sobrou: 0 }}
          currencyRegion="PT"
          periodLabel="Setembro 2026"
          monthIndex={8}
          variant="week"
        />,
      ),
    );
    expect(screen.getByTestId('finance-cashflow-empty')).toBeInTheDocument();
  });

  it('renderiza barras com width/height válidos e números grandes acima', () => {
    const days = daysFixture();
    render(
      wrap(
        <FinanceCashflowChart
          days={days}
          weeks={bucketDaysByWeeks(days, 2026, 8)}
          totals={{ receita: 331, despesas: 30, sobrou: 301 }}
          currencyRegion="PT"
          periodLabel="Setembro 2026"
          monthIndex={8}
          variant="week"
        />,
      ),
    );
    expect(screen.getByTestId('finance-cashflow-chart')).toBeInTheDocument();
    expect(screen.getByTestId('finance-cashflow-totals')).toBeInTheDocument();
    expect(screen.getByTestId('finance-cashflow-sobrou')).toBeInTheDocument();
    expect(screen.getAllByText('Entradas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Saídas').length).toBeGreaterThan(0);
    const bars = screen.getAllByTestId(/cashflow-bar-/);
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(Number(bar.getAttribute('data-width'))).toBeGreaterThan(0);
      expect(Number(bar.getAttribute('data-height'))).toBeGreaterThanOrEqual(2);
    }
  });

  it('ao tocar uma semana mostra o resumo no tooltip', () => {
    const days = daysFixture();
    render(
      wrap(
        <FinanceCashflowChart
          days={days}
          weeks={bucketDaysByWeeks(days, 2026, 8)}
          totals={{ receita: 331, despesas: 30, sobrou: 301 }}
          currencyRegion="PT"
          periodLabel="Setembro 2026"
          monthIndex={8}
          variant="week"
        />,
      ),
    );
    fireEvent.pointerDown(screen.getByTestId('cashflow-hit-0'));
    const tip = screen.getByTestId('finance-cashflow-tooltip');
    expect(tip.textContent).toMatch(/Entradas/);
    expect(tip.textContent).toMatch(/Saídas/);
    expect(tip.textContent).toMatch(/Sobrou/);
    expect(tip.textContent).toMatch(/set/);
  });
});
