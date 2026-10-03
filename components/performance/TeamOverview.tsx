import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { PerformanceMetrics } from '../../types/staffPerformance';
import { formatPercent, moneyDelta, rateDelta, valueDelta } from '../../utils/staffPerformanceView';
import { DeltaText } from './DeltaText';
import { MetricInfo, type MetricId } from './MetricInfo';

interface TeamOverviewProps {
    totals: PerformanceMetrics | null;
    previous: PerformanceMetrics | null;
    against: string | null;
    formatMoney: (v: number) => string;
}

/** R7.3: linha de equipe — Retorno total, Atendimentos, Voltou a agendar, Faltas. */
export const TeamOverview: React.FC<TeamOverviewProps> = ({ totals, previous, against, formatMoney }) => {
    const { colors, font, radius } = useBrutalTheme();
    const prevSample = previous?.atendimentos ?? 0;
    const t = totals;
    const cells: { label: string; info: MetricId; value: React.ReactNode; hint?: string | null; delta: ReturnType<typeof moneyDelta> }[] = [
        {
            label: 'Retorno total',
            info: 'retorno',
            value: t?.retorno == null ? '—' : formatMoney(t.retorno),
            hint: 'antes das despesas fixas',
            delta: moneyDelta(t?.retorno, previous?.retorno, { prevSample, formatMoney }),
        },
        {
            label: 'Atendimentos',
            info: 'atendimentos',
            value: <span>{t?.atendimentos ?? 0}</span>,
            hint: t && t.atendimentos_clube > 0 ? `${t.atendimentos_clube} do Clube` : null,
            delta: valueDelta(t?.atendimentos, previous?.atendimentos, { prevSample, format: (v) => String(v) }),
        },
        {
            label: 'Voltou a agendar',
            info: 'voltou',
            value: formatPercent(t?.voltou_taxa),
            hint: t && t.maduros > 0 ? `${t.voltou} de ${t.maduros}` : null,
            delta: rateDelta(t?.voltou_taxa, previous?.voltou_taxa, { prevSample }),
        },
        {
            label: 'Faltas',
            info: 'faltas',
            value: formatPercent(t?.taxa_faltas),
            hint: t && t.desfechos > 0 ? `${t.faltas} de ${t.desfechos}` : null,
            delta: rateDelta(t?.taxa_faltas, previous?.taxa_faltas, { prevSample, lowerIsBetter: true }),
        },
    ];
    return (
        <section
            data-testid="team-overview"
            aria-label="Equipe no período"
            className={`grid grid-cols-2 lg:grid-cols-4 border ${colors.border} ${radius.card} ${colors.card} overflow-hidden`}
        >
            {cells.map((c, i) => (
                <div
                    key={c.label}
                    className={`p-4 lg:p-5 min-w-0 ${i % 2 === 1 ? `border-l ${colors.divider}` : ''} ${i >= 2 ? `border-t lg:border-t-0 ${colors.divider}` : ''} ${i === 2 ? 'lg:border-l' : ''}`}
                >
                    <div className="flex items-center justify-between gap-1">
                        <span className={`${font.label} text-xs uppercase tracking-wide ${colors.textMuted}`}>{c.label}</span>
                        <MetricInfo id={c.info} />
                    </div>
                    <p className={`mt-2 ${font.mono} tabular-nums font-bold text-xl lg:text-2xl ${colors.text} whitespace-nowrap`}>{c.value}</p>
                    {c.hint && <p className={`mt-0.5 text-xs ${colors.textMuted} tabular-nums`}>{c.hint}</p>}
                    <DeltaText delta={c.delta} against={against} className="mt-1.5" />
                </div>
            ))}
        </section>
    );
};
