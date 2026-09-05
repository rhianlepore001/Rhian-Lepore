import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MembershipPlansSettings } from '@/pages/settings/MembershipPlansSettings';
import type { MembershipPlan } from '@/services/memberships';

const plansState = {
  data: [] as MembershipPlan[] | undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock('@/components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useMemberships', () => ({
  useMembershipPlans: () => ({
    data: plansState.data,
    isLoading: plansState.isLoading,
    isError: plansState.isError,
    refetch: plansState.refetch,
  }),
  useUpsertMembershipPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMembershipPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useServiceSettings', () => ({
  useServices: () => ({
    data: [{ id: 's1', name: 'Corte', duration_minutes: 30 }],
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ companyId: 'company-1', userType: 'barber' }),
}));

vi.mock('@/hooks/useBusinessCopy', () => ({
  useBusinessCopy: () => ({
    clubPlanNamePlaceholder: 'Corte ilimitado',
    clubPlanDescriptionPlaceholder: 'Descrição',
    clubPlansSubtitle: 'Defina preço e serviços inclusos.',
  }),
}));

vi.mock('@/hooks/useTenantLocale', () => ({
  useTenantLocale: () => ({ currencySymbol: 'R$' }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const samplePlan: MembershipPlan = {
  id: 'plan-1',
  user_id: 'company-1',
  name: 'Corte ilimitado',
  description: 'Mensal',
  price_cents: 9000,
  service_ids: ['s1'],
  usage_limit_per_month: null,
  badge_color: 'gold',
  active: true,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/configuracoes/clube']}>
      <MembershipPlansSettings />
    </MemoryRouter>,
  );
}

describe('MembershipPlansSettings', () => {
  beforeEach(() => {
    plansState.data = [samplePlan];
    plansState.isLoading = false;
    plansState.isError = false;
    plansState.refetch.mockClear();
  });

  it('lista planos já criados com editar visível', () => {
    renderPage();
    expect(screen.getByTestId('club-plans-list')).toBeInTheDocument();
    expect(screen.getByText('Corte ilimitado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar plano/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre o formulário na página com Voltar, sem modal', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo plano/i }));

    expect(screen.getByTestId('club-plan-form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novo plano' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('club-plans-list')).not.toBeInTheDocument();
  });

  it('volta da edição para a lista', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Editar plano/i }));
    expect(screen.getByRole('heading', { name: 'Editar plano' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('club-plans-list')).toBeInTheDocument();
    expect(screen.queryByTestId('club-plan-form')).not.toBeInTheDocument();
  });

  it('mostra erro em vez de empty state quando a carga falha', () => {
    plansState.data = undefined;
    plansState.isError = true;
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os planos');
    expect(screen.queryByText('Nenhum plano ainda')).not.toBeInTheDocument();
  });
});
