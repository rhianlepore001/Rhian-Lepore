/**
 * Aprovação de agendamentos online (`business_settings.online_booking_requires_approval`).
 * true (padrão, inclusive sem linha/coluna) = pedido precisa de aceite, como sempre foi.
 * false = o agendamento online entra confirmado direto na agenda.
 */

export const ONLINE_BOOKING_APPROVAL_LABEL = 'Aprovar agendamentos online';

export const ONLINE_BOOKING_APPROVAL_HELP =
  'Ligado: cada agendamento pelo link chega como pedido e só entra na agenda quando você ou o profissional aceita. ' +
  'Desligado: o horário é confirmado na hora e já aparece na agenda.';

export const ONLINE_BOOKING_APPROVAL_PENDING_NOTE =
  'Pedidos que já chegaram continuam esperando sua resposta.';

export const ONLINE_BOOKING_APPROVAL_UNSUPPORTED_NOTE =
  'A confirmação automática ainda está sendo ativada. Por enquanto, todo agendamento online continua precisando de aprovação.';

/** Minutos em que o cliente pode cancelar online um agendamento confirmado automaticamente. */
export const AUTO_CONFIRM_CANCEL_GRACE_MINUTES = 15;

/** Configuração do dono (linha de business_settings). Ausente → manual. */
export function resolveOnlineBookingRequiresApproval(
  settings: { online_booking_requires_approval?: boolean | null } | null | undefined,
): boolean {
  return settings?.online_booking_requires_approval !== false;
}

/** JSON público (get_public_business_settings_json). Ausente/nulo → manual. */
export function isPublicBookingAutoConfirm(
  publicSettings: unknown,
): boolean {
  if (!publicSettings || typeof publicSettings !== 'object') return false;
  return (publicSettings as { online_booking_auto_confirm?: unknown }).online_booking_auto_confirm === true;
}

/** Se a coluna existe na linha lida (front publicado antes da migration não quebra). */
export function hasOnlineBookingApprovalColumn(settings: object | null | undefined): boolean {
  return Boolean(settings) && Object.prototype.hasOwnProperty.call(settings, 'online_booking_requires_approval');
}
