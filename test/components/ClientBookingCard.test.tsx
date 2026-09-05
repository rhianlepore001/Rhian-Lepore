import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientBookingCard, type ClientBooking } from '../../components/ClientBookingCard';

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

const booking: ClientBooking = {
  id: 'b1',
  appointment_time: '2026-09-08T10:00:00',
  status: 'pending',
  service_ids: ['s1'],
  service_names: ['Corte Teste Automatizado'],
  professional_id: 'p1',
  professional_name: 'Mario',
  total_price: 50,
  duration_minutes: 30,
  created_at: '2026-09-01T00:00:00.000Z',
};

describe('ClientBookingCard', () => {
  it('mantém ações dentro da grade sem cortar o botão Editar', () => {
    const { container } = render(
      <MemoryRouter>
        <ClientBookingCard
          booking={booking}
          isBeauty
          businessPhone="11999998888"
          businessSlug="barbearia-silva"
          clientName="Zé"
          region="PT"
          onCancelled={vi.fn()}
        />
      </MemoryRouter>,
    );

    const actions = screen.getByRole('button', { name: /Editar/ }).parentElement;
    expect(actions?.className).toMatch(/grid/);
    expect(container.firstChild).toHaveClass('min-w-0');
    expect(screen.getByText(/50,00/)).toBeInTheDocument();
    expect(screen.queryByText(/Cobrar Confirmação/)).toBeNull();
    expect(screen.getByRole('button', { name: /Pedir confirmação/ })).toBeInTheDocument();
  });
});
