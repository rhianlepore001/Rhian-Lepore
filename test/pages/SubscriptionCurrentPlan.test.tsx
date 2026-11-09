import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const invoke = vi.fn(() => new Promise(() => {}));
const sub = { subscriptionStatus: 'active', trialDaysRemaining: 0, isSubscriptionActive: true, isTrial: false };
let currentPlan: 'solo' | 'team' | null = 'solo';
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...(a as [])) } } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ businessName: 'Fictício', region: 'BR', userType: 'barber' }) }));
vi.mock('../../hooks/useSubscription', () => ({ useSubscription: () => sub }));
vi.mock('../../hooks/useCurrentPlan', () => ({ useCurrentPlan: () => currentPlan }));
vi.mock('../../components/SettingsLayout', () => ({ SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../hooks/useBrutalTheme', () => {
  const theme = {
    isBeauty: false,
    classes: { buttonPrimary: 'btn-primary', buttonSecondary: '', buttonDanger: '', buttonGhost: 'btn-ghost', buttonSuccess: '', buttonOutline: '', card: '' },
    colors: { text: '', textSecondary: '', textMuted: '', card: '', border: '' },
    accent: { bgDim: '', text: '' },
    radius: { card: '', badge: '', button: '' },
    density: { card: '', cardPadding: '' },
    shadow: { card: '' },
    status: { successBg: '', success: '', successBorder: '', dangerBg: '', danger: '', dangerBorder: '' },
  };
  return { useBrutalTheme: () => theme };
});

import { SubscriptionSettings } from '../../pages/settings/SubscriptionSettings';

describe('Plano AgendiX: destaque do plano atual', () => {
  beforeEach(() => { invoke.mockClear(); sub.subscriptionStatus = 'active'; sub.isTrial = false; currentPlan = 'solo'; });

  it('com assinatura ativa no Solo: cartão Solo marcado e sem checkout; Equipe oferece a troca', () => {
    render(<SubscriptionSettings />);
    const soloCard = screen.getByRole('region', { name: 'Plano Solo' });
    const teamCard = screen.getByRole('region', { name: 'Plano Equipe' });
    expect(within(soloCard).getByText('Seu plano atual', { selector: '[data-current-plan-badge]' })).toBeVisible();
    expect(soloCard).toHaveAttribute('aria-current', 'true');
    expect(teamCard).not.toHaveAttribute('aria-current');
    const soloBtn = within(soloCard).getByRole('button', { name: 'Seu plano atual' });
    expect(soloBtn).toBeDisabled();
    fireEvent.click(soloBtn);
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Alterar Plano' })).toBeNull();
    fireEvent.click(within(teamCard).getByRole('button', { name: 'Mudar para Equipe' }));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('em trial sem assinatura nada muda', () => {
    sub.subscriptionStatus = 'trial'; sub.isTrial = true; currentPlan = null;
    render(<SubscriptionSettings />);
    expect(screen.getAllByRole('button', { name: 'Começar Assinatura' })).toHaveLength(2);
    expect(screen.queryByText('Seu plano atual')).toBeNull();
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
  });
});
