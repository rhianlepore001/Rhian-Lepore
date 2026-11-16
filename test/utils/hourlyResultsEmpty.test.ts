import { describe, expect, it } from 'vitest';
import type { HourMetrics } from '@/hooks/useChairHour';
import { hourlyEmptyKind, isMoneyHeroHidden } from '@/utils/hourlyResultsEmpty';

const base = (o: Partial<HourMetrics>): HourMetrics => ({
  available_minutes: null,
  worked_minutes: null,
  estimated_count: null,
  revenue_per_worked_hour: null,
  revenue_per_available_hour: null,
  occupancy: null,
  ...o,
});

describe('hourlyResultsEmpty', () => {
  it('dono sem item → setup', () => {
    expect(hourlyEmptyKind({ role: 'owner', item: null })).toBe('setup');
    expect(hourlyEmptyKind({ role: 'owner', item: undefined })).toBe('setup');
  });

  it('dono com horas abertas e sem atendimento → no_attendance', () => {
    expect(hourlyEmptyKind({ role: 'owner', item: base({ available_minutes: 600, worked_minutes: 0 }) })).toBe('no_attendance');
  });

  it('colaborador sem item → staff_no_hours', () => {
    expect(hourlyEmptyKind({ role: 'staff', item: null })).toBe('staff_no_hours');
  });

  it('dono com atendimento e receita mensurável → null (mostra números)', () => {
    expect(
      hourlyEmptyKind({ role: 'owner', item: base({ available_minutes: 600, worked_minutes: 300, revenue_per_worked_hour: 100 }) }),
    ).toBeNull();
  });

  it('dono com atendimento mas receita por hora zero → unmeasurable', () => {
    expect(
      hourlyEmptyKind({
        role: 'owner',
        item: base({ available_minutes: 600, worked_minutes: 30, revenue_per_worked_hour: 0, revenue_per_available_hour: 0 }),
      }),
    ).toBe('unmeasurable');
  });

  it('isMoneyHeroHidden esconde herói para qualquer kind não nulo', () => {
    for (const kind of ['setup', 'no_attendance', 'staff_no_hours', 'unmeasurable'] as const) {
      expect(isMoneyHeroHidden(kind)).toBe(true);
    }
    expect(isMoneyHeroHidden(null)).toBe(false);
  });
});