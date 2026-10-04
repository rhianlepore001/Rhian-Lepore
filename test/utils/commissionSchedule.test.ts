import { describe, expect, it } from 'vitest';
import {
  defaultPaymentDay,
  formatLegacyFrequencyResetNotice,
  formatScheduleChangeNotice,
  frequencyLabel,
  normalizePaymentFrequency,
  paymentDayLabel,
  paymentDayOptions,
  previewFromDraft,
  scheduleDraftSummary,
  scheduleSummary,
  validateScheduleDraft,
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
    expect(scheduleDraftSummary({
      frequency: 'biweekly',
      closeDays: [20, 5],
      payOffsetDays: 2,
      reminderOffsets: [2, 0],
    })).toBe('Quinzenal · Dias 5 e 20');
  });

  it('oferece opcoes coerentes por frequencia', () => {
    expect(defaultPaymentDay('weekly')).toBe(1);
    expect(defaultPaymentDay('biweekly')).toBe(1);
    expect(defaultPaymentDay('monthly')).toBe(5);
    expect(paymentDayOptions('weekly')).toHaveLength(7);
    expect(paymentDayOptions('biweekly')).toHaveLength(15);
    expect(paymentDayOptions('monthly')).toHaveLength(31);
  });

  it('preview quinzenal 5 e 20 com pagar até +2 e lembrete 2 dias antes do fechamento', () => {
    const preview = previewFromDraft({
      frequency: 'biweekly',
      closeDays: [5, 20],
      payOffsetDays: 2,
      reminderOffsets: [2],
    }, '2026-10-04');
    expect(preview.closes).toEqual(['2026-10-05', '2026-10-20']);
    expect(preview.payDues).toEqual(['2026-10-07', '2026-10-22']);
    expect(preview.reminders).toEqual(['2026-10-03', '2026-10-18']);
    expect(preview.text).toBe(
      'Próximos fechamentos: 05/10 e 20/10. Você paga até 07/10 e 22/10. Lembrete em 03/10 e 18/10.',
    );
  });

  it('preview avisa que a mudança vale no próximo fechamento', () => {
    expect(formatScheduleChangeNotice('2026-10-05', '2026-10-20')).toBe(
      'A mudança vale a partir do próximo fechamento (20/10). O período atual continua até 05/10.',
    );
  });

  it('quinzenal 15/30 em fevereiro vira 15 e último dia do mês', () => {
    const preview = previewFromDraft({
      frequency: 'biweekly',
      closeDays: [15, 30],
      payOffsetDays: 2,
      reminderOffsets: [2, 0],
    }, '2026-02-01');
    expect(preview.closes).toEqual(['2026-02-15', '2026-02-28']);
    expect(preview.text).toContain('15/02 e 28/02');
  });

  it('dia 31 em mês curto vira o último dia', () => {
    const preview = previewFromDraft({
      frequency: 'monthly',
      closeDays: [31],
      payOffsetDays: 0,
      reminderOffsets: [0],
    }, '2026-02-01');
    expect(preview.closes[0]).toBe('2026-02-28');
    expect(preview.text).toContain('28/02');
  });

  it('aviso único usa o substantivo do negócio', () => {
    expect(formatLegacyFrequencyResetNotice('da barbearia')).toBe(
      'Revisamos o pagamento da comissão: agora todos seguem a regra da barbearia. Se alguém precisar de outra regra, crie uma exceção.',
    );
    expect(formatLegacyFrequencyResetNotice('do negócio')).toContain('regra do negócio');
  });

  it('quinzenal exige >= 7 dias dentro do mês E na virada do mês', () => {
    const msg = 'Os dois fechamentos precisam ter pelo menos 7 dias entre eles, inclusive na virada do mês.';
    const d = (closeDays: number[]) => validateScheduleDraft({
      frequency: 'biweekly', closeDays, payOffsetDays: 2, reminderOffsets: [2],
    });
    expect(d([2, 28])).toBe(msg); // virada: 2 dias
    expect(d([28, 2])).toBe(msg);
    expect(d([5, 10])).toBe(msg); // dentro do mês: 5 dias
    expect(d([1, 23])).toBe(msg); // 22 > 21
    expect(d([24, 31])).toBe(msg); // fevereiro: 31 vira 28, só 4 dias
    expect(d([5, 5])).toBe(msg);
    expect(d([1, 22])).toBeNull(); // 21: limite
    expect(d([10, 17])).toBeNull(); // 7: limite
    expect(d([5, 20])).toBeNull();
    expect(d([1, 16])).toBeNull();
    expect(d([15, 30])).toBeNull();
    expect(d([10, 31])).toBeNull(); // fevereiro: 10 e 28 = 18 dias
    expect(d([21, 29])).toBeNull(); // fevereiro: 21 e 28 = 7 dias
  });
});
