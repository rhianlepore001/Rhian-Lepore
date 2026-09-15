import { describe, expect, it } from 'vitest';
import { TRIAL_DAYS, computeTrialEndsAt } from '@/utils/trial';

describe('trial', () => {
  it('define 20 dias de teste do produto', () => {
    expect(TRIAL_DAYS).toBe(20);
  });

  it('calcula trial_ends_at a partir da data de cadastro', () => {
    const start = new Date('2026-09-15T12:00:00.000Z');
    expect(computeTrialEndsAt(start)).toBe('2026-10-05T12:00:00.000Z');
  });
});
