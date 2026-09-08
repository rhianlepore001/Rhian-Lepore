export function minutesSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const started = Date.parse(iso);
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor((now - started) / 60000));
}

export function remainingLateMinutes(
  calledAt: string | null | undefined,
  lateMinutes: number,
  now = Date.now(),
): number | null {
  const elapsed = minutesSince(calledAt, now);
  if (elapsed == null) return null;
  return Math.max(0, lateMinutes - elapsed);
}

export function formatElapsedMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatOrdinalPosition(position: number): string {
  return `${position}º`;
}
