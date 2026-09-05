import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicClubFlow } from '../../components/membership/PublicClubFlow';
import type { MembershipPlan } from '../../services/memberships';

const plan: MembershipPlan = {
  id: 'plan-1',
  user_id: 'biz-1',
  name: 'Corte Ilimitado',
  description: null,
  price_cents: 9000,
  service_ids: [],
  usage_limit_per_month: 4,
  badge_color: 'gold',
  active: true,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

vi.mock('../../hooks/useMemberships', () => ({
  usePublicMembershipPlans: () => ({
    data: [plan],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePublicPixConfig: () => ({
    data: {
      pix_key_type: 'cpf',
      pix_key_value: '52998224725',
      pix_holder_name: 'Loja',
      pix_merchant_city: 'SAO PAULO',
      mbway_phone: '+351912345678',
      mbway_holder_name: 'Loja PT',
    },
    isLoading: false,
  }),
  useCreatePublicMembershipRequest: () => ({ mutateAsync: vi.fn() }),
  useCreatePublicPixPayment: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

function renderFlow(region: 'BR' | 'PT') {
  return render(
    <MemoryRouter>
      <PublicClubFlow slug="loja" businessId="biz-1" region={region} />
    </MemoryRouter>,
  );
}

describe('PublicClubFlow — método por região', () => {
  it('oferece Pix no Brasil, sem MB WAY', async () => {
    const user = userEvent.setup();
    renderFlow('BR');
    await user.click(screen.getByRole('button', { name: /Quero assinar/i }));
    expect(screen.getByText('Pix agora')).toBeInTheDocument();
    expect(screen.getByText('No balcão')).toBeInTheDocument();
    expect(screen.queryByText('MB WAY')).not.toBeInTheDocument();
    expect(await screen.findByTestId('pix-copy-button')).toBeInTheDocument();
    expect(screen.getByLabelText(/Código Pix copia e cola/i)).toBeInTheDocument();
  });

  it('oferece MB WAY em Portugal, sem Pix', async () => {
    const user = userEvent.setup();
    renderFlow('PT');
    await user.click(screen.getByRole('button', { name: /Quero assinar/i }));
    expect(screen.getByText('MB WAY')).toBeInTheDocument();
    expect(screen.getByText('No balcão')).toBeInTheDocument();
    expect(screen.queryByText('Pix agora')).not.toBeInTheDocument();
  });
});
