import React from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { DashboardAppointment } from '../../types/dashboard';
import {
  getCockpitAgendaStatus,
  type CockpitAgendaStatusMeta,
} from '../../utils/dashboardCockpit';

export interface TodayAgendaListProps {
  appointments: DashboardAppointment[];
  nextId: string | null;
  loading?: boolean;
  showPrice?: boolean;
  formatPrice?: (price: number) => string;
  onOpenAll: () => void;
  onSelect?: (apt: DashboardAppointment) => void;
  limit?: number;
}

function toneClasses(
  tone: CockpitAgendaStatusMeta['tone'],
  theme: ReturnType<typeof useBrutalTheme>,
): { dot: string; badge: string } {
  const { accent, status, colors } = theme;
  switch (tone) {
    case 'accent':
      return { dot: accent.bg, badge: `${accent.bgDim} ${accent.text}` };
    case 'warning':
      return {
        dot: status.warning.replace('text-', 'bg-'),
        badge: `${status.warningBg} ${status.warning}`,
      };
    case 'success':
      return {
        dot: status.success.replace('text-', 'bg-'),
        badge: `${status.successBg} ${status.success}`,
      };
    case 'danger':
      return {
        dot: status.danger.replace('text-', 'bg-'),
        badge: `${status.dangerBg} ${status.danger}`,
      };
    case 'info':
      return {
        dot: 'bg-[var(--color-info)]',
        badge: 'bg-[color-mix(in_srgb,var(--color-info)_15%,transparent)] text-[var(--color-info)]',
      };
    default:
      return { dot: colors.surface, badge: `${colors.surface} ${colors.textMuted}` };
  }
}

export const TodayAgendaList: React.FC<TodayAgendaListProps> = ({
  appointments,
  nextId,
  loading = false,
  showPrice = false,
  formatPrice,
  onOpenAll,
  onSelect,
  limit = 8,
}) => {
  const theme = useBrutalTheme();
  const { colors, accent } = theme;
  const visible = appointments.slice(0, limit);

  return (
    <Card variant="outlined">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className={`h-4 w-4 shrink-0 ${accent.text}`} aria-hidden="true" />
          <h2 className={`font-heading text-base font-bold ${colors.text}`}>Agenda de hoje</h2>
        </div>
        <button
          type="button"
          onClick={onOpenAll}
          className={`min-h-[44px] px-2 text-sm font-semibold ${accent.text} hover:opacity-70 transition-opacity`}
        >
          Ver agenda →
        </button>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-14 rounded-xl animate-pulse ${colors.surface}`} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-6 text-center ${colors.divider}`}>
          <p className={`text-sm ${colors.textSecondary}`}>Nenhum agendamento para hoje.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((apt) => {
            const meta = getCockpitAgendaStatus(apt, nextId);
            const tones = toneClasses(meta.tone, theme);
            const isNow = meta.key === 'now';

            return (
              <li key={apt.id}>
                <button
                  type="button"
                  onClick={() => (onSelect ? onSelect(apt) : onOpenAll())}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-opacity hover:opacity-90 min-h-[44px] ${
                    isNow ? `${accent.bgDim} ${accent.borderDim} border` : colors.surface
                  }`}
                >
                  <span className={`font-mono text-sm font-bold tabular-nums shrink-0 ${colors.text}`}>
                    {apt.time}
                  </span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${tones.dot}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${colors.text}`}>{apt.clientName}</p>
                    <p className={`truncate text-xs ${colors.textSecondary}`}>
                      {apt.service}
                      {showPrice && formatPrice ? ` · ${formatPrice(apt.price)}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-mono font-bold uppercase tracking-wider ${tones.badge}`}
                  >
                    {meta.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && appointments.length > limit && (
        <button
          type="button"
          onClick={onOpenAll}
          className={`mt-3 w-full min-h-[44px] text-sm font-semibold ${accent.text}`}
        >
          +{appointments.length - limit} na agenda completa
        </button>
      )}
    </Card>
  );
};
