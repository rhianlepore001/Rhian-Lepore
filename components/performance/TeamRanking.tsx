import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Badge } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { PerformanceMember } from '../../types/staffPerformance';
import {
    defaultDir,
    formatPercent,
    memberBadge,
    moneyDelta,
    rankLabel,
    rateDelta,
    sortMembers,
    summarySentence,
    type Delta,
    type SortDir,
    type SortKey,
} from '../../utils/staffPerformanceView';
import { DeltaText } from './DeltaText';
import { MetricInfo } from './MetricInfo';

interface TeamRankingProps {
    members: PerformanceMember[];
    minSample: number;
    previousName: string | null;
    formatMoney: (v: number) => string;
    hrefFor: (professionalId: string) => string;
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey, dir: SortDir) => void;
}

interface Cell { key: SortKey; label: string; short: string; value: string; delta: Delta | null }

function cellsFor(m: PerformanceMember, formatMoney: (v: number) => string): Cell[] {
    const p = m.previous;
    const prevSample = p?.atendimentos ?? 0;
    const money = (v: number | null) => (v == null ? '—' : formatMoney(v));
    return [
        { key: 'retorno', label: 'Retorno para a casa', short: 'Retorno', value: money(m.metrics.retorno), delta: moneyDelta(m.metrics.retorno, p?.retorno, { prevSample, formatMoney }) },
        { key: 'retorno_por_hora', label: 'Retorno por hora', short: 'Retorno/h', value: m.metrics.retorno_por_hora == null ? '—' : `${formatMoney(m.metrics.retorno_por_hora)}/h`, delta: moneyDelta(m.metrics.retorno_por_hora, p?.retorno_por_hora, { prevSample, formatMoney }) },
        { key: 'ticket_medio', label: 'Ticket médio', short: 'Ticket', value: money(m.metrics.ticket_medio), delta: moneyDelta(m.metrics.ticket_medio, p?.ticket_medio, { prevSample, formatMoney }) },
        { key: 'voltou_taxa', label: 'Voltou a agendar', short: 'Voltou a agendar', value: formatPercent(m.metrics.voltou_taxa), delta: rateDelta(m.metrics.voltou_taxa, p?.voltou_taxa, { prevSample }) },
        { key: 'taxa_faltas', label: 'Faltas', short: 'Faltas', value: formatPercent(m.metrics.taxa_faltas), delta: rateDelta(m.metrics.taxa_faltas, p?.taxa_faltas, { prevSample, lowerIsBetter: true }) },
    ];
}

const Position: React.FC<{ m: PerformanceMember; minSample: number }> = ({ m, minSample }) => {
    const { colors, font } = useBrutalTheme();
    if (m.rank != null) return <span className={`${font.mono} tabular-nums font-bold ${colors.text}`}>{rankLabel(m.rank)}</span>;
    const badge = memberBadge(m, minSample);
    return badge ? <Badge variant="neutral" className="whitespace-nowrap">{badge}</Badge> : <span className={colors.textMuted}>—</span>;
};

export const TeamRanking: React.FC<TeamRankingProps> = ({ members, minSample, previousName, formatMoney, hrefFor, sortKey, sortDir, onSort }) => {
    const { colors, font, radius, accent } = useBrutalTheme();
    const sorted = sortMembers(members, sortKey, sortDir);
    const head = `${font.label} text-xs uppercase tracking-wide ${colors.textMuted}`;
    const sortButton = (key: SortKey, text: string, align: 'left' | 'right' = 'right') => {
        const active = sortKey === key;
        const nextDir: SortDir = active ? (sortDir === 'asc' ? 'desc' : 'asc') : defaultDir(key);
        return (
            <button
                type="button"
                onClick={() => onSort(key, nextDir)}
                className={`inline-flex items-center gap-1 min-h-[36px] ${align === 'right' ? 'justify-end w-full' : ''} ${head} ${active ? colors.text : ''} hover:text-theme-text`}
            >
                {text}
                {active && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />)}
            </button>
        );
    };
    const ariaSort = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none');

    return (
        <>
            {/* mobile/tablet: um cartão por colaborador, 5 números fixos */}
            <ol className="space-y-3 lg:hidden" aria-label="Colaboradores">
                {sorted.map((m) => {
                    const cells = cellsFor(m, formatMoney);
                    return (
                        <li key={m.professional_id} data-testid={`member-${m.professional_id}`} className={`p-4 border ${colors.border} ${radius.card} ${colors.card}`}>
                            <div className="flex items-center gap-3">
                                <Position m={m} minSample={minSample} />
                                <Link to={hrefFor(m.professional_id)} className={`min-w-0 flex-1 min-h-[44px] inline-flex items-center font-semibold ${colors.text} hover:underline underline-offset-4 break-words`}>
                                    {m.name}
                                </Link>
                            </div>
                            <p className={`mt-1 text-sm leading-snug ${colors.textSecondary}`}>{summarySentence(m, { formatMoney, minSample, previousName })}</p>
                            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
                                {cells.map((c, i) => (
                                    <div key={c.key} className={`min-w-0 ${i === 4 ? 'col-span-2' : ''}`}>
                                        <dt className={head}>{c.label}</dt>
                                        <dd className={`mt-0.5 ${font.mono} tabular-nums font-semibold ${colors.text} whitespace-nowrap`}>{c.value}</dd>
                                        <dd><DeltaText delta={c.delta} /></dd>
                                    </div>
                                ))}
                            </dl>
                        </li>
                    );
                })}
            </ol>

            {/* desktop: tabela com cabeçalho fixo e ordenação por coluna */}
            <div className={`hidden lg:block border ${colors.border} ${radius.card} ${colors.card}`}>
                <table className="w-full text-sm">
                    <caption className="sr-only">Colaboradores por Retorno por hora</caption>
                    <thead className={`sticky top-0 z-10 ${colors.card}`}>
                        <tr className={`border-b ${colors.divider}`}>
                            <th scope="col" className="px-5 py-2 text-left w-[9rem]" aria-sort={ariaSort('rank')}>
                                <span className="inline-flex items-center gap-1">{sortButton('rank', 'Posição', 'left')}<MetricInfo id="ranking" /></span>
                            </th>
                            <th scope="col" className={`px-3 py-2 text-left ${head}`}>Colaborador</th>
                            {(['retorno', 'retorno_por_hora', 'ticket_medio', 'voltou_taxa', 'taxa_faltas', 'atendimentos'] as SortKey[]).map((k) => (
                                <th key={k} scope="col" className="px-3 py-2 text-right last:pr-5" aria-sort={ariaSort(k)}>
                                    {sortButton(k, { retorno: 'Retorno', retorno_por_hora: 'Retorno/h', ticket_medio: 'Ticket', voltou_taxa: 'Voltou a agendar', taxa_faltas: 'Faltas', atendimentos: 'Atendimentos', rank: '' }[k])}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((m) => {
                            const cells = cellsFor(m, formatMoney);
                            const ranked = m.rank != null;
                            return (
                                <tr key={m.professional_id} data-testid={`member-${m.professional_id}`} className={`border-b last:border-b-0 ${colors.divider} ${colors.surfaceHover} align-top`}>
                                    <td className="px-5 py-3.5"><Position m={m} minSample={minSample} /></td>
                                    <td className="px-3 py-3.5 min-w-[11rem]">
                                        <Link to={hrefFor(m.professional_id)} className={`font-semibold ${ranked ? colors.text : colors.textSecondary} hover:underline underline-offset-4 ${accent.ring}`}>
                                            {m.name}
                                        </Link>
                                    </td>
                                    {cells.map((c) => (
                                        <td key={c.key} className="px-3 py-3.5 text-right">
                                            <span className={`block ${font.mono} tabular-nums whitespace-nowrap ${c.key === 'retorno_por_hora' && ranked ? `font-bold ${colors.text}` : colors.textSecondary}`}>{c.value}</span>
                                            <DeltaText delta={c.delta} className="justify-end" />
                                        </td>
                                    ))}
                                    <td className={`px-3 pr-5 py-3.5 text-right ${font.mono} tabular-nums ${colors.textSecondary}`}>{m.metrics.atendimentos}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};
