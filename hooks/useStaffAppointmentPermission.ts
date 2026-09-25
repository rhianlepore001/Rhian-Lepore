import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useSettings';
import {
  canEditAppointment,
  normalizeStaffAppointmentEditScope,
  staffEditBlockedMessage,
  type StaffAppointmentEditScope,
} from '@/utils/staffAppointmentPermission';

export interface StaffAppointmentPermission {
  scope: StaffAppointmentEditScope;
  isStaff: boolean;
  /** Pode editar/reagendar/cancelar o agendamento deste profissional? */
  canEdit: (professionalId: string | null | undefined) => boolean;
  /** No nível "só os próprios": o colaborador não pode passar o agendamento para outro profissional. */
  lockProfessionalToSelf: boolean;
  blockedMessage: string;
}

/**
 * Lê a permissão definida pelo dono em business_settings (o colaborador tem
 * leitura do row da empresa). Sem a coluna (banco antigo) ou sem row, cai no
 * padrão 'none' — o mesmo comportamento de antes desta feature.
 */
export function useStaffAppointmentPermission(): StaffAppointmentPermission {
  const { role, teamMemberId } = useAuth();
  const { data: settings } = useBusinessSettings();
  const scope = normalizeStaffAppointmentEditScope(settings?.staff_appointment_edit_scope);
  const isStaff = role === 'staff';

  const canEdit = useCallback(
    (professionalId: string | null | undefined) => canEditAppointment({ role, scope, teamMemberId, professionalId }),
    [role, scope, teamMemberId],
  );

  return useMemo(() => ({
    scope,
    isStaff,
    canEdit,
    lockProfessionalToSelf: isStaff && scope === 'own',
    blockedMessage: staffEditBlockedMessage(scope),
  }), [scope, isStaff, canEdit]);
}
