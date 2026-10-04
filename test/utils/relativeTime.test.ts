import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agendaPathForNotification, formatRelativeTimeInTimeZone } from '@/utils/relativeTime';

const SP = 'America/Sao_Paulo';

describe('formatRelativeTimeInTimeZone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('agora, minutos, horas e ontem no fuso do negócio', () => {
    vi.setSystemTime(new Date('2026-10-04T12:00:00.000Z'));
    expect(formatRelativeTimeInTimeZone('2026-10-04T12:00:00.000Z', SP)).toBe('agora');
    expect(formatRelativeTimeInTimeZone('2026-10-04T11:55:00.000Z', SP)).toBe('há 5 min');
    expect(formatRelativeTimeInTimeZone('2026-10-04T10:00:00.000Z', SP)).toBe('há 2 h');
    expect(formatRelativeTimeInTimeZone('2026-10-03T15:00:00.000Z', SP)).toBe('ontem');
  });

  it('ontem segue o calendário do negócio, não o UTC', () => {
    // 00:30 em São Paulo = 03:30 UTC; 23:00 do dia anterior SP = 02:00 UTC
    vi.setSystemTime(new Date('2026-10-04T03:30:00.000Z'));
    expect(formatRelativeTimeInTimeZone('2026-10-04T02:00:00.000Z', SP)).toBe('ontem');
  });
});

describe('agendaPathForNotification', () => {
  it('abre a agenda no pedido', () => {
    expect(agendaPathForNotification({ booking_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07' }))
      .toBe('/agenda?booking=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07');
    expect(agendaPathForNotification({ link: '/agenda' })).toBe('/agenda');
  });
});
