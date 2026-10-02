import {
  addDaysToDateString,
  formatTimeInTimeZone,
  getDateStringInTimeZone,
  zonedDateTimeToDate,
} from './businessTimezone';

export type AgendaBlockKind = 'hours' | 'full_day' | 'multi_day';

export interface AgendaBlockRange {
  startsAt: string;
  endsAt: string;
}

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function intervalsOverlap(
  aStart: string | number | Date,
  aEnd: string | number | Date,
  bStart: string | number | Date,
  bEnd: string | number | Date,
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  if (Number.isNaN(as) || Number.isNaN(ae) || Number.isNaN(bs) || Number.isNaN(be)) return false;
  return as < be && ae > bs;
}

export function buildAgendaBlockRange(input: {
  kind: AgendaBlockKind;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timeZone: string;
}): AgendaBlockRange {
  const { kind, startDate, timeZone } = input;
  if (!DATE_RE.test(startDate)) {
    throw new Error('invalid_block_date');
  }

  if (kind === 'hours') {
    const startTime = input.startTime ?? '';
    const endTime = input.endTime ?? '';
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      throw new Error('invalid_block_time');
    }
    if (endTime <= startTime) {
      throw new Error('invalid_block_interval');
    }
    return {
      startsAt: zonedDateTimeToDate(startDate, startTime, timeZone).toISOString(),
      endsAt: zonedDateTimeToDate(startDate, endTime, timeZone).toISOString(),
    };
  }

  if (kind === 'full_day') {
    const next = addDaysToDateString(startDate, 1);
    return {
      startsAt: zonedDateTimeToDate(startDate, '00:00', timeZone).toISOString(),
      endsAt: zonedDateTimeToDate(next, '00:00', timeZone).toISOString(),
    };
  }

  const endDate = input.endDate ?? startDate;
  if (!DATE_RE.test(endDate) || endDate < startDate) {
    throw new Error('invalid_block_interval');
  }
  const afterLast = addDaysToDateString(endDate, 1);
  return {
    startsAt: zonedDateTimeToDate(startDate, '00:00', timeZone).toISOString(),
    endsAt: zonedDateTimeToDate(afterLast, '00:00', timeZone).toISOString(),
  };
}

export interface AgendaBlockInterval {
  starts_at: string;
  ends_at: string;
}

/**
 * Mapeia um bloqueio para índices da grade do dia (slots de 30 min).
 * Intervalo meio-aberto [start, end). Fora do dia visível → null.
 */
export function blockToSlotRange(
  block: AgendaBlockInterval,
  dateStr: string,
  timeSlots: string[],
  timeZone: string,
): { startIdx: number; span: number } | null {
  if (timeSlots.length === 0) return null;
  const dayStart = zonedDateTimeToDate(dateStr, '00:00', timeZone).getTime();
  const dayEnd = zonedDateTimeToDate(addDaysToDateString(dateStr, 1), '00:00', timeZone).getTime();
  const blockStart = new Date(block.starts_at).getTime();
  const blockEnd = new Date(block.ends_at).getTime();
  if (Number.isNaN(blockStart) || Number.isNaN(blockEnd)) return null;
  if (blockStart >= dayEnd || blockEnd <= dayStart) return null;

  const slotMs = 30 * 60_000;
  let startIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < timeSlots.length; i += 1) {
    const slotStart = zonedDateTimeToDate(dateStr, timeSlots[i], timeZone).getTime();
    const slotEnd = slotStart + slotMs;
    if (slotStart < blockEnd && slotEnd > blockStart) {
      if (startIdx < 0) startIdx = i;
      lastIdx = i;
    }
  }
  if (startIdx < 0) return null;
  return { startIdx, span: lastIdx - startIdx + 1 };
}

/**
 * Mesma regra da grade (hora local do dispositivo, como os cards de
 * agendamento). `dateStr` é o dia visível (YYYY-MM-DD local).
 */
export function blockToSlotRangeOnViewDay(
  block: AgendaBlockInterval,
  dateStr: string,
  timeSlots: string[],
): { startIdx: number; span: number } | null {
  if (timeSlots.length === 0) return null;
  const dayStart = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) return null;
  const dayEnd = new Date(dayStart.getTime());
  dayEnd.setDate(dayEnd.getDate() + 1);
  const blockStart = new Date(block.starts_at);
  const blockEnd = new Date(block.ends_at);
  if (Number.isNaN(blockStart.getTime()) || Number.isNaN(blockEnd.getTime())) return null;
  if (blockStart >= dayEnd || blockEnd <= dayStart) return null;
  const clipStart = blockStart < dayStart ? dayStart : blockStart;
  const clipEnd = blockEnd > dayEnd ? dayEnd : blockEnd;
  const slotMs = 30 * 60_000;
  let startIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < timeSlots.length; i += 1) {
    const slotStart = new Date(`${dateStr}T${timeSlots[i]}:00`);
    const slotEnd = new Date(slotStart.getTime() + slotMs);
    if (slotStart < clipEnd && slotEnd > clipStart) {
      if (startIdx < 0) startIdx = i;
      lastIdx = i;
    }
  }
  if (startIdx < 0) return null;
  return { startIdx, span: lastIdx - startIdx + 1 };
}

export function slotOverlapsBlocks(
  dateStr: string,
  time: string,
  durationMin: number,
  blocks: AgendaBlockInterval[],
  professionalId: string,
  timeZone: string,
  blockProfessionalId: (block: AgendaBlockInterval & { professional_id?: string }) => string | undefined = (b) =>
    (b as { professional_id?: string }).professional_id,
): boolean {
  const start = zonedDateTimeToDate(dateStr, time, timeZone);
  const end = new Date(start.getTime() + Math.max(durationMin, 1) * 60_000);
  return blocks.some((b) => {
    const pid = blockProfessionalId(b);
    if (pid && pid !== professionalId) return false;
    return intervalsOverlap(start, end, b.starts_at, b.ends_at);
  });
}

export function formatBlockRangeLabel(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): string {
  const startDay = getDateStringInTimeZone(startsAt, timeZone);
  const endExclusive = getDateStringInTimeZone(endsAt, timeZone);
  const startHm = formatTimeInTimeZone(startsAt, timeZone);
  const endHm = formatTimeInTimeZone(endsAt, timeZone);
  const lastDay = endHm === '00:00' ? addDaysToDateString(endExclusive, -1) : endExclusive;

  const fmt = (isoDay: string) => {
    const [y, m, d] = isoDay.split('-');
    return `${d}/${m}/${y}`;
  };

  if (startDay === lastDay && !(startHm === '00:00' && endHm === '00:00' && startDay !== endExclusive)) {
    if (startHm === '00:00' && endHm === '00:00') {
      return fmt(startDay);
    }
    return `${fmt(startDay)} · ${startHm}–${endHm}`;
  }
  if (startHm === '00:00' && endHm === '00:00') {
    return `${fmt(startDay)} – ${fmt(lastDay)}`;
  }
  return `${fmt(startDay)} ${startHm} – ${fmt(lastDay)} ${endHm}`;
}
