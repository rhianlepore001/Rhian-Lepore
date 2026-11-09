import { getTodayInTimeZone } from './businessTimezone';

export function chairHourMonth(timezone: string, now: Date = new Date()): string {
  return `${getTodayInTimeZone(timezone, now).slice(0, 7)}-01`;
}
