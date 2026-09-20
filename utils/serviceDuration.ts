/** Preset durations shown in the service editor select (minutes). */
export const SERVICE_DURATION_PRESETS = [15, 30, 45, 60] as const;

export type ServiceDurationSelection =
  | { mode: 'preset'; minutes: (typeof SERVICE_DURATION_PRESETS)[number] }
  | { mode: 'custom'; hours: number; minutes: number };

export function isPresetDuration(minutes: number): boolean {
  return (SERVICE_DURATION_PRESETS as readonly number[]).includes(minutes);
}

/** Resolve editor state from a stored duration_minutes value. */
export function selectionFromDurationMinutes(minutes: number | null | undefined): {
  selectValue: string;
  customHours: string;
  customMinutes: string;
} {
  const value = typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 30;
  if (isPresetDuration(value)) {
    return { selectValue: String(value), customHours: '0', customMinutes: '0' };
  }
  return {
    selectValue: 'custom',
    customHours: String(Math.floor(value / 60)),
    customMinutes: String(value % 60),
  };
}

export function minutesFromSelection(
  selectValue: string,
  customHours: string,
  customMinutes: string,
): number {
  if (selectValue !== 'custom') {
    const preset = parseInt(selectValue, 10);
    if (!Number.isFinite(preset) || preset <= 0) {
      throw new Error('Duração inválida.');
    }
    return preset;
  }
  const hours = parseInt(customHours || '0', 10);
  const mins = parseInt(customMinutes || '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(mins) || hours < 0 || mins < 0 || mins > 59) {
    throw new Error('Informe horas e minutos válidos (minutos de 0 a 59).');
  }
  const total = hours * 60 + mins;
  if (total <= 0) {
    throw new Error('A duração personalizada deve ser maior que zero.');
  }
  if (total > 12 * 60) {
    throw new Error('Duração máxima: 12 horas.');
  }
  return total;
}

/** Human-readable duration for lists (pt-BR). */
export function formatServiceDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? '1h' : `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
