import { describe, expect, it } from 'vitest';
import {
  clampQueueLateMinutes,
  lateMinutesDraftFromSettings,
  parseQueueLateMinutesInput,
} from '@/utils/queueLateMinutes';

describe('queueLateMinutes', () => {
  it('permite campo vazio enquanto digita', () => {
    expect(parseQueueLateMinutesInput('')).toBeNull();
    expect(parseQueueLateMinutesInput('   ')).toBeNull();
  });

  it('aceita rascunho numerico sem forcar zero', () => {
    expect(parseQueueLateMinutesInput('1')).toBe(1);
    expect(parseQueueLateMinutesInput('10')).toBe(10);
    expect(parseQueueLateMinutesInput('120')).toBe(120);
    expect(parseQueueLateMinutesInput('12a')).toBeNull();
  });

  it('limita entre 1 e 120 no save', () => {
    expect(clampQueueLateMinutes(0)).toBe(1);
    expect(clampQueueLateMinutes(200)).toBe(120);
    expect(clampQueueLateMinutes(15)).toBe(15);
  });

  it('nao hidrata zero invalido do banco', () => {
    expect(lateMinutesDraftFromSettings(0)).toBe('10');
    expect(lateMinutesDraftFromSettings(8)).toBe('8');
  });
});
