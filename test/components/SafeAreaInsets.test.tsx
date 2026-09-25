/**
 * Regressão iOS PWA (standalone): chrome fixo precisa respeitar as safe areas.
 * index.html usa viewport-fit=cover + status-bar-style=black-translucent, então o
 * app desenha sob a status bar/home indicator — header e bottom nav devem somar
 * --safe-top / --safe-bottom (env(safe-area-inset-*), 0 em Android/desktop).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', role: 'owner' }),
}));
const subscription = { isTrial: false, isExpired: false };
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => subscription,
}));
// Filhos pesados do Layout (dependem de Supabase/contextos) não importam aqui.
vi.mock('@/components/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('@/components/Header', () => ({ Header: () => <header data-testid="header" /> }));
vi.mock('@/components/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('@/components/PaywallModal', () => ({ PaywallModal: () => null }));
vi.mock('@/components/BrutalBackground', () => ({ BrutalBackground: () => null }));

import { BottomMobileNav } from '@/components/BottomMobileNav';
import { Layout } from '@/components/Layout';
import { Modal } from '@/components/ui/Modal';

describe('iOS safe areas (PWA instalado)', () => {
  it('index.html mantém viewport-fit=cover e define --safe-top/--safe-bottom via env()', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    expect(html).toMatch(/viewport-fit=cover/);
    expect(html).toMatch(/--safe-top:\s*env\(safe-area-inset-top,\s*0px\)/);
    expect(html).toMatch(/--safe-bottom:\s*env\(safe-area-inset-bottom,\s*0px\)/);
  });

  it('bottom nav cresce com o home indicator (altura + padding somam --safe-bottom)', () => {
    render(
      <MemoryRouter initialEntries={['/agenda']}>
        <BottomMobileNav />
      </MemoryRouter>
    );
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.className).toContain('h-[calc(64px+var(--safe-bottom))]');
    expect(nav.className).toContain('pb-[calc(0.35rem+var(--safe-bottom))]');
    // Altura fixa sem safe area era a causa do corte dos labels no iPhone.
    expect(nav.className).not.toMatch(/(^|\s)h-\[64px\](\s|$)/);
  });

  it('Layout desloca header (--header-top) e conteúdo pela status bar e reserva o home indicator', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/agenda']}>
        <Layout>
          <div>conteúdo</div>
        </Layout>
      </MemoryRouter>
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--header-top')).toBe('var(--safe-top)');
    const main = container.querySelector('main') as HTMLElement;
    expect(main.className).toContain('pt-[calc(var(--safe-top)+3.5rem)]');
    expect(main.className).toContain('pb-[calc(6rem+var(--safe-bottom))]');
  });

  it('com banner de trial, header e conteúdo somam status bar + 40px do banner', () => {
    subscription.isTrial = true;
    try {
      const { container } = render(
        <MemoryRouter initialEntries={['/agenda']}>
          <Layout>
            <div>conteúdo</div>
          </Layout>
        </MemoryRouter>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.style.getPropertyValue('--header-top')).toBe('calc(var(--safe-top) + 40px)');
      const main = container.querySelector('main') as HTMLElement;
      expect(main.className).toContain('pt-[calc(var(--safe-top)+96px)]');
      expect(main.className).toContain('md:pt-[calc(var(--safe-top)+120px)]');
    } finally {
      subscription.isTrial = false;
    }
  });

  it('Modal: bottom sheet reserva o home indicator e full-screen reserva ambos', () => {
    const { unmount } = render(
      <Modal open onClose={() => {}} title="Sheet">
        <div>x</div>
      </Modal>
    );
    expect(screen.getByRole('dialog').className).toContain('max-md:pb-[var(--safe-bottom)]');
    unmount();

    render(
      <Modal open onClose={() => {}} title="Full" size="full">
        <div>x</div>
      </Modal>
    );
    const full = screen.getByRole('dialog').className;
    expect(full).toContain('pt-[var(--safe-top)]');
    expect(full).toContain('pb-[var(--safe-bottom)]');
  });
});
