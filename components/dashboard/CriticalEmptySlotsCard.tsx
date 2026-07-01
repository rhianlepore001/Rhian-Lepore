import React from 'react';
import { Calendar, AlertCircle, TrendingUp, Megaphone } from 'lucide-react';
import { Card } from '../ui/Card';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useCriticalEmptySlots } from '../../hooks/useCriticalEmptySlots';
import { formatDuration } from '../../utils/formatters';

export const CriticalEmptySlotsCard: React.FC = () => {
  const { colors, accent, status } = useBrutalTheme();
  const { data, isLoading } = useCriticalEmptySlots(7);

  const critical = data?.criticalSlots ?? [];
  const totalEmpty = data?.totalEmptyMinutes ?? 0;
  const criticalCount = critical.filter((s) => s.severity === 'critical').length;
  const warningCount = critical.filter((s) => s.severity === 'warning').length;

  const overallSeverity = criticalCount > 0
    ? 'critical'
    : warningCount > 0
      ? 'warning'
      : 'ok';

  const statusColor = overallSeverity === 'critical'
    ? status.danger
    : overallSeverity === 'warning'
      ? status.warning
      : status.success;
  const statusBg = overallSeverity === 'critical'
    ? status.dangerBg
    : overallSeverity === 'warning'
      ? status.warningBg
      : status.successBg;
  const statusBorder = overallSeverity === 'critical'
    ? status.dangerBorder
    : overallSeverity === 'warning'
      ? status.warningBorder
      : status.successBorder;

  return (
    <Card variant="outlined" className="overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${accent.bgDim} ${accent.text}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-heading text-base font-bold ${colors.text}`}>Horários Vagos Críticos</h2>
            <p className={`text-sm ${colors.textSecondary}`}>Próximos 7 dias</p>
          </div>
        </div>

        {isLoading || !data ? (
          <div className={`h-7 w-20 rounded-full ${colors.surface} animate-pulse`} />
        ) : (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusBg} ${statusBorder} ${statusColor}`}
          >
            {overallSeverity === 'ok' ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {overallSeverity === 'critical'
              ? `${criticalCount} críticos`
              : overallSeverity === 'warning'
                ? `${warningCount} atenção`
                : 'Tudo preenchido'}
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <div className="mt-6 space-y-3">
          <div className={`h-12 rounded-lg ${colors.surface} animate-pulse`} />
          <div className={`h-12 rounded-lg ${colors.surface} animate-pulse`} />
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3">
            <div>
              <p className={`font-mono text-3xl font-black tabular-nums tracking-tight ${colors.text}`}>
                {formatDuration(totalEmpty)}
              </p>
              <p className={`text-xs ${colors.textSecondary}`}>de tempo ocioso total</p>
            </div>
          </div>

          {critical.length === 0 ? (
            <div className={`mt-5 p-4 rounded-xl border ${status.successBg} ${status.successBorder} ${status.success}`}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <p className="text-xs font-medium">
                  Agenda cheia nos próximos 7 dias. Excelente!
                </p>
              </div>
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {critical.slice(0, 3).map((slot) => (
                <li
                  key={`${slot.date}-${slot.startTime}`}
                  className={`p-3 rounded-xl border ${
                    slot.severity === 'critical'
                      ? `${status.dangerBg} ${status.dangerBorder}`
                      : `${status.warningBg} ${status.warningBorder}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${colors.text}`}>
                        {slot.weekday}, {formatDateBR(slot.date)}
                      </p>
                      <p className={`text-xs font-mono ${colors.textSecondary}`}>
                        {slot.startTime}–{slot.endTime} · {formatDuration(slot.durationMinutes)}
                      </p>
                    </div>
                    <button
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${colors.border} ${colors.card} ${colors.text} hover:${accent.bgDim} transition-all`}
                      title="Criar campanha para preencher"
                    >
                      <Megaphone className="w-3 h-3" />
                      Camp.
                    </button>
                  </div>
                </li>
              ))}
              {critical.length > 3 && (
                <li>
                  <button className={`w-full text-center text-xs font-bold py-2 ${colors.textSecondary} hover:${accent.text} transition-colors`}>
                    + {critical.length - 3} horários vagos
                  </button>
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </Card>
  );
};

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}
