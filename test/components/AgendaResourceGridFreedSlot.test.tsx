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

// Relógio antes dos horários do teste (05/01 07:00): faltas ainda reaproveitáveis.
const BEFORE = new Date(2026, 0, 5, 7, 0);

function setup(appointments: AgendaGridAppointment[], now: Date = BEFORE) {
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
      now={now}
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

  it('falta + agendamento ativo no MESMO horário: ativo por cima (z maior, depois no DOM) e ambos clicáveis', async () => {
    const noShow = apt('NoShow');
    const active = { ...apt('Confirmed'), id: 'a-new', clientName: 'Bruno' };
    const { onSelectAppointment } = setup([active, noShow]); // ordem da API não importa
    const noShowChip = screen.getByRole('button', { name: /Aline — Corte às 08:00/ });
    const activeChip = screen.getByRole('button', { name: /Bruno — Corte às 08:00/ });
    // ativo: z-[2], começa depois da faixa da falta; falta: z-[1], faixa estreita à esquerda
    expect(activeChip.className).toMatch(/\bz-\[2\]/);
    expect(activeChip.className).toMatch(/\bleft-\[33%\]/);
    expect(noShowChip.className).toMatch(/\bz-\[1\]/);
    expect(noShowChip.className).toMatch(/\bright-\[68%\]/);
    expect(activeChip).toHaveAttribute('data-shares-slot', 'true');
    expect(noShowChip.compareDocumentPosition(activeChip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(activeChip);
    expect(onSelectAppointment).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a-new' }));
    await userEvent.click(noShowChip);
    expect(onSelectAppointment).toHaveBeenLastCalledWith(expect.objectContaining({ id: noShow.id }));
  });

  it('agendamento ativo sozinho continua com largura total e z-[2]', () => {
    setup([apt('Confirmed')]);
    const chip = screen.getByRole('button', { name: /Aline — Corte às 08:00/ });
    expect(chip.className).toMatch(/\bleft-0\.5\b/);
    expect(chip.className).toMatch(/\bz-\[2\]/);
    expect(chip).not.toHaveAttribute('data-shares-slot');
  });

  it('falta cujo horário já terminou: card visível e clicável, mas sem "+" ao lado', async () => {
    const { slot, onSelectAppointment } = setup([apt('NoShow')], new Date(2026, 0, 5, 9, 0));
    expect(within(slot('08:00')).queryByRole('button', { name: /Novo agendamento às 08:00/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Aline — Corte às 08:00/ }));
    expect(onSelectAppointment).toHaveBeenCalled();
  });

  it('falta de hoje ainda em andamento (08:00–08:30, agora 08:10): "+" continua', () => {
    const { slot } = setup([apt('NoShow')], new Date(2026, 0, 5, 8, 10));
    expect(within(slot('08:00')).getByRole('button', { name: /Novo agendamento às 08:00/ })).toBeInTheDocument();
  });
});
