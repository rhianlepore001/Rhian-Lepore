import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionDiscount } from '@/hooks/useSubscriptionDiscount';
import { useClientActiveMembership } from '@/hooks/useMemberships';
import { countMembershipUsesThisPeriod } from '@/services/memberships';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ companyId: 'company-001' }),
}));

vi.mock('@/hooks/useMemberships', () => ({
  useClientActiveMembership: vi.fn(),
}));

vi.mock('@/services/memberships', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/memberships')>();
  return {
    ...actual,
    countMembershipUsesThisPeriod: vi.fn().mockResolvedValue(0),
  };
});

vi.mock('@/services/serviceSettings', () => ({
  fetchServices: vi.fn().mockResolvedValue([]),
}));

const mockedMembership = useClientActiveMembership as unknown as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

function activeMembership(serviceIds: string[], planName = 'Corte Ilimitado', usageLimit: number | null = null) {
  return {
    data: {
      id: 'ms-1',
      status: 'active',
      current_period_start: '2026-09-01T00:00:00Z',
      current_period_end: '2026-10-01T00:00:00Z',
      plan: { id: 'plan-1', name: planName, service_ids: serviceIds, usage_limit_per_month: usageLimit },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(countMembershipUsesThisPeriod).mockResolvedValue(0);
});

describe('useSubscriptionDiscount', () => {
  it('sem membership: cobra o subtotal cheio, nada coberto', () => {
    mockedMembership.mockReturnValue({ data: null });

    const { result } = renderHook(
      () => useSubscriptionDiscount({
        clientId: 'client-1',
        services: [{ id: 's1', price: 50 }, { id: 's2', price: 30 }],
      }),
      { wrapper },
    );

    expect(result.current.hasActiveSubscription).toBe(false);
    expect(result.current.subtotalCents).toBe(8000);
    expect(result.current.finalCents).toBe(8000);
    expect(result.current.coveredCents).toBe(0);
    expect(result.current.uncoveredServices).toHaveLength(2);
  });

  it('membership pending (nao ativa) nao aplica desconto', () => {
    mockedMembership.mockReturnValue({
      data: { id: 'ms-1', status: 'pending', plan: { id: 'plan-1', name: 'X', service_ids: ['s1'] } },
    });

    const { result } = renderHook(
      () => useSubscriptionDiscount({
        clientId: 'client-1',
        services: [{ id: 's1', price: 50 }],
      }),
      { wrapper },
    );

    expect(result.current.hasActiveSubscription).toBe(false);
    expect(result.current.finalCents).toBe(5000);
  });

  it('plano que cobre TODOS os servicos: total final zero e fullyCovered', () => {
    mockedMembership.mockReturnValue(activeMembership(['s1', 's2']));

    const { result } = renderHook(
      () => useSubscriptionDiscount({
        clientId: 'client-1',
        services: [{ id: 's1', price: 50 }, { id: 's2', price: 30 }],
      }),
      { wrapper },
    );

    expect(result.current.hasActiveSubscription).toBe(true);
    expect(result.current.fullyCovered).toBe(true);
    expect(result.current.subtotalCents).toBe(8000);
    expect(result.current.coveredCents).toBe(8000);
    expect(result.current.finalCents).toBe(0);
    expect(result.current.coveredServices).toHaveLength(2);
    expect(result.current.message).toContain('Corte Ilimitado');
  });

  it('plano que cobre parte: desconta o coberto, cobra o resto', () => {
    mockedMembership.mockReturnValue(activeMembership(['s1']));

    const { result } = renderHook(
      () => useSubscriptionDiscount({
        clientId: 'client-1',
        services: [{ id: 's1', price: 50 }, { id: 's2', price: 30 }],
      }),
      { wrapper },
    );

    expect(result.current.fullyCovered).toBe(false);
    expect(result.current.coveredCents).toBe(5000);
    expect(result.current.finalCents).toBe(3000);
    expect(result.current.coveredServices).toHaveLength(1);
    expect(result.current.uncoveredServices).toHaveLength(1);
    expect(result.current.message).toContain('cobre 1 de 2');
  });

  it('plano ativo que nao cobre nenhum servico agendado: cobra tudo', () => {
    mockedMembership.mockReturnValue(activeMembership(['outro']));

    const { result } = renderHook(
      () => useSubscriptionDiscount({
        clientId: 'client-1',
        services: [{ id: 's1', price: 50 }],
      }),
      { wrapper },
    );

    expect(result.current.hasActiveSubscription).toBe(true);
    expect(result.current.fullyCovered).toBe(false);
    expect(result.current.coveredCents).toBe(0);
    expect(result.current.finalCents).toBe(5000);
    expect(result.current.message).toContain('não cobre');
  });

  it('teto de usos atingido: cobra o atendimento', async () => {
    vi.mocked(countMembershipUsesThisPeriod).mockResolvedValue(4);
    mockedMembership.mockReturnValue(activeMembership(['s1'], 'Silver', 4));

    const { result } = renderHook(
      () => useSubscriptionDiscount({
        clientId: 'client-1',
        services: [{ id: 's1', price: 50 }],
      }),
      { wrapper },
    );

    await vi.waitFor(() => {
      expect(result.current.fullyCovered).toBe(false);
      expect(result.current.finalCents).toBe(5000);
      expect(result.current.message).toContain('Limite');
    });
  });
});
