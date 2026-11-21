import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicBusinessHeader } from '../../components/PublicBusinessHeader';

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ mode: 'light', toggleMode: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'beauty', role: 'owner', isAuthenticated: false }),
}));

describe('PublicBusinessHeader — Portfólio', () => {
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
