import { describe, expect, it } from 'vitest';
import {
  groupSlotRequirements,
  intersectSlotLists,
  isPricedService,
  planGroupStarts,
  summarizeGroup,
  validateGroupPeople,
} from '@/utils/groupBooking';
import { buildAttendeeSequence } from '@/utils/appointmentAttendees';

describe('isPricedService', () => {
  it('exige preço e duração maiores que zero', () => {
    expect(isPricedService({ price: 40, duration_minutes: 30 })).toBe(true);
    expect(isPricedService({ price: 0, duration_minutes: 30 })).toBe(false);
    expect(isPricedService({ price: 40, duration_minutes: 0 })).toBe(false);
    expect(isPricedService({ price: null, duration_minutes: 30 })).toBe(false);
    expect(isPricedService({ price: 40, duration_minutes: undefined })).toBe(false);
    expect(isPricedService({ price: Number.NaN, duration_minutes: 30 })).toBe(false);
  });
});

describe('planGroupStarts', () => {
  const start = new Date('2026-11-01T10:00:00Z');
  it('mesmo profissional atende em sequência', () => {
    const starts = planGroupStarts(start, [
      { professionalId: 'a', durationMinutes: 30 },
      { professionalId: 'a', durationMinutes: 45 },
      { professionalId: 'a', durationMinutes: 15 },
    ]);
    expect(starts.map(d => d.toISOString())).toEqual([
      '2026-11-01T10:00:00.000Z', '2026-11-01T10:30:00.000Z', '2026-11-01T11:15:00.000Z',
    ]);
  });
  it('profissionais diferentes atendem ao mesmo tempo', () => {
    const starts = planGroupStarts(start, [
      { professionalId: 'a', durationMinutes: 30 },
      { professionalId: 'b', durationMinutes: 60 },
      { professionalId: 'a', durationMinutes: 30 },
    ]);
    expect(starts.map(d => d.toISOString())).toEqual([
      '2026-11-01T10:00:00.000Z', '2026-11-01T10:00:00.000Z', '2026-11-01T10:30:00.000Z',
    ]);
  });
});

describe('groupSlotRequirements', () => {
  it('soma a duração por profissional, na ordem de aparição', () => {
    expect(groupSlotRequirements([
      { professionalId: 'a', durationMinutes: 30 },
      { professionalId: 'b', durationMinutes: 60 },
      { professionalId: 'a', durationMinutes: 20 },
    ])).toEqual([
      { professionalId: 'a', durationMinutes: 50 },
      { professionalId: 'b', durationMinutes: 60 },
    ]);
  });
});

describe('intersectSlotLists', () => {
  it('mantém só horários livres para todos os profissionais', () => {
    expect(intersectSlotLists([['09:00', '09:30', '10:00'], ['09:30', '10:00', '10:30']])).toEqual(['09:30', '10:00']);
    expect(intersectSlotLists([['09:00'], []])).toEqual([]);
    expect(intersectSlotLists([])).toEqual([]);
    expect(intersectSlotLists([['09:00', '09:30']])).toEqual(['09:00', '09:30']);
  });
});

describe('summarizeGroup', () => {
  const services = [
    { id: 's1', name: 'Corte', price: 40, duration_minutes: 30 },
    { id: 's2', name: 'Barba', price: 30, duration_minutes: 20 },
  ];
  it('calcula serviços, horário e preço de cada pessoa e o total', () => {
    const rows = summarizeGroup(new Date('2026-11-01T10:00:00Z'), [
      { name: 'Titular Fictício', professionalId: 'a', serviceIds: ['s1'] },
      { name: 'Pessoa Dois', professionalId: 'b', serviceIds: ['s1', 's2'] },
    ], services);
    expect(rows.people.map(p => [p.name, p.professionalId, p.startsAt.toISOString(), p.durationMinutes, p.totalPrice])).toEqual([
      ['Titular Fictício', 'a', '2026-11-01T10:00:00.000Z', 30, 40],
      ['Pessoa Dois', 'b', '2026-11-01T10:00:00.000Z', 50, 70],
    ]);
    expect(rows.totalPrice).toBe(110);
  });
});

describe('validateGroupPeople', () => {
  const ok = { name: 'Pessoa Dois', professionalId: 'a', serviceIds: ['s1'] };
  it('aceita um grupo completo', () => {
    expect(validateGroupPeople([{ name: 'Titular', professionalId: 'a', serviceIds: ['s1'] }, ok])).toBeNull();
  });
  it('pede nome, serviço e profissional de cada pessoa', () => {
    expect(validateGroupPeople([{ name: 'Titular', professionalId: 'a', serviceIds: ['s1'] }, { ...ok, name: ' ' }])).toBe('Informe o nome da pessoa 2.');
    expect(validateGroupPeople([{ name: 'Titular', professionalId: 'a', serviceIds: [] }, ok])).toBe('Escolha ao menos um serviço para Titular.');
    expect(validateGroupPeople([{ name: 'Titular', professionalId: 'a', serviceIds: ['s1'] }, { ...ok, professionalId: '' }])).toBe('Escolha o profissional de Pessoa Dois.');
  });
  it('recusa nomes repetidos sem diferenciar maiúsculas', () => {
    expect(validateGroupPeople([{ name: 'Ana', professionalId: 'a', serviceIds: ['s1'] }, { ...ok, name: ' ana ' }])).toBe('Use nomes diferentes para cada pessoa.');
  });
});

describe('buildAttendeeSequence por profissional', () => {
  const services = [{ id: 's1', name: 'A', price: 30, duration_minutes: 20 }, { id: 's2', name: 'B', price: 50, duration_minutes: 40 }];
  it('profissionais diferentes começam juntos e o mesmo profissional segue em sequência', () => {
    const rows = buildAttendeeSequence(new Date('2026-11-01T10:00:00Z'), [
      { dependentId: null, name: 'Titular', serviceIds: ['s1'], professionalId: 'a' },
      { dependentId: 'd1', name: 'Um', serviceIds: ['s2'], professionalId: 'b' },
      { dependentId: 'd2', name: 'Dois', serviceIds: ['s2'], professionalId: 'a' },
    ], services);
    expect(rows.map(r => r.appointmentTime.toISOString())).toEqual([
      '2026-11-01T10:00:00.000Z', '2026-11-01T10:00:00.000Z', '2026-11-01T10:20:00.000Z',
    ]);
  });
});
