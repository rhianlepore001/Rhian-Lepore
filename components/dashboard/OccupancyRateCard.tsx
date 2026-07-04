import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, Calendar, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useOccupancyComparison, type OccupancyPeriod } from '../../hooks/useOccupancyRate';
import { formatDuration } from '../../utils/formatters';

export const OccupancyRateCard: React.FC = () => {
  const { colors, accent, status } = useBrutalTheme();
  const [period, setPeriod] = useState<OccupancyPeriod>('today');
  const { data, isLoading } = useOccupancyComparison(period);

  const current = data?.current;
  const previous = data?.previous;

  const rate = current?.occupancyRate ?? 0;
  const previousRate = previous?.occupancyRate ?? 0;
  const delta = rate - previousRate;

  let statusColor = status.success;
  let statusBg = status.successBg;
  let statusBorder = status.successBorder;
  let StatusIcon = CheckCircle2;
  let statusLabel = 'Boa';

  if (rate < 50) {
    statusColor = status.danger;
    statusBg = status.dangerBg;
    statusBorder = status.dangerBorder;
    StatusIcon = AlertCircle;
    statusLabel = 'Crítica';
  } else if (rate < 70) {
    statusColor = status.warning;
    statusBg = status.warningBg;
    statusBorder = status.warningBorder;
    StatusIcon = AlertCircle;
    statusLabel = 'Atenção';
  } else if (rate > 95) {
    statusColor = status.warning;
    statusBg = status.warningBg;
    statusBorder = status.warningBorder;
    StatusIcon = AlertCircle;
    statusLabel = 'Lotada';
  }

  const periodLabel: Record<OccupancyPeriod, string> = {
    today: 'Hoje',
    week: 'Semana',
    month: 'Mês',
  };

  return (
    <Card variant="outlined" className="overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${accent.bgDim} ${accent.text}`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-heading text-base font-bold ${colors.text}`}>Agenda cheia</h2>
            <p className={`text-sm ${colors.textSecondary}`}>Quanto da sua agenda está preenchida</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-divider)]">
          {(Object.keys(periodLabel) as OccupancyPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                period === p
                  ? `${accent.bgDim} ${accent.text}`
                  : `${colors.textMuted} hover:${colors.text}`
              }`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !current ? (
        <div className="mt-6 space-y-4">
          <div className={`h-12 rounded-lg ${colors.surface} animate-pulse`} />
          <div className={`h-3 rounded-full ${colors.surface} animate-pulse`} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className={`font-mono text-5xl font-black tabular-nums tracking-tight ${colors.text}`}>
                {rate}%
              </p>
              <div className="mt-2 flex items-center gap-2">
                {delta > 0 ? (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${status.success}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{delta}% vs {periodLabel[period].toLowerCase()} anterior
                  </span>
                ) : delta < 0 ? (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${status.danger}`}>
                    <TrendingDown className="w-3.5 h-3.5" />
                    {delta}% vs {periodLabel[period].toLowerCase()} anterior
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${colors.textMuted}`}>
                    <Minus className="w-3.5 h-3.5" />
                    Estável
                  </span>
                )}
              </div>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusBg} ${statusBorder} ${statusColor}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {statusLabel}
            </div>
          </div>

          <div className="mt-5">
            <div className={`h-3 rounded-full ${colors.surface} overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${accent.bg}`}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-mono">
              <span className={colors.textSecondary}>
                {formatDuration(current.occupiedMinutes)} ocupados
              </span>
              <span className={colors.textSecondary}>
                {formatDuration(current.availableMinutes)} disponíveis
              </span>
            </div>
          </div>

          {rate < 70 && (
            <div className={`mt-4 p-3 rounded-xl border ${status.warningBg} ${status.warningBorder} ${status.warning}`}>
              <p className="text-xs font-medium leading-relaxed">
                Você ainda tem {formatDuration(current.availableMinutes - current.occupiedMinutes)} livres.
                Vale abrir mais horários ou avisar clientes com agenda em aberto.
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
