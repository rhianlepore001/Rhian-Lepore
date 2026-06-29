import React, { useState } from 'react';
import { UserX, TrendingUp, TrendingDown, Minus, CalendarOff, DollarSign, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useCancellationRate, type CancellationPeriod } from '../../hooks/useCancellationRate';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

export const CancellationRateCard: React.FC = () => {
  const { colors, accent, status } = useBrutalTheme();
  const { region } = useAuth();
  const [period, setPeriod] = useState<CancellationPeriod>('month');
  const { data, isLoading } = useCancellationRate(period);

  const current = data?.current;
  const rate = current ? current.cancellationRate + current.noShowRate : 0;
  const delta = current?.comparison.delta ?? 0;

  let statusColor = status.success;
  let statusBg = status.successBg;
  let statusBorder = status.successBorder;
  let StatusIcon = TrendingDown;
  let statusLabel = 'Excelente';

  if (rate > 20) {
    statusColor = status.danger;
    statusBg = status.dangerBg;
    statusBorder = status.dangerBorder;
    StatusIcon = AlertTriangle;
    statusLabel = 'Crítico';
  } else if (rate > 10) {
    statusColor = status.warning;
    statusBg = status.warningBg;
    statusBorder = status.warningBorder;
    StatusIcon = AlertTriangle;
    statusLabel = 'Atenção';
  }

  const periodLabel: Record<CancellationPeriod, string> = {
    week: 'Semana',
    month: 'Mês',
    quarter: 'Trimestre',
  };

  return (
    <Card variant="outlined" className="overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${accent.bgDim} ${accent.text}`}>
            <CalendarOff className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-heading text-base font-bold ${colors.text}`}>Cancelamentos & Faltas</h2>
            <p className={`text-sm ${colors.textSecondary}`}>Taxa de no-shows</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-divider)]">
          {(Object.keys(periodLabel) as CancellationPeriod[]).map((p) => (
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
        <div className="mt-6 space-y-3">
          <div className={`h-12 rounded-lg ${colors.surface} animate-pulse`} />
          <div className={`h-3 rounded-full ${colors.surface} animate-pulse`} />
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className={`font-mono text-5xl font-black tabular-nums tracking-tight ${colors.text}`}>
                {rate.toFixed(1)}%
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs">
                {delta > 0 ? (
                  <span className={`inline-flex items-center gap-1 font-bold ${status.danger}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{delta.toFixed(1)}%
                  </span>
                ) : delta < 0 ? (
                  <span className={`inline-flex items-center gap-1 font-bold ${status.success}`}>
                    <TrendingDown className="w-3.5 h-3.5" />
                    {delta.toFixed(1)}%
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 font-bold ${colors.textMuted}`}>
                    <Minus className="w-3.5 h-3.5" />
                    Estável
                  </span>
                )}
                <span className={colors.textSecondary}>
                  vs {periodLabel[period].toLowerCase()} anterior
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusBg} ${statusBorder} ${statusColor}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {statusLabel}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border ${colors.card} ${colors.border}`}>
              <div className="flex items-center gap-1.5">
                <UserX className={`w-3.5 h-3.5 ${colors.textMuted}`} />
                <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.textMuted}`}>
                  Cancelados
                </p>
              </div>
              <p className={`mt-1.5 font-mono text-2xl font-black tabular-nums ${colors.text}`}>
                {current.breakdown.cancelled}
              </p>
              <p className={`text-[10px] font-mono ${colors.textSecondary}`}>
                {current.cancellationRate.toFixed(1)}% do total
              </p>
            </div>

            <div className={`p-3 rounded-xl border ${colors.card} ${colors.border}`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 ${colors.textMuted}`} />
                <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.textMuted}`}>
                  Faltas
                </p>
              </div>
              <p className={`mt-1.5 font-mono text-2xl font-black tabular-nums ${colors.text}`}>
                {current.breakdown.noShow}
              </p>
              <p className={`text-[10px] font-mono ${colors.textSecondary}`}>
                {current.noShowRate.toFixed(1)}% do total
              </p>
            </div>
          </div>

          {current.revenueLost > 0 && (
            <div className={`mt-4 p-3 rounded-xl border ${status.warningBg} ${status.warningBorder}`}>
              <div className="flex items-center gap-2">
                <DollarSign className={`w-4 h-4 ${status.warning}`} />
                <p className={`text-xs font-medium ${status.warning}`}>
                  Receita perdida: <span className="font-bold">{formatCurrency(current.revenueLost, region)}</span>
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
