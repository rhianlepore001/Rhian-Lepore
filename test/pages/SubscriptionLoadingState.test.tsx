import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const invoke = vi.fn(() => new Promise(() => {})); // fica carregando
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...(a as [])) } } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ businessName: 'Fictício', region: 'BR', userType: 'barber' }) }));
vi.mock('../../hooks/useCurrentPlan', () => ({ useCurrentPlan: () => null }));
vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ subscriptionStatus: 'trial', trialDaysRemaining: 5, isSubscriptionActive: true, isTrial: true }),
}));
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

describe('SubscriptionSettings: estado carregando', () => {
  it('o botão secundário (ghost) mostra spinner + texto visíveis, sem ficar apagado', async () => {
    render(<SubscriptionSettings />);
    // No tema barber o Solo é o recomendado (primary) e o Equipe é o secundário (ghost).
    const [, ghost] = screen.getAllByRole('button', { name: 'Começar Assinatura' });
    expect(ghost.className).toContain('btn-ghost');
    fireEvent.click(ghost);
    await waitFor(() => expect(ghost).toHaveAttribute('aria-busy', 'true'));
    expect(within(ghost).getByText('Abrindo pagamento…')).toBeVisible();
    expect(ghost.querySelector('svg.animate-spin')).not.toBeNull();
    expect(ghost.className).not.toContain('opacity-50');
    // O outro plano fica bloqueado enquanto isso.
    const others = screen.getAllByRole('button', { name: 'Começar Assinatura' });
    expect(others).toHaveLength(1);
    expect(others[0]).toBeDisabled();
    // Um segundo clique não abre outra sessão.
    fireEvent.click(ghost);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
