export type CommissionPaymentFrequency = 'weekly' | 'biweekly' | 'monthly';

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export function normalizePaymentFrequency(
  value: string | null | undefined,
): CommissionPaymentFrequency {
  if (value === 'weekly' || value === 'biweekly' || value === 'monthly') return value;
  return 'monthly';
}

export function frequencyLabel(frequency: CommissionPaymentFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quinzenal';
    default:
      return 'Mensal';
  }
}

export function paymentDayLabel(
  frequency: CommissionPaymentFrequency,
  day: number | null | undefined,
): string {
  const safeDay = typeof day === 'number' && !Number.isNaN(day) ? day : frequency === 'weekly' ? 1 : 5;
  if (frequency === 'weekly') {
    return WEEKDAY_SHORT[safeDay] ?? WEEKDAY_SHORT[1];
  }
  if (frequency === 'biweekly') {
    const first = Math.min(Math.max(safeDay, 1), 15);
    const second = first + 15;
    return `Dias ${first} e ${second}`;
  }
  return `Dia ${Math.min(Math.max(safeDay, 1), 31)}`;
}

export function scheduleSummary(
  frequency: CommissionPaymentFrequency | string | null | undefined,
  day: number | null | undefined,
): string {
  const freq = normalizePaymentFrequency(frequency ?? undefined);
  return `${frequencyLabel(freq)} · ${paymentDayLabel(freq, day)}`;
}

export function defaultPaymentDay(frequency: CommissionPaymentFrequency): number {
  if (frequency === 'weekly') return 1;
  if (frequency === 'biweekly') return 1;
  return 5;
}

export function paymentDayOptions(
  frequency: CommissionPaymentFrequency,
): Array<{ value: number; label: string }> {
  if (frequency === 'weekly') {
    return WEEKDAY_LABELS.map((label, value) => ({ value, label }));
  }
  if (frequency === 'biweekly') {
    return Array.from({ length: 15 }, (_, i) => {
      const day = i + 1;
      return { value: day, label: `Dias ${day} e ${day + 15}` };
    });
  }
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    return { value: day, label: `Dia ${day}` };
  });
}
