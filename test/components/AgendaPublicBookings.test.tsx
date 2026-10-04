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
        onAccept={onAccept}
        onReject={onReject}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Aceitar/ }));
    expect(onAccept).toHaveBeenCalledWith(booking);
    await userEvent.click(screen.getByRole('button', { name: /Recusar/ }));
    expect(onReject).toHaveBeenCalledWith('pb1');
  });

  it('mostra Recusar também para staff', () => {
    render(
      <AgendaPublicBookings
        bookings={[booking]}
        teamMembers={members}
        services={services}
        currencyRegion="BR"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Aceitar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recusar/ })).toBeInTheDocument();
  });

  it('esconde Aceitar/Recusar quando o usuário não pode agir no pedido de outro profissional', () => {
    render(
      <AgendaPublicBookings
        bookings={[booking]}
        teamMembers={members}
        services={services}
        currencyRegion="BR"
        onAccept={vi.fn()}
        onReject={vi.fn()}
        canActOnBooking={() => false}
      />,
    );

    expect(screen.queryByRole('button', { name: /Aceitar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recusar/ })).not.toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Pedido para Rhian Lepore. Só Rhian Lepore ou o dono podem responder.')).toBeInTheDocument();
    expect(screen.queryByText(/aceite ou recuse/)).not.toBeInTheDocument();
  });

  it('pedido de edição mostra Alteração: de {antes} para {depois}', () => {
    render(
      <AgendaPublicBookings
        bookings={[{
          ...booking,
          is_edit: true,
          original_appointment_time: '2026-10-04T13:00:00.000Z',
          appointment_time: '2026-10-04T15:00:00.000Z',
        }]}
        teamMembers={members}
        services={services}
        currencyRegion="BR"
        timeZone="America/Sao_Paulo"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByTestId('agenda-booking-alteracao')).toHaveTextContent(
      'Alteração: de 04/10 · 10:00 para 04/10 · 12:00',
    );
    expect(screen.getByText('1 alteração aguardando aprovação')).toBeInTheDocument();
  });

  it('com pedidos mistos, o contador só inclui os que o usuário pode aceitar', () => {
    render(
      <AgendaPublicBookings
        bookings={[
          booking,
          { ...booking, id: 'pb2', professional_id: 'm2', customer_name: 'João' },
        ]}
        teamMembers={[...members, { id: 'm2', name: 'Yago Y' }]}
        services={services}
        currencyRegion="BR"
        onAccept={vi.fn()}
        onReject={vi.fn()}
        canActOnBooking={(item) => item.professional_id === 'm1'}
      />,
    );
    expect(screen.getByText('1 solicitação online')).toBeInTheDocument();
    expect(screen.getByText('Feitos pelo link público — aceite ou recuse.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Aceitar/ })).toHaveLength(1);
  });

  it('flexiona o resumo com pedidos novos e alterações', () => {
    render(
      <AgendaPublicBookings
        bookings={[
          booking,
          {
            ...booking,
            id: 'pb2',
            is_edit: true,
            original_appointment_time: '2026-10-04T13:00:00.000Z',
            appointment_time: '2026-10-04T15:00:00.000Z',
          },
        ]}
        teamMembers={members}
        services={services}
        currencyRegion="BR"
        timeZone="America/Sao_Paulo"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText('2 solicitações online')).toBeInTheDocument();
    expect(screen.getByText('1 pedido novo e 1 alteração')).toBeInTheDocument();
  });

  it('destaca o pedido focado pelo sino', () => {
    render(
      <AgendaPublicBookings
        bookings={[booking]}
        teamMembers={members}
        services={services}
        currencyRegion="BR"
        onAccept={vi.fn()}
        onReject={vi.fn()}
        highlightedBookingId="pb1"
      />,
    );
    expect(screen.getByTestId('agenda-public-booking-pb1')).toHaveAttribute('data-highlighted', 'true');
  });
});
