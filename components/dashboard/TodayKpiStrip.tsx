import React from 'react';
import { Card } from '../ui/Card';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export interface TodayKpi {
  id: string;
  label: string;
  value: string;
  hint?: string;
  progress?: number | null;
  onClick?: () => void;
}

export interface TodayKpiStripProps {
  items: TodayKpi[];
  loading?: boolean;
}

export const TodayKpiStrip: React.FC<TodayKpiStripProps> = ({ items, loading = false }) => {
  const { accent, colors, status } = useBrutalTheme();

  if (loading) {
    return (
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="outlined" className="min-h-[96px] animate-pulse">
            <div className={`h-3 w-16 rounded ${colors.surface}`} />
            <div className={`mt-3 h-7 w-20 rounded ${colors.surface}`} />
          </Card>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.id}
          variant="outlined"
          className="p-4"
          onClick={item.onClick}
        >
          <p className={`text-xs font-semibold uppercase tracking-wide ${colors.textMuted}`}>
            {item.label}
          </p>
          <p className={`mt-1 font-mono text-xl font-black tabular-nums md:text-2xl ${colors.text}`}>
            {item.value}
          </p>
          {item.hint && (
            <p className={`mt-0.5 text-xs ${colors.textSecondary} truncate`}>{item.hint}</p>
          )}
          {item.progress != null && (
            <div
              className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${colors.surface}`}
              role="progressbar"
              aria-valuenow={item.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  item.progress >= 100 ? 'bg-[var(--color-success)]' : accent.bg
                }`}
                style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
              />
            </div>
          )}
          {item.progress != null && item.progress >= 100 && (
            <p className={`mt-1 text-xs font-semibold ${status.success}`}>Meta atingida</p>
          )}
        </Card>
      ))}
    </section>
  );
};
