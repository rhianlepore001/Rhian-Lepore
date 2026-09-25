import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMEZONE_BR,
  DEFAULT_TIMEZONE_PT,
  FALLBACK_TIMEZONE,
  TIMEZONE_OPTIONS,
  addDaysToDateString,
  dateStringToLocalDate,
  defaultTimezoneForRegion,
  formatTimeInTimeZone,
  getDateStringInTimeZone,
  getTimeZoneOffsetMinutes,
  getTodayInTimeZone,
  isValidTimeZone,
  isZonedSlotInPast,
  resolveBusinessTimezone,
  zonedDateTimeToIso,
} from '../../utils/businessTimezone';

const SP = 'America/Sao_Paulo';
const LIS = 'Europe/Lisbon';

describe('resolveBusinessTimezone (default por país + fallback)', () => {
  it('BR -> America/Sao_Paulo, PT -> Europe/Lisbon', () => {
    expect(resolveBusinessTimezone({ region: 'BR' })).toBe(SP);
    expect(resolveBusinessTimezone({ region: 'PT' })).toBe(LIS);
    expect(resolveBusinessTimezone({ region: ' pt ' })).toBe(LIS);
  });

  it('região desconhecida/ausente cai no fallback America/Sao_Paulo', () => {
    expect(FALLBACK_TIMEZONE).toBe(SP);
    expect(resolveBusinessTimezone({ region: null })).toBe(SP);
    expect(resolveBusinessTimezone({ region: 'US' })).toBe(SP);
    expect(resolveBusinessTimezone({})).toBe(SP);
  });

  it('fuso salvo e válido vence a região; inválido/vazio é ignorado', () => {
    expect(resolveBusinessTimezone({ timezone: 'America/Manaus', region: 'BR' })).toBe('America/Manaus');
    expect(resolveBusinessTimezone({ timezone: 'Atlantic/Azores', region: 'PT' })).toBe('Atlantic/Azores');
    expect(resolveBusinessTimezone({ timezone: 'Mars/Olympus', region: 'PT' })).toBe(LIS);
    expect(resolveBusinessTimezone({ timezone: '  ', region: 'BR' })).toBe(SP);
    expect(resolveBusinessTimezone({ timezone: null, region: 'PT' })).toBe(LIS);
  });

  it('todas as opções do select são fusos IANA válidos', () => {
    for (const opt of TIMEZONE_OPTIONS) expect(isValidTimeZone(opt.value)).toBe(true);
    expect(defaultTimezoneForRegion('BR')).toBe(DEFAULT_TIMEZONE_BR);
    expect(defaultTimezoneForRegion('PT')).toBe(DEFAULT_TIMEZONE_PT);
  });
});

describe('zonedDateTimeToIso (horário de verão Lisboa vs São Paulo)', () => {
  it('Lisboa no verão (WEST) usa +01:00', () => {
    expect(zonedDateTimeToIso('2026-09-28', '10:00', LIS)).toBe('2026-09-28T10:00:00+01:00');
  });

  it('Lisboa no inverno (WET) usa +00:00', () => {
    expect(zonedDateTimeToIso('2026-12-28', '10:00', LIS)).toBe('2026-12-28T10:00:00+00:00');
  });

  it('Lisboa: véspera e dia seguinte à mudança de horário (25/10/2026)', () => {
    expect(zonedDateTimeToIso('2026-10-24', '09:00', LIS)).toBe('2026-10-24T09:00:00+01:00');
    expect(zonedDateTimeToIso('2026-10-26', '09:00', LIS)).toBe('2026-10-26T09:00:00+00:00');
    // Entrada no verão (29/03/2026): 00:30 ainda WET, 09:00 já WEST
    expect(zonedDateTimeToIso('2026-03-29', '00:30', LIS)).toBe('2026-03-29T00:30:00+00:00');
    expect(zonedDateTimeToIso('2026-03-29', '09:00', LIS)).toBe('2026-03-29T09:00:00+01:00');
  });

  it('Lisboa: horário inexistente (01:30 do salto) é empurrado para frente', () => {
    expect(zonedDateTimeToIso('2026-03-29', '01:30', LIS)).toBe('2026-03-29T02:30:00+01:00');
  });

  it('São Paulo não tem horário de verão: sempre -03:00 (jan e set)', () => {
    expect(zonedDateTimeToIso('2026-01-15', '10:00', SP)).toBe('2026-01-15T10:00:00-03:00');
    expect(zonedDateTimeToIso('2026-09-28', '10:00', SP)).toBe('2026-09-28T10:00:00-03:00');
  });

  it('outros fusos do Brasil (Manaus -04:00, Noronha -02:00)', () => {
    expect(zonedDateTimeToIso('2026-09-28', '09:00', 'America/Manaus')).toBe('2026-09-28T09:00:00-04:00');
    expect(zonedDateTimeToIso('2026-09-28', '09:00', 'America/Noronha')).toBe('2026-09-28T09:00:00-02:00');
  });

  it('slot às 23:30 em São Paulo fica no mesmo dia local (instante no dia seguinte em UTC)', () => {
    const iso = zonedDateTimeToIso('2026-09-28', '23:30', SP);
    expect(iso).toBe('2026-09-28T23:30:00-03:00');
    expect(new Date(iso).toISOString()).toBe('2026-09-29T02:30:00.000Z');
    // e volta exatamente para 23:30 do dia 28 no fuso do negócio
    expect(formatTimeInTimeZone(iso, SP)).toBe('23:30');
    expect(getDateStringInTimeZone(iso, SP)).toBe('2026-09-28');
  });

  it('slot às 23:30 em Lisboa (verão) = 22:30Z do mesmo dia', () => {
    const iso = zonedDateTimeToIso('2026-09-28', '23:30', LIS);
    expect(new Date(iso).toISOString()).toBe('2026-09-28T22:30:00.000Z');
    expect(getDateStringInTimeZone(iso, LIS)).toBe('2026-09-28');
  });

  it('00:00 e 00:30 (virada do dia) permanecem no dia escolhido', () => {
    expect(zonedDateTimeToIso('2026-09-28', '00:00', SP)).toBe('2026-09-28T00:00:00-03:00');
    expect(zonedDateTimeToIso('2026-09-28', '00:30', LIS)).toBe('2026-09-28T00:30:00+01:00');
  });
});

describe('getTodayInTimeZone (virada do dia perto da meia-noite)', () => {
  // 2026-09-26 02:30Z = 23:30 de 25/09 em São Paulo, 03:30 de 26/09 em Lisboa
  const nearMidnight = new Date('2026-09-26T02:30:00Z');

  it('mesmo instante, "hoje" diferente por negócio', () => {
    expect(getTodayInTimeZone(SP, nearMidnight)).toBe('2026-09-25');
    expect(getTodayInTimeZone(LIS, nearMidnight)).toBe('2026-09-26');
    expect(getTodayInTimeZone('America/Manaus', nearMidnight)).toBe('2026-09-25');
  });

  it('meia-noite exata em São Paulo já é o novo dia', () => {
    expect(getTodayInTimeZone(SP, new Date('2026-09-26T03:00:00Z'))).toBe('2026-09-26');
    expect(getTodayInTimeZone(SP, new Date('2026-09-26T02:59:59Z'))).toBe('2026-09-25');
  });
});

describe('isZonedSlotInPast (bloqueio de horário passado no fuso do negócio)', () => {
  // Agora = 16:00 em São Paulo (19:00Z) = 20:00 em Lisboa
  const now = new Date('2026-09-28T19:00:00Z');

  it('negócio BR às 16:00: 16:30/17:00/19:00 ainda disponíveis, 15:30/16:00 não', () => {
    expect(isZonedSlotInPast('2026-09-28', '15:30', SP, now)).toBe(true);
    expect(isZonedSlotInPast('2026-09-28', '16:00', SP, now)).toBe(true);
    expect(isZonedSlotInPast('2026-09-28', '16:30', SP, now)).toBe(false);
    expect(isZonedSlotInPast('2026-09-28', '17:00', SP, now)).toBe(false);
    expect(isZonedSlotInPast('2026-09-28', '19:00', SP, now)).toBe(false);
  });

  it('negócio PT no mesmo instante (20:00 em Lisboa): 19:30 já passou, 20:30 não', () => {
    expect(isZonedSlotInPast('2026-09-28', '19:30', LIS, now)).toBe(true);
    expect(isZonedSlotInPast('2026-09-28', '20:30', LIS, now)).toBe(false);
  });

  it('23:30 de hoje em SP ainda é futuro às 23:00 locais', () => {
    const at2300 = new Date('2026-09-29T02:00:00Z');
    expect(isZonedSlotInPast('2026-09-28', '23:30', SP, at2300)).toBe(false);
    expect(isZonedSlotInPast('2026-09-28', '22:30', SP, at2300)).toBe(true);
  });
});

describe('helpers de exibição', () => {
  it('formatTimeInTimeZone mostra o mesmo instante na hora do negócio', () => {
    // Agendamento real da Barbearia Bob (PT): 2026-09-08 14:13Z
    expect(formatTimeInTimeZone('2026-09-08T14:13:00Z', LIS)).toBe('15:13');
    expect(formatTimeInTimeZone('2026-09-08T14:13:00Z', SP)).toBe('11:13');
  });

  it('offsets', () => {
    expect(getTimeZoneOffsetMinutes('2026-09-28T12:00:00Z', SP)).toBe(-180);
    expect(getTimeZoneOffsetMinutes('2026-09-28T12:00:00Z', LIS)).toBe(60);
    expect(getTimeZoneOffsetMinutes('2026-12-28T12:00:00Z', LIS)).toBe(0);
  });

  it('addDaysToDateString atravessa mês/ano e DST sem erro', () => {
    expect(addDaysToDateString('2026-09-25', 60)).toBe('2026-11-24');
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateString('2026-10-24', 2)).toBe('2026-10-26');
  });
});

describe('independência do fuso do navegador', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(['America/Sao_Paulo', 'Europe/Lisbon', 'Europe/London', 'America/Manaus', 'UTC', 'Asia/Tokyo'])(
    'mesmo ISO para Lisboa 10:00 e SP 23:30 com o processo em %s',
    (tz) => {
      process.env.TZ = tz;
      expect(zonedDateTimeToIso('2026-09-28', '10:00', LIS)).toBe('2026-09-28T10:00:00+01:00');
      expect(zonedDateTimeToIso('2026-09-28', '23:30', SP)).toBe('2026-09-28T23:30:00-03:00');
      expect(getTodayInTimeZone(SP, new Date('2026-09-26T02:30:00Z'))).toBe('2026-09-25');
      const d = dateStringToLocalDate('2026-09-28');
      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 28]);
    },
  );
});
