import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionSettings } from '@/pages/settings/SubscriptionSettings';
import { AGENDIX_PLAN_COPY, AGENDIX_PLANS } from '@/constants/agendixPlans';
import { ToastProvider } from '@/components/ui';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    businessName: 'Barbearia Silva',
    region: 'BR',
    user: { id: 'user-1' },
    userType: 'barber',
  }),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscriptionStatus: 'trial',
    subscriptionPlan: null,
    trialDaysRemaining: 8,
    isSubscriptionActive: true,
    isTrial: true,
  }),
}));

vi.mock('@/components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('SubscriptionSettings', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'barber');
    document.documentElement.setAttribute('data-mode', 'dark');
  });

  it('mostra copy de decisão Solo e Equipe, sem Stripe na interface', () => {
    render(
      <ToastProvider>
        <SubscriptionSettings />
      </ToastProvider>,
    );

    expect(screen.getByRole('heading', { name: AGENDIX_PLAN_COPY.pageTitle })).toBeInTheDocument();
    expect(screen.getByText(AGENDIX_PLANS.solo.audience)).toBeInTheDocument();
    expect(screen.getByText(AGENDIX_PLANS.equipe.audience)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assinar Solo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assinar Equipe' })).toBeInTheDocument();
    expect(screen.getByText('Quem chega sem hora entra pelo QR, vê a vez e pode pagar no Pix')).toBeInTheDocument();
    expect(screen.getByText('Clube: o cliente paga mensal, você ganha recorrência')).toBeInTheDocument();
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
    expect(screen.getByText(AGENDIX_PLAN_COPY.footer)).toBeInTheDocument();
  });
});
