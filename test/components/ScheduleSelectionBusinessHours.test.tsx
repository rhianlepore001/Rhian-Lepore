import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleSelection } from '../../components/appointment/ScheduleSelection';
import type { BusinessHours } from '../../types/settings';

// Mesmo fuso do dispositivo: a conversão fica neutra e o teste roda igual em qualquer CI.
const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const open = (start: string, end: string) => ({ isOpen: true, blocks: [{ start, end }] });
const HOURS: BusinessHours = {
  mon: open('09:00', '18:00'), tue: open('09:00', '18:00'), wed: open('09:00', '18:00'),
  thu: open('09:00', '18:00'), fri: open('09:00', '18:00'), sat: open('09:00', '14:00'),
  sun: { isOpen: false, blocks: [] },
};
const MONDAY = new Date(2026, 8, 28);
const SUNDAY = new Date(2026, 9, 4);

function setup(props: Partial<React.ComponentProps<typeof ScheduleSelection>> = {}) {
  const setSelectedTime = vi.fn();
  const utils = render(
    <ScheduleSelection
      teamMembers={[{ id: 'p1', name: 'Bob' }]}
      selectedProId="p1"
      setSelectedProId={vi.fn()}
      selectedDate={MONDAY}
      setSelectedDate={vi.fn()}
      selectedTime=""
      setSelectedTime={setSelectedTime}
      activeCardBg="active"
      cardBg="card"
      accentColor="text-accent"
      isBeauty={false}
      services={[]}
      selectedServiceIds={[]}
      user={null}
      businessHours={HOURS}
      shopTimeZone={DEVICE_TZ}
      {...props}
    />,
  );
  return { setSelectedTime, ...utils };
}

const timeBtn = (t: string) => screen.queryByRole('button', { name: t });

describe('ScheduleSelection — horários seguem o expediente, encaixe fora dele continua possível', () => {
  it('segunda 09–18: mostra só os horários do expediente', () => {
    setup();
    expect(timeBtn('09:00')).toBeInTheDocument();
    expect(timeBtn('17:30')).toBeInTheDocument();
    expect(timeBtn('08:30')).toBeNull();
    expect(timeBtn('18:00')).toBeNull();
  });

  it('"Fora do expediente" revela os horários antes/depois para um encaixe', async () => {
    const { setSelectedTime } = setup();
    const toggle = screen.getByRole('button', { name: /fora do expediente/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Antes da abertura')).toBeInTheDocument();
    expect(screen.getByText('Depois do fechamento')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '06:00' }));
    expect(setSelectedTime).toHaveBeenCalledWith('06:00');
    expect(timeBtn('22:30')).toBeInTheDocument();
  });

  it('horário pré-preenchido fora do expediente (grade 22:30) já abre a seção e aparece selecionado', () => {
    setup({ selectedTime: '22:30' });
    expect(screen.getByRole('button', { name: /fora do expediente/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '22:30' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('dia fechado: aviso claro e todos os horários livres para encaixe', () => {
    setup({ selectedDate: SUNDAY });
    expect(screen.getByText(/fechado neste dia/i)).toBeInTheDocument();
    expect(timeBtn('10:00')).toBeInTheDocument();
    expect(timeBtn('06:00')).toBeInTheDocument();
  });

  it('sem horário configurado: lista do dia inteiro, sem seção extra', () => {
    setup({ businessHours: null });
    expect(timeBtn('00:00')).toBeInTheDocument();
    expect(timeBtn('23:30')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fora do expediente/i })).toBeNull();
  });

  it('horário passado (hoje) é selecionável — encaixe lançado depois do atendimento', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { setSelectedTime } = setup({ selectedDate: today, businessHours: null });
    const early = screen.getByRole('button', { name: '00:30' });
    expect(early).toBeEnabled();
    await userEvent.click(early);
    expect(setSelectedTime).toHaveBeenCalledWith('00:30');
  });

  it('omite horários que cruzam um bloqueio daquele profissional', () => {
    const dateStr = `${MONDAY.getFullYear()}-${String(MONDAY.getMonth() + 1).padStart(2, '0')}-${String(MONDAY.getDate()).padStart(2, '0')}`;
    setup({
      blocks: [{
        professional_id: 'p1',
        starts_at: new Date(`${dateStr}T12:00:00`).toISOString(),
        ends_at: new Date(`${dateStr}T13:00:00`).toISOString(),
      }],
      durationMinutes: 30,
    });
    expect(timeBtn('12:00')).toBeNull();
    expect(timeBtn('12:30')).toBeNull();
    expect(timeBtn('11:30')).toBeInTheDocument();
    expect(timeBtn('13:00')).toBeInTheDocument();
  });
});
