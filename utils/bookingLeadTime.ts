/** Antecedência mínima do link público (`profiles.booking_lead_time_hours`). */

export const LEAD_TIME_PRESETS = [0, 2, 8, 16, 24] as const;

export type LeadTimePresetHours = (typeof LEAD_TIME_PRESETS)[number];

export const DEFAULT_BOOKING_LEAD_TIME_HOURS = 2;
export const MAX_BOOKING_LEAD_TIME_HOURS = 720;
export const SEE_TOMORROW_MAX_LEAD_HOURS = 16;

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

export function parseCustomLeadTimeHours(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return clampLeadTimeHours(parsed);
}

export const LEAD_TIME_CUSTOM_EMPTY_ERROR = 'Informe as horas de antecedência';
export const LEAD_TIME_CUSTOM_RANGE_HINT = '0 a 720';

export function leadTimeViolationMessage(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours < 0) {
    return 'Esse horário precisa ser marcado com mais antecedência';
  }
  return `Esse horário precisa ser marcado com pelo menos ${hours}h de antecedência`;
}

export function leadTimeEmptySlotsMessage(
  hours: number,
  isToday: boolean,
  opts?: { hasCta?: boolean },
): string {
  if (opts?.hasCta) {
    return isToday
      ? `Hoje não há horários com ${hours}h de antecedência.`
      : `Sem horários com ${hours}h de antecedência.`;
  }
  const tomorrow = hours <= SEE_TOMORROW_MAX_LEAD_HOURS;
  if (isToday) {
    return tomorrow
      ? `Hoje não há horários com ${hours}h de antecedência. Veja amanhã.`
      : `Hoje não há horários com ${hours}h de antecedência. Escolha outro dia.`;
  }
  return tomorrow
    ? `Não há horários com ${hours}h de antecedência neste dia.`
    : `Não há horários com ${hours}h de antecedência neste dia. Escolha outro dia.`;
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

export function leadTimeHoursFromError(error: unknown, fallback: number | null = null): number | null {
  const raw = error && typeof error === 'object' ? error as { details?: string } : {};
  const parsed = Number.parseInt(String(raw.details ?? ''), 10);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
}

/* ------------------------------------------------------------------------- */
/* Precisão de minutos (`profiles.booking_lead_time_minutes`).                */
/* NULL/ausente = `booking_lead_time_hours * 60` (valores antigos intactos).   */
/* ------------------------------------------------------------------------- */

export const MAX_BOOKING_LEAD_TIME_MINUTES = MAX_BOOKING_LEAD_TIME_HOURS * 60;
export const DEFAULT_BOOKING_LEAD_TIME_MINUTES = DEFAULT_BOOKING_LEAD_TIME_HOURS * 60;
export const LEAD_TIME_CUSTOM_MINUTES_RANGE_HINT = 'Horas de 0 a 720 e minutos de 0 a 59.';
export const LEAD_TIME_CUSTOM_MINUTES_ERROR = 'Os minutos vão de 0 a 59.';
export const LEAD_TIME_CUSTOM_HOURS_ERROR = 'As horas vão de 0 a 720.';
export const LEAD_TIME_CUSTOM_MAX_ERROR = 'O máximo é 720h.';
export const LEAD_TIME_CUSTOM_BOTH_EMPTY_ERROR = 'Informe horas e/ou minutos de antecedência.';

export function clampLeadTimeMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BOOKING_LEAD_TIME_MINUTES;
  return Math.min(MAX_BOOKING_LEAD_TIME_MINUTES, Math.max(0, Math.trunc(value)));
}

/** Minutos efetivos a partir do perfil: coluna nova quando gravada, senão horas×60. */
export function resolveLeadTimeMinutes(profile: {
  booking_lead_time_minutes?: number | null;
  booking_lead_time_hours?: number | null;
} | null | undefined): number {
  const minutes = profile?.booking_lead_time_minutes;
  if (typeof minutes === 'number' && Number.isFinite(minutes)) return clampLeadTimeMinutes(minutes);
  const hours = profile?.booking_lead_time_hours;
  if (typeof hours === 'number' && Number.isFinite(hours)) return clampLeadTimeMinutes(hours * 60);
  return DEFAULT_BOOKING_LEAD_TIME_MINUTES;
}

/** Horas gravadas junto (compatibilidade/rollback): teto, nunca mais permissivo. */
export function leadTimeHoursForMinutes(minutes: number): number {
  return clampLeadTimeHours(Math.ceil(clampLeadTimeMinutes(minutes) / 60));
}

export function isLeadTimePresetMinutes(minutes: number): boolean {
  return minutes % 60 === 0 && isLeadTimePreset(minutes / 60);
}

export function splitLeadTimeMinutes(minutes: number): { hours: number; minutes: number } {
  const total = clampLeadTimeMinutes(minutes);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** "2h", "1h30", "20 min", "0 min". */
export function formatLeadTimeDuration(minutes: number): string {
  const { hours, minutes: rest } = splitLeadTimeMinutes(minutes);
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

export type CustomLeadTimeParse =
  | { ok: true; minutes: number }
  | { ok: false; error: string };

/** Campos "Outro": horas (0..720) + minutos (0..59). Vazio conta como 0; os dois vazios = erro. */
export function parseCustomLeadTime(hoursRaw: string, minutesRaw: string): CustomLeadTimeParse {
  const h = hoursRaw.trim();
  const m = minutesRaw.trim();
  if (h === '' && m === '') return { ok: false, error: LEAD_TIME_CUSTOM_BOTH_EMPTY_ERROR };
  if ((h !== '' && !/^\d+$/.test(h)) || (m !== '' && !/^\d+$/.test(m))) {
    return { ok: false, error: LEAD_TIME_CUSTOM_BOTH_EMPTY_ERROR };
  }
  const hours = h === '' ? 0 : Number.parseInt(h, 10);
  const mins = m === '' ? 0 : Number.parseInt(m, 10);
  if (mins > 59) return { ok: false, error: LEAD_TIME_CUSTOM_MINUTES_ERROR };
  if (hours > MAX_BOOKING_LEAD_TIME_HOURS) return { ok: false, error: LEAD_TIME_CUSTOM_HOURS_ERROR };
  const total = hours * 60 + mins;
  if (total > MAX_BOOKING_LEAD_TIME_MINUTES) return { ok: false, error: LEAD_TIME_CUSTOM_MAX_ERROR };
  return { ok: true, minutes: total };
}

function clockLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Exemplo do card de configurações, sempre a partir de "14h":
 * "Com 1h30: se agora são 14h, o cliente só vê horários a partir das 15h30."
 */
export function leadTimeExample(minutes: number): string {
  const total = clampLeadTimeMinutes(minutes);
  if (total === 0) {
    return 'Sem mínimo: o cliente vê qualquer horário livre que ainda não passou. Se agora são 14h, um horário às 14h10 já aparece.';
  }
  const start = 14 * 60;
  const end = start + total;
  const days = Math.floor(end / (24 * 60));
  const when = days === 0
    ? `a partir das ${clockLabel(end)}`
    : days === 1
      ? `a partir de amanhã às ${clockLabel(end)}`
      : `a partir de daqui a ${days} dias, às ${clockLabel(end)}`;
  return `Com ${formatLeadTimeDuration(total)}: se agora são 14h, o cliente só vê horários ${when}.`;
}

/** Recusa do servidor: DETAIL "2" (horas cheias) ou "minutes=90". */
export function leadTimeMinutesFromError(error: unknown, fallback: number | null = null): number | null {
  const raw = error && typeof error === 'object' ? error as { details?: string } : {};
  const details = String(raw.details ?? '').trim();
  const m = /^minutes=(\d+)$/.exec(details);
  if (m) return Number.parseInt(m[1], 10);
  if (/^\d+$/.test(details)) return Number.parseInt(details, 10) * 60;
  return fallback;
}

export function leadTimeViolationMessageMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return leadTimeViolationMessage(null);
  return `Esse horário precisa ser marcado com pelo menos ${formatLeadTimeDuration(minutes)} de antecedência`;
}

export function leadTimeEmptySlotsMessageMinutes(
  minutes: number,
  isToday: boolean,
  opts?: { hasCta?: boolean },
): string {
  const label = formatLeadTimeDuration(minutes);
  if (opts?.hasCta) {
    return isToday
      ? `Hoje não há horários com ${label} de antecedência.`
      : `Sem horários com ${label} de antecedência.`;
  }
  const tomorrow = minutes <= SEE_TOMORROW_MAX_LEAD_HOURS * 60;
  if (isToday) {
    return tomorrow
      ? `Hoje não há horários com ${label} de antecedência. Veja amanhã.`
      : `Hoje não há horários com ${label} de antecedência. Escolha outro dia.`;
  }
  return tomorrow
    ? `Não há horários com ${label} de antecedência neste dia.`
    : `Não há horários com ${label} de antecedência neste dia. Escolha outro dia.`;
}
