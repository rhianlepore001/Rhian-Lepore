import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicBookingMemberships } from '../../components/membership/PublicBookingMemberships';
import { usePublicMembershipPlans } from '../../hooks/useMemberships';
import type { MembershipPlan } from '../../services/memberships';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

vi.mock('../../hooks/useMemberships', () => ({
  usePublicMembershipPlans: vi.fn(),
}));

const plans: MembershipPlan[] = [
  {
    id: 'plan-gold',
    user_id: 'biz-1',
    name: 'Corte Ilimitado',
    description: 'Cortes no mês sem limite',
    price_cents: 9000,
    service_ids: ['s1', 's2'],
    usage_limit_per_month: null,
    badge_color: 'gold',
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'plan-bronze',
    user_id: 'biz-1',
    name: 'Barba Mensal',
    description: null,
    price_cents: 5500,
    service_ids: ['s2'],
    usage_limit_per_month: 2,
    badge_color: 'bronze',
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
];

function renderSection() {
  return render(
    <MemoryRouter>
      <PublicBookingMemberships
        businessId="biz-1"
        slug="barbearia-silva"
        region="BR"
        themeOverride="barber"
        services={[
          { id: 's1', name: 'Corte Masculino' },
          { id: 's2', name: 'Barba' },
        ]}
      />
    </MemoryRouter>,
  );
}

describe('PublicBookingMemberships', () => {
  beforeEach(() => {
    vi.mocked(usePublicMembershipPlans).mockReset();
  });

  it('não renderiza enquanto carrega ou sem planos', () => {
    vi.mocked(usePublicMembershipPlans).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usePublicMembershipPlans>);
    const { rerender } = renderSection();
    expect(screen.queryByTestId('booking-memberships')).not.toBeInTheDocument();

    vi.mocked(usePublicMembershipPlans).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof usePublicMembershipPlans>);
    rerender(
      <MemoryRouter>
        <PublicBookingMemberships businessId="biz-1" slug="barbearia-silva" />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('booking-memberships')).not.toBeInTheDocument();
  });

  it('lista as assinaturas abaixo dos serviços com CTA para o clube', () => {
    vi.mocked(usePublicMembershipPlans).mockReturnValue({
      data: plans,
      isLoading: false,
    } as ReturnType<typeof usePublicMembershipPlans>);
    renderSection();

    expect(screen.getByTestId('booking-memberships')).toBeInTheDocument();
    expect(screen.getByTestId('booking-memberships').className).toMatch(/pb-8/);
    expect(screen.getByRole('heading', { name: 'Assinaturas' })).toBeInTheDocument();
    expect(screen.getByText('Corte Ilimitado')).toBeInTheDocument();
    expect(screen.getByText('Barba Mensal')).toBeInTheDocument();
    expect(screen.getByText(/90,00/)).toBeInTheDocument();
    expect(screen.getByText('Ilimitado')).toBeInTheDocument();
    expect(screen.getByText('2 usos/mês')).toBeInTheDocument();
    expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
    expect(screen.getAllByText('Barba').length).toBeGreaterThan(0);

    const links = screen.getAllByRole('link', { name: /Quero assinar/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/clube/barbearia-silva');
  });
});
