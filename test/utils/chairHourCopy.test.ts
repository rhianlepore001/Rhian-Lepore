import { describe, expect, it } from 'vitest';
import { formatHours, outOfTen, periodLabel, pickTip, previousPeriod } from '@/utils/chairHourCopy';

describe('chairHourCopy', () => {
  it('traduz ocupação em "x de cada 10" sem inventar valores', () => {
    expect(outOfTen(0.7)).toBe('7 de cada 10');
    expect(outOfTen(0.02)).toBe('menos de 1 de cada 10');
    expect(outOfTen(1.4)).toBe('10 de cada 10');
    expect(outOfTen(null)).toBeNull();
    expect(outOfTen(Number.NaN)).toBeNull();
  });
  it('formata horas e período em linguagem simples', () => {
    expect(formatHours(2520)).toBe('42 h');
    expect(formatHours(90)).toBe('1,5 h');
    expect(formatHours(null)).toBeNull();
    expect(periodLabel('2026-10-01', null)).toBe('Outubro de 2026');
    expect(periodLabel('2026-11-04', '2026-11-09')).toBe('04/11/2026 a 09/11/2026');
  });
  it('calcula o período anterior do mesmo tamanho', () => {
    expect(previousPeriod('2026-01-01', null)).toEqual({ start: '2025-12-01', end: null });
    expect(previousPeriod('2026-11-04', '2026-11-09')).toEqual({ start: '2026-10-29', end: '2026-11-03' });
    expect(previousPeriod('x', null)).toBeNull();
  });
  it('só dá dica quando os números sustentam', () => {
    expect(pickTip({ availableMinutes: null, occupancy: 0.2, costPerHour: 30, marginPerHour: 1 })).toBeNull();
    expect(pickTip({ availableMinutes: 600, occupancy: 0.9, costPerHour: null, marginPerHour: null })).toBeNull();
    expect(pickTip({ availableMinutes: 600, occupancy: 0.9, costPerHour: 30, marginPerHour: -2 })).toMatch(/não pagam as contas/);
    expect(pickTip({ availableMinutes: 600, occupancy: 0.4, costPerHour: 30, marginPerHour: 5 })).toMatch(/horários ficaram vazios/);
    expect(pickTip({ availableMinutes: 600, occupancy: 0.9, costPerHour: 30, marginPerHour: 5, lossService: 'Hidratação' })).toMatch(/Hidratação/);
    expect(pickTip({ availableMinutes: 600, occupancy: 0.9, costPerHour: 30, marginPerHour: 5 })).toMatch(/Bom ritmo/);
  });
});
