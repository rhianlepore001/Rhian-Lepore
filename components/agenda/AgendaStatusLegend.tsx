import React from 'react';
import { Check, AlertTriangle, Clock, Ban, X, Edit2, MessageCircle } from 'lucide-react';
import { VISUAL_STATUS_CLASSES, VISUAL_STATUS_LABEL, type VisualStatus } from '../../utils/appointmentStatus';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

const VISUAL_STATUS_ICON: Record<VisualStatus, React.ComponentType<{ className?: string }>> = {
  completed: Check,
  overdue: AlertTriangle,
  normal: Clock,
  noshow: Ban,
  cancelled: X,
};

const STATUSES: VisualStatus[] = ['normal', 'overdue', 'completed', 'noshow', 'cancelled'];

export interface AgendaStatusLegendProps {
  emptyHint?: boolean;
}

/**
 * Barra de status colada ao fundo da grade — uma linha, scroll horizontal no mobile.
 */
export const AgendaStatusLegend: React.FC<AgendaStatusLegendProps> = ({ emptyHint = false }) => {
  const { colors } = useBrutalTheme();

  return (
    <footer
      data-testid="agenda-status-legend"
      className={`shrink-0 border-t ${colors.divider} ${colors.card} px-3 py-2`}
    >
      {emptyHint && (
        <p className={`text-center text-xs ${colors.textMuted} mb-1.5`}>
          Nenhum agendamento neste dia. Toque num horário para criar.
        </p>
      )}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-nowrap">
        {STATUSES.map((v) => {
          const LegendIcon = VISUAL_STATUS_ICON[v];
          return (
            <div key={v} className={`flex items-center gap-1.5 shrink-0 text-xs font-medium ${colors.textMuted}`}>
              <LegendIcon className={`w-3.5 h-3.5 ${VISUAL_STATUS_CLASSES[v].text}`} />
              <span className="whitespace-nowrap">{VISUAL_STATUS_LABEL[v]}</span>
            </div>
          );
        })}
        <div className={`w-px h-3.5 shrink-0 ${colors.divider} bg-[var(--color-divider)]`} aria-hidden />
        <div className={`flex items-center gap-1.5 shrink-0 text-xs font-medium ${colors.textMuted}`}>
          <MessageCircle className="w-3.5 h-3.5 text-[var(--color-success)]/80" />
          <span className="whitespace-nowrap">Com observação</span>
        </div>
        <div className={`flex items-center gap-1.5 shrink-0 text-xs font-medium ${colors.textMuted}`}>
          <Edit2 className={`w-3 h-3 ${colors.textMuted}`} />
          <span className="whitespace-nowrap">Editado</span>
        </div>
      </div>
    </footer>
  );
};
