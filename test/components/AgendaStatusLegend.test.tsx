import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgendaStatusLegend } from '../../components/agenda/AgendaStatusLegend';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

describe('AgendaStatusLegend', () => {
  it('mostra estados e ações no fim do fluxo, sem prender a viewport', () => {
    render(<AgendaStatusLegend />);
    const bar = screen.getByTestId('agenda-status-legend');
    expect(bar.tagName).toBe('FOOTER');
    expect(bar.className).not.toMatch(/sticky|fixed|shrink-0/);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('A confirmar')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Não compareceu')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByText('Com observação')).toBeInTheDocument();
    expect(screen.getByText('Editado')).toBeInTheDocument();
  });

  it('mostra hint de dia vazio quando pedido', () => {
    render(<AgendaStatusLegend emptyHint />);
    expect(screen.getByText(/Nenhum agendamento neste dia/)).toBeInTheDocument();
  });
});
