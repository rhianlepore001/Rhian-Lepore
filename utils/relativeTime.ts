import { addDaysToDateString, getDateStringInTimeZone, getTodayInTimeZone, getZonedParts } from './businessTimezone';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Tempo relativo no fuso do negócio (não no do navegador).
 * "agora" / "há 5 min" / "há 2 h" / "ontem" / "há 3 d" / "02/10".
 */
export function formatRelativeTimeInTimeZone(
  iso: string,
  timeZone: string,
  now: Date | number = Date.now(),
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const nowMs = now instanceof Date ? now.getTime() : now;
  const diff = nowMs - then;
  if (diff < 45_000) return 'agora';

  const thenDay = getDateStringInTimeZone(then, timeZone);
  const today = getTodayInTimeZone(timeZone, nowMs);
  const yesterday = addDaysToDateString(today, -1);

  if (thenDay === today) {
    const mins = Math.max(1, Math.round(diff / 60_000));
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.max(1, Math.round(diff / 3_600_000));
    return `há ${hours} h`;
  }
  if (thenDay === yesterday) return 'ontem';

  const days = Math.max(2, Math.round(diff / 86_400_000));
  if (days < 7) return `há ${days} d`;
  const parts = getZonedParts(then, timeZone);
  return `${pad(parts.day)}/${pad(parts.month)}`;
}

export function agendaPathForNotification(item: {
  booking_id?: string | null;
  link?: string | null;
}): string {
  if (item.booking_id) {
    return `/agenda?booking=${encodeURIComponent(item.booking_id)}`;
  }
  return item.link || '/agenda';
}
