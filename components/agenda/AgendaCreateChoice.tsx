import React from 'react';
import { Ban, CalendarPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export interface AgendaCreateChoiceProps {
  open: boolean;
  onClose: () => void;
  onNewAppointment: () => void;
  onBlockAgenda: () => void;
  /** Quando true, mostra as duas ações. Quando false o pai nem abre este sheet. */
  canBlock: boolean;
  /** Slot vazio da grade: copy "Bloquear a partir daqui". */
  source?: 'plus' | 'slot';
}

export const AgendaCreateChoice: React.FC<AgendaCreateChoiceProps> = ({
  open,
  onClose,
  onNewAppointment,
  onBlockAgenda,
  canBlock,
  source = 'plus',
}) => {
  const { colors, accent } = useBrutalTheme();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="O que você quer fazer?"
      size="sm"
      labelledById="agenda-create-choice-title"
    >
      <div className="grid gap-2" data-testid="agenda-create-choice">
        <button
          type="button"
          data-testid="agenda-choice-new-appointment"
          className={`flex items-center gap-3 w-full min-h-[44px] rounded-xl border px-4 py-3 text-left ${colors.border} ${colors.card} hover:bg-[var(--color-accent-dim)]`}
          onClick={onNewAppointment}
        >
          <CalendarPlus className={`w-5 h-5 shrink-0 ${accent.text}`} aria-hidden />
          <span>
            <span className={`block text-sm font-semibold ${colors.text}`}>Novo atendimento</span>
            <span className={`block text-xs ${colors.textMuted}`}>Marcar cliente na agenda</span>
          </span>
        </button>
        {canBlock && (
          <button
            type="button"
            data-testid="agenda-choice-block"
            className={`flex items-center gap-3 w-full min-h-[44px] rounded-xl border px-4 py-3 text-left ${colors.border} ${colors.card} hover:bg-[var(--color-card-hover)]`}
            onClick={onBlockAgenda}
          >
            <Ban className={`w-5 h-5 shrink-0 ${colors.textMuted}`} aria-hidden />
            <span>
              <span className={`block text-sm font-semibold ${colors.text}`}>
                {source === 'slot' ? 'Bloquear a partir daqui' : 'Bloquear agenda'}
              </span>
              <span className={`block text-xs ${colors.textMuted}`}>
                {source === 'slot' ? 'Já começa neste horário' : 'Ninguém marca neste período'}
              </span>
            </span>
          </button>
        )}
      </div>
    </Modal>
  );
};
