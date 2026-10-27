import { describe, expect, it } from 'vitest';
import { attendeeLabel, buildAttendeeSequence } from '@/utils/appointmentAttendees';

describe('appointment attendees', () => {
  const services = [{ id: 's1', name: 'Serviço A', price: 30, duration_minutes: 20 }, { id: 's2', name: 'Serviço B', price: 50, duration_minutes: 40 }];
  it('keeps the holder as contact and permits only dependents in a consecutive sequence', () => {
    const result = buildAttendeeSequence(new Date('2026-11-01T10:00:00Z'), [
      { dependentId: 'd1', name: 'Pessoa Um', serviceIds: ['s1'] },
      { dependentId: 'd2', name: 'Pessoa Dois', serviceIds: ['s2'] },
    ], services);
    expect(result.map(row => [row.name, row.appointmentTime.toISOString(), row.durationMinutes, row.totalPrice])).toEqual([
      ['Pessoa Um', '2026-11-01T10:00:00.000Z', 20, 30],
      ['Pessoa Dois', '2026-11-01T10:20:00.000Z', 40, 50],
    ]);
  });
  it('refuses missing services instead of silently shortening the sequence', () => {
    expect(() => buildAttendeeSequence(new Date(), [{ dependentId: null, name: 'Titular Fictício', serviceIds: ['missing'] }], services)).toThrow();
  });
  it('labels both attended person and responsible holder, including an archived snapshot', () => {
    expect(attendeeLabel({ attendee_name: 'Pessoa Um', dependent_id: 'd1', clientName: 'Titular Fictício' })).toBe('Pessoa Um (dep. de Titular Fictício)');
    expect(attendeeLabel({ attendee_name: 'Pessoa Um', dependent_id: null, clientName: 'Titular Fictício' })).toBe('Pessoa Um (responsável: Titular Fictício)');
    expect(attendeeLabel({ clientName: 'Titular Fictício' })).toBe('Titular Fictício');
  });
});
