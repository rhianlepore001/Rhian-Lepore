import { getBusinessCopy, type BusinessTheme } from './businessCopy';
import { formatTimeInTimeZone } from './businessTimezone';

export const RESCHEDULE_SUCCESS_TOAST = 'Horário remarcado.';
export const RESCHEDULE_GENERIC_ERROR = 'Não foi possível remarcar. Tente novamente.';
export const RESCHEDULE_PAST_NOTE = 'Esse horário já passou — use para lançar um atendimento que já aconteceu.';
export const RESCHEDULE_UNCHANGED_MESSAGE = 'Escolha um horário ou profissional diferente do atual.';
export const RESCHEDULE_STATUS_MESSAGE = 'Só dá para remarcar atendimentos pendentes ou confirmados.';
export const RESCHEDULE_PENDING_CLIENT_REQUEST =
  'O cliente pediu outro horário para este agendamento. Aceite ou recuse o pedido antes de remarcar.';
export const RESCHEDULE_WHATSAPP_LABEL = 'Avisar o cliente no WhatsApp';
export const RESCHEDULE_CONFIRM_LABEL = 'Confirmar remarcação';
export const RESCHEDULE_MODAL_TITLE = 'Remarcar horário';
export const RESCHEDULE_OCCUPANCY_ERROR =
  'Não deu para atualizar os ocupados. O servidor ainda recusa conflito.';

export const RESCHEDULE_ERROR_HINTS = new Set([
  'reschedule_slot_busy',
  'reschedule_unchanged',
  'reschedule_status_invalid',
  'reschedule_professional_unavailable',
  'reschedule_not_found',
  'reschedule_pending_client_request',
  'staff_appointment_edit_forbidden',
]);

export function slotBusyMessage(professionalName: string): string {
  const name = professionalName.trim() || 'profissional';
  return `Esse horário já está ocupado na agenda de ${name}. Escolha outro.`;
}

function padPtDate(instant: Date, timeZone: string): string {
  return instant.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  });
}

function weekdayPt(instant: Date, timeZone: string): string {
  const w = instant.toLocaleDateString('pt-BR', { weekday: 'long', timeZone });
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export function formatRescheduleInstant(
  timeIso: string,
  timeZone: string,
  professionalName?: string | null,
): string {
  const instant = new Date(timeIso);
  const withPro = professionalName?.trim() ? ` com ${professionalName.trim()}` : '';
  return `${weekdayPt(instant, timeZone)} ${padPtDate(instant, timeZone)} às ${formatTimeInTimeZone(instant, timeZone)}${withPro}`;
}

export function formatRescheduleCurrentLine(input: {
  timeIso: string;
  timeZone: string;
  professionalName?: string | null;
}): string {
  const instant = new Date(input.timeIso);
  const withPro = input.professionalName?.trim() ? ` com ${input.professionalName.trim()}` : '';
  return `Atual: ${weekdayPt(instant, input.timeZone)} ${padPtDate(instant, input.timeZone)} às ${formatTimeInTimeZone(instant, input.timeZone)}${withPro}`;
}

export function formatRescheduleHistoryLine(input: {
  actorName: string;
  createdAtIso: string;
  oldTimeIso: string;
  timeZone: string;
}): string {
  const created = new Date(input.createdAtIso);
  const old = new Date(input.oldTimeIso);
  return `Remarcado por ${input.actorName} em ${padPtDate(created, input.timeZone)} (antes: ${padPtDate(old, input.timeZone)} às ${formatTimeInTimeZone(old, input.timeZone)})`;
}

export interface RescheduleWhatsAppInput {
  theme: BusinessTheme;
  clientName: string;
  businessName?: string | null;
  oldTimeIso: string;
  newTimeIso: string;
  timeZone: string;
  professionalName?: string | null;
}

export function buildRescheduleWhatsAppMessage(input: RescheduleWhatsAppInput): string {
  const copy = getBusinessCopy(input.theme);
  const establishment = (input.businessName || '').trim() || copy.establishmentFallback;
  const client = (input.clientName || '').trim();
  const greeting = client
    ? (input.theme === 'beauty' ? `Olá, ${client}! ✨` : `Fala, ${client}! 🔁`)
    : 'Olá!';
  const old = new Date(input.oldTimeIso);
  const next = new Date(input.newTimeIso);
  const oldDate = padPtDate(old, input.timeZone);
  const oldTime = formatTimeInTimeZone(old, input.timeZone);
  const newDate = padPtDate(next, input.timeZone);
  const newTime = formatTimeInTimeZone(next, input.timeZone);
  const withPro = input.professionalName?.trim() ? ` com ${input.professionalName.trim()}` : '';
  const agora = `Agora: *${newDate}* às *${newTime}*${withPro}.`;

  if (input.theme === 'beauty') {
    return [
      greeting,
      `Seu horário no *${establishment}* foi remarcado.`,
      `Antes: ${oldDate} às ${oldTime}`,
      agora,
      'Se precisar de outro horário, é só responder. 💖',
    ].join('\n');
  }

  return [
    greeting,
    `Seu horário na *${establishment}* foi remarcado.`,
    `Antes: ${oldDate} às ${oldTime}`,
    agora,
    'Qualquer dúvida é só responder aqui. Até lá! ✂️',
  ].join('\n');
}
