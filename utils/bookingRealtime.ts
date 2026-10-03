export const BOOKING_REALTIME_EVENT = 'booking_status';
export const BOOKING_STATUS_LIVE_EVENT = 'agendix:booking-status';
export const PUBLIC_BOOKING_CHANGE_LIVE_EVENT = 'agendix:public-booking-change';
export const BOOKING_LIVE_POLL_MS = 30_000;

export const bookingRealtimeTopic = (bookingId: string) => `booking:${bookingId}`;

export const BOOKING_REALTIME_PAYLOAD_KEYS = ['id', 'status', 'appointment_time', 'op', 'at'] as const;

export type BookingRealtimeOp = 'INSERT' | 'UPDATE';

export interface BookingRealtimeEvent {
  id: string;
  status: string;
  appointment_time: string | null;
  op: BookingRealtimeOp;
  at?: string;
}

export function parseBookingRealtimeEvent(payload: unknown): BookingRealtimeEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  const status = typeof record.status === 'string' ? record.status : null;
  if (!id || !status) return null;
  const op: BookingRealtimeOp = record.op === 'INSERT' || record.op === 'UPDATE' ? record.op : 'UPDATE';
  return {
    id,
    status,
    appointment_time: typeof record.appointment_time === 'string' ? record.appointment_time : null,
    op,
    at: typeof record.at === 'string' ? record.at : undefined,
  };
}

export function applyBookingStatusEvent<T extends { id: string; status: string; appointment_time: string }>(
  bookings: T[],
  event: BookingRealtimeEvent,
): T[] {
  return bookings.map((booking) => (
    booking.id === event.id
      ? {
          ...booking,
          status: event.status,
          appointment_time: event.appointment_time ?? booking.appointment_time,
        }
      : booking
  ));
}

export function mergePendingPublicBooking<T extends { id: string; status?: string }>(
  current: T[],
  row: T,
): T[] {
  if (row.status && row.status !== 'pending') {
    return current.filter((booking) => booking.id !== row.id);
  }
  const index = current.findIndex((booking) => booking.id === row.id);
  if (index === -1) return [...current, row];
  const next = current.slice();
  next[index] = { ...current[index], ...row };
  return next;
}
