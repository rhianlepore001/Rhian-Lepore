import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketingConsent } from '@/components/MarketingConsent';
import { readConsent } from '@/lib/marketingConsent';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));
vi.mock('@/lib/metaTracking', () => ({
  isMetaRoute: (path: string) => ['/login', '/register'].includes(path),
  setMetaScope: vi.fn(),
  metaTracker: { pageView: vi.fn(), lead: vi.fn() },
}));

describe('MarketingConsent', () => {
  beforeEach(() => localStorage.clear());
  it('offers equal accept/refuse controls, persists refusal and allows changing it', () => {
    render(<MemoryRouter initialEntries={['/login']}><MarketingConsent /></MemoryRouter>);
    expect(screen.getByRole('region', { name: 'Sua escolha sobre cookies' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(readConsent()).toBe('rejected');
    fireEvent.click(screen.getByRole('button', { name: 'Preferências de cookies' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(readConsent()).toBe('accepted');
  });
  it('is available on the privacy page without enabling page tracking there', () => {
    render(<MemoryRouter initialEntries={['/privacidade']}><MarketingConsent /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  });
});
