import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Legal } from '../../pages/Legal';

vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { bg: '', text: '' } }) }));

describe('Política de Privacidade: origem do cadastro', () => {
  it('informa o que guardamos, por quê, o prazo e o consentimento do identificador da Meta, sem termos técnicos', () => {
    render(<MemoryRouter initialEntries={['/privacidade']}><Legal /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Como você chegou até nós/ })).toBeInTheDocument();
    const text = document.body.textContent || '';
    expect(text).toMatch(/primeira visita/);
    expect(text).toMatch(/interesse legítimo/);
    expect(text).toMatch(/apagadas\s+quando sua conta é excluída/);
    expect(text).toMatch(/identificador de clique da Meta só é gravado se você\s+tiver aceitado/);
    expect(text).not.toMatch(/utm|fbclid|localStorage|RPC/i);
  });
});
