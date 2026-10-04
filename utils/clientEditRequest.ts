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
