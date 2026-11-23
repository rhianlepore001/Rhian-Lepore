import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicBusinessHeader } from '../../components/PublicBusinessHeader';

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ mode: 'light', toggleMode: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'beauty', role: 'owner', isAuthenticated: false }),
}));

describe('PublicBusinessHeader — Portfólio', () => {
  it('abre a capa e a foto de perfil separadamente com os arquivos originais', () => {
    render(<PublicBusinessHeader businessName="Studio Aurora" coverPhotoUrl="/capa.webp" logoUrl="/perfil.webp" />);

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar foto de capa' }));
    const cover = screen.getByRole('dialog', { name: 'Foto de capa' });
    expect(within(cover).getByRole('img')).toHaveAttribute('src', '/capa.webp');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(cover).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar foto de perfil' }));
    const profile = screen.getByRole('dialog', { name: 'Foto de perfil' });
    expect(within(profile).getByRole('img')).toHaveAttribute('src', '/perfil.webp');
    fireEvent.click(within(profile).getByRole('button', { name: 'Fechar' }));
    expect(profile).not.toBeInTheDocument();
  });

  it('remove controles de ampliação quando a foto não carrega e aceita uma nova URL', () => {
    const { rerender } = render(<PublicBusinessHeader businessName="Studio Aurora" coverPhotoUrl="/indisponivel.webp" logoUrl="/perfil.webp" />);
    const cover = screen.getByRole('button', { name: 'Ampliar foto de capa' });
    const profile = screen.getByRole('button', { name: 'Ampliar foto de perfil' });
    fireEvent.error(within(cover).getByRole('presentation'));
    fireEvent.error(within(profile).getByRole('presentation'));
    expect(cover).not.toBeInTheDocument();
    expect(profile).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Studio Aurora' })).toBeVisible();

    rerender(<PublicBusinessHeader businessName="Studio Aurora" coverPhotoUrl="/nova-capa.webp" />);
    expect(screen.getByRole('button', { name: 'Ampliar foto de capa' })).toBeVisible();
  });

  it('renderiza o título Fotos do espaço fora da galeria aberta e sem posicionamento absoluto sobre elas', () => {
    render(
      <MemoryRouter>
        <PublicBusinessHeader
          businessName="Studio Aurora"
          userType="beauty"
          gallery={[
            { id: '1', image_url: '/demo/salao/galeria-01.webp' },
            { id: '2', image_url: '/demo/salao/galeria-02.webp' },
          ]}
        />
      </MemoryRouter>,
    );

    const heading = screen.getByTestId('public-gallery-heading');
    const track = screen.getByTestId('public-gallery-track');

    expect(heading).toHaveTextContent('Fotos do espaço');
    expect(heading.className).not.toContain('absolute');
    expect(track.contains(heading)).toBe(false);
    expect(track.closest('details')).toHaveAttribute('open');
    // O título fica em bloco anterior ao container relativo do carrossel
    expect(heading.parentElement?.nextElementSibling?.contains(track)).toBe(true);
  });
});
