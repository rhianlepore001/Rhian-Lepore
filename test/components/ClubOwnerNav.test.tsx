import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ClubOwnerNav } from '../../components/membership/ClubOwnerNav';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
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
});
