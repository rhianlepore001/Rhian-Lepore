import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface GoalHistoryItem {
    month: string;
    year: number;
    goal: number;
    achieved: number;
    percentage: number;
    success: boolean;
}

interface GoalHistoryProps {
    history: GoalHistoryItem[];
    currencySymbol: string;
    isBeauty?: boolean;
}

export const GoalHistory: React.FC<GoalHistoryProps> = ({
    history,
    currencySymbol,
    isBeauty,
}) => {
    const { colors, accent, radius, status } = useBrutalTheme(
        isBeauty === undefined ? undefined : { override: isBeauty ? 'beauty' : 'barber' }
    );

    if (history.length === 0) {
        return null;
    }

    const successCount = history.filter(h => h.success).length;
    const successRate = Math.round((successCount / history.length) * 100);
    const totalAchieved = history.reduce((sum, item) => sum + item.achieved, 0);
    const averagePerformance = Math.round(history.reduce((sum, item) => sum + item.percentage, 0) / history.length);

    const latestGoal = history[0];
    const previousGoal = history[1];
    const trend = previousGoal ? latestGoal.percentage - previousGoal.percentage : 0;

    const region = currencySymbol === '€' ? 'PT' : 'BR';
    const cardStyle = `${colors.card} border ${colors.border} ${radius.card}`;
    const labelStyle = `text-xs font-mono ${colors.textMuted} uppercase tracking-wider`;

    return (
        <div className="space-y-6">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* Success Rate */}
                <div className={`p-4 ${cardStyle}`}>
                    <p className={`${labelStyle} mb-2`}>Taxa de Sucesso</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-heading ${accent.text}`}>{successRate}%</span>
                        <span className={`text-xs ${colors.textMuted} font-mono`}>{successCount}/{history.length}</span>
                    </div>
                </div>

                {/* Average Performance */}
                <div className={`p-4 ${cardStyle}`}>
                    <p className={`${labelStyle} mb-2`}>Média Mensal</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-heading ${averagePerformance >= 100 ? accent.text : colors.textSecondary}`}>
                            {averagePerformance}%
                        </span>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className={`p-4 ${cardStyle} md:col-span-2`}>
                    <p className={`${labelStyle} mb-2`}>Faturamento Total (6 meses)</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl md:text-3xl font-heading ${colors.text}`}>
                            {formatCurrency(totalAchieved, region)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Current Month Performance */}
            <div className={`p-5 border ${radius.card} ${latestGoal.success
                ? `${accent.bgDim} ${accent.borderDim}`
                : `${colors.card} ${colors.border}`
                }`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-sm font-mono ${colors.textMuted} uppercase tracking-wider`}>
                                {latestGoal.month} {latestGoal.year}
                            </span>
                            {latestGoal.success ? (
                                <CheckCircle2 className={`w-5 h-5 ${accent.text}`} />
                            ) : (
                                <XCircle className={`w-5 h-5 ${status.danger}`} />
                            )}
                        </div>
                        <h3 className={`text-2xl font-heading ${accent.text} mb-1`}>
                            {latestGoal.percentage}% da Meta
                        </h3>
                        <p className={`text-sm ${colors.textSecondary} font-mono`}>
                            {formatCurrency(latestGoal.achieved, region)} de {formatCurrency(latestGoal.goal, region)}
                        </p>
                    </div>
                    {trend !== 0 && previousGoal && (
                        <div className={`flex items-center gap-2 px-3 py-2 ${radius.badge} ${trend > 0
                            ? `${status.successBg} ${status.success}`
                            : `${status.dangerBg} ${status.danger}`
                            }`}>
                            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="font-mono text-sm font-bold">
                                {trend > 0 ? '+' : ''}{trend}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className={`relative h-3 rounded-full ${colors.surface} overflow-hidden`}>
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full ${accent.bg} transition-all duration-1000`}
                        style={{ width: `${Math.min(latestGoal.percentage, 100)}%` }}
                    />
                </div>
            </div>

            {/* History Timeline */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h4 className={`text-sm font-mono ${colors.textMuted} uppercase tracking-wider`}>
                        Histórico de Performance
                    </h4>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${accent.bg}`}></div>
                            <span className={colors.textMuted}>Atingida</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${status.dangerBg} border ${status.dangerBorder}`}></div>
                            <span className={colors.textMuted}>Não Atingida</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {history.slice(0, 6).map((item, index) => {
                        const isRecent = index === 0;
                        return (
                            <div
                                key={`${item.month}-${item.year}`}
                                className={`p-4 relative overflow-hidden border ${radius.card} ${item.success
                                    ? `${accent.bgDim} ${accent.borderDim}`
                                    : `${status.dangerBg} ${status.dangerBorder}`
                                    } ${isRecent ? 'ring-2 ring-[var(--color-border-strong)]' : ''}`}
                            >
                                {isRecent && (
                                    <div className={`absolute top-1 right-1 px-1.5 py-0.5 ${accent.bg} ${radius.badge} text-[var(--color-bg)] text-xs font-bold font-mono`}>
                                        ATUAL
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-2">
                                    <p className={`text-xs font-mono ${colors.textSecondary} uppercase tracking-wide`}>
                                        {item.month.substring(0, 3)}
                                    </p>
                                    <span className="text-lg leading-none">
                                        {item.success ? '✅' : '❌'}
                                    </span>
                                </div>
                                <p className={`text-2xl font-heading mb-1 ${item.success ? accent.text : status.danger}`}>
                                    {item.percentage}%
                                </p>
                                <p className={`text-xs ${colors.textMuted} font-mono`}>
                                    {currencySymbol} {(item.achieved / 1000).toFixed(1)}k
                                </p>
                                {item.percentage >= 100 && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${accent.bg}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
