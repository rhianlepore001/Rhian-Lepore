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
vi.mock('../../pages/Login', () => ({ Login: () => <h1>Acesso ao AgendiX</h1> }));
vi.mock('../../components/DynamicBranding', () => ({ DynamicBranding: () => null }));
vi.mock('../../components/MarketingConsent', () => ({ MarketingConsent: () => null }));
vi.mock('../../components/UpdatePrompt', () => ({ UpdatePrompt: () => null }));
vi.mock('../../components/onboarding/ActivationBanner', () => ({ ActivationBanner: () => null }));
vi.mock('../../components/whatsapp/WhatsAppHandoff', () => ({ WhatsAppHandoffHost: () => null }));
vi.mock('../../components/DevBugButton', () => ({ DevBugButton: () => null }));
import App from '../../App';

beforeEach(() => { window.history.replaceState(null, '', '/#/'); auth.authenticated = false; });
it('direciona a raiz para o login quando o visitante não tem sessão', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Acesso ao AgendiX' })).toBeVisible();
  expect(screen.queryByTestId('original-layout')).toBeNull();
  expect(screen.queryByText('Seu talento cuida dos clientes.')).toBeNull();
  expect(window.location.hash).toBe('#/login');
});
it.each([false, true])('mantém a landing separada em /landing, com sessão=%s', async (authenticated) => {
  auth.authenticated = authenticated;
  window.history.replaceState(null, '', '/#/landing');
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Seu talento cuida dos clientes.');
  expect(screen.queryByTestId('original-layout')).toBeNull();
  expect(window.location.hash).toBe('#/landing');
});
it('preserva Dashboard e Layout na mesma URL para usuário com sessão', async () => {
  auth.authenticated = true;
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Dashboard original' })).toBeVisible();
  expect(screen.getByTestId('original-layout')).toBeVisible();
  expect(window.location.hash).toBe('#/');
});
