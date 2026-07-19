import React from 'react';
import { TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';

interface MonthData {
    month: string;
    year: number;
    revenue: number;
    expenses: number;
    profit: number;
    growth: number; // percentage
}

interface MonthlyHistoryProps {
    data: MonthData[];
    currencySymbol: string;
    accentColor?: string;
    isBeauty?: boolean;
}

export const MonthlyHistory: React.FC<MonthlyHistoryProps> = ({
    data,
    currencySymbol,
    accentColor = 'accent-gold',
    isBeauty = false
}) => {
    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Sem dados históricos disponíveis</p>
            </div>
        );
    }

    // Find best and worst months
    const bestMonth = data.reduce((max, month) => month.profit > max.profit ? month : max, data[0]);
    const worstMonth = data.reduce((min, month) => month.profit < min.profit ? month : min, data[0]);

    const avgGrowth = data.reduce((sum, month) => sum + month.growth, 0) / data.length;
    const totalRevenue = data.reduce((sum, month) => sum + month.revenue, 0);

    return (
        <div className="space-y-6">
            {/* Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--color-success-bg)] border border-[var(--color-success-border)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-[var(--color-success)]" />
                        <p className="text-xs font-mono text-[var(--color-success)] uppercase">Melhor Mês</p>
                    </div>
                    <p className="text-lg font-heading text-[var(--color-text)]">
                        {bestMonth.month} {bestMonth.year}
                    </p>
                    <p className="text-sm text-[var(--color-success)] font-mono">
                        {currencySymbol} {bestMonth.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className={`${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}/10 border ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'}/30 rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className={`w-5 h-5 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />
                        <p className={`text-xs font-mono ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} uppercase`}>Crescimento Médio</p>
                    </div>
                    <p className="text-lg font-heading text-[var(--color-text)]">
                        {avgGrowth > 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
                    </p>
                    <p className={`text-sm ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} font-mono`}>
                        por mês
                    </p>
                </div>

                <div className="bg-[var(--color-info-bg)] border border-[var(--color-info-border)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-[var(--color-info)]" />
                        <p className="text-xs font-mono text-[var(--color-info)] uppercase">Receita Total</p>
                    </div>
                    <p className="text-lg font-heading text-[var(--color-text)]">
                        12 meses
                    </p>
                    <p className="text-sm text-[var(--color-info)] font-mono">
                        {currencySymbol} {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-[var(--color-border)] text-text-secondary font-mono text-xs uppercase">
                            <th className="p-3">Período</th>
                            <th className="p-3 text-right">Receita</th>
                            <th className="p-3 text-right">Despesas</th>
                            <th className="p-3 text-right">Lucro</th>
                            <th className="p-3 text-right">Crescimento</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {data.map((month, index) => {
                            const isBest = month.month === bestMonth.month && month.year === bestMonth.year;
                            const isWorst = month.month === worstMonth.month && month.year === worstMonth.year;

                            return (
                                <tr
                                    key={`${month.month}-${month.year}`}
                                    className={`hover:bg-[var(--color-card-hover)] transition-colors ${isBest ? 'bg-[var(--color-success)]/5' : isWorst ? 'bg-[var(--color-danger)]/5' : ''}`}
                                >
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--color-text)] font-medium">{month.month} {month.year}</span>
                                            {isBest && <Award className="w-4 h-4 text-[var(--color-success)]" />}
                                        </div>
                                    </td>
                                    <td className="p-3 text-right font-mono text-[var(--color-success)]">
                                        {currencySymbol} {month.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-right font-mono text-[var(--color-danger)]">
                                        {currencySymbol} {month.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className={`p-3 text-right font-mono font-bold ${month.profit >= 0 ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-[var(--color-danger)]'}`}>
                                        {currencySymbol} {month.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${month.growth >= 0 ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
                                            {month.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {month.growth > 0 ? '+' : ''}{month.growth.toFixed(1)}%
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
