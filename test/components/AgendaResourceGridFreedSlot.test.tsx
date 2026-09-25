import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaResourceGrid, type AgendaGridAppointment } from '../../components/agenda/AgendaResourceGrid';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

const members = [{ id: 'm1', name: 'Mario Silva' }];
const apt = (status: string, time = '08:00'): AgendaGridAppointment => ({
  id: `a-${status}-${time}`,
  clientName: 'Aline',
  service: 'Corte',
  appointment_time: `2026-01-05T${time}:00`,
  price: 45,
  status,
  professional_id: 'm1',
});

function setup(appointments: AgendaGridAppointment[]) {
  const onEmptySlotClick = vi.fn();
  const onSelectAppointment = vi.fn();
  render(
    <AgendaResourceGrid
      members={members}
      allMembers={members}
      appointments={appointments}
      timeSlots={['08:00', '08:30']}
      showUnassigned={false}
      currencyRegion="BR"
      selectedProfessionalIds={[]}
      onSelectAll={vi.fn()}
      onToggleProfessional={vi.fn()}
      onSelectAppointment={onSelectAppointment}
      onEmptySlotClick={onEmptySlotClick}
    />,
  );
  const slot = (time: string) => document.querySelector(`[data-testid="agenda-col-m1"] [data-agenda-slot="${time}"]`) as HTMLElement;
  return { onEmptySlotClick, onSelectAppointment, slot };
}

describe('AgendaResourceGrid — falta/cancelado liberam o horário', () => {
  it('NoShow: card continua visível e o "+" do mesmo horário aparece ao lado', async () => {
    const { onEmptySlotClick, onSelectAppointment, slot } = setup([apt('NoShow')]);
    const plus = within(slot('08:00')).getByRole('button', { name: 'Novo agendamento às 08:00 com Mario Silva' });
    expect(plus).toHaveAttribute('data-freed-slot', 'true');
    await userEvent.click(plus);
    expect(onEmptySlotClick).toHaveBeenCalledWith('m1', '08:00');
    const chip = screen.getByRole('button', { name: /Aline — Corte às 08:00/ });
    expect(chip).toHaveAttribute('data-frees-slot', 'true');
    await userEvent.click(chip);
    expect(onSelectAppointment).toHaveBeenCalled();
  });

  it('Cancelled também libera', () => {
    const { slot } = setup([apt('Cancelled')]);
    expect(within(slot('08:00')).getByRole('button', { name: /Novo agendamento às 08:00/ })).toBeInTheDocument();
  });

  it.each(['Confirmed', 'Pending', 'Completed'])('%s continua ocupando o horário (sem "+")', (status) => {
    const { slot } = setup([apt(status)]);
    expect(within(slot('08:00')).queryByRole('button', { name: /Novo agendamento às 08:00/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Aline — Corte às 08:00/ })).not.toHaveAttribute('data-frees-slot');
  });

  it('falta + agendamento ativo no mesmo horário: continua ocupado', () => {
    const { slot } = setup([apt('NoShow'), { ...apt('Confirmed'), id: 'a-active' }]);
    expect(within(slot('08:00')).queryByRole('button', { name: /Novo agendamento às 08:00/ })).toBeNull();
  });

  it('horário vazio segue com o "+" normal (largura total)', () => {
    const { slot } = setup([apt('NoShow')]);
    const plus = within(slot('08:30')).getByRole('button', { name: /Novo agendamento às 08:30/ });
    expect(plus).not.toHaveAttribute('data-freed-slot');
  });
});
