import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { PerformanceTrendPoint } from '../../types/staffPerformance';
import { monthShortLabel } from '../../utils/staffPerformanceView';

interface TrendBarsProps {
    title: string;
    points: Array<Pick<PerformanceTrendPoint, 'month' | 'low_sample' | 'atendimentos'> & { value: number | null }>;
    formatValue: (v: number) => string;
    testId?: string;
}

export const TrendBars: React.FC<TrendBarsProps> = ({ title, points, formatValue, testId }) => {
    const { colors, accent, radius } = useBrutalTheme();
    const values = points.map((p) => p.value);
    const max = Math.max(0, ...values.map((v) => v ?? 0));

    const hasLowSample = points.some((p) => p.low_sample && p.atendimentos > 0 && p.value != null);

    return (
        <figure className="min-w-0">
            <figcaption className={`text-sm font-semibold ${colors.text}`}>{title}</figcaption>
            <ol className="mt-3 grid grid-cols-6 gap-2 items-end h-32" aria-label={title}>
                {points.map((p, i) => {
                    const v = values[i];
                    const empty = v == null || p.atendimentos === 0;
                    const h = empty || max === 0 ? 0 : Math.max(8, Math.round((Math.max(v ?? 0, 0) / max) * 100));
                    const text = empty ? 'sem dados' : formatValue(v as number);
                    const sampleNote = p.low_sample && !empty ? ', poucos atendimentos' : '';
                    return (
                        <li
                            key={p.month}
                            data-testid={testId}
                            className="flex flex-col items-center justify-end h-full gap-1 min-w-0"
                            aria-label={`${monthShortLabel(p.month)}: ${text}${sampleNote}`}
                        >
                            {empty ? (
                                <span className={`text-sm ${colors.textMuted}`} aria-hidden="true">—</span>
                            ) : (
                                <span
                                    aria-hidden="true"
                                    data-low-sample={p.low_sample || undefined}
                                    className={`w-full max-w-[2.5rem] ${radius.badge === 'rounded-full' ? 'rounded-t-md' : 'rounded-t-sm'} ${accent.bg} ${p.low_sample ? 'opacity-40' : ''}`}
                                    style={{ height: `${h}%` }}
                                />
                            )}
                            <span className={`text-xs ${colors.textMuted}`} aria-hidden="true">{monthShortLabel(p.month)}</span>
                        </li>
                    );
                })}
            </ol>
            {hasLowSample && (
                <p className={`mt-3 text-[13px] ${colors.textMuted}`}>Barra mais clara: poucos atendimentos.</p>
            )}
        </figure>
    );
};
