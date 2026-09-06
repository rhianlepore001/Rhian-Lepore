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

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function daysBetweenLocal(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Dias até o próximo acerto (0 = hoje). Semanal usa weekday JS (0=Dom).
 * Quinzenal usa `day` e `day+15`, limitados ao último dia do mês.
 */
export function daysUntilSettlement(
  frequency: CommissionPaymentFrequency | string | null | undefined,
  day: number | null | undefined,
  today: Date = new Date(),
): number {
  const freq = normalizePaymentFrequency(frequency);
  const year = today.getFullYear();
  const month = today.getMonth();

  if (freq === 'weekly') {
    const targetDow = Math.min(Math.max(typeof day === 'number' ? day : 1, 0), 6);
    return (targetDow - today.getDay() + 7) % 7;
  }

  if (freq === 'biweekly') {
    const first = Math.min(Math.max(typeof day === 'number' ? day : 1, 1), 15);
    const currentDay = today.getDate();
    const thisMonthDays = [first, first + 15]
      .map((candidate) => clampDayOfMonth(year, month, candidate))
      .filter((candidate, index, all) => all.indexOf(candidate) === index && candidate >= currentDay);
    if (thisMonthDays.length > 0) {
      return Math.min(...thisMonthDays) - currentDay;
    }
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const nextMonthIndex = nextMonth % 12;
    const nextDate = new Date(nextYear, nextMonthIndex, clampDayOfMonth(nextYear, nextMonthIndex, first));
    return daysBetweenLocal(today, nextDate);
  }

  const settlement = Math.min(Math.max(typeof day === 'number' ? day : 5, 1), 31);
  const thisMonthDay = clampDayOfMonth(year, month, settlement);
  if (today.getDate() <= thisMonthDay) {
    return thisMonthDay - today.getDate();
  }
  const nextMonth = month + 1;
  const nextYear = nextMonth > 11 ? year + 1 : year;
  const nextMonthIndex = nextMonth % 12;
  const nextDate = new Date(
    nextYear,
    nextMonthIndex,
    clampDayOfMonth(nextYear, nextMonthIndex, settlement),
  );
  return daysBetweenLocal(today, nextDate);
}

export function isSettlementWithinWindow(
  frequency: CommissionPaymentFrequency | string | null | undefined,
  day: number | null | undefined,
  today: Date = new Date(),
  windowDays = 2,
): boolean {
  const remaining = daysUntilSettlement(frequency, day, today);
  return remaining >= 0 && remaining <= windowDays;
}
