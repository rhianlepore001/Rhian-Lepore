import { describe, expect, it } from 'vitest';
import {
  formatLeadTimeDuration,
  isLeadTimePresetMinutes,
  leadTimeEmptySlotsMessageMinutes,
  leadTimeExample,
  leadTimeHoursForMinutes,
  leadTimeMinutesFromError,
  leadTimeViolationMessageMinutes,
  parseCustomLeadTime,
  resolveLeadTimeMinutes,
  splitLeadTimeMinutes,
} from '@/utils/bookingLeadTime';

describe('antecedência com minutos', () => {
  it('formata 2h, 1h30, 20 min, 0 min', () => {
    expect(formatLeadTimeDuration(120)).toBe('2h');
    expect(formatLeadTimeDuration(90)).toBe('1h30');
    expect(formatLeadTimeDuration(65)).toBe('1h05');
    expect(formatLeadTimeDuration(20)).toBe('20 min');
    expect(formatLeadTimeDuration(0)).toBe('0 min');
  });

  it('resolve minutos: coluna nova vence; ausente = horas×60; nada = 120', () => {
    expect(resolveLeadTimeMinutes({ booking_lead_time_minutes: 90, booking_lead_time_hours: 2 })).toBe(90);
    expect(resolveLeadTimeMinutes({ booking_lead_time_minutes: null, booking_lead_time_hours: 8 })).toBe(480);
    expect(resolveLeadTimeMinutes({ booking_lead_time_hours: 0 })).toBe(0);
    expect(resolveLeadTimeMinutes(null)).toBe(120);
    expect(resolveLeadTimeMinutes({ booking_lead_time_minutes: 99999 })).toBe(43200);
  });

  it('horas de compatibilidade = teto (nunca mais permissivo)', () => {
    expect(leadTimeHoursForMinutes(90)).toBe(2);
    expect(leadTimeHoursForMinutes(20)).toBe(1);
    expect(leadTimeHoursForMinutes(120)).toBe(2);
    expect(leadTimeHoursForMinutes(0)).toBe(0);
    expect(leadTimeHoursForMinutes(43200)).toBe(720);
  });

  it('preset só em hora cheia da lista', () => {
    expect(isLeadTimePresetMinutes(120)).toBe(true);
    expect(isLeadTimePresetMinutes(0)).toBe(true);
    expect(isLeadTimePresetMinutes(90)).toBe(false);
    expect(isLeadTimePresetMinutes(180)).toBe(false);
    expect(splitLeadTimeMinutes(90)).toEqual({ hours: 1, minutes: 30 });
  });

  it('valida horas 0..720 e minutos 0..59', () => {
    expect(parseCustomLeadTime('1', '30')).toEqual({ ok: true, minutes: 90 });
    expect(parseCustomLeadTime('', '20')).toEqual({ ok: true, minutes: 20 });
    expect(parseCustomLeadTime('3', '')).toEqual({ ok: true, minutes: 180 });
    expect(parseCustomLeadTime('0', '0')).toEqual({ ok: true, minutes: 0 });
    expect(parseCustomLeadTime('720', '0')).toEqual({ ok: true, minutes: 43200 });
    expect(parseCustomLeadTime('', '')).toMatchObject({ ok: false });
    expect(parseCustomLeadTime('1', '60')).toEqual({ ok: false, error: 'Os minutos vão de 0 a 59.' });
    expect(parseCustomLeadTime('721', '0')).toEqual({ ok: false, error: 'As horas vão de 0 a 720.' });
    expect(parseCustomLeadTime('720', '1')).toEqual({ ok: false, error: 'O máximo é 720h.' });
    expect(parseCustomLeadTime('1a', '0')).toMatchObject({ ok: false });
  });

  it('exemplo dinâmico a partir das 14h', () => {
    expect(leadTimeExample(120)).toBe('Com 2h: se agora são 14h, o cliente só vê horários a partir das 16h.');
    expect(leadTimeExample(90)).toBe('Com 1h30: se agora são 14h, o cliente só vê horários a partir das 15h30.');
    expect(leadTimeExample(20)).toBe('Com 20 min: se agora são 14h, o cliente só vê horários a partir das 14h20.');
    expect(leadTimeExample(16 * 60)).toBe('Com 16h: se agora são 14h, o cliente só vê horários a partir de amanhã às 6h.');
    expect(leadTimeExample(48 * 60)).toBe('Com 48h: se agora são 14h, o cliente só vê horários a partir de daqui a 2 dias, às 14h.');
    expect(leadTimeExample(0)).toMatch(/^Sem mínimo:/);
  });

  it('lê o DETAIL da recusa: horas cheias ("2") e minutos ("minutes=90")', () => {
    expect(leadTimeMinutesFromError({ details: '2' })).toBe(120);
    expect(leadTimeMinutesFromError({ details: 'minutes=90' })).toBe(90);
    expect(leadTimeMinutesFromError({ details: '' }, 45)).toBe(45);
    expect(leadTimeMinutesFromError({})).toBeNull();
  });

  it('mensagens usam o rótulo com minutos', () => {
    expect(leadTimeViolationMessageMinutes(90)).toBe('Esse horário precisa ser marcado com pelo menos 1h30 de antecedência');
    expect(leadTimeViolationMessageMinutes(120)).toBe('Esse horário precisa ser marcado com pelo menos 2h de antecedência');
    expect(leadTimeViolationMessageMinutes(null)).toBe('Esse horário precisa ser marcado com mais antecedência');
    expect(leadTimeEmptySlotsMessageMinutes(20, true, { hasCta: true })).toBe('Hoje não há horários com 20 min de antecedência.');
    expect(leadTimeEmptySlotsMessageMinutes(24 * 60, true)).toBe('Hoje não há horários com 24h de antecedência. Escolha outro dia.');
  });
});
