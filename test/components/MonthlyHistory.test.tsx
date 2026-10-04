import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MonthlyHistory } from '../../components/MonthlyHistory';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

const data = [
  { month: 'Outubro', year: 2026, revenue: 1250, expenses: 400, profit: 850, growth: 7.8 },
  { month: 'Setembro', year: 2026, revenue: 1160, expenses: 380, profit: 780, growth: 8.4 },
  { month: 'Agosto', year: 2026, revenue: 1070, expenses: 360, profit: 710, growth: 0 },
];

describe('MonthlyHistory (PR-F #11)', () => {
  it('três números no mesmo cartão da Visão geral (FinanceKpi), rótulos em caixa normal', () => {
    render(<MonthlyHistory data={data} currencyRegion="PT" />);
    const kpis = within(screen.getByTestId('history-kpis')).getAllByTestId('finance-kpi');
    expect(kpis).toHaveLength(3);
    expect(kpis.map((k) => k.querySelector('[data-kpi-label]')?.textContent)).toEqual([
      'Melhor mês', 'Crescimento médio', 'Receita em 3 meses',
    ]);
    expect(kpis[0]).toHaveTextContent('Lucro em Outubro 2026');
    expect(kpis[2]).toHaveTextContent('Agosto 2026 – Outubro 2026');
  });

  it('sem blocos coloridos: nenhum fundo success/danger/info nos números (só o ícone igual à Visão geral) e nas linhas', () => {
    const { container } = render(<MonthlyHistory data={data} currencyRegion="PT" />);
    expect(container.innerHTML).not.toMatch(/(success|danger|info)-bg|bg-\[var\(--color-(success|danger)\)\]/);
    expect(container.innerHTML).not.toMatch(/uppercase/);
    expect(screen.getAllByTestId('history-month').length).toBe(6); // lista (celular) + tabela (computador)
  });

  it('estado vazio em português', () => {
    render(<MonthlyHistory data={[]} currencyRegion="PT" />);
    expect(screen.getByText('Ainda sem histórico')).toBeInTheDocument();
  });
});
