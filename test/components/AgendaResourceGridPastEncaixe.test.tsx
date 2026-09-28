import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaResourceGrid, type AgendaGridAppointment } from '../../components/agenda/AgendaResourceGrid';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

/**
 * Encaixe em horário passado (D1a): barbeiro atende primeiro e lança depois.
 * Horário vazio, cancelado ou falta — mesmo já encerrados — oferecem o "+".
 * Os testes rodam com o relógio real: os horários são de janeiro/2026 (passado).
 */
const members = [{ id: 'm1', name: 'Mario Silva' }];
const apt = (status: string, time = '08:00', extra: Partial<AgendaGridAppointment> = {}): AgendaGridAppointment => ({
  id: `a-${status}-${time}`,
  clientName: 'Aline',
  service: 'Corte',
  appointment_time: `2026-01-05T${time}:00`,
  price: 45,
  status,
  professional_id: 'm1',
  ...extra,
});

function setup(appointments: AgendaGridAppointment[], extra: Partial<React.ComponentProps<typeof AgendaResourceGrid>> = {}) {
  const onEmptySlotClick = vi.fn();
  const onSelectAppointment = vi.fn();
  render(
    <AgendaResourceGrid
      members={members}
      allMembers={members}
      appointments={appointments}
      timeSlots={['08:00', '08:30', '09:00']}
      showUnassigned={false}
      currencyRegion="BR"
      selectedProfessionalIds={[]}
      onSelectAll={vi.fn()}
      onToggleProfessional={vi.fn()}
      onSelectAppointment={onSelectAppointment}
      onEmptySlotClick={onEmptySlotClick}
      {...extra}
    />,
  );
  const slot = (time: string) => document.querySelector(`[data-testid="agenda-col-m1"] [data-agenda-slot="${time}"]`) as HTMLElement;
  return { onEmptySlotClick, onSelectAppointment, slot };
}

describe('AgendaResourceGrid — encaixe em horário passado', () => {
  it('falta já encerrada: "+" ao lado do card (faixa da direita) e abre o wizard no horário', async () => {
    const { slot, onEmptySlotClick } = setup([apt('NoShow')]);
    const plus = within(slot('08:00')).getByRole('button', { name: 'Novo agendamento às 08:00 com Mario Silva' });
    expect(plus).toHaveAttribute('data-freed-slot', 'true');
    await userEvent.click(plus);
    expect(onEmptySlotClick).toHaveBeenCalledWith('m1', '08:00');
  });

  it('falta encerrada sozinha: card estreito à esquerda (não ocupa a faixa do "+")', () => {
    setup([apt('NoShow')]);
    const chip = screen.getByRole('button', { name: /Aline — Corte às 08:00/ });
    expect(chip).not.toHaveAttribute('data-full-width');
    expect(chip.className).toMatch(/\bright-\[40%\]/);
  });

  it('falta encerrada de 60 min: "+" nos dois horários que ela cobria', () => {
    const { slot } = setup([apt('NoShow', '08:00', { duration_minutes: 60 })]);
    expect(within(slot('08:00')).getByRole('button', { name: /Novo agendamento às 08:00/ })).toHaveAttribute('data-freed-slot', 'true');
    expect(within(slot('08:30')).getByRole('button', { name: /Novo agendamento às 08:30/ })).toHaveAttribute('data-freed-slot', 'true');
  });

  it('cancelado passado e horário vazio passado continuam com "+"', () => {
    const { slot } = setup([apt('Cancelled')]);
    expect(within(slot('08:00')).getByRole('button', { name: /Novo agendamento às 08:00/ })).toBeInTheDocument();
    expect(within(slot('08:30')).getByRole('button', { name: /Novo agendamento às 08:30/ })).not.toHaveAttribute('data-freed-slot');
  });

  it('falta encerrada + agendamento ativo (encaixe já lançado): lado a lado, sem "+"', () => {
    const { slot } = setup([apt('NoShow'), apt('Confirmed', '08:00', { id: 'a-new', clientName: 'Bruno' })]);
    expect(within(slot('08:00')).queryByRole('button', { name: /Novo agendamento/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Aline — Corte às 08:00/ }).className).toMatch(/\bright-\[68%\]/);
    expect(screen.getByRole('button', { name: /Bruno — Corte às 08:00/ }).className).toMatch(/\bleft-\[33%\]/);
  });

});

describe('AgendaResourceGrid — linhas fora do expediente', () => {
  it('linhas fora do expediente ficam marcadas (hachura) e continuam clicáveis para encaixe', async () => {
    const { slot, onEmptySlotClick } = setup([], { offHoursSlots: ['08:00'] });
    expect(slot('08:00')).toHaveAttribute('data-off-hours', 'true');
    expect(slot('08:30')).not.toHaveAttribute('data-off-hours');
    await userEvent.click(within(slot('08:00')).getByRole('button', { name: /Novo agendamento às 08:00/ }));
    expect(onEmptySlotClick).toHaveBeenCalledWith('m1', '08:00');
  });

  it('rótulo de fechamento no fim da régua de horários', () => {
    setup([], { endLabel: '09:30' });
    expect(screen.getByTestId('agenda-grid-end-label')).toHaveTextContent('09:30');
  });
});
