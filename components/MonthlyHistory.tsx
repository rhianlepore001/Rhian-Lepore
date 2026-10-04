import React from 'react';
import { Award, TrendingUp, Wallet, History } from 'lucide-react';
import { formatCurrency, type Region } from '../utils/formatters';
import { formatMonthGrowth } from '../utils/financeCashflow';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { FinanceKpi } from './finance/FinanceKpi';
import { Card } from './ui/Card';

interface MonthData {
    month: string;
    year: number;
    revenue: number;
    expenses: number;
    profit: number;
    growth: number;
    previousRevenue?: number;
    previousRecords?: number;
}

interface MonthlyHistoryProps {
    data: MonthData[];
    currencyRegion: Region;
    /** @deprecated tema vem do useBrutalTheme */
    accentColor?: string;
    /** @deprecated tema vem do useBrutalTheme */
    isBeauty?: boolean;
}

const LOW_MOVEMENT = 'Mês anterior com pouco movimento';

/**
 * Histórico (PR-F #11): três números no mesmo cartão da Visão geral e a lista de meses
 * sem blocos coloridos. Verde/vermelho só no texto do crescimento.
 */
export const MonthlyHistory: React.FC<MonthlyHistoryProps> = ({ data, currencyRegion }) => {
    const { colors, status, font } = useBrutalTheme();

    if (data.length === 0) {
        return (
            <Card>
                <div className={`text-center py-10 ${colors.textSecondary}`}>
                    <History className={`w-8 h-8 mx-auto mb-3 ${colors.textMuted}`} aria-hidden="true" />
                    <p className={`font-semibold ${colors.text}`}>Ainda sem histórico</p>
                    <p className="text-sm mt-1">Os meses aparecem aqui assim que houver movimento.</p>
                </div>
            </Card>
        );
    }

    const bestMonth = data.reduce((max, m) => (m.profit > max.profit ? m : max), data[0]);
    const avgGrowth = data.reduce((sum, m) => sum + m.growth, 0) / data.length;
    const totalRevenue = data.reduce((sum, m) => sum + m.revenue, 0);
    const avgSign = avgGrowth > 0 ? '+' : avgGrowth < 0 ? '−' : '';
    const avgGrowthLabel = `${avgSign}${Math.abs(avgGrowth).toFixed(1).replace('.', ',')}%`;
    const oldest = data[data.length - 1];
    const newest = data[0];
    const span = data.length === 1 ? '1 mês' : `${data.length} meses`;

    const rows = data.map((m, index) => {
        const prev = data[index + 1];
        const growthLabel = formatMonthGrowth({
            currentRevenue: m.revenue,
            previousRevenue: prev?.revenue ?? 0,
            previousRecords: prev ? 8 : 0,
        });
        const muted = growthLabel === LOW_MOVEMENT || !prev;
        const negative = growthLabel.startsWith('−');
        return {
            key: `${m.month}-${m.year}`,
            label: `${m.month} ${m.year}`,
            m,
            growth: !prev ? '—' : growthLabel === LOW_MOVEMENT ? 'Pouco movimento antes' : growthLabel,
            growthClass: muted ? colors.textMuted : negative ? status.danger : status.success,
            isBest: m === bestMonth,
        };
    });

    const money = (v: number) => formatCurrency(v, currencyRegion);

    return (
        <div className="space-y-4 md:space-y-6">
            <section data-testid="history-kpis" aria-label="Resumo do histórico" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FinanceKpi
                    icon={<Award className="h-4 w-4" />}
                    title="Melhor mês"
                    value={money(bestMonth.profit)}
                    subtitle={`Lucro em ${bestMonth.month} ${bestMonth.year}`}
                />
                <FinanceKpi
                    icon={<TrendingUp className="h-4 w-4" />}
                    title="Crescimento médio"
                    value={avgGrowthLabel}
                    subtitle="Receita, mês a mês"
                />
                <FinanceKpi
                    icon={<Wallet className="h-4 w-4" />}
                    title={`Receita em ${span}`}
                    value={money(totalRevenue)}
                    subtitle={`${oldest.month} ${oldest.year} – ${newest.month} ${newest.year}`}
                />
            </section>

            <Card
                title={
                    <div>
                        <h3 className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>Mês a mês</h3>
                        <p className={`mt-0.5 text-xs ${colors.textSecondary}`}>Últimos {span}</p>
                    </div>
                }
                noPadding
            >
                {/* Celular: lista (sem tabela com scroll lateral) */}
                <ul className={`md:hidden divide-y ${colors.divider}`}>
                    {rows.map((r) => (
                        <li key={r.key} data-testid="history-month" className="px-4 py-3">
                            <div className="flex items-baseline justify-between gap-3">
                                <p className={`text-sm font-semibold ${colors.text}`}>
                                    {r.label}
                                    {r.isBest && <span className={`ml-2 text-xs font-medium ${colors.textSecondary}`}>melhor mês</span>}
                                </p>
                                <p className={`${font.mono} text-base font-bold tabular-nums ${colors.text}`}>{money(r.m.profit)}</p>
                            </div>
                            <div className={`mt-0.5 flex items-baseline justify-between gap-3 text-xs tabular-nums ${colors.textSecondary}`}>
                                <span className="truncate">Receita {money(r.m.revenue)} · Despesas {money(r.m.expenses)}</span>
                                <span className={`shrink-0 ${r.growthClass}`}>{r.growth}</span>
                            </div>
                        </li>
                    ))}
                </ul>

                {/* Computador: tabela */}
                <div className="hidden md:block">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b ${colors.divider} text-[13px] font-medium ${colors.textSecondary}`}>
                                <th scope="col" className="px-5 py-3 font-medium">Mês</th>
                                <th scope="col" className="px-5 py-3 font-medium text-right">Receita</th>
                                <th scope="col" className="px-5 py-3 font-medium text-right">Despesas</th>
                                <th scope="col" className="px-5 py-3 font-medium text-right">Lucro</th>
                                <th scope="col" className="px-5 py-3 font-medium text-right">Crescimento</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${colors.divider}`}>
                            {rows.map((r) => (
                                <tr key={r.key} data-testid="history-month">
                                    <td className={`px-5 py-3 text-sm font-medium ${colors.text}`}>
                                        {r.label}
                                        {r.isBest && <span className={`ml-2 text-xs font-normal ${colors.textSecondary}`}>melhor mês</span>}
                                    </td>
                                    <td className={`px-5 py-3 text-right ${font.mono} text-sm tabular-nums ${colors.textSecondary}`}>{money(r.m.revenue)}</td>
                                    <td className={`px-5 py-3 text-right ${font.mono} text-sm tabular-nums ${colors.textSecondary}`}>{money(r.m.expenses)}</td>
                                    <td className={`px-5 py-3 text-right ${font.mono} text-sm font-bold tabular-nums ${colors.text}`}>{money(r.m.profit)}</td>
                                    <td className={`px-5 py-3 text-right text-sm tabular-nums ${r.growthClass}`}>{r.growth}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
