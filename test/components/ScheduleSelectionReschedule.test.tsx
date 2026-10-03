import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScheduleSelection } from '../../components/appointment/ScheduleSelection';
import type { BusinessHours } from '../../types/settings';

const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const open = (start: string, end: string) => ({ isOpen: true, blocks: [{ start, end }] });
const HOURS: BusinessHours = {
  mon: open('09:00', '18:00'), tue: open('09:00', '18:00'), wed: open('09:00', '18:00'),
  thu: open('09:00', '18:00'), fri: open('09:00', '18:00'), sat: open('09:00', '14:00'),
  sun: { isOpen: false, blocks: [] },
};
const MONDAY = new Date(2026, 8, 28);

function setup(props: Partial<React.ComponentProps<typeof ScheduleSelection>> = {}) {
  return render(
    <ScheduleSelection
      teamMembers={[{ id: 'p1', name: 'Bob' }, { id: 'p2', name: 'Bruna' }]}
      selectedProId="p1"
      setSelectedProId={vi.fn()}
      selectedDate={MONDAY}
      setSelectedDate={vi.fn()}
      selectedTime=""
      setSelectedTime={vi.fn()}
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
}

describe('ScheduleSelection — remarcação (B-68 / R-02)', () => {
  it('mostra horário bloqueado desabilitado com rótulo Bloqueado', () => {
    const dateStr = `${MONDAY.getFullYear()}-${String(MONDAY.getMonth() + 1).padStart(2, '0')}-${String(MONDAY.getDate()).padStart(2, '0')}`;
    setup({
      blocks: [{
        professional_id: 'p1',
        starts_at: new Date(`${dateStr}T12:00:00`).toISOString(),
        ends_at: new Date(`${dateStr}T13:00:00`).toISOString(),
      }],
      durationMinutes: 30,
    });
    const blocked = screen.getByRole('button', { name: /12:00/ });
    expect(blocked).toBeDisabled();
    expect(blocked.textContent).toMatch(/Bloqueado/);
    expect(screen.getByRole('button', { name: '11:30' })).toBeEnabled();
  });

  it('lockProfessional trava o seletor nos outros profissionais', () => {
    setup({ lockProfessional: true });
    expect(screen.getByRole('button', { name: /Bruna/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Bob/ })).toBeEnabled();
  });
});
