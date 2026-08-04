import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceCashflowChart } from '@/components/finance/FinanceCashflowChart';
import { UIProvider } from '@/contexts/UIContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

describe('FinanceCashflowChart', () => {
  it('mostra empty state quando não há movimentação', () => {
    render(
      wrap(
        <FinanceCashflowChart
          data={[
            { name: '01', receita: 0, despesas: 0 },
            { name: '02', receita: 0, despesas: 0 },
          ]}
          currencyRegion="PT"
        />,
      ),
    );
    expect(screen.getByTestId('finance-cashflow-empty')).toBeInTheDocument();
  });

  it('renderiza o chart quando há dados', () => {
    render(
      wrap(
        <FinanceCashflowChart
          data={[
            { name: '01', receita: 100, despesas: 20 },
            { name: '02', receita: 0, despesas: 0 },
            { name: '03', receita: 50, despesas: 10 },
          ]}
          currencyRegion="BR"
        />,
      ),
    );
    expect(screen.getByTestId('finance-cashflow-chart')).toBeInTheDocument();
    expect(screen.getByText('Entradas')).toBeInTheDocument();
    expect(screen.getByText('Saídas')).toBeInTheDocument();
  });
});
