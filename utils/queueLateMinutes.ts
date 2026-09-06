export const QUEUE_LATE_MINUTES_MIN = 1;
export const QUEUE_LATE_MINUTES_MAX = 120;

export function parseQueueLateMinutesInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value)) return null;
  return value;
}

export function clampQueueLateMinutes(value: number): number {
  return Math.min(QUEUE_LATE_MINUTES_MAX, Math.max(QUEUE_LATE_MINUTES_MIN, value));
}

export function lateMinutesDraftFromSettings(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < QUEUE_LATE_MINUTES_MIN) {
    return '10';
  }
  return String(clampQueueLateMinutes(value));
}
