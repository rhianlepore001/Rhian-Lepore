import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
const sub: any = {};
vi.mock('../../hooks/useSubscription', () => ({ useSubscription: () => sub }));
const auth: any = {};
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useBrutalTheme', () => {
  const any: any = new Proxy({}, { get: () => '' });
  return { useBrutalTheme: () => ({ colors: any, accent: any, classes: any }) };
});

import { TrialStatusCard } from '../../components/TrialStatusCard';

beforeEach(() => {
  navigate.mockReset();
  Object.assign(sub, { isTrial: true, isExpired: false, trialDaysRemaining: 12, isLoading: false });
  Object.assign(auth, { role: 'owner' });
});

describe('TrialStatusCard', () => {
  it('trial: "Período de teste" + dias restantes + Assinar (nunca "Teste grátis")', () => {
    const onNavigate = vi.fn();
    render(<TrialStatusCard onNavigate={onNavigate} />);
    expect(screen.getByTestId('trial-status')).toBeTruthy();
    expect(screen.getByText('Período de teste')).toBeTruthy();
    expect(screen.getByText('12 dias restantes')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/teste grátis/i);
    fireEvent.click(screen.getByRole('button', { name: /Assinar/ }));
    expect(navigate).toHaveBeenCalledWith('/configuracoes/assinatura');
    expect(onNavigate).toHaveBeenCalled();
  });

  it.each([[1, 'Termina amanhã'], [0, 'Termina hoje'], [30, '30 dias restantes']])('%i dia(s) → %s', (d, txt) => {
    sub.trialDaysRemaining = d;
    render(<TrialStatusCard />);
    expect(screen.getByText(txt)).toBeTruthy();
  });

  it('crítico (≤ 2 dias) marca data-tone="warning"', () => {
    sub.trialDaysRemaining = 2;
    render(<TrialStatusCard />);
    expect(screen.getByTestId('trial-status').getAttribute('data-tone')).toBe('warning');
  });

  it('expirado: "Período de teste encerrado" + Ver planos', () => {
    Object.assign(sub, { isTrial: false, isExpired: true });
    render(<TrialStatusCard />);
    expect(screen.getByText('Período de teste encerrado')).toBeTruthy();
    expect(screen.getByTestId('trial-status').getAttribute('data-tone')).toBe('danger');
    fireEvent.click(screen.getByRole('button', { name: /Ver planos/ }));
    expect(navigate).toHaveBeenCalledWith('/configuracoes/assinatura');
  });

  it('não aparece para staff, assinante ativo ou carregando', () => {
    auth.role = 'staff';
    const a = render(<TrialStatusCard />);
    expect(a.container.innerHTML).toBe('');
    a.unmount();
    auth.role = 'owner'; Object.assign(sub, { isTrial: false, isExpired: false });
    const b = render(<TrialStatusCard />);
    expect(b.container.innerHTML).toBe('');
    b.unmount();
    Object.assign(sub, { isTrial: true, isLoading: true });
    const c = render(<TrialStatusCard />);
    expect(c.container.innerHTML).toBe('');
  });
});
