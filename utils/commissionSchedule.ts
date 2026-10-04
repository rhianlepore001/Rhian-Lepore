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

export type PayOffsetDays = 0 | 2 | 5;
export type ReminderOffset = 0 | 1 | 2;

export interface CommissionScheduleDraft {
  frequency: CommissionPaymentFrequency;
  closeDays: number[];
  payOffsetDays: PayOffsetDays;
  reminderOffsets: ReminderOffset[];
  anchorDate?: string | null;
}

export const WEEKDAY_FULL = WEEKDAY_LABELS;
export const WEEKDAY_TINY = WEEKDAY_SHORT;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function isoFromParts(year: number, month1: number, day: number): string {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

export function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

export function formatPtDayMonth(iso: string): string {
  const { m, d } = parseIsoDate(iso);
  return `${pad2(d)}/${pad2(m)}`;
}

export function joinPtList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function clampDayOfMonth(year: number, month1: number, day: number): string {
  const last = lastDayOfMonth(year, month1);
  return isoFromParts(year, month1, Math.min(Math.max(day, 1), last));
}

export function addIsoDays(iso: string, days: number): string {
  const { y, m, d } = parseIsoDate(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

export function defaultCloseDays(frequency: CommissionPaymentFrequency): number[] {
  if (frequency === 'weekly') return [1];
  if (frequency === 'biweekly') return [5, 20];
  return [5];
}

export function defaultScheduleDraft(): CommissionScheduleDraft {
  return {
    frequency: 'monthly',
    closeDays: [5],
    payOffsetDays: 2,
    reminderOffsets: [2, 0],
  };
}

function monthCloses(year: number, month1: number, days: number[]): string[] {
  const unique = [...new Set(days.map((day) => clampDayOfMonth(year, month1, day)))];
  unique.sort(compareIso);
  return unique;
}

export function firstCloseOnOrAfter(draft: CommissionScheduleDraft, fromIso: string): string | null {
  const from = parseIsoDate(fromIso);
  if (draft.frequency === 'weekly') {
    const dow = draft.closeDays[0] ?? 1;
    const dt = new Date(Date.UTC(from.y, from.m - 1, from.d));
    const delta = (dow - dt.getUTCDay() + 7) % 7;
    dt.setUTCDate(dt.getUTCDate() + delta);
    return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  let y = from.y;
  let m = from.m;
  for (let i = 0; i < 18; i += 1) {
    for (const iso of monthCloses(y, m, draft.closeDays)) {
      if (compareIso(iso, fromIso) >= 0) return iso;
    }
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return null;
}

export function upcomingCloses(draft: CommissionScheduleDraft, fromIso: string, count = 2): string[] {
  const out: string[] = [];
  let cursor = fromIso;
  for (let i = 0; i < count; i += 1) {
    const next = firstCloseOnOrAfter(draft, cursor);
    if (!next) break;
    out.push(next);
    cursor = addIsoDays(next, 1);
  }
  return out;
}

export function payDuesFromCloses(closes: string[], payOffsetDays: number): string[] {
  return closes.map((c) => addIsoDays(c, payOffsetDays));
}

/** offset 0 = dia do pagamento; 1/2 = N dias antes do fechamento (AC4). */
export function reminderDatesFromPays(
  pays: string[],
  offsets: number[],
  closes: string[] = pays,
): string[] {
  const set = new Set<string>();
  const n = Math.max(pays.length, closes.length);
  for (let i = 0; i < n; i += 1) {
    const close = closes[i] ?? pays[i];
    const pay = pays[i] ?? close;
    if (!close || !pay) continue;
    for (const off of offsets) {
      set.add(off === 0 ? pay : addIsoDays(close, -off));
    }
  }
  return [...set].sort(compareIso);
}

export function draftsEqual(a: CommissionScheduleDraft, b: CommissionScheduleDraft): boolean {
  const days = (d: number[]) => [...d].sort((x, y) => x - y).join(',');
  const rems = (d: number[]) => [...d].sort((x, y) => y - x).join(',');
  return a.frequency === b.frequency
    && a.payOffsetDays === b.payOffsetDays
    && days(a.closeDays) === days(b.closeDays)
    && rems(a.reminderOffsets) === rems(b.reminderOffsets);
}

export function scheduleDraftSummary(draft: CommissionScheduleDraft): string {
  if (draft.frequency === 'weekly') {
    const dow = draft.closeDays[0] ?? 1;
    return `${frequencyLabel('weekly')} · ${WEEKDAY_SHORT[dow] ?? WEEKDAY_SHORT[1]}`;
  }
  if (draft.frequency === 'biweekly') {
    const days = [...draft.closeDays].sort((a, b) => a - b);
    return `${frequencyLabel('biweekly')} · Dias ${days.join(' e ')}`;
  }
  return `${frequencyLabel('monthly')} · Dia ${draft.closeDays[0] ?? 5}`;
}

export function formatLegacyFrequencyResetNotice(ofTheBusiness: string): string {
  return `Revisamos o pagamento da comissão: agora todos seguem a regra ${ofTheBusiness}. Se alguém precisar de outra regra, crie uma exceção.`;
}

export function formatSchedulePreview(input: {
  closes: string[];
  payDues: string[];
  reminders: string[];
}): string {
  const closes = joinPtList(input.closes.map(formatPtDayMonth));
  const pays = joinPtList(input.payDues.map(formatPtDayMonth));
  const rems = joinPtList(input.reminders.map(formatPtDayMonth));
  const parts = [`Próximos fechamentos: ${closes}.`];
  if (pays) parts.push(`Você paga até ${pays}.`);
  if (rems) parts.push(`Lembrete em ${rems}.`);
  return parts.join(' ');
}

export function formatScheduleChangeNotice(currentEnd: string, firstNewClose: string): string {
  return `A mudança vale a partir do próximo fechamento (${formatPtDayMonth(firstNewClose)}). O período atual continua até ${formatPtDayMonth(currentEnd)}.`;
}

export function previewFromDraft(draft: CommissionScheduleDraft, fromIso: string): {
  closes: string[];
  payDues: string[];
  reminders: string[];
  text: string;
} {
  const closes = upcomingCloses(draft, fromIso, 2);
  const payDues = payDuesFromCloses(closes, draft.payOffsetDays);
  const reminders = reminderDatesFromPays(payDues, draft.reminderOffsets, closes);
  return {
    closes,
    payDues,
    reminders,
    text: formatSchedulePreview({ closes, payDues, reminders }),
  };
}

export function validateScheduleDraft(draft: CommissionScheduleDraft): string | null {
  if (draft.frequency === 'weekly') {
    if (draft.closeDays.length !== 1 || draft.closeDays[0] < 0 || draft.closeDays[0] > 6) {
      return 'Escolha um dia da semana.';
    }
  } else if (draft.frequency === 'monthly') {
    if (draft.closeDays.length !== 1 || draft.closeDays[0] < 1 || draft.closeDays[0] > 31) {
      return 'Escolha o dia do mês.';
    }
  } else {
    if (draft.closeDays.length !== 2) return 'Quinzenal precisa de dois dias do mês.';
    const [a, b] = [...draft.closeDays].sort((x, y) => x - y);
    if (a === b || Math.abs(a - b) < 7) return 'Os dois dias precisam ter pelo menos 7 dias de intervalo.';
    if (a < 1 || b > 31) return 'Escolha dois dias entre 1 e 31.';
  }
  if (![0, 2, 5].includes(draft.payOffsetDays)) return 'Prazo de pagamento inválido.';
  if (draft.reminderOffsets.length < 1) return 'Escolha pelo menos um lembrete.';
  return null;
}

export function payOffsetLabel(offset: PayOffsetDays): string {
  if (offset === 0) return 'no mesmo dia';
  if (offset === 2) return 'até 2 dias depois';
  return 'até 5 dias depois';
}

export function reminderOffsetLabel(offset: ReminderOffset): string {
  if (offset === 2) return '2 dias antes';
  if (offset === 1) return '1 dia antes';
  return 'no dia do pagamento';
}

export function scheduleRowToDraft(row: {
  frequency?: string | null;
  close_days?: number[] | null;
  pay_offset_days?: number | null;
  reminder_offsets?: number[] | null;
} | null | undefined): CommissionScheduleDraft {
  const frequency = normalizePaymentFrequency(row?.frequency);
  const closeDays = row?.close_days && row.close_days.length > 0
    ? [...row.close_days]
    : defaultCloseDays(frequency);
  const pay = row?.pay_offset_days;
  const payOffsetDays: PayOffsetDays = pay === 0 || pay === 2 || pay === 5 ? pay : 2;
  const rem = (row?.reminder_offsets ?? [2, 0]).filter((n): n is ReminderOffset => n === 0 || n === 1 || n === 2);
  return {
    frequency,
    closeDays,
    payOffsetDays,
    reminderOffsets: rem.length ? rem : [2, 0],
  };
}
