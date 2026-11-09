import { describe, expect, it } from 'vitest';
import { chairHourMonth } from '@/utils/chairHourPeriod';

describe('mês de análise da hora de trabalho', () => {
  it('usa o mês no fuso do estabelecimento', () => {
    const instant = new Date('2026-11-01T01:00:00Z');
    expect(chairHourMonth('America/Sao_Paulo', instant)).toBe('2026-10-01');
    expect(chairHourMonth('Europe/Lisbon', instant)).toBe('2026-11-01');
  });
});
