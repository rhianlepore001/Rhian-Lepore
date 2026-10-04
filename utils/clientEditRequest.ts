import { formatTimeInTimeZone } from './businessTimezone';
import { formatClientCardDateInSentence } from './clientBookings';

export const SERVICE_ONLY_EDIT_SKIP_LABEL = 'Trocar só o serviço sem aprovação';
export const SERVICE_ONLY_EDIT_SKIP_HELP =
  'Se o cliente só troca o serviço e a nova duração cabe no mesmo horário, grava direto. Desligado: toda alteração pede aprovação.';

export function formatClientEditDateTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  return `${formatClientCardDateInSentence(d, timeZone)} às ${formatTimeInTimeZone(d, timeZone)}`;
}

export function clientEditRequestSentMessage(originalIso: string, timeZone: string): string {
  return `Pedido de alteração enviado. Seu horário original (${formatClientEditDateTime(originalIso, timeZone)}) continua reservado até a resposta.`;
}

export function formatAgendaAlteracao(fromIso: string, toIso: string, timeZone: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit' });
    return `${date} · ${formatTimeInTimeZone(d, timeZone)}`;
  };
  return `Alteração: de ${fmt(fromIso)} para ${fmt(toIso)}`;
}

export const CLIENT_EDIT_PENDING_STATUS_LABEL = 'Alteração pendente';

export function formatClientEditReservedLine(originalIso: string, timeZone: string): string {
  return `Horário original reservado: ${formatClientEditDateTime(originalIso, timeZone)}`;
}

export function formatAgendaOnlineRequestsTitle(count: number): string {
  return count === 1 ? '1 solicitação online' : `${count} solicitações online`;
}

export function formatAgendaPublicBookingsSummary(edits: number, newOnes: number): string {
  if (edits > 0 && newOnes > 0) {
    const novos = newOnes === 1 ? '1 pedido novo' : `${newOnes} pedidos novos`;
    const alts = edits === 1 ? '1 alteração' : `${edits} alterações`;
    return `${novos} e ${alts}`;
  }
  if (edits > 0) {
    return edits === 1
      ? '1 alteração aguardando aprovação'
      : `${edits} alterações aguardando aprovação`;
  }
  return 'Feitos pelo link público — aceite ou recuse.';
}

function joinPtList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function formatStaffCannotActSummary(
  bookings: Array<{ professional_id?: string | null }>,
  members: Array<{ id: string; name: string }>,
): string {
  const labels = bookings.map((booking) => {
    if (!booking.professional_id) return 'qualquer profissional';
    return members.find((member) => member.id === booking.professional_id)?.name || 'qualquer profissional';
  });
  const unique = [...new Set(labels)];
  const named = unique.filter((name) => name !== 'qualquer profissional');
  const pedido = bookings.length === 1 ? 'Pedido' : 'Pedidos';
  const dest = `${pedido} para ${joinPtList(unique)}.`;
  if (named.length === 0) {
    return `${dest} Só o dono pode responder.`;
  }
  if (named.length === 1) {
    return `${dest} Só ${named[0]} ou o dono podem responder.`;
  }
  return `${dest} Só ${named.join(', ')} ou o dono podem responder.`;
}

export function formatAgendaRequestsBanner(input: {
  bookings: Array<{
    professional_id?: string | null;
    status?: string | null;
    is_edit?: boolean | null;
  }>;
  canActOnBooking: (booking: { professional_id?: string | null }) => boolean;
  teamMembers: Array<{ id: string; name: string }>;
}): { title: string; summary: string } {
  const { bookings, canActOnBooking, teamMembers } = input;
  const actionable = bookings.filter((booking) => canActOnBooking(booking));
  if (actionable.length === 0) {
    return {
      title: formatAgendaOnlineRequestsTitle(bookings.length),
      summary: formatStaffCannotActSummary(bookings, teamMembers),
    };
  }
  const edits = actionable.filter((booking) => (
    isClientEditPending({ ...booking, status: booking.status ?? 'pending' })
  )).length;
  return {
    title: formatAgendaOnlineRequestsTitle(actionable.length),
    summary: formatAgendaPublicBookingsSummary(edits, actionable.length - edits),
  };
}

export function isClientEditPending(booking: {
  status?: string | null;
  is_edit?: boolean | null;
}): boolean {
  return (booking.status ?? '').trim().toLowerCase() === 'pending' && Boolean(booking.is_edit);
}

export function clientEditReservedIso(booking: {
  appointment_time: string;
  original_appointment_time?: string | null;
  is_edit?: boolean | null;
  status?: string | null;
}): string {
  if (isClientEditPending(booking) && booking.original_appointment_time) {
    return booking.original_appointment_time;
  }
  return booking.appointment_time;
}
