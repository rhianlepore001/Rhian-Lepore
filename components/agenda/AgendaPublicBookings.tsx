import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { formatCurrency, formatPhone, type Region } from '../../utils/formatters';
import {
  formatAgendaAlteracao,
  formatAgendaOnlineRequestsTitle,
  formatAgendaPublicBookingsSummary,
  isClientEditPending,
} from '../../utils/clientEditRequest';
import { formatTimeInTimeZone, getDateStringInTimeZone, getTodayInTimeZone } from '../../utils/businessTimezone';

export interface AgendaPublicBookingItem {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_time: string;
  total_price: number;
  professional_id?: string | null;
  service_ids?: string[] | null;
  status?: string | null;
  is_edit?: boolean | null;
  original_appointment_time?: string | null;
  notes?: string | null;
  customer_notes?: string | null;
  observation?: string | null;
}

export interface AgendaPublicBookingMember {
  id: string;
  name: string;
}

export interface AgendaPublicBookingService {
  id: string;
  name: string;
}

export interface AgendaPublicBookingsProps {
  bookings: AgendaPublicBookingItem[];
  teamMembers: AgendaPublicBookingMember[];
  services: AgendaPublicBookingService[];
  currencyRegion: Region;
  timeZone?: string;
  onAccept: (booking: AgendaPublicBookingItem) => void;
  onReject: (bookingId: string) => void;
  acceptError?: { id: string; message: string } | null;
}

function bookingNote(booking: AgendaPublicBookingItem): string {
  return (booking.notes || booking.customer_notes || booking.observation || '').trim();
}

function bookingServiceLabel(
  booking: AgendaPublicBookingItem,
  services: AgendaPublicBookingService[],
): string {
  const names = (booking.service_ids ?? [])
    .map((id) => services.find((s) => s.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  if (names.length > 0) return names.join(', ');
  const count = booking.service_ids?.length ?? 0;
  return count === 1 ? '1 serviço' : `${count} serviços`;
}

export const AgendaPublicBookings: React.FC<AgendaPublicBookingsProps> = ({
  bookings,
  teamMembers,
  services,
  currencyRegion,
  timeZone = 'America/Sao_Paulo',
  onAccept,
  onReject,
  acceptError = null,
}) => {
  const { colors, accent, classes } = useBrutalTheme();

  if (bookings.length === 0) return null;

  const edits = bookings.filter((b) => isClientEditPending({ ...b, status: b.status ?? 'pending' })).length;
  const newOnes = bookings.length - edits;
  const summary = formatAgendaPublicBookingsSummary(edits, newOnes);

  return (
    <section data-testid="agenda-public-bookings" className="shrink-0 space-y-2">
      <div className={`rounded-xl border px-3 py-2 ${accent.border} ${accent.bgDim}`}>
        <div className="flex items-start gap-2 min-w-0">
          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${accent.text}`} aria-hidden />
          <div className="min-w-0">
            <h3 className={`${colors.text} font-bold text-sm leading-snug`}>
              {formatAgendaOnlineRequestsTitle(bookings.length)}
            </h3>
            <p className={`${colors.textSecondary} text-xs leading-snug break-words`}>
              {summary}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {bookings.map((booking) => {
          const professional = teamMembers.find((m) => m.id === booking.professional_id);
          const bookingDate = new Date(booking.appointment_time);
          const isToday = getDateStringInTimeZone(booking.appointment_time, timeZone) === getTodayInTimeZone(timeZone);
          const note = bookingNote(booking);
          const pendingEdit = isClientEditPending({ ...booking, status: booking.status ?? 'pending' });
          const when = `${isToday ? 'Hoje' : bookingDate.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit' })} · ${formatTimeInTimeZone(booking.appointment_time, timeZone)}`;

          return (
            <li
              key={booking.id}
              data-testid={`agenda-public-booking-${booking.id}`}
              className={`${colors.card} ${colors.border} rounded-xl px-3 py-2.5`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    isToday
                      ? `${accent.bg} text-[var(--color-on-accent)] ${accent.border}`
                      : `${colors.surface} ${colors.textMuted} ${colors.border}`
                  }`}
                >
                  {when}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAccept(booking)}
                    className={`px-4 min-h-[48px] py-2 rounded-lg text-sm font-bold inline-flex items-center gap-1 ${classes.buttonSuccess}`}
                    title="Aceitar"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden /> Aceitar
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(booking.id)}
                    className={`px-4 min-h-[48px] py-2 rounded-lg text-sm font-bold inline-flex items-center gap-1 ${classes.buttonDanger}`}
                    title="Recusar"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden /> Recusar
                  </button>
                </div>
              </div>

              {pendingEdit && (
                <p
                  data-testid="agenda-booking-alteracao"
                  className="mt-1.5 text-xs font-bold text-[var(--color-info)]"
                >
                  {booking.original_appointment_time
                    ? formatAgendaAlteracao(
                      booking.original_appointment_time,
                      booking.appointment_time,
                      timeZone,
                    )
                    : 'Alteração de agendamento'}
                </p>
              )}

              <p className={`${colors.text} font-bold text-sm leading-snug break-words mt-1.5`}>
                {booking.customer_name}
              </p>
              <p className={`${colors.textSecondary} text-xs font-mono break-all`}>
                {formatPhone(booking.customer_phone, currencyRegion)}
              </p>
              <p className={`${colors.textSecondary} text-xs leading-snug break-words mt-1`}>
                {bookingServiceLabel(booking, services)}
                {' · '}
                <span className={`${colors.text} font-semibold`}>
                  {formatCurrency(booking.total_price, currencyRegion)}
                </span>
                {' · '}
                {professional?.name || 'Qualquer profissional'}
              </p>
              {note && (
                <p className={`${colors.text} text-xs leading-snug break-words whitespace-pre-wrap mt-1.5`}>
                  {note}
                </p>
              )}
              {acceptError?.id === booking.id && (
                <p
                  className="mt-2 text-sm leading-snug break-words text-[var(--color-danger)]"
                  data-testid="agenda-public-booking-accept-error"
                  role="alert"
                >
                  {acceptError.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
