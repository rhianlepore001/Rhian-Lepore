import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionDiscount } from '@/hooks/useSubscriptionDiscount';
import { useClientActiveMembership } from '@/hooks/useMemberships';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ companyId: 'company-001' }),
}));

vi.mock('@/hooks/useMemberships', () => ({
  useClientActiveMembership: vi.fn(),
}));

vi.mock('@/services/serviceSettings', () => ({
  fetchServices: vi.fn().mockResolvedValue([]),
}));

const mockedMembership = useClientActiveMembership as unknown as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

function activeMembership(serviceIds: string[], planName = 'Corte Ilimitado') {
  return {
    data: {
      id: 'ms-1',
      status: 'active',
      plan: { id: 'plan-1', name: planName, service_ids: serviceIds },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
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
});
