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
      <div className="flex items-center gap-3 px-3 py-3 md:px-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent.bgDim} ${accent.text}`} aria-hidden="true">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p data-kpi-label className={`text-[13px] font-medium ${colors.textSecondary}`}>{title}</p>
          <p data-kpi-value className={`mt-0.5 font-mono text-xl font-black tracking-tight tabular-nums ${colors.text}`}>{value}</p>
          <p className={`mt-0.5 text-xs ${colors.textSecondary} truncate`}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
};
