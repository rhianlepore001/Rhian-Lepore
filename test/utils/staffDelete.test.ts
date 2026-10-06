import { describe, expect, it } from 'vitest';
import { getBusinessRemainderNoun } from '@/utils/businessCopy';
import { isOpenAppointmentStatus } from '@/utils/appointmentStatus';
import {
  agendaAppointmentLink,
  businessOfLabel,
  formatOpenAppointmentWhen,
  isOpenAppointmentLate,
  isStaffHasOpenAppointmentsError,
  isStaffLegacyLinkError,
  moreAppointmentsLabel,
  openAppointmentsCopy,
  parseOpenCount,
} from '@/utils/staffDelete';

const TZ = 'Europe/Lisbon';
const NOW = new Date('2026-10-06T09:00:00.000Z'); // 10:00 em Lisboa

describe('staffDelete — mapeamento do erro do servidor', () => {
  it('reconhece STAFF_HAS_OPEN_APPOINTMENTS pela mensagem ou pelo hint', () => {
    expect(isStaffHasOpenAppointmentsError({ code: 'P0001', message: 'STAFF_HAS_OPEN_APPOINTMENTS' })).toBe(true);
    expect(isStaffHasOpenAppointmentsError({ hint: 'staff_has_open_appointments', message: 'x' })).toBe(true);
    expect(isStaffHasOpenAppointmentsError({ message: 'OWNER_OR_MISSING_TEAM_MEMBER' })).toBe(false);
    expect(isStaffHasOpenAppointmentsError(null)).toBe(false);
  });

  it('lê open_count do DETAIL', () => {
    expect(parseOpenCount('open_count=3')).toBe(3);
    expect(parseOpenCount('open_count=0')).toBeNull();
    expect(parseOpenCount(null)).toBeNull();
    expect(parseOpenCount('outra coisa')).toBeNull();
  });

  it('23503 vira o caso legado (sem #23503 na tela)', () => {
    expect(isStaffLegacyLinkError({ code: '23503', message: 'violates foreign key' })).toBe(true);
    expect(isStaffLegacyLinkError({ code: '23505' })).toBe(false);
  });
});

describe('staffDelete — status em aberto (mesma regra da guarda SQL)', () => {
  it.each([
    ['Pending', true], ['Confirmed', true], ['Rascunho', true],
    ['Completed', false], ['Cancelled', false], ['NoShow', false], ['no_show', false], [' completed ', false], ['CANCELLED', false],
  ])('%s -> em aberto=%s', (status, open) => {
    expect(isOpenAppointmentStatus(status)).toBe(open);
  });

  it('Atrasado = mesma regra da Agenda (horário + duração + 15 min)', () => {
    const base = { status: 'Confirmed', duration_minutes: 30 };
    expect(isOpenAppointmentLate({ ...base, appointment_time: '2026-10-06T08:00:00.000Z' }, NOW)).toBe(true);
    expect(isOpenAppointmentLate({ ...base, appointment_time: '2026-10-06T08:20:00.000Z' }, NOW)).toBe(false);
    expect(isOpenAppointmentLate({ ...base, appointment_time: '2026-10-07T08:00:00.000Z' }, NOW)).toBe(false);
  });
});

describe('staffDelete — textos sem tipo de negócio fixo', () => {
  it.each([
    ['barber', 'da barbearia'],
    ['beauty', 'do salão'],
    ['tattoo', 'do estúdio'],
    [null, 'do negócio'],
  ])('%s -> %s', (userType, expected) => {
    const remainder = getBusinessRemainderNoun(userType);
    expect(businessOfLabel(remainder)).toBe(expected);
    expect(openAppointmentsCopy(2, 'Aline', remainder).action).toBe(
      `Para excluir, finalize cada um ou passe para outro profissional ${expected}.`,
    );
  });

  it('singular e plural', () => {
    const r = getBusinessRemainderNoun('barber');
    expect(openAppointmentsCopy(1, 'Aline', r).lead).toBe('Aline ainda tem 1 atendimento em aberto.');
    expect(openAppointmentsCopy(1, 'Aline', r).action).toBe('Para excluir, finalize o atendimento ou passe para outro profissional da barbearia.');
    expect(openAppointmentsCopy(4, 'Aline', r).lead).toBe('Aline ainda tem 4 atendimentos em aberto.');
    expect(openAppointmentsCopy(2, '  ', r).lead).toBe('Este profissional ainda tem 2 atendimentos em aberto.');
    expect(moreAppointmentsLabel(1)).toBe('e mais 1 atendimento');
    expect(moreAppointmentsLabel(63)).toBe('e mais 63 atendimentos');
  });
});

describe('staffDelete — data/hora e deep link no fuso do negócio', () => {
  it('Hoje / Ontem / Amanhã / dia da semana', () => {
    expect(formatOpenAppointmentWhen('2026-10-06T13:30:00.000Z', TZ, NOW)).toBe('Hoje · 14:30');
    expect(formatOpenAppointmentWhen('2026-10-05T08:00:00.000Z', TZ, NOW)).toBe('Ontem · 09:00');
    expect(formatOpenAppointmentWhen('2026-10-07T09:15:00.000Z', TZ, NOW)).toBe('Amanhã · 10:15');
    expect(formatOpenAppointmentWhen('2026-07-05T10:30:00.000Z', TZ, NOW)).toMatch(/^dom\.?, 05\/07 · 11:30$/);
  });

  it('link usa o dia do negócio, não o UTC', () => {
    // 23:30 em São Paulo de 05/07 = 02:30 UTC de 06/07
    expect(agendaAppointmentLink({ id: 'a b', appointment_time: '2026-07-06T02:30:00.000Z' }, 'America/Sao_Paulo'))
      .toBe('/agenda?date=2026-07-05&appointment=a%20b');
  });
});
