import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaPublicBookings } from '../../components/agenda/AgendaPublicBookings';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const booking = {
  id: 'pb1',
  customer_name: 'Maria Silva',
  customer_phone: '11999998888',
  appointment_time: '2026-09-05T14:00:00',
  total_price: 80,
  professional_id: 'm1',
  service_ids: ['s1', 's2'],
  notes: 'Prefere horário da tarde e corte degradê.',
};

const members = [{ id: 'm1', name: 'Rhian Lepore' }];
const services = [
  { id: 's1', name: 'Corte' },
  { id: 's2', name: 'Barba' },
];

describe('AgendaPublicBookings', () => {
  it('não recorta a lista com max-height e mostra a mensagem inteira', () => {
    render(
      <AgendaPublicBookings
        bookings={[booking]}
        teamMembers={members}
        services={services}
        currencyRegion="BR"
        isStaff={false}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    const section = screen.getByTestId('agenda-public-bookings');
    expect(section.className).not.toMatch(/max-h-/);
    expect(section.className).not.toMatch(/overflow-y-auto/);
    expect(screen.getByText('Prefere horário da tarde e corte degradê.')).toBeInTheDocument();
    expect(screen.getByText(/Corte, Barba/)).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('dispara aceitar e recusar', async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(
      <AgendaPublicBookings
        bookings={[booking]}
        teamMembers={members}
        services={services}
        currencyRegion="BR"
        isStaff={false}
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Aceitar/ }));
    expect(onAccept).toHaveBeenCalledWith(booking);
    await userEvent.click(screen.getByRole('button', { name: /Recusar/ }));
    expect(onReject).toHaveBeenCalledWith('pb1');
  });
});
