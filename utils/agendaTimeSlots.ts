/** Início da grade padrão da agenda gestora (06:00). */
export const AGENDA_GRID_START_MINUTES = 6 * 60;

export function formatTimeHHMM(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Grade padrão da agenda gestora: 06:00 → 23:30 (até meia-noite).
 * Horários 00:00–05:59 não entram aqui — só via linhas dinâmicas.
 */
export function buildDefaultAgendaSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    const hh = hour.toString().padStart(2, '0');
    slots.push(`${hh}:00`);
    slots.push(`${hh}:30`);
  }
  return slots;
}

/**
 * Todos os slots de 30 min do dia — criação/edição manual interna.
 * Gestor/colaborador escolhe qualquer horário; booking online segue
 * `get_available_slots` (horário de funcionamento).
 */
export function buildManualBookingTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 0; hour <= 23; hour++) {
    const hh = hour.toString().padStart(2, '0');
    slots.push(`${hh}:00`);
    slots.push(`${hh}:30`);
  }
  return slots;
}

function insertSorted(slots: string[], time: string): void {
  const mins = timeToMinutes(time);
  const idx = slots.findIndex((t) => timeToMinutes(t) > mins);
  if (idx === -1) slots.push(time);
  else slots.splice(idx, 0, time);
}

/**
 * Grade da agenda: slots padrão 06:00–23:30 + linhas dinâmicas
 * para horários de agendamentos existentes.
 *
 * - 00:00–05:59: no topo, antes das 06:00
 * - demais horários fora da grade (ex.: 14:15): na ordem do bloco diurno
 */
export function buildAgendaGridSlots(appointmentTimes: Array<Date | string>): string[] {
  const defaultSlots = buildDefaultAgendaSlots();
  const defaultSet = new Set(defaultSlots);

  const early = new Set<string>();
  const daytimeExtras = new Set<string>();

  for (const raw of appointmentTimes) {
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    if (!(d instanceof Date) || isNaN(d.getTime())) continue;

    const time = formatTimeHHMM(d);
    const mins = d.getHours() * 60 + d.getMinutes();

    if (mins < AGENDA_GRID_START_MINUTES) {
      early.add(time);
    } else if (!defaultSet.has(time)) {
      daytimeExtras.add(time);
    }
  }

  const earlySorted = [...early].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  const dayMerged = [...defaultSlots];
  for (const extra of [...daytimeExtras].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))) {
    insertSorted(dayMerged, extra);
  }

  return [...earlySorted, ...dayMerged];
}
