import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubscriptionSettings } from './SubscriptionSettings';
import { ToastProvider } from '../../components/ui/Toast';

const authState = {
  businessName: 'Barbearia Teste',
  region: 'BR' as 'BR' | 'PT',
  userType: 'barber',
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscriptionStatus: 'trial',
    trialDaysRemaining: 10,
    isSubscriptionActive: true,
    isTrial: true,
  }),
}));

vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    isBeauty: false,
    accent: { text: '', bgDim: '' },
    colors: {
      text: '',
      textSecondary: '',
      textMuted: '',
      card: '',
      border: '',
      divider: '',
    },
    radius: { card: '', badge: '', button: '' },
    shadow: { card: '' },
    density: { cardPadding: 'p-4' },
    classes: {
      buttonPrimary: '',
      buttonSecondary: '',
      buttonDanger: '',
      buttonGhost: '',
    },
    status: {
      success: '',
      successBg: '',
      successBorder: '',
      danger: '',
      dangerBg: '',
      dangerBorder: '',
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('SubscriptionSettings — preços do plano AgendiX', () => {
  it('mostra Solo R$ 19,99 e Equipe R$ 28,99 no Brasil', () => {
    authState.region = 'BR';
    render(<SubscriptionSettings />, { wrapper });
    expect(screen.getByText('R$ 19,99')).toBeInTheDocument();
    expect(screen.getByText('R$ 28,99')).toBeInTheDocument();
    expect(screen.queryByText('R$ 34,90')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 59,90')).not.toBeInTheDocument();
  });

  it('mostra Solo € 5,99 e Equipe € 9,99 em Portugal', () => {
    authState.region = 'PT';
    render(<SubscriptionSettings />, { wrapper });
    expect(screen.getByText('€ 5,99')).toBeInTheDocument();
    expect(screen.getByText('€ 9,99')).toBeInTheDocument();
    expect(screen.queryByText('€ 9,90')).not.toBeInTheDocument();
    expect(screen.queryByText('€ 19,90')).not.toBeInTheDocument();
  });
});
