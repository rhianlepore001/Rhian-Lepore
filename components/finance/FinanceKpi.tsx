import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export interface FinanceKpiProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}

/**
 * Cartão de número do Financeiro (Visão geral e Histórico usam o mesmo).
 * Rótulo em caixa normal, número em fonte tabular, uma linha de apoio.
 */
export const FinanceKpi: React.FC<FinanceKpiProps> = ({ title, value, subtitle, icon }) => {
  const { colors, accent, radius } = useBrutalTheme();
  return (
    <div data-testid="finance-kpi" className={`${colors.card} ${colors.border} border ${radius.card} overflow-hidden`}>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-3 md:px-4">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent.bgDim} ${accent.text}`} aria-hidden="true">
          {icon}
        </span>
        <p data-kpi-label className={`text-sm font-semibold leading-snug ${colors.textSecondary}`}>{title}</p>
        <p data-kpi-value className={`col-span-2 font-mono text-[clamp(0.875rem,4vw,1.375rem)] font-bold tracking-tight tabular-nums [overflow-wrap:anywhere] ${colors.text}`}>{value}</p>
        <p className={`col-span-2 text-xs leading-snug ${colors.textSecondary}`}>{subtitle}</p>
      </div>
    </div>
  );
};
