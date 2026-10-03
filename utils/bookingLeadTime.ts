/** Antecedência mínima do link público (`profiles.booking_lead_time_hours`). */

export const LEAD_TIME_PRESETS = [0, 2, 8, 16, 24] as const;

export type LeadTimePresetHours = (typeof LEAD_TIME_PRESETS)[number];

export const DEFAULT_BOOKING_LEAD_TIME_HOURS = 2;
export const MAX_BOOKING_LEAD_TIME_HOURS = 720;

export function isLeadTimePreset(hours: number): hours is LeadTimePresetHours {
  return (LEAD_TIME_PRESETS as readonly number[]).includes(hours);
}

export function leadTimePresetLabel(hours: number): string {
  if (hours === 0) return 'Sem mínimo';
  return `${hours}h`;
}

export function clampLeadTimeHours(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BOOKING_LEAD_TIME_HOURS;
  return Math.min(MAX_BOOKING_LEAD_TIME_HOURS, Math.max(0, Math.trunc(value)));
}

export function leadTimeViolationMessage(hours: number): string {
  return `Esse horário precisa ser marcado com pelo menos ${hours}h de antecedência`;
}

export function leadTimeEmptySlotsMessage(hours: number, isToday: boolean): string {
  if (isToday) {
    return `Hoje não há horários com ${hours}h de antecedência. Veja amanhã.`;
  }
  return `Não há horários com ${hours}h de antecedência neste dia.`;
}

export function isLeadTimeViolationError(error: unknown): boolean {
  const raw = error && typeof error === 'object' ? error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  } : { message: String(error ?? '') };
  const blob = `${raw.code ?? ''} ${raw.message ?? ''} ${raw.details ?? ''} ${raw.hint ?? ''}`.toLowerCase();
  return blob.includes('lead_time_violation');
}

export function leadTimeHoursFromError(error: unknown, fallback = DEFAULT_BOOKING_LEAD_TIME_HOURS): number {
  const raw = error && typeof error === 'object' ? error as { details?: string } : {};
  const parsed = Number.parseInt(String(raw.details ?? ''), 10);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
}
