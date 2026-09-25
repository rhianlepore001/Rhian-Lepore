/**
 * Permissão da equipe (staff) para editar / reagendar / cancelar agendamentos.
 *
 * O dono escolhe em Configurações › Equipe (coluna
 * business_settings.staff_appointment_edit_scope). O banco aplica a mesma regra
 * via trigger (migration 20260925140000_staff_appointment_edit_scope), então
 * esconder botões aqui é só UX — não é a proteção.
 *
 * Fora do escopo (continua como hoje para toda a equipe, em qualquer nível):
 * criar agendamento, "Confirmar e cobrar" (checkout) e "Faltou".
 */
export type StaffAppointmentEditScope = 'none' | 'own' | 'all';

export const STAFF_APPOINTMENT_EDIT_SCOPES: readonly StaffAppointmentEditScope[] = ['none', 'own', 'all'];

/**
 * Padrão = comportamento atual do app: colaborador não edita nem cancela
 * (os botões sempre foram só do dono). Também vale quando a coluna ainda não
 * existe (front novo contra banco antigo).
 */
export const DEFAULT_STAFF_APPOINTMENT_EDIT_SCOPE: StaffAppointmentEditScope = 'none';

export function isStaffAppointmentEditScope(value: unknown): value is StaffAppointmentEditScope {
  return typeof value === 'string' && (STAFF_APPOINTMENT_EDIT_SCOPES as readonly string[]).includes(value);
}

export function normalizeStaffAppointmentEditScope(value: unknown): StaffAppointmentEditScope {
  return isStaffAppointmentEditScope(value) ? value : DEFAULT_STAFF_APPOINTMENT_EDIT_SCOPE;
}

export interface AppointmentEditCheck {
  role: string | null | undefined;
  scope: StaffAppointmentEditScope;
  /** team_members.id do colaborador logado. */
  teamMemberId: string | null | undefined;
  /** professional_id do agendamento. */
  professionalId: string | null | undefined;
}

/** Pode editar, reagendar ou cancelar este agendamento? */
export function canEditAppointment({ role, scope, teamMemberId, professionalId }: AppointmentEditCheck): boolean {
  if (role !== 'staff') return true; // dono (e demais papéis não-staff) sempre podem
  if (scope === 'all') return true;
  if (scope === 'own') return !!teamMemberId && !!professionalId && professionalId === teamMemberId;
  return false;
}

/** Explicação curta mostrada ao colaborador quando a ação está bloqueada. */
export function staffEditBlockedMessage(scope: StaffAppointmentEditScope): string {
  if (scope === 'own') {
    return 'Você só pode editar ou cancelar os seus próprios agendamentos. Fale com o dono para alterar este.';
  }
  return 'Edição e cancelamento de agendamentos estão reservados ao dono. Fale com ele para alterar.';
}

export const STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS: ReadonlyArray<{
  value: StaffAppointmentEditScope;
  label: string;
  description: string;
}> = [
  {
    value: 'none',
    label: 'Não podem editar',
    description: 'Colaboradores não editam, reagendam nem cancelam agendamentos. Só o dono.',
  },
  {
    value: 'own',
    label: 'Só os próprios',
    description: 'Cada colaborador edita, reagenda e cancela apenas os agendamentos em que é o profissional.',
  },
  {
    value: 'all',
    label: 'Todos os agendamentos',
    description: 'Colaboradores editam, reagendam e cancelam qualquer agendamento do estabelecimento.',
  },
];

/** Mensagem quando o banco recusa (ex.: o dono mudou a permissão com a tela aberta). */
export const STAFF_EDIT_FORBIDDEN_MESSAGE = 'Sua permissão não permite alterar este agendamento. Fale com o dono.';

/** Erro do banco quando a trigger bloqueia (42501 + mensagem fixa). */
export function isStaffEditForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  return String(e.message ?? '').includes('staff_appointment_edit_forbidden');
}
