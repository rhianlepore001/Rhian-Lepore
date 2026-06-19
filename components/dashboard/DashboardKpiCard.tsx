import React from 'react';
import { Card } from '../ui/Card';
import { MiniSparkline } from './MiniSparkline';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export interface DashboardKpiCardProps {
  title: string;
  value: string;
  variation?: number;
  sparklineData?: number[];
  variant?: 'default' | 'accent';
  icon?: React.ReactNode;
  onClick?: () => void;
  subtitle?: string;
}

export const DashboardKpiCard: React.FC<DashboardKpiCardProps> = ({
  title,
  value,
  variation,
  sparklineData,
  variant = 'default',
  icon,
  onClick,
  subtitle,
}) => {
  const { accent, colors, status, shadow } = useBrutalTheme();

  const isPositive = variation !== undefined && variation > 0;
  const isNegative = variation !== undefined && variation < 0;
  const isNeutral = variation !== undefined && variation === 0;
  const variationText = variation !== undefined
    ? `${isPositive ? '+' : ''}${variation.toFixed(1)}%`
    : null;

  const variationColor = isPositive ? status.success : isNegative ? status.danger : colors.textMuted;
  const variationBg = isPositive ? status.successBg : isNegative ? status.dangerBg : colors.surface;

  return (
    <div
      className={`${onClick ? 'cursor-pointer' : ''} group`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <Card variant={variant === 'accent' ? 'elevated' : 'outlined'} className={`h-full transition-all duration-300 ${onClick ? `hover:-translate-y-0.5 ${shadow.cardHover}` : ''}`} noPadding>
        <div className="p-4 md:p-6 flex flex-col justify-between h-full relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className={`text-[10px] font-mono uppercase tracking-[0.15em] font-bold ${colors.textMuted}`}>
                {title}
              </span>
              {subtitle && (
                <p className={`text-[9px] ${colors.textMuted} mt-0.5 opacity-60`}>{subtitle}</p>
              )}
            </div>
            {icon && (
              <div className={`p-2 rounded-xl ${accent.bgDim} transition-all duration-300 group-hover:scale-110`}>
                <span className={accent.text}>{icon}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-end">
            <div className={`text-2xl md:text-3xl font-bold font-mono tabular-nums tracking-tight ${variant === 'accent' ? accent.text : colors.text}`}>
              {value}
            </div>

            {variationText && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${variationBg}`}>
                  {isPositive ? (
                    <TrendingUp className={`w-3 h-3 ${variationColor}`} aria-hidden="true" />
                  ) : isNegative ? (
                    <TrendingDown className={`w-3 h-3 ${variationColor}`} aria-hidden="true" />
                  ) : (
                    <Minus className={`w-3 h-3 ${variationColor}`} aria-hidden="true" />
                  )}
                  <span className={`text-[10px] font-mono font-bold ${variationColor}`}>
                    {variationText}
                  </span>
                </div>
                <span className={`text-[9px] ${colors.textMuted}`}>vs sem. anterior</span>
              </div>
            )}

            {sparklineData && sparklineData.length > 0 && (
              <div className="mt-3 -mx-1">
                <MiniSparkline data={sparklineData} color={accent.hex} height={40} showArea />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
