import { describe, expect, it } from 'vitest';
import {
  clampLeadTimeHours,
  isLeadTimePreset,
  isLeadTimeViolationError,
  leadTimeEmptySlotsMessage,
  leadTimeHoursFromError,
  leadTimePresetLabel,
  leadTimeViolationMessage,
} from '@/utils/bookingLeadTime';

describe('bookingLeadTime copy e presets', () => {
  it('rótulos dos presets incluem Sem mínimo e 8/16/24h', () => {
    expect(leadTimePresetLabel(0)).toBe('Sem mínimo');
    expect(leadTimePresetLabel(2)).toBe('2h');
    expect(leadTimePresetLabel(8)).toBe('8h');
    expect(leadTimePresetLabel(16)).toBe('16h');
    expect(leadTimePresetLabel(24)).toBe('24h');
    expect(isLeadTimePreset(2)).toBe(true);
    expect(isLeadTimePreset(3)).toBe(false);
  });

  it('mensagem de recusa usa o Xh do critério', () => {
    expect(leadTimeViolationMessage(8)).toBe(
      'Esse horário precisa ser marcado com pelo menos 8h de antecedência',
    );
  });

  it('empty state de hoje cita a antecedência e manda ver amanhã', () => {
    expect(leadTimeEmptySlotsMessage(8, true)).toBe(
      'Hoje não há horários com 8h de antecedência. Veja amanhã.',
    );
    expect(leadTimeEmptySlotsMessage(2, false)).toBe(
      'Não há horários com 2h de antecedência neste dia.',
    );
  });

  it('detecta lead_time_violation e lê as horas do DETAIL', () => {
    const err = { code: 'P0001', message: 'lead_time_violation', details: '16', hint: 'lead_time_violation' };
    expect(isLeadTimeViolationError(err)).toBe(true);
    expect(leadTimeHoursFromError(err)).toBe(16);
    expect(isLeadTimeViolationError({ message: 'slot_unavailable' })).toBe(false);
  });

  it('clampa Outro para inteiro ≥ 0', () => {
    expect(clampLeadTimeHours(3.9)).toBe(3);
    expect(clampLeadTimeHours(-4)).toBe(0);
    expect(clampLeadTimeHours(9000)).toBe(720);
  });
});
