import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ClubOwnerNav } from '../../components/membership/ClubOwnerNav';

const auth = { region: 'BR' as 'BR' | 'PT' };

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

function renderNav(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<ClubOwnerNav />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ClubOwnerNav', () => {
  beforeEach(() => {
    auth.region = 'BR';
  });

  it('mostra Planos, Pix e Assinantes', () => {
    renderNav('/configuracoes/clube');
    expect(screen.getByRole('navigation', { name: 'Seções do clube' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planos' })).toHaveAttribute('href', '/configuracoes/clube');
    expect(screen.getByRole('link', { name: 'Pix' })).toHaveAttribute('href', '/configuracoes/clube/pix');
    expect(screen.getByRole('link', { name: 'Assinantes' })).toHaveAttribute('href', '/clube/assinantes');
  });

  it('marca Pix como página atual em /configuracoes/clube/pix', () => {
    renderNav('/configuracoes/clube/pix');
    expect(screen.getByRole('link', { name: 'Pix' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Planos' })).not.toHaveAttribute('aria-current');
  });

  it('mostra MB WAY no lugar de Pix quando a conta é Portugal', () => {
    auth.region = 'PT';
    renderNav('/configuracoes/clube');
    expect(screen.getByRole('link', { name: 'MB WAY' })).toHaveAttribute('href', '/configuracoes/clube/pix');
    expect(screen.queryByRole('link', { name: 'Pix' })).not.toBeInTheDocument();
  });
});
