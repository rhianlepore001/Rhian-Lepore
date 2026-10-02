/**
 * Permissão para criar/remover bloqueio de agenda.
 * O banco aplica a mesma regra nas RPCs create_agenda_block / delete_agenda_block.
 */

export const DEFAULT_STAFF_CAN_BLOCK_AGENDA = true;

export const AGENDA_BLOCKED_MESSAGE =
  'Este horário está bloqueado. Remova o bloqueio para agendar.';

export function messageForAgendaBlockResultCode(code: string | undefined): string {
  switch (code) {
    case 'overlap':
      return 'Já existe um bloqueio neste período.';
    case 'forbidden':
      return 'Você não pode bloquear a agenda deste profissional.';
    case 'invalid_interval':
      return 'O fim precisa ser depois do início.';
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
  const e = error as { code?: string; message?: string };
  if (e.code === 'agenda_blocked') return true;
  const msg = (e.message ?? '').toLowerCase();
  return msg.includes('agenda_blocked') || msg.includes('está bloqueado') || msg.includes('esta bloqueado');
}
