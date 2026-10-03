import { supabase } from '@/lib/supabase';
import { slotOverlapsOccupying, type OccupyingAppointment } from './agendaBlockRange';
import { addDaysToDateString, zonedDateTimeToDate } from './businessTimezone';

const APT_STATUSES = ['Pending', 'Confirmed', 'Completed'] as const;
const APT_FETCH_STATUSES = [...APT_STATUSES, 'Cancelled', 'NoShow'] as const;
const PB_STATUSES = ['pending', 'confirmed'] as const;
const RELEASED_STATUSES = new Set(['Cancelled', 'NoShow']);

export interface PublicBookingOccupancyRow {
  id: string;
  professional_id?: string | null;
  appointment_time: string;
  duration_minutes?: number | null;
  status?: string | null;
}

export function salonDayRange(dateStr: string, timeZone: string): { startIso: string; endIso: string } {
  const start = zonedDateTimeToDate(dateStr, '00:00', timeZone);
  const end = zonedDateTimeToDate(addDaysToDateString(dateStr, 1), '00:00', timeZone);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Mesma regra de confirmed_booking_slot_released: confirmed só libera se há Cancelled/NoShow no mesmo instante+pro e nenhum outro status. */
export function confirmedBookingSlotReleased(
  appointments: OccupyingAppointment[],
  pb: PublicBookingOccupancyRow,
): boolean {
  const pbTime = new Date(pb.appointment_time).getTime();
  if (Number.isNaN(pbTime)) return false;
  const proId = pb.professional_id || '';
  const sameSlot = appointments.filter((a) => {
    if (proId && (a.professional_id || '') !== proId) return false;
    return new Date(a.appointment_time).getTime() === pbTime;
  });
  const hasReleased = sameSlot.some((a) => RELEASED_STATUSES.has(a.status || ''));
  const hasActive = sameSlot.some((a) => !RELEASED_STATUSES.has(a.status || ''));
  return hasReleased && !hasActive;
}

export function publicBookingToOccupying(row: PublicBookingOccupancyRow): OccupyingAppointment {
  const st = (row.status || '').toLowerCase();
  return {
    id: `pb:${row.id}`,
    professional_id: row.professional_id,
    appointment_time: row.appointment_time,
    duration_minutes: row.duration_minutes,
    status: st === 'pending' ? 'Pending' : 'Confirmed',
  };
}

export function mergeOccupying(input: {
  appointments: OccupyingAppointment[];
  publicBookings: PublicBookingOccupancyRow[];
  ignorePublicBookingId?: string | null;
}): OccupyingAppointment[] {
  const fromPb = input.publicBookings
    .filter((b) => b.id !== input.ignorePublicBookingId)
    .filter((b) => {
      const st = (b.status || '').toLowerCase();
      if (!PB_STATUSES.includes(st as typeof PB_STATUSES[number])) return false;
      if (st === 'confirmed' && confirmedBookingSlotReleased(input.appointments, b)) return false;
      return true;
    })
    .map(publicBookingToOccupying);
  return [
    ...input.appointments.filter((a) => APT_STATUSES.includes((a.status || '') as typeof APT_STATUSES[number])),
    ...fromPb,
  ];
}

export function uiSlotIsBusy(opts: {
  dateStr: string;
  time: string;
  durationMinutes: number;
  occupying: OccupyingAppointment[];
  professionalId: string;
  timeZone: string;
  ignoreAppointmentId?: string | null;
}): boolean {
  return slotOverlapsOccupying(
    opts.dateStr,
    opts.time,
    opts.durationMinutes,
    opts.occupying,
    opts.professionalId,
    opts.timeZone,
    opts.ignoreAppointmentId,
  );
}

/** Mesma regra da RPC: [start, start+duration) em appointments (inclui fila) e public_bookings. */
export function serverSlotIsBusy(opts: {
  startIso: string;
  durationMinutes: number;
  professionalId: string;
  ignoreAppointmentId?: string | null;
  ignorePublicBookingId?: string | null;
  appointments: OccupyingAppointment[];
  publicBookings: PublicBookingOccupancyRow[];
}): boolean {
  const start = new Date(opts.startIso).getTime();
  const end = start + Math.max(opts.durationMinutes || 30, 1) * 60_000;
  const aptHit = opts.appointments.some((a) => {
    if (opts.ignoreAppointmentId && a.id === opts.ignoreAppointmentId) return false;
    if ((a.professional_id || '') !== opts.professionalId) return false;
    if (!APT_STATUSES.includes((a.status || '') as typeof APT_STATUSES[number])) return false;
    const aStart = new Date(a.appointment_time).getTime();
    const aEnd = aStart + Math.max(a.duration_minutes || 30, 1) * 60_000;
    return aStart < end && aEnd > start;
  });
  const pbHit = opts.publicBookings.some((b) => {
    if (opts.ignorePublicBookingId && b.id === opts.ignorePublicBookingId) return false;
    if ((b.professional_id || '') !== opts.professionalId) return false;
    const st = (b.status || '').toLowerCase();
    if (st !== 'pending' && st !== 'confirmed') return false;
    if (st === 'confirmed' && confirmedBookingSlotReleased(opts.appointments, b)) return false;
    const aStart = new Date(b.appointment_time).getTime();
    const aEnd = aStart + Math.max(b.duration_minutes || 30, 1) * 60_000;
    return aStart < end && aEnd > start;
  });
  return aptHit || pbHit;
}

export async function fetchRescheduleOccupancy(input: {
  companyId: string;
  dateStr: string;
  professionalId: string;
  timeZone: string;
  ignorePublicBookingId?: string | null;
}): Promise<OccupyingAppointment[]> {
  const { startIso, endIso } = salonDayRange(input.dateStr, input.timeZone);
  const [aptRes, pbRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, professional_id, appointment_time, duration_minutes, status')
      .eq('user_id', input.companyId)
      .eq('professional_id', input.professionalId)
      .in('status', [...APT_FETCH_STATUSES])
      .gte('appointment_time', startIso)
      .lt('appointment_time', endIso),
    supabase
      .from('public_bookings')
      .select('id, professional_id, appointment_time, duration_minutes, status')
      .eq('business_id', input.companyId)
      .eq('professional_id', input.professionalId)
      .in('status', [...PB_STATUSES])
      .gte('appointment_time', startIso)
      .lt('appointment_time', endIso),
  ]);
  if (aptRes.error) throw aptRes.error;
  if (pbRes.error) throw pbRes.error;
  return mergeOccupying({
    appointments: (aptRes.data ?? []) as OccupyingAppointment[],
    publicBookings: (pbRes.data ?? []) as PublicBookingOccupancyRow[],
    ignorePublicBookingId: input.ignorePublicBookingId,
  });
}
