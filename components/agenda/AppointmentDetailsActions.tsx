import React from 'react';
import { Ban, CalendarPlus, Check, DollarSign, Edit2, Lock, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { isNoShowStatus } from '../../utils/appointmentStatus';

interface AppointmentDetailsActionsProps {
  status: string;
  /** Pode editar/reagendar/cancelar (dono sempre; colaborador conforme a permissão da equipe). */
  canEdit: boolean;
  isStaff: boolean;
  /** Explicação curta para o colaborador quando edição/cancelamento está bloqueado. */
  blockedMessage: string;
  onCheckout: () => void;
  onNoShow: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onClose: () => void;
  /**
   * Falta (NoShow): cria um NOVO agendamento (mesmo cliente/serviço) em outro
   * horário. Liberado para toda a equipe (criar não depende da permissão de edição).
   */
  onReschedule?: () => void;
}

/**
 * Rodapé do modal "Detalhes do Agendamento" da Agenda.
 * "Confirmar e cobrar" e "Faltou" seguem liberados para toda a equipe (como antes);
 * "Editar" e "Cancelar" dependem de `canEdit`.
 */
export const AppointmentDetailsActions: React.FC<AppointmentDetailsActionsProps> = ({
  status,
  canEdit,
  isStaff,
  blockedMessage,
  onCheckout,
  onNoShow,
  onEdit,
  onCancel,
  onClose,
  onReschedule,
}) => {
  const { colors } = useBrutalTheme();
  const isOpen = status === 'Confirmed' || status === 'Pending';

  const isNoShow = isNoShowStatus(status);

  if (isNoShow && onReschedule) {
    return (
      <>
        <Button
          variant="primary"
          className="w-full flex justify-center items-center gap-2"
          onClick={onReschedule}
          data-testid="noshow-reschedule"
        >
          <CalendarPlus className="w-4 h-4" /> Reagendar
        </Button>
        <Button variant="ghost" className="w-full flex justify-center items-center gap-2" onClick={onClose}>
          Fechar
        </Button>
        <p className={`text-xs ${colors.textMuted}`} data-testid="noshow-reschedule-hint">
          Cria um novo agendamento para o mesmo cliente. A falta continua no histórico e o horário já está livre.
        </p>
      </>
    );
  }

  if (!isOpen) {
    return (
      <Button variant="primary" className="flex-1 flex justify-center items-center gap-2" onClick={onClose}>
        <Check className="w-4 h-4" /> Fechar
      </Button>
    );
  }

  return (
    <>
      {/* Confirmar e cobrar — dono E colaborador (abre o checkout) */}
      <Button variant="primary" className="w-full flex justify-center items-center gap-2" onClick={onCheckout}>
        <DollarSign className="w-4 h-4" /> Confirmar e cobrar
      </Button>
      <div className="flex flex-wrap gap-2">
        {/* Faltou — dono E colaborador */}
        <Button
          variant="secondary"
          className="flex-1 min-w-[7rem] flex justify-center items-center gap-2"
          onClick={onNoShow}
        >
          <Ban className="w-4 h-4" /> Faltou
        </Button>
        {canEdit && status === 'Confirmed' && (
          <Button
            variant="secondary"
            className="flex-1 min-w-[7rem] flex justify-center items-center gap-2"
            onClick={onEdit}
          >
            <Edit2 className="w-4 h-4" /> Editar
          </Button>
        )}
        {canEdit && (
          <Button
            variant="secondary"
            className="flex-1 min-w-[7rem] flex justify-center items-center gap-2"
            onClick={onCancel}
          >
            <X className="w-4 h-4" /> Cancelar
          </Button>
        )}
        <Button
          variant="ghost"
          className="flex-1 min-w-[7rem] flex justify-center items-center gap-2"
          onClick={onClose}
        >
          Fechar
        </Button>
      </div>
      {isStaff && !canEdit && (
        <p className={`flex items-start gap-2 text-xs ${colors.textMuted}`} data-testid="staff-edit-blocked-note">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{blockedMessage}</span>
        </p>
      )}
    </>
  );
};
