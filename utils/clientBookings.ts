/**
 * Regras da Minha Área (cliente público) para listar pedidos online.
 *
 * Item 5b: quando o estabelecimento cancela (ou recusa) um pedido, o cliente
 * precisa ver o cancelamento e poder reagendar. Pedidos cancelados com horário
 * ainda no futuro aparecem em "Próximos" como CANCELADO (não contam como
 * agendamento ativo); os passados vão para "Histórico".
 */

export interface ClientBookingLike {
  id: string;
  appointment_time: string;
  status: string;
  service_ids: string[];
  professional_id?: string | null;
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
  // Histórico: passou + concluídos/faltas (mesmo se o horário ainda for "futuro").
  const history = bookings.filter((b) =>
    b.status === 'completed' || b.status === 'no_show' || !isFuture(b),
  );
  return { upcoming, activeUpcoming, history };
}

export const CANCELLED_BY_BUSINESS_MESSAGE = 'O estabelecimento cancelou este agendamento.';
export const CANCELLED_GENERIC_MESSAGE = 'Este agendamento foi cancelado.';
export const PAST_CANCELLED_BY_BUSINESS_MESSAGE = 'O estabelecimento cancelou este horário.';
export const REBOOK_LABEL = 'Agendar de novo';
export const NEXT_SLOT_CTA = 'Agendar próximo horário';
export const SLOT_CTA = 'Agendar horário';
export const NO_SHOW_MESSAGE = 'Sentimos sua falta. Quer marcar outro horário?';

/** Frases para membro com effective_status = active. Sem acúmulo de visita nem desconto. */
export const CLUB_SENTENCE: Record<'confirmed' | 'completed' | 'no_show' | 'cancelled', string> = {
  confirmed: 'Seu Clube está ativo neste horário.',
  completed: 'Seu Clube segue ativo.',
  no_show: 'Seu Clube continua ativo.',
  cancelled: 'Seu Clube segue valendo.',
};

export interface ClubSentenceOpts {
  clubOffered: boolean;
  isMember: boolean;
  businessName?: string;
}

export function clubInviteSentence(businessName?: string): string {
  const name = (businessName ?? '').trim();
  return name ? `Conheça o Clube da ${name}` : 'Conheça o Clube';
}

export function clubSentence(status: string, opts: ClubSentenceOpts): string | null {
  if (!opts.clubOffered) return null;
  const key = status.trim().toLowerCase();
  if (key !== 'confirmed' && key !== 'completed' && key !== 'no_show' && key !== 'cancelled') {
    return null;
  }
  if (opts.isMember) return CLUB_SENTENCE[key];
  return clubInviteSentence(opts.businessName);
}

export function completedThankYou(clientName: string): string {
  const first = clientName.trim().split(/\s+/)[0] ?? '';
  if (!first) return 'Obrigado pela visita!';
  const named = first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1).toLocaleLowerCase('pt-BR');
  return `Obrigado pela visita, ${named}!`;
}

/** Dia civil no fuso do negócio (não o do navegador). */
export function businessCalendarDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isSameBusinessDay(appointmentIso: string, timeZone: string, now: Date = new Date()): boolean {
  return businessCalendarDay(new Date(appointmentIso), timeZone) === businessCalendarDay(now, timeZone);
}

export function completedRebookLabel(appointmentIso: string, timeZone: string, now: Date = new Date()): string {
  return isSameBusinessDay(appointmentIso, timeZone, now) ? NEXT_SLOT_CTA : SLOT_CTA;
}

/** Data do card: 'Sáb., 10 de out.' — weekday capitalizado; 'de' e mês em minúsculas. */
export function formatClientCardDate(date: Date, timeZone: string): string {
  const raw = date.toLocaleDateString('pt-BR', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const lowered = raw.toLocaleLowerCase('pt-BR');
  return lowered.replace(/^(\p{L})/u, (ch) => ch.toLocaleUpperCase('pt-BR'));
}

/** Mesma data, para o meio da frase do WhatsApp: 'sáb., 10 de out.' */
export function formatClientCardDateInSentence(date: Date, timeZone: string): string {
  return formatClientCardDate(date, timeZone).replace(/^(\p{L})/u, (ch) => ch.toLocaleLowerCase('pt-BR'));
}

/** Aviso acima dos cards pending na Minha Área. */
export function pendingAwaitingBanner(businessNoun: string, pendingCount: number): string {
  const who = businessNoun === 'salão'
    ? 'O salão'
    : businessNoun === 'barbearia'
      ? 'A barbearia'
      : 'O estabelecimento';
  const what = pendingCount > 1 ? 'estes horários' : 'este horário';
  return `${who} ainda não confirmou ${what}.`;
}

export function cancellationMessage(booking: Pick<ClientBookingLike, 'cancelled_by_business'>): string {
  return booking.cancelled_by_business ? CANCELLED_BY_BUSINESS_MESSAGE : CANCELLED_GENERIC_MESSAGE;
}

/** Fluxo público do mesmo negócio, serviços e profissional pré-selecionados. */
export function rebookPath(
  slug: string,
  booking: Pick<ClientBookingLike, 'service_ids' | 'professional_id'>,
): string {
  const ids = (booking.service_ids ?? []).filter(Boolean);
  const parts: string[] = [];
  if (ids.length > 0) parts.push(`rebook=${ids.join(',')}`);
  if (booking.professional_id) parts.push(`pro=${booking.professional_id}`);
  return parts.length > 0 ? `/book/${slug}?${parts.join('&')}` : `/book/${slug}`;
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
