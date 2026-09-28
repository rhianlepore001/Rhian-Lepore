import { describe, expect, it } from 'vitest';
import { buildAgendaDayWindow, splitWizardTimeSlots } from '@/utils/agendaDayWindow';
import type { BusinessHours } from '@/types/settings';

const LISBON = 'Europe/Lisbon';
const open = (start: string, end: string) => ({ isOpen: true, blocks: [{ start, end }] });
const closed = { isOpen: false, blocks: [] };

/** Seg–Sex 09–21, Sáb 09–14, Dom fechado. */
const HOURS: BusinessHours = {
  mon: open('09:00', '21:00'),
  tue: open('09:00', '21:00'),
  wed: open('09:00', '21:00'),
  thu: open('09:00', '21:00'),
  fri: open('09:00', '21:00'),
  sat: open('09:00', '14:00'),
  sun: closed,
};
// 2026-09-28 = segunda; 2026-10-04 = domingo; 2026-10-03 = sábado
const MON = '2026-09-28';
const SAT = '2026-10-03';
const SUN = '2026-10-04';
/** ISO de um horário de parede de Lisboa no dia. */
const lis = (date: string, hm: string) => {
  const off = date >= '2026-10-25' ? '+00:00' : '+01:00';
  return `${date}T${hm}:00${off}`;
};
const base = { businessHours: HOURS, shopTimeZone: LISBON, viewTimeZone: LISBON };

describe('buildAgendaDayWindow — grade segue o horário de funcionamento do dia', () => {
  it('expediente 09–21: primeira linha 09:00, última 20:30 (linhas de 30 min)', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: MON });
    expect(w.slots[0]).toBe('09:00');
    expect(w.slots[w.slots.length - 1]).toBe('20:30');
    expect(w.slots).toHaveLength(24);
    expect(w.endLabel).toBe('21:00');
    expect(w.closed).toBe(false);
    expect(w.offHours).toEqual([]);
  });

  it('usa o dia da semana certo (sábado 09–14)', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: SAT });
    expect([w.slots[0], w.slots[w.slots.length - 1], w.endLabel]).toEqual(['09:00', '13:30', '14:00']);
  });

  it('encaixe às 06:00 estende o início do dia; linhas antes da abertura ficam fora do expediente', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: MON, appointments: [{ appointment_time: lis(MON, '06:00') }] });
    expect(w.slots[0]).toBe('06:00');
    expect(w.slots.slice(0, 7)).toEqual(['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00']);
    expect(w.offHours).toEqual(['06:00', '06:30', '07:00', '07:30', '08:00', '08:30']);
    expect(w.slots[w.slots.length - 1]).toBe('20:30');
  });

  it('encaixe às 22:30 estende o fim até o término do atendimento', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: MON, appointments: [{ appointment_time: lis(MON, '22:30'), duration_minutes: 30 }] });
    expect(w.slots[w.slots.length - 1]).toBe('22:30');
    expect(w.endLabel).toBe('23:00');
    expect(w.offHours).toEqual(['21:00', '21:30', '22:00', '22:30']);
  });

  it('atendimento que termina depois do fechamento (20:30 + 90 min) estende até 22:00', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: MON, appointments: [{ appointment_time: lis(MON, '20:30'), duration_minutes: 90 }] });
    expect(w.slots[w.slots.length - 1]).toBe('21:30');
    expect(w.endLabel).toBe('22:00');
  });

  it('horário fora do passo de 30 min (14:15) ganha linha própria na ordem', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: MON, appointments: [{ appointment_time: lis(MON, '14:15') }] });
    const i = w.slots.indexOf('14:15');
    expect(i).toBe(w.slots.indexOf('14:00') + 1);
    expect(w.slots[i + 1]).toBe('14:30');
  });

  it('encaixe fora do passo antes da abertura (07:45) alinha o início em 07:30', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: MON, appointments: [{ appointment_time: lis(MON, '07:45') }] });
    expect(w.slots.slice(0, 3)).toEqual(['07:30', '07:45', '08:00']);
  });

  it('dois blocos (09–12 e 14–19): grade 09–19 e o intervalo de almoço fica fora do expediente', () => {
    const hours: BusinessHours = { ...HOURS, mon: { isOpen: true, blocks: [{ start: '14:00', end: '19:00' }, { start: '09:00', end: '12:00' }] } };
    const w = buildAgendaDayWindow({ ...base, businessHours: hours, dateStr: MON });
    expect([w.slots[0], w.slots[w.slots.length - 1]]).toEqual(['09:00', '18:30']);
    expect(w.offHours).toEqual(['12:00', '12:30', '13:00', '13:30']);
  });

  it('dia fechado sem agendamentos: estado "fechado" com a janela habitual da semana (tudo fora do expediente)', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: SUN });
    expect(w.closed).toBe(true);
    expect([w.slots[0], w.slots[w.slots.length - 1]]).toEqual(['09:00', '20:30']);
    expect(w.offHours).toEqual(w.slots);
  });

  it('dia fechado com encaixe: continua fechado, mas a grade inclui o atendimento', () => {
    const w = buildAgendaDayWindow({ ...base, dateStr: SUN, appointments: [{ appointment_time: lis(SUN, '07:00'), duration_minutes: 60 }] });
    expect(w.closed).toBe(true);
    expect(w.slots[0]).toBe('07:00');
  });

  it('sem horário configurado: mantém a grade antiga 06:00–23:30', () => {
    for (const businessHours of [null, undefined, {}]) {
      const w = buildAgendaDayWindow({ dateStr: MON, businessHours, shopTimeZone: LISBON, viewTimeZone: LISBON });
      expect(w.hasBusinessHours).toBe(false);
      expect(w.closed).toBe(false);
      expect([w.slots[0], w.slots[w.slots.length - 1], w.slots.length]).toEqual(['06:00', '23:30', 36]);
      expect(w.offHours).toEqual([]);
    }
  });

  it('sem horário configurado + madrugada: estende para cima como antes', () => {
    const w = buildAgendaDayWindow({ dateStr: MON, businessHours: null, shopTimeZone: LISBON, viewTimeZone: LISBON, appointments: [{ appointment_time: lis(MON, '02:00') }] });
    expect(w.slots[0]).toBe('02:00');
  });

  it('blocos inválidos são ignorados (fim antes do início, formato errado)', () => {
    const hours: BusinessHours = { ...HOURS, mon: { isOpen: true, blocks: [{ start: '18:00', end: '10:00' }, { start: '9h', end: '12:00' }] } };
    const w = buildAgendaDayWindow({ ...base, businessHours: hours, dateStr: MON });
    expect(w.closed).toBe(true);
  });

  it('fuso: negócio em São Paulo 09–19 visto de Lisboa aparece 13:00–23:00 (mesma regra de exibição da grade)', () => {
    const hours: BusinessHours = { ...HOURS, mon: open('09:00', '19:00') };
    const w = buildAgendaDayWindow({ dateStr: MON, businessHours: hours, shopTimeZone: 'America/Sao_Paulo', viewTimeZone: LISBON });
    expect([w.slots[0], w.slots[w.slots.length - 1], w.endLabel]).toEqual(['13:00', '22:30', '23:00']);
  });

  it('fuso: fechamento que passa da meia-noite no fuso de exibição é cortado em 24:00', () => {
    const hours: BusinessHours = { ...HOURS, mon: open('09:00', '21:00') };
    const w = buildAgendaDayWindow({ dateStr: MON, businessHours: hours, shopTimeZone: 'America/Sao_Paulo', viewTimeZone: LISBON });
    expect(w.slots[w.slots.length - 1]).toBe('23:30');
    expect(w.endLabel).toBe('24:00');
  });
});

describe('splitWizardTimeSlots — horários do wizard (encaixe fora do expediente)', () => {
  it('expediente 09–21: horários dentro primeiro; fora do expediente separados', () => {
    const s = splitWizardTimeSlots({ ...base, dateStr: MON });
    expect(s.inHours[0]).toBe('09:00');
    expect(s.inHours[s.inHours.length - 1]).toBe('20:30');
    expect(s.outOfHours).toContain('06:00');
    expect(s.outOfHours).toContain('21:00');
    expect(s.outOfHours).toContain('23:30');
    expect(s.inHours.length + s.outOfHours.length).toBe(48);
    expect(s.closed).toBe(false);
  });

  it('horário pré-preenchido fora da grade de 30 min entra na lista certa', () => {
    const s = splitWizardTimeSlots({ ...base, dateStr: MON, extraTimes: ['14:15', '22:45'] });
    expect(s.inHours).toContain('14:15');
    expect(s.outOfHours).toContain('22:45');
  });

  it('dia fechado: todos os horários ficam disponíveis como encaixe', () => {
    const s = splitWizardTimeSlots({ ...base, dateStr: SUN });
    expect(s.closed).toBe(true);
    expect(s.inHours).toEqual([]);
    expect(s.outOfHours).toHaveLength(48);
  });

  it('sem horário configurado: lista única com o dia inteiro (como antes)', () => {
    const s = splitWizardTimeSlots({ dateStr: MON, businessHours: null, shopTimeZone: LISBON, viewTimeZone: LISBON });
    expect(s.hasBusinessHours).toBe(false);
    expect(s.inHours).toHaveLength(48);
    expect(s.outOfHours).toEqual([]);
  });
});
