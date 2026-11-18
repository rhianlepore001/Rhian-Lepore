import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Clients } from '../../pages/Clients';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'company-1' },
    companyId: 'company-1',
    role: 'owner',
    region: 'BR',
    userType: 'beauty',
    isAuthenticated: true,
  }),
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            order: () => ({
              overrideTypes: async () => ({
                data: [
                  {
                    id: 'c1',
                    user_id: 'company-1',
                    name: 'Fernanda Carvalho',
                    phone: '11900000001',
                    email: null,
                    photo_url: null,
                    birth_date: null,
                    notes: null,
                    is_active: true,
                    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('../../services/crm', async () => {
  const actual = await vi.importActual<typeof import('../../services/crm')>('../../services/crm');
  return {
    ...actual,
    syncPublicClientsToCrm: vi.fn().mockResolvedValue(undefined),
    fetchClientAppointmentStats: vi.fn().mockResolvedValue([
      {
        client_id: 'c1',
        appointment_time: new Date(Date.now() - 52 * 86400000).toISOString(),
        price: 220,
      },
      {
        client_id: 'c1',
        appointment_time: new Date(Date.now() - 75 * 86400000).toISOString(),
        price: 220,
      },
    ]),
  };
});

describe('Clients — layout de nome longo e selos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe nome longo sem truncamento e mantém VIP e Inativo alinhados na mesma linha', async () => {
    render(
      <MemoryRouter>
        <Clients />
      </MemoryRouter>,
    );

    const heading = await screen.findByRole('heading', { name: 'Fernanda Carvalho' });
    expect(heading.className).not.toContain('truncate');
    expect(heading.className).toContain('break-words');

    const rowScope = within(heading.parentElement!);
    await waitFor(() => {
      const vipBadge = rowScope.getByText('VIP');
      const inactiveBadge = rowScope.getByText('Inativo');
      expect(vipBadge.parentElement).toBe(inactiveBadge.parentElement);
      expect(vipBadge.parentElement?.className).toContain('flex-nowrap');
      expect(vipBadge.className).toContain('whitespace-nowrap');
      expect(inactiveBadge.className).toContain('whitespace-nowrap');
    });
  });
});
