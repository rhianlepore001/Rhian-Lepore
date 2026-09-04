import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgendaStatusLegend } from '../../components/agenda/AgendaStatusLegend';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

describe('AgendaStatusLegend', () => {
  it('mostra estados e ações numa barra única', () => {
    render(<AgendaStatusLegend />);
    const bar = screen.getByTestId('agenda-status-legend');
    expect(bar.tagName).toBe('FOOTER');
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('A confirmar')).toBeInTheDocument();
    expect(screen.getByText('Com observação')).toBeInTheDocument();
    expect(screen.getByText('Editado')).toBeInTheDocument();
  });

  it('mostra hint de dia vazio quando pedido', () => {
    render(<AgendaStatusLegend emptyHint />);
    expect(screen.getByText(/Nenhum agendamento neste dia/)).toBeInTheDocument();
  });
});
