import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import { Finance } from '@/pages/Finance';

const AUTH = {
  user: { id: 'owner-1' },
  role: 'owner' as 'owner' | 'staff',
  region: 'BR',
  userType: 'barber',
  companyId: 'owner-1',
  teamMemberId: 'pro-1',
  isAuthenticated: true,
  loading: false,
};

const deleteMutate = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => AUTH,
}));

vi.mock('@/hooks/useFinance', () => ({
  useMonthlyHistory: () => ({ data: [], refetch: vi.fn() }),
  useFinanceDropdowns: () => ({ data: { services: [], clients: [], professionals: [] } }),
  useDeleteFinanceTransaction: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useMarkExpenseAsPaid: () => ({ mutateAsync: vi.fn() }),
  useCreateFinanceRecord: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/services/finance', async (orig) => {
  const actual = await orig<typeof import('../../services/finance')>();
  return {
    ...actual,
    fetchFinanceStats: vi.fn(),
  };
});

vi.mock('@/services/queue', () => ({
  fetchQueueCompletedCount: vi.fn().mockResolvedValue(0),
}));

vi.mock('@/components/HelpButtons', () => ({ AIAssistantButton: () => null }));
vi.mock('@/components/CommissionsManagement', () => ({ CommissionsManagement: () => null }));
vi.mock('@/components/finance/FinanceCashflowChart', () => ({ FinanceCashflowChart: () => null }));
vi.mock('@/components/MonthlyHistory', () => ({ MonthlyHistory: () => null }));
vi.mock('@/hooks/useTenantLocale', () => ({
  useTenantLocale: () => ({ region: 'BR', currencyRegion: 'BR', currencySymbol: 'R$' }),
}));

import { fetchFinanceStats } from '@/services/finance';

const nowIso = '2026-10-04T14:00:00.000Z';

function stats(transactions: unknown[]) {
  return {
    revenue: 80,
    expenses: 0,
    commissions_pending: 0,
    profit: 80,
    revenue_by_method: { pix: 80, mbway: 0, dinheiro: 0, cartao: 0 },
    pendingExpenses: 0,
    transactions,
  };
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/financeiro']}>
      <ToastProvider>
        <Finance />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Finance — exclusão', () => {
  beforeEach(() => {
    AUTH.role = 'owner';
    AUTH.user = { id: 'owner-1' };
    deleteMutate.mockReset().mockResolvedValue({ ok: true, kind: 'manual' });
    vi.mocked(fetchFinanceStats).mockReset();
    vi.mocked(fetchFinanceStats).mockResolvedValue(stats([
      {
        id: 'apt-1',
        created_at: nowIso,
        barber_name: 'Ana',
        professional_id: 'pro-1',
        client_name: 'Maria Silva',
        service_name: 'Corte',
        description: null,
        amount: 80,
        expense: 0,
        type: 'revenue',
        commission_paid: true,
        payment_method: 'pix',
        status: 'paid',
      },
      {
        id: 'fin-prod',
        created_at: nowIso,
        barber_name: 'Ana',
        professional_id: 'pro-1',
        client_name: 'Maria Silva',
        service_name: 'Pomada',
        description: 'Venda de produto: Pomada',
        amount: 40,
        expense: 0,
        type: 'revenue',
        commission_paid: false,
        payment_method: 'pix',
        status: 'paid',
      },
    ]));
  });

  it('dono vê Excluir e a confirmação do serviço', async () => {
    mount();
    await waitFor(() => expect(screen.getAllByTestId('finance-delete').length).toBeGreaterThan(0));
    expect(screen.getByText('Ações')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('finance-delete')[0]);
    expect(screen.getByTestId('finance-delete-confirm').textContent).toMatch(/remove o atendimento de Maria Silva/);
    expect(screen.getByTestId('finance-delete-confirm').textContent).not.toMatch(/barbearia|salão/i);
  });

  it('confirma só o produto e recarrega a lista sem código técnico no erro', async () => {
    deleteMutate.mockRejectedValueOnce({ code: 'PGRST202', message: 'Could not find the function public.delete_finance_transaction' });
    mount();
    await waitFor(() => expect(screen.getAllByText('Pomada').length).toBeGreaterThan(0));
    const deleteButtons = screen.getAllByTestId('finance-delete');
    fireEvent.click(deleteButtons[1]);
    expect(screen.getByTestId('finance-delete-confirm').textContent).toBe('Só o produto sai. O atendimento continua.');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).not.toMatch(/PGRST|#/);
  });

  it('staff não vê Excluir nem a coluna Ações em Meu Financeiro', async () => {
    AUTH.role = 'staff';
    mount();
    await waitFor(() => expect(screen.getByText('Meu Financeiro')).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText('Corte').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('finance-delete')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
    expect(screen.queryByText('Ações')).toBeNull();
  });
});
