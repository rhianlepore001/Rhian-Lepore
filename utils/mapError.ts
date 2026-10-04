import {
  AGENDA_BLOCKED_MESSAGE,
  PUBLIC_SLOT_UNAVAILABLE_MESSAGE,
  agendaBlockedMessage,
  messageForAgendaBlockResultCode,
  professionalNameFromBlockedError,
} from './agendaBlockPermission';
import { isLeadTimeViolationError, leadTimeHoursFromError, leadTimeViolationMessage } from './bookingLeadTime';
import { RESCHEDULE_ERROR_HINTS } from './rescheduleCopy';

/**
 * Mapa de erro: traduz exceções do Supabase/JS em copy humana PT-BR + código curto
 * para suporte. Nunca renderize `error.message` cru no JSX — passe por aqui.
 *
 * DS Lock §9 (voz/copy) + SPEC §7.3 (tratamento de erro humano).
 */

export interface UserFacingError {
  /** Mensagem curta e acionável em PT-BR (não técnica). */
  message: string;
  /** Código curto exibido como suffix para suporte rastrear. */
  code: string;
  /** Erro original preservado para Logger. Nunca renderize. */
  originalError: unknown;
}

interface RawErrorShape {
  code?: string;
  message?: string;
  hint?: string;
  details?: string;
  name?: string;
  status?: number;
}

// PostgREST/Supabase + códigos comuns → copy curta
const CODE_MAP: Record<string, string> = {
  // Rede / Auth
  network_error: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
  auth_expired: 'Sua sessão expirou. Faça login novamente.',
  permission_denied: 'Você não tem permissão para essa ação.',
  invalid_login: 'E-mail ou senha incorretos. Verifique e tente de novo.',
  rate_limit_login: 'Muitas tentativas de login. Por segurança, aguarde 1 minuto.',
  user_already_exists: 'Este e-mail já tem conta. Faça login ou use outro e-mail.',

  // Postgres
  '23505': 'Esse registro já existe.',
  '23503': 'Não foi possível concluir: existe um vínculo com outro registro.',
  '22P02': 'Algum campo está em formato inválido. Revise e tente de novo.',
  '42501': 'Você não tem permissão para essa ação.',
  slot_unavailable: PUBLIC_SLOT_UNAVAILABLE_MESSAGE,
  booking_not_cancellable: 'Não foi possível cancelar este agendamento. Tente de novo ou fale com o salão.',
  cancel_window_closed: 'O prazo para cancelar online já passou. Fale com o estabelecimento.',
  agenda_blocked: AGENDA_BLOCKED_MESSAGE,
  professional_blocked: AGENDA_BLOCKED_MESSAGE,
  block_finished: messageForAgendaBlockResultCode('block_finished'),
  block_too_long: messageForAgendaBlockResultCode('block_too_long'),
  block_starts_in_past: messageForAgendaBlockResultCode('block_starts_in_past'),
  block_start_adjusted: messageForAgendaBlockResultCode('block_start_adjusted'),
  block_conflicts_changed: messageForAgendaBlockResultCode('block_conflicts_changed'),

  // PostgREST
  PGRST116: 'Não encontramos esse registro.',
  PGRST301: 'A sessão expirou. Faça login novamente.',
};

function pickCode(raw: RawErrorShape): string {
  const msg = (raw.message ?? '').toLowerCase();

  if (
    raw.code === 'agenda_blocked'
    || raw.code === 'professional_blocked'
    || raw.hint === 'professional_blocked'
    || msg.includes('agenda_blocked')
    || msg.includes('professional_blocked')
    || msg.includes('horário bloqueado na agenda')
    || msg.includes('horario bloqueado na agenda')
    || msg.includes('está bloqueado')
    || msg.includes('esta bloqueado')
  ) {
    return 'professional_blocked';
  }
  if (raw.hint && RESCHEDULE_ERROR_HINTS.has(raw.hint)) {
    return raw.hint;
  }
  if (msg.includes('staff_appointment_edit_forbidden')) {
    return 'staff_appointment_edit_forbidden';
  }
  if (raw.code === 'block_finished' || raw.code === 'block_too_long' || raw.code === 'block_starts_in_past' || raw.code === 'block_start_adjusted' || raw.code === 'block_conflicts_changed') {
    return raw.code;
  }
  if (msg.includes('este bloqueio já terminou')) return 'block_finished';
  if (raw.code && CODE_MAP[raw.code]) return raw.code;
  if (
    raw.code === 'email_exists'
    || msg.includes('already registered')
    || msg.includes('already been registered')
    || msg.includes('user already exists')
    || msg.includes('email already exists')
  ) {
    return 'user_already_exists';
  }
  if (msg.includes('invalid login credentials') || msg.includes('credenciais inválidas')) {
    return 'invalid_login';
  }
  if (msg.includes('muitas tentativas')) return 'rate_limit_login';
  if (isLeadTimeViolationError(raw)) return 'lead_time_violation';
  if (
    msg.includes('slot_unavailable')
    || msg.includes('este horário acabou de ser ocupado')
  ) {
    return 'slot_unavailable';
  }
  if (msg.includes('booking_not_cancellable')) {
    return 'booking_not_cancellable';
  }
  if (msg.includes('cancel_window_closed')) {
    return 'cancel_window_closed';
  }
  if (raw.status === 401) return 'auth_expired';
  if (raw.status === 403) return 'permission_denied';
  if (raw.name === 'TypeError' && msg.includes('failed to fetch')) return 'network_error';
  return raw.code ?? raw.status?.toString() ?? 'unknown';
}

function shortRef(code: string): string {
  // Code visível para suporte (não exibe stack, só um marcador curto).
  return `#${code.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'ERR'}`;
}

/**
 * Converte qualquer erro capturado em uma `UserFacingError` segura para exibir.
 *
 * @param error o erro original (de try/catch)
 * @param fallback copy padrão quando o código não estiver mapeado. Não exponha `error.message`.
 */
export function mapError(error: unknown, fallback: string): UserFacingError {
  const raw: RawErrorShape =
    error && typeof error === 'object'
      ? (error as RawErrorShape)
      : { message: String(error ?? '') };

  const code = pickCode(raw);
  const named = professionalNameFromBlockedError(raw);
  const human = code === 'professional_blocked' && named
    ? agendaBlockedMessage(named)
    : code === 'lead_time_violation'
      ? leadTimeViolationMessage(leadTimeHoursFromError(error))
    : RESCHEDULE_ERROR_HINTS.has(code) && raw.message
      ? raw.message
      : CODE_MAP[code] ?? fallback;

  return {
    message: human,
    code: shortRef(code),
    originalError: error,
  };
}

/** Combina message + código em uma única string para toasts simples. */
export function formatUserFacingError(err: UserFacingError): string {
  // E-mail duplicado: o marcador curto (#useralre) não ajuda o usuário.
  if (err.code === '#useralre') return err.message;
  return `${err.message} (${err.code})`;
}

/** Signup do Auth: e-mail já existe em auth.users. */
export function isEmailTakenError(error: unknown): boolean {
  const raw: RawErrorShape =
    error && typeof error === 'object'
      ? (error as RawErrorShape)
      : { message: String(error ?? '') };

  return pickCode(raw) === 'user_already_exists';
}
