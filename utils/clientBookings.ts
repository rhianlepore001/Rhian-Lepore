/**
 * Regras da Minha Área (cliente público) para listar pedidos online.
 *
 * Item 5b: quando o estabelecimento cancela (ou recusa) um pedido, o cliente
 * precisa ver o cancelamento e poder reagendar. Pedidos cancelados com horário
 * ainda no futuro aparecem em "Próximos" como CANCELADO (não contam como
 * agendamento ativo); os passados continuam fora das listas, como antes.
 */

export interface ClientBookingLike {
  id: string;
  appointment_time: string;
  status: string;
  service_ids: string[];
  cancelled_by_business?: boolean;
}

export const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'] as const;

export function isActiveBookingStatus(status: string): boolean {
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function isCancelledBooking(booking: Pick<ClientBookingLike, 'status'>): boolean {
  return booking.status === 'cancelled';
}

export function splitClientBookings<T extends ClientBookingLike>(bookings: T[], now: Date = new Date()): {
  /** Ativos futuros + cancelados futuros, em ordem de horário. */
  upcoming: T[];
  /** Só os ativos futuros (contador "Você tem N agendamentos próximos"). */
  activeUpcoming: T[];
  history: T[];
} {
  const nowMs = now.getTime();
  const isFuture = (b: T) => new Date(b.appointment_time).getTime() >= nowMs;
  const activeUpcoming = bookings.filter((b) => isActiveBookingStatus(b.status) && isFuture(b));
  const upcoming = bookings
    .filter((b) => (isActiveBookingStatus(b.status) || isCancelledBooking(b)) && isFuture(b))
    .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
  // Histórico inalterado: concluídos + não cancelados que já passaram.
  const history = bookings.filter((b) =>
    b.status === 'completed' || (!isCancelledBooking(b) && !isFuture(b)),
  );
  return { upcoming, activeUpcoming, history };
}

export const CANCELLED_BY_BUSINESS_MESSAGE = 'O estabelecimento cancelou este agendamento.';
export const CANCELLED_GENERIC_MESSAGE = 'Este agendamento foi cancelado.';

export function cancellationMessage(booking: Pick<ClientBookingLike, 'cancelled_by_business'>): string {
  return booking.cancelled_by_business ? CANCELLED_BY_BUSINESS_MESSAGE : CANCELLED_GENERIC_MESSAGE;
}

/** Fluxo público do mesmo negócio com os mesmos serviços pré-selecionados. */
export function rebookPath(slug: string, booking: Pick<ClientBookingLike, 'service_ids'>): string {
  const ids = (booking.service_ids ?? []).filter(Boolean);
  return ids.length > 0 ? `/book/${slug}?rebook=${ids.join(',')}` : `/book/${slug}`;
}

/** Junta o resultado de get_client_booking_cancellations nos pedidos. */
export function withCancellationInfo<T extends ClientBookingLike>(
  bookings: T[],
  cancelledByBusiness: Record<string, boolean>,
): T[] {
  return bookings.map((b) =>
    isCancelledBooking(b) ? { ...b, cancelled_by_business: cancelledByBusiness[b.id] === true } : b,
  );
}
