import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ authenticated: false }));
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isAuthenticated: auth.authenticated, loading: false, tutorialCompleted: true, role: 'owner', userType: 'barber', user: null }),
}));
vi.mock('../../contexts/AlertsContext', () => ({ AlertsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="original-layout">{children}</div> }));
vi.mock('../../pages/Dashboard', () => ({ Dashboard: () => <h1>Dashboard original</h1> }));
vi.mock('../../components/DynamicBranding', () => ({ DynamicBranding: () => null }));
vi.mock('../../components/MarketingConsent', () => ({ MarketingConsent: () => null }));
vi.mock('../../components/UpdatePrompt', () => ({ UpdatePrompt: () => null }));
vi.mock('../../components/onboarding/ActivationBanner', () => ({ ActivationBanner: () => null }));
vi.mock('../../components/whatsapp/WhatsAppHandoff', () => ({ WhatsAppHandoffHost: () => null }));
vi.mock('../../components/DevBugButton', () => ({ DevBugButton: () => null }));
import App from '../../App';

beforeEach(() => { window.history.replaceState(null, '', '/#/'); auth.authenticated = false; });
it('mostra a landing na raiz para visitante sem sessão', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Seu talento cuida dos clientes.');
  expect(screen.queryByTestId('original-layout')).toBeNull();
  expect(window.location.hash).toBe('#/');
});
it('preserva Dashboard e Layout na mesma URL para usuário com sessão', async () => {
  auth.authenticated = true;
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Dashboard original' })).toBeVisible();
  expect(screen.getByTestId('original-layout')).toBeVisible();
  expect(window.location.hash).toBe('#/');
});
