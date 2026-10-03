/**
 * Permissão para criar/remover bloqueio de agenda.
 * O banco aplica a mesma regra nas RPCs create_agenda_block / delete_agenda_block.
 */

export const DEFAULT_STAFF_CAN_BLOCK_AGENDA = true;

export function agendaBlockedMessage(professionalName: string): string {
  const name = professionalName.trim() || 'profissional';
  return `Horário bloqueado na agenda de ${name}. Para agendar, remova o bloqueio primeiro.`;
}

export function acceptBlockedMessage(professionalName: string): string {
  const name = professionalName.trim() || 'profissional';
  return `Não foi possível aceitar: o horário deste pedido está bloqueado na agenda de ${name}. Recuse o pedido ou remova o bloqueio.`;
}

export const AGENDA_BLOCKED_MESSAGE = agendaBlockedMessage('profissional');

export const PUBLIC_SLOT_UNAVAILABLE_MESSAGE = 'Este horário acabou de ser ocupado. Escolha outro.';

const BLOCKED_MESSAGE_RE = /Horário bloqueado na agenda de (.+?)\. Para agendar, remova o bloqueio primeiro\./;

export function professionalNameFromBlockedError(error: unknown): string | null {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';
  return message.match(BLOCKED_MESSAGE_RE)?.[1] ?? null;
}

export function messageForBookingAcceptError(error: unknown, fallbackProfessional?: string | null): string | null {
  if (!isAgendaBlockedError(error)) return null;
  return acceptBlockedMessage(professionalNameFromBlockedError(error) ?? fallbackProfessional ?? 'profissional');
}

export function messageForAgendaBlockResultCode(code: string | undefined): string {
  switch (code) {
    case 'overlap':
      return 'Já existe um bloqueio neste período.';
    case 'forbidden':
      return 'Você não tem permissão para bloquear esta agenda.';
    case 'invalid_interval':
      return 'O fim do bloqueio precisa ser depois do início.';
    case 'block_too_long':
      return 'Um bloqueio pode ter no máximo 366 dias.';
    case 'block_starts_in_past':
      return 'O início do bloqueio já passou.';
    case 'block_start_adjusted':
      return 'O início do bloqueio já passou. Ajustamos para agora — confira e confirme de novo.';
    case 'block_finished':
      return 'Este bloqueio já terminou e fica só no histórico.';
    case 'block_conflicts_changed':
      return 'Entrou um novo atendimento nesse período. Revise a lista e confirme de novo.';
    case 'unavailable':
      return 'Bloqueio de agenda ainda não está disponível neste ambiente.';
    default:
      return 'Não foi possível bloquear a agenda.';
  }
}

export function normalizeStaffCanBlockAgenda(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  // Sem coluna / nulo / lixo → padrão do produto (ligado).
  return DEFAULT_STAFF_CAN_BLOCK_AGENDA;
}

export function canManageAgendaBlock(input: {
  role: string | null | undefined;
  staffCanBlock: boolean;
  teamMemberId: string | null | undefined;
  professionalId: string | null | undefined;
}): boolean {
  if (input.role !== 'staff') return true;
  if (!input.staffCanBlock) return false;
  if (!input.teamMemberId || !input.professionalId) return false;
  return input.teamMemberId === input.professionalId;
}

export function canCreateAgendaBlock(input: {
  role: string | null | undefined;
  staffCanBlock: boolean;
  teamMemberId: string | null | undefined;
  professionalId?: string | null;
}): boolean {
  if (input.role !== 'staff') return true;
  if (!input.staffCanBlock) return false;
  if (!input.teamMemberId) return false;
  if (input.professionalId == null || input.professionalId === '') return true;
  return input.teamMemberId === input.professionalId;
}

export function agendaBlockBandLabel(input: {
  role: string | null | undefined;
  staffCanBlock: boolean;
  teamMemberId: string | null | undefined;
  professionalId: string | null | undefined;
}): string {
  if (
    input.role === 'staff'
    && !canManageAgendaBlock(input)
  ) {
    return 'Agenda bloqueada';
  }
  return 'Bloqueado';
}

export function isAgendaBlockedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; hint?: string };
  if (e.code === 'agenda_blocked' || e.code === 'professional_blocked' || e.hint === 'professional_blocked') return true;
  const msg = (e.message ?? '').toLowerCase();
  return msg.includes('agenda_blocked')
    || msg.includes('professional_blocked')
    || msg.includes('horário bloqueado na agenda')
    || msg.includes('horario bloqueado na agenda')
    || msg.includes('está bloqueado')
    || msg.includes('esta bloqueado');
}
