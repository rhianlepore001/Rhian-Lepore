import React from 'react';
import { Edit2, MessageCircle } from 'lucide-react';
import { VISUAL_STATUS_CLASSES, VISUAL_STATUS_LABEL, type VisualStatus } from '../../utils/appointmentStatus';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

const STATUSES: VisualStatus[] = ['normal', 'overdue', 'completed', 'noshow', 'cancelled'];

export interface AgendaStatusLegendProps {
  emptyHint?: boolean;
}

/**
 * Legenda no fluxo da página — só aparece depois de rolar o calendário.
 * Sem sticky/fixed: o foco permanece na grade.
 */
export const AgendaStatusLegend: React.FC<AgendaStatusLegendProps> = ({ emptyHint = false }) => {
  const { colors } = useBrutalTheme();

  return (
    <footer
      data-testid="agenda-status-legend"
      className={`pt-4 pb-1 ${colors.textMuted}`}
    >
      {emptyHint && (
        <p className={`text-center text-xs ${colors.textMuted} mb-2`}>
          Nenhum agendamento neste dia. Toque num horário para criar.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {STATUSES.map((v) => (
          <div key={v} className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full ${VISUAL_STATUS_CLASSES[v].dot}`}
              aria-hidden
            />
            <span className="whitespace-nowrap">{VISUAL_STATUS_LABEL[v]}</span>
          </div>
        ))}
        <div className={`w-px h-3 shrink-0 ${colors.divider} bg-[var(--color-divider)]`} aria-hidden />
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
          <MessageCircle className="w-3 h-3 text-[var(--color-success)]/70" aria-hidden />
          <span className="whitespace-nowrap">Com observação</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
          <Edit2 className="w-3 h-3" aria-hidden />
          <span className="whitespace-nowrap">Editado</span>
        </div>
      </div>
    </footer>
  );
};
