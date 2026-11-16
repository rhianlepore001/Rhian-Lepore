import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock } from 'lucide-react';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';

export function HourlyResultsEntry({ to, subtitle, period }: { to: string; subtitle: string; period?: string }) {
  const { colors, accent, radius } = useBrutalTheme();
  return (
    <Link
      to={to}
      data-testid="hourly-results-entry"
      className={`group flex items-center gap-3 p-4 md:p-5 min-h-[72px] border ${colors.border} ${colors.card} ${radius.card} transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent.bgDim} ${accent.text}`} aria-hidden="true">
        <Clock className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <h2 className={`text-base font-semibold leading-tight ${colors.text}`}>Resultados por hora</h2>
        <span className={`mt-1 block text-[13px] leading-snug ${colors.textSecondary}`}>{subtitle}</span>
        {period && <span className={`mt-1 block text-[13px] leading-snug ${colors.textSecondary}`}>Período: {period}</span>}
        <span className={`mt-2 inline-flex min-h-11 items-center text-sm font-semibold ${accent.text}`}>Ver resultados</span>
      </span>
      <ChevronRight className={`h-5 w-5 shrink-0 ${colors.textSecondary} transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none`} aria-hidden="true" />
    </Link>
  );
}
