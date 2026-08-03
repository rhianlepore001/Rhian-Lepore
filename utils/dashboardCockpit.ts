import type { DashboardAppointment } from '@/types/dashboard';

export type CockpitAgendaStatus =
  | 'now'
  | 'confirm'
  | 'confirmed'
  | 'scheduled'
  | 'done'
  | 'cancelled';

export interface CockpitAgendaStatusMeta {
  key: CockpitAgendaStatus;
  label: string;
  tone: 'accent' | 'warning' | 'success' | 'info' | 'muted' | 'danger';
}

const DONE = new Set(['completed', 'concluído', 'concluido']);
const CANCELLED = new Set(['cancelled', 'canceled', 'cancelado']);
const PENDING = new Set(['pending', 'pendente']);
const CONFIRMED = new Set(['confirmed', 'confirmado']);

function normalizeStatus(status: string): string {
  return (status ?? '').trim().toLowerCase();
}

/** Próximo atendimento ativo: não concluído/cancelado, ordenado por horário. */
export function pickNextAppointment(
  appointments: DashboardAppointment[],
  now: Date = new Date(),
): DashboardAppointment | null {
  const active = appointments
    .filter((a) => {
      const s = normalizeStatus(a.status);
      return !DONE.has(s) && !CANCELLED.has(s);
    })
    .sort(
      (a, b) =>
        new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime(),
    );

  if (active.length === 0) return null;

  const upcoming = active.find((a) => new Date(a.appointment_time).getTime() >= now.getTime() - 30 * 60_000);
  return upcoming ?? active[0];
}

export function pickUpcomingAfter(
  appointments: DashboardAppointment[],
  nextId: string | null,
  limit = 2,
): DashboardAppointment[] {
  if (!nextId) {
    return appointments
      .filter((a) => {
        const s = normalizeStatus(a.status);
        return !DONE.has(s) && !CANCELLED.has(s);
      })
      .slice(0, limit);
  }

  const sorted = [...appointments].sort(
    (a, b) =>
      new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime(),
  );
  const idx = sorted.findIndex((a) => a.id === nextId);
  if (idx < 0) return [];

  return sorted
    .slice(idx + 1)
    .filter((a) => {
      const s = normalizeStatus(a.status);
      return !DONE.has(s) && !CANCELLED.has(s);
    })
    .slice(0, limit);
}

export function getCockpitAgendaStatus(
  apt: DashboardAppointment,
  nextId: string | null,
  now: Date = new Date(),
): CockpitAgendaStatusMeta {
  const s = normalizeStatus(apt.status);

  if (DONE.has(s)) {
    return { key: 'done', label: 'Concluído', tone: 'muted' };
  }
  if (CANCELLED.has(s)) {
    return { key: 'cancelled', label: 'Cancelado', tone: 'danger' };
  }

  if (nextId && apt.id === nextId) {
    const start = new Date(apt.appointment_time).getTime();
    const withinWindow = Math.abs(start - now.getTime()) <= 45 * 60_000;
    if (withinWindow || start <= now.getTime()) {
      return { key: 'now', label: 'Agora', tone: 'accent' };
    }
  }

  if (PENDING.has(s)) {
    return { key: 'confirm', label: 'Confirmar', tone: 'warning' };
  }
  if (CONFIRMED.has(s)) {
    return { key: 'confirmed', label: 'Confirmado', tone: 'success' };
  }

  return { key: 'scheduled', label: 'Agendado', tone: 'info' };
}

export function countActiveToday(appointments: DashboardAppointment[]): number {
  return appointments.filter((a) => {
    const s = normalizeStatus(a.status);
    return !CANCELLED.has(s);
  }).length;
}

export function estimateFreeSlots(
  availableMinutes: number,
  occupiedMinutes: number,
  slotMinutes = 30,
): number {
  if (slotMinutes <= 0) return 0;
  const free = Math.max(0, availableMinutes - occupiedMinutes);
  return Math.floor(free / slotMinutes);
}
