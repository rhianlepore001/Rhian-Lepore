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

export function clientEditReservedIso(booking: {
  appointment_time: string;
  original_appointment_time?: string | null;
  is_edit?: boolean | null;
}): string {
  if (booking.is_edit && booking.original_appointment_time) return booking.original_appointment_time;
  return booking.appointment_time;
}
