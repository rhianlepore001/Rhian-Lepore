import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const invoke = vi.fn();
const auth = { businessName: 'Negócio fictício', region: 'BR' as 'BR' | 'PT' };
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useCurrentPlan', () => ({ useCurrentPlan: () => null }));
vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ subscriptionStatus: 'trial', trialDaysRemaining: 5, isSubscriptionActive: true, isTrial: true }),
}));
vi.mock('../../components/SettingsLayout', () => ({ SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    isBeauty: false,
    colors: { text: '', textSecondary: '', textMuted: '', card: '', border: '' },
    accent: { bgDim: '', text: '' },
    radius: { card: '', badge: '' },
    status: { successBg: '', success: '', successBorder: '', dangerBg: '', danger: '', dangerBorder: '' },
  }),
}));

import { SubscriptionSettings } from '../../pages/settings/SubscriptionSettings';

describe('SubscriptionSettings → create-checkout-session', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: null, error: null });
  });

  it.each([
    ['BR', 'BRL'],
    ['PT', 'EUR'],
  ] as const)('região %s envia só planId + %s; o preço Stripe vem dos secrets do servidor', async (region, currency) => {
    auth.region = region;
    render(<SubscriptionSettings />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Começar Assinatura' })[1]);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe('create-checkout-session');
    expect(opts.body.planId).toBe('team');
    expect(opts.body.currency).toBe(currency);
    expect(opts.body.mode).toBe('subscription');
    // Nenhum Price ID do front: os VITE_STRIPE_PRICE_* da Vercel são de outra conta Stripe
    // e o EUR nem é lido (env com sufixo _EU), então mandar priceId só confunde.
    expect(opts.body).not.toHaveProperty('priceId');
  });
});
