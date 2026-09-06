import { describe, expect, it } from 'vitest';
import {
  daysUntilSettlement,
  defaultPaymentDay,
  frequencyLabel,
  isSettlementWithinWindow,
  normalizePaymentFrequency,
  paymentDayLabel,
  paymentDayOptions,
  scheduleSummary,
} from '@/utils/commissionSchedule';

describe('commissionSchedule', () => {
  it('normaliza frequencias desconhecidas para monthly', () => {
    expect(normalizePaymentFrequency('biweekly')).toBe('biweekly');
    expect(normalizePaymentFrequency('weekly')).toBe('weekly');
    expect(normalizePaymentFrequency('monthly')).toBe('monthly');
    expect(normalizePaymentFrequency('foo')).toBe('monthly');
    expect(normalizePaymentFrequency(undefined)).toBe('monthly');
  });

  it('rotula frequencias e dias', () => {
    expect(frequencyLabel('weekly')).toBe('Semanal');
    expect(frequencyLabel('biweekly')).toBe('Quinzenal');
    expect(frequencyLabel('monthly')).toBe('Mensal');
    expect(paymentDayLabel('weekly', 1)).toBe('Seg');
    expect(paymentDayLabel('biweekly', 5)).toBe('Dias 5 e 20');
    expect(paymentDayLabel('monthly', 5)).toBe('Dia 5');
    expect(scheduleSummary('biweekly', 1)).toBe('Quinzenal · Dias 1 e 16');
  });

  it('oferece opcoes coerentes por frequencia', () => {
    expect(defaultPaymentDay('weekly')).toBe(1);
    expect(defaultPaymentDay('biweekly')).toBe(1);
    expect(defaultPaymentDay('monthly')).toBe(5);
    expect(paymentDayOptions('weekly')).toHaveLength(7);
    expect(paymentDayOptions('biweekly')).toHaveLength(15);
    expect(paymentDayOptions('monthly')).toHaveLength(31);
  });

  it('calcula dias ate o acerto semanal, quinzenal e mensal', () => {
    const sunday = new Date(2026, 8, 6);
    expect(daysUntilSettlement('weekly', 0, sunday)).toBe(0);
    expect(daysUntilSettlement('weekly', 5, sunday)).toBe(5);
    expect(daysUntilSettlement('biweekly', 7, sunday)).toBe(1);
    expect(daysUntilSettlement('monthly', 6, sunday)).toBe(0);
    expect(daysUntilSettlement('monthly', 5, sunday)).toBeGreaterThan(0);
    expect(isSettlementWithinWindow('biweekly', 7, sunday, 2)).toBe(true);
    expect(isSettlementWithinWindow('weekly', 5, sunday, 2)).toBe(false);
  });

  it('quinzenal em fevereiro usa o ultimo dia do mes quando 30 nao existe', () => {
    const feb20 = new Date(2026, 1, 20);
    expect(daysUntilSettlement('biweekly', 15, feb20)).toBe(8);
  });
});
