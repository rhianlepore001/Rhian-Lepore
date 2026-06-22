import { describe, it, expect } from 'vitest';
import { getVisualStatus } from '@/utils/appointmentStatus.ts';

// Arsenal adversarial: tenta quebrar getVisualStatus com dados de borda.
// Asserções refletem o COMPORTAMENTO ATUAL (evidência). Comentários marcam o que é frágil.

const NOON = new Date('2026-06-21T12:00:00.000Z');

describe('appointmentStatus — ATAQUE 1: boundary', () => {
  it('duration_minutes = 0 → overdue só após os 15min de tolerância', () => {
    const apt = { status: 'Confirmed', appointment_time: '2026-06-21T11:44:00.000Z', duration_minutes: 0 };
    expect(getVisualStatus(apt, NOON)).toBe('overdue'); // 11:44 + 0 + 15 = 11:59 < 12:00
    const apt2 = { status: 'Confirmed', appointment_time: '2026-06-21T11:46:00.000Z', duration_minutes: 0 };
    expect(getVisualStatus(apt2, NOON)).toBe('normal'); // 11:46 + 0 + 15 = 12:01 > 12:00
  });

  it('duration_minutes = 9999 → nunca overdue (deadline longe no futuro)', () => {
    const apt = { status: 'Confirmed', appointment_time: '2026-06-21T06:00:00.000Z', duration_minutes: 9999 };
    expect(getVisualStatus(apt, NOON)).toBe('normal');
  });

  it('CORRIGIDO: duration_minutes NEGATIVO é tratado como 0 (não antecipa o atraso)', () => {
    // appointment às 12:00, duração -60 → clampada para 0 → deadline = 12:00 + 0 + 15 = 12:15
    const apt = { status: 'Confirmed', appointment_time: '2026-06-21T12:00:00.000Z', duration_minutes: -60 };
    // now 11:50 é antes do horário → normal (não mais overdue)
    expect(getVisualStatus(apt, new Date('2026-06-21T11:50:00.000Z'))).toBe('normal');
  });

  it('appointment_time 23:59 + duração cruzando meia-noite → usa timestamp absoluto (sem bug de virada de dia)', () => {
    const apt = { status: 'Confirmed', appointment_time: '2026-06-21T23:59:00.000Z', duration_minutes: 30 };
    // deadline = 22/06 00:44. Antes disso → normal; depois → overdue
    expect(getVisualStatus(apt, new Date('2026-06-22T00:30:00.000Z'))).toBe('normal');
    expect(getVisualStatus(apt, new Date('2026-06-22T01:00:00.000Z'))).toBe('overdue');
  });

  it('appointment_time inválido → normal (sem crash)', () => {
    expect(getVisualStatus({ status: 'Confirmed', appointment_time: 'not-a-date', duration_minutes: 30 }, NOON)).toBe('normal');
    expect(getVisualStatus({ status: 'Pending', appointment_time: '24:00', duration_minutes: 30 }, NOON)).toBe('normal');
  });
});

describe('appointmentStatus — case-insensitivity de status (corrigido)', () => {
  it('CORRIGIDO: status em lowercase é reconhecido como terminal', () => {
    expect(getVisualStatus({ status: 'completed', appointment_time: '2026-06-21T08:00:00.000Z' }, NOON)).toBe('completed');
    expect(getVisualStatus({ status: 'cancelled', appointment_time: '2026-06-21T08:00:00.000Z' }, NOON)).toBe('cancelled');
    expect(getVisualStatus({ status: 'no_show', appointment_time: '2026-06-21T08:00:00.000Z' }, NOON)).toBe('noshow');
  });

  it('CORRIGIDO: status com espaços extras é normalizado (trim)', () => {
    expect(getVisualStatus({ status: ' Completed ', appointment_time: '2026-06-21T08:00:00.000Z' }, NOON)).toBe('completed');
  });
});
