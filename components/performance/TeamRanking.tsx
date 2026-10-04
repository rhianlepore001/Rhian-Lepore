import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Badge } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { PerformanceMember } from '../../types/staffPerformance';
import type { BusinessRemainderNoun } from '../../utils/businessCopy';
import {
    defaultDir,
    memberBadge,
    rankedSentence,
    rankLabel,
    sortMembers,
    unrankedSentence,
    type SortDir,
    type SortKey,
} from '../../utils/staffPerformanceView';

interface TeamRankingProps {
    members: PerformanceMember[];
    minSample: number;
    formatMoney: (v: number) => string;
    hrefFor: (professionalId: string) => string;
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey, dir: SortDir) => void;
    remainder: BusinessRemainderNoun;
}

const Position: React.FC<{ m: PerformanceMember }> = ({ m }) => {
    const { colors, font } = useBrutalTheme();
    if (m.rank != null) return <span className={`${font.mono} tabular-nums font-semibold ${colors.text}`}>{rankLabel(m.rank)}</span>;
    return <span className={`text-sm ${colors.textSecondary}`}>—</span>;
};

export const TeamRanking: React.FC<TeamRankingProps> = ({
    members, minSample, formatMoney, hrefFor, sortKey, sortDir, onSort, remainder,
}) => {
    const { colors, font, radius, accent } = useBrutalTheme();
    const sorted = sortMembers(members, sortKey, sortDir);
    const head = `text-xs ${colors.textMuted}`;
    const money = (v: number | null) => (v == null ? '—' : formatMoney(v));
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

    const personCard = (m: PerformanceMember, unranked: boolean) => {
        const badge = memberBadge(m, minSample);
        const showBadge = badge && badge !== 'Poucos atendimentos para comparar';
        return (
        <li
            data-testid={`member-${m.professional_id}`}
            data-unranked={unranked || undefined}
            className={`p-4 border ${colors.border} ${radius.card} ${colors.card}`}
        >
            <div className="flex items-baseline justify-between gap-3">
                <Link
                    to={hrefFor(m.professional_id)}
                    className={`min-w-0 flex-1 min-h-[44px] inline-flex items-center font-semibold ${colors.text} hover:underline underline-offset-4 break-words`}
                >
                    {unranked ? m.name : `${rankLabel(m.rank!)} ${m.name}`}
                </Link>
                {showBadge && <Badge variant="neutral">{badge}</Badge>}
            </div>
            <p className={`mt-1 text-sm leading-snug ${colors.textSecondary}`}>
                {unranked ? unrankedSentence(m, minSample) : rankedSentence(m)}
            </p>
            <p className={`mt-3 ${font.mono} tabular-nums font-semibold text-[28px] leading-none ${colors.text}`}>
                {money(m.metrics.retorno)}
            </p>
            <p className={`mt-2 text-[13px] ${colors.textMuted}`}>{remainder.remainderLabel}</p>
        </li>
        );
    };

    return (
        <>
            <ol className="space-y-3 lg:hidden" aria-label="Colaboradores">
                {sorted.map((m, i) => {
                    const unranked = m.rank == null;
                    const fence = unranked && (i === 0 || sorted[i - 1].rank != null);
                    return (
                        <React.Fragment key={m.professional_id}>
                            {fence && (
                                <li className={`pt-1 text-sm font-semibold ${colors.text}`}>Ainda sem posição no ranking</li>
                            )}
                            {personCard(m, unranked)}
                        </React.Fragment>
                    );
                })}
            </ol>

            <div className={`hidden lg:block border ${colors.border} ${radius.card} ${colors.card}`}>
                <table className="w-full text-sm">
                    <caption className="sr-only">Colaboradores</caption>
                    <thead className={`sticky top-0 z-10 ${colors.card}`}>
                        <tr className={`border-b ${colors.divider}`}>
                            <th scope="col" className="px-5 py-2 text-left w-[9rem]" aria-sort={ariaSort('rank')}>
                                {sortButton('rank', 'Posição', 'left')}
                            </th>
                            <th scope="col" className={`px-3 py-2 text-left ${head}`}>Colaborador</th>
                            <th scope="col" className="px-3 py-2 text-right" aria-sort={ariaSort('retorno')}>
                                {sortButton('retorno', remainder.remainderLabel)}
                            </th>
                            <th scope="col" className="px-3 py-2 text-right" aria-sort={ariaSort('retorno_por_hora')}>
                                {sortButton('retorno_por_hora', 'Rende por hora')}
                            </th>
                            <th scope="col" className="px-3 py-2 text-right last:pr-5" aria-sort={ariaSort('atendimentos')}>
                                {sortButton('atendimentos', 'Atendimentos')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((m, i) => {
                            const ranked = m.rank != null;
                            const fence = !ranked && (i === 0 || sorted[i - 1].rank != null);
                            return (
                                <React.Fragment key={m.professional_id}>
                                    {fence && (
                                        <tr>
                                            <td colSpan={5} className={`px-5 py-3 text-sm font-semibold ${colors.text}`}>
                                                Ainda sem posição no ranking
                                            </td>
                                        </tr>
                                    )}
                                    <tr
                                        data-testid={`member-${m.professional_id}`}
                                        data-unranked={ranked ? undefined : true}
                                        className={`border-b last:border-b-0 ${colors.divider} ${colors.surfaceHover} align-top`}
                                    >
                                        <td className="px-5 py-3.5"><Position m={m} /></td>
                                        <td className="px-3 py-3.5 min-w-[11rem]">
                                            <Link to={hrefFor(m.professional_id)} className={`font-semibold ${colors.text} hover:underline underline-offset-4 ${accent.ring}`}>
                                                {m.name}
                                            </Link>
                                            {!ranked && (
                                                <p className={`mt-1 text-sm ${colors.textSecondary}`}>{unrankedSentence(m, minSample)}</p>
                                            )}
                                        </td>
                                        <td className={`px-3 py-3.5 text-right ${font.mono} tabular-nums ${colors.text}`}>
                                            {money(m.metrics.retorno)}
                                        </td>
                                        <td className={`px-3 py-3.5 text-right ${font.mono} tabular-nums ${colors.textSecondary}`}>
                                            {m.metrics.retorno_por_hora == null ? '—' : `${formatMoney(m.metrics.retorno_por_hora)}/h`}
                                        </td>
                                        <td className={`px-3 pr-5 py-3.5 text-right ${font.mono} tabular-nums ${colors.textSecondary}`}>
                                            {m.metrics.atendimentos}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};
