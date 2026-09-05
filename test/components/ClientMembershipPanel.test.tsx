import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientMembershipPanel } from '../../components/membership/ClientMembershipPanel';
import type { PublicClientMembership } from '../../services/memberships';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

vi.mock('../../hooks/useMemberships', () => ({
  usePublicPixConfig: () => ({ data: null, isLoading: false }),
}));

const base: PublicClientMembership = {
  membership_id: 'ms-1',
  stored_status: 'active',
  effective_status: 'active',
  plan_id: 'plan-1',
  plan_name: 'Corte Ilimitado',
  plan_description: 'Cortes no mês',
  price_cents: 9000,
  badge_color: 'gold',
  service_ids: ['s1'],
  service_names: ['Corte Masculino'],
  usage_limit_per_month: 4,
  usage_this_period: 1,
  starts_at: '2026-09-01T00:00:00.000Z',
  current_period_start: '2026-09-01T00:00:00.000Z',
  current_period_end: '2026-10-01T00:00:00.000Z',
  next_billing_at: '2026-10-01T00:00:00.000Z',
  last_paid_at: '2026-09-01T00:00:00.000Z',
  payment_method: 'pix',
};

function renderPanel(membership: PublicClientMembership | null) {
  return render(
    <MemoryRouter>
      <ClientMembershipPanel
        membership={membership}
        slug="barbearia-silva"
        isBeauty={false}
        region="BR"
        businessPhone="11988887777"
        businessName="Barbearia Silva"
        clientName="João Silva"
      />
    </MemoryRouter>
  );
}

describe('ClientMembershipPanel', () => {
  it('mostra validade, incluso e usos quando ativo', () => {
    renderPanel(base);
    expect(screen.getByTestId('club-validity').textContent).toMatch(/Válido até/i);
    expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
    expect(screen.getByTestId('club-usage').textContent).toMatch(/1 de 4 usos/);
    expect(screen.getByRole('link', { name: /Agendar com o plano/i })).toHaveAttribute(
      'href',
      '/book/barbearia-silva'
    );
  });

  it('mostra empty state com CTA para assinar', () => {
    renderPanel(null);
    expect(screen.getByTestId('club-panel-empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver planos do clube/i })).toHaveAttribute(
      'href',
      '/clube/barbearia-silva'
    );
  });

  it('oferece WhatsApp quando atrasado', () => {
    renderPanel({ ...base, effective_status: 'overdue', stored_status: 'active' });
    expect(screen.getByRole('link', { name: /Falar para renovar/i })).toBeInTheDocument();
    expect(screen.getByText(/Atrasado/i)).toBeInTheDocument();
  });

  it('explica pending como pagamento, sem usos do plano', () => {
    renderPanel({ ...base, effective_status: 'pending', stored_status: 'pending', last_paid_at: null });
    expect(screen.getByTestId('club-validity').textContent).toMatch(/Pagamento pendente/i);
    expect(screen.queryByTestId('club-usage')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Agendar com o plano/i })).not.toBeInTheDocument();
  });
});
