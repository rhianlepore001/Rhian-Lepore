import { describe, it, expect } from 'vitest';
import {
  buildDefaultAgendaSlots,
  buildManualBookingTimeSlots,
  buildAgendaGridSlots,
  timeToMinutes,
} from '@/utils/agendaTimeSlots';

describe('agendaTimeSlots', () => {
  it('buildDefaultAgendaSlots cobre 06:00 até 23:30', () => {
    const slots = buildDefaultAgendaSlots();
    expect(slots[0]).toBe('06:00');
    expect(slots[1]).toBe('06:30');
    expect(slots[slots.length - 2]).toBe('23:00');
    expect(slots[slots.length - 1]).toBe('23:30');
    expect(slots).not.toContain('00:00');
    expect(slots).not.toContain('05:30');
    expect(slots).toContain('08:00');
  });

  it('buildManualBookingTimeSlots cobre o dia inteiro', () => {
    const slots = buildManualBookingTimeSlots();
    expect(slots[0]).toBe('00:00');
    expect(slots).toContain('05:30');
    expect(slots).toContain('06:00');
    expect(slots[slots.length - 1]).toBe('23:30');
    expect(slots).toHaveLength(48);
  });

  it('buildAgendaGridSlots prepende madrugada quando há agendamento', () => {
    const slots = buildAgendaGridSlots([
      new Date(2026, 7, 1, 2, 0),
      new Date(2026, 7, 1, 0, 0),
      new Date(2026, 7, 1, 10, 0),
    ]);

    expect(slots.slice(0, 2)).toEqual(['00:00', '02:00']);
    expect(slots[2]).toBe('06:00');
    expect(slots).toContain('10:00');
    expect(timeToMinutes(slots[0])).toBeLessThan(timeToMinutes(slots[1]));
  });

  it('buildAgendaGridSlots insere horário fora do passo de 30min no bloco diurno', () => {
    const slots = buildAgendaGridSlots([new Date(2026, 7, 1, 14, 15)]);
    const idx = slots.indexOf('14:15');
    expect(idx).toBeGreaterThan(slots.indexOf('14:00'));
    expect(idx).toBeLessThan(slots.indexOf('14:30'));
    expect(slots[0]).toBe('06:00');
  });

  it('sem agendamentos extras, retorna só a grade padrão', () => {
    expect(buildAgendaGridSlots([])).toEqual(buildDefaultAgendaSlots());
  });
});
