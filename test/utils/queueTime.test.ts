import { describe, expect, it } from 'vitest';
import { formatElapsedMinutes, formatOrdinalPosition, minutesSince, remainingLateMinutes } from '@/utils/queueTime';

describe('queueTime', () => {
  const now = Date.parse('2026-09-08T12:00:00.000Z');

  it('conta minutos desde um instante e ignora datas inválidas', () => {
    expect(minutesSince('2026-09-08T11:35:00.000Z', now)).toBe(25);
    expect(minutesSince('2026-09-08T12:05:00.000Z', now)).toBe(0);
    expect(minutesSince('nada', now)).toBeNull();
    expect(minutesSince(null, now)).toBeNull();
  });

  it('calcula o prazo restante após a chamada sem ficar negativo', () => {
    expect(remainingLateMinutes('2026-09-08T11:56:00.000Z', 10, now)).toBe(6);
    expect(remainingLateMinutes('2026-09-08T11:40:00.000Z', 10, now)).toBe(0);
    expect(remainingLateMinutes(null, 10, now)).toBeNull();
  });

  it('formata minutos em horas quando passa de 60', () => {
    expect(formatElapsedMinutes(45)).toBe('45 min');
    expect(formatElapsedMinutes(60)).toBe('1 h');
    expect(formatElapsedMinutes(75)).toBe('1 h 15 min');
  });

  it('formata posição ordinal', () => {
    expect(formatOrdinalPosition(1)).toBe('1º');
    expect(formatOrdinalPosition(12)).toBe('12º');
  });
});
