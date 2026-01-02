import React from 'react';
import { Trophy, Target, TrendingUp, Zap, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

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
    isBeauty = false
}) => {
    if (history.length === 0) {
        return null;
    }

    const successCount = history.filter(h => h.success).length;
    const failCount = history.length - successCount;
    const successRate = Math.round((successCount / history.length) * 100);
    const totalAchieved = history.reduce((sum, item) => sum + item.achieved, 0);
    const averagePerformance = Math.round(history.reduce((sum, item) => sum + item.percentage, 0) / history.length);

    const latestGoal = history[0];
    const previousGoal = history[1];
    const trend = previousGoal ? latestGoal.percentage - previousGoal.percentage : 0;

    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const borderStyle = isBeauty ? 'border-beauty-neon/30 rounded-xl' : 'border-brutal-border border-2';
    const cardStyle = isBeauty
        ? 'bg-beauty-card/30 border border-beauty-neon/20 rounded-xl'
        : 'bg-neutral-900 border-2 border-brutal-border shadow-[2px_2px_0px_0px_#000000]';

    return (
        <div className="space-y-6">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* Success Rate */}
                <div className={`p-4 ${cardStyle}`}>
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">Taxa de Sucesso</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-heading ${accentText}`}>{successRate}%</span>
                        <span className="text-xs text-neutral-600 font-mono">{successCount}/{history.length}</span>
                    </div>
                </div>

                {/* Average Performance */}
                <div className={`p-4 ${cardStyle}`}>
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">Média Mensal</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-heading ${averagePerformance >= 100 ? accentText : 'text-neutral-400'}`}>
                            {averagePerformance}%
                        </span>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className={`p-4 ${cardStyle} md:col-span-2`}>
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">Faturamento Total (6 meses)</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl md:text-3xl font-heading text-white`}>
                            {formatCurrency(totalAchieved, currencySymbol === '€' ? 'PT' : 'BR')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Current Month Performance */}
            <div className={`p-5 ${isBeauty
                ? latestGoal.success
                    ? 'bg-beauty-neon/10 border border-beauty-neon/40'
                    : 'bg-beauty-card/50 border border-beauty-neon/20'
                : latestGoal.success
                    ? 'bg-accent-gold/10 border-2 border-accent-gold/50'
                    : 'bg-neutral-900/50 border-2 border-neutral-700'
                } ${isBeauty ? 'rounded-xl' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono text-neutral-500 uppercase tracking-wider">
                                {latestGoal.month} {latestGoal.year}
                            </span>
                            {latestGoal.success ? (
                                <CheckCircle2 className={`w-5 h-5 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                        <h3 className={`text-2xl font-heading ${accentText} mb-1`}>
                            {latestGoal.percentage}% da Meta
                        </h3>
                        <p className="text-sm text-neutral-400 font-mono">
                            {formatCurrency(latestGoal.achieved, currencySymbol === '€' ? 'PT' : 'BR')} de {formatCurrency(latestGoal.goal, currencySymbol === '€' ? 'PT' : 'BR')}
                        </p>
                    </div>
                    {trend !== 0 && previousGoal && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded ${trend > 0
                                ? isBeauty ? 'bg-beauty-acid/20 text-beauty-acid' : 'bg-green-500/20 text-green-500'
                                : 'bg-red-500/20 text-red-500'
                            }`}>
                            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="font-mono text-sm font-bold">
                                {trend > 0 ? '+' : ''}{trend}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className={`relative h-3 ${isBeauty ? 'bg-beauty-dark/50 rounded-full' : 'bg-neutral-950 border-2 border-black'} overflow-hidden`}>
                    <div
                        className={`absolute top-0 left-0 h-full ${accentBg} transition-all duration-1000 ${isBeauty ? '' : 'border-r-2 border-black'
                            }`}
                        style={{ width: `${Math.min(latestGoal.percentage, 100)}%` }}
                    >
                        {!isBeauty && (
                            <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#000_4px,#000_8px)]"></div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Timeline */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-mono text-neutral-500 uppercase tracking-wider">
                        Histórico de Performance
                    </h4>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 ${isBeauty ? 'bg-beauty-neon rounded-full' : 'bg-accent-gold'}`}></div>
                            <span className="text-neutral-500">Atingida</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 ${isBeauty ? 'bg-red-500/50 rounded-full' : 'bg-red-900'}`}></div>
                            <span className="text-neutral-500">Não Atingida</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {history.slice(0, 6).map((item, index) => {
                        const isRecent = index === 0;
                        return (
                            <div
                                key={`${item.month}-${item.year}`}
                                className={`p-4 relative overflow-hidden ${isBeauty
                                        ? item.success
                                            ? 'bg-beauty-neon/10 border border-beauty-neon/30 rounded-xl'
                                            : 'bg-red-500/10 border border-red-500/30 rounded-xl'
                                        : item.success
                                            ? 'bg-accent-gold/10 border-2 border-accent-gold/40'
                                            : 'bg-red-900/20 border-2 border-red-800/40'
                                    } ${!isBeauty && 'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'} ${isRecent ? 'ring-2 ring-white/20' : ''}`}
                            >
                                {isRecent && (
                                    <div className={`absolute top-1 right-1 px-1.5 py-0.5 ${accentBg} ${isBeauty ? 'rounded-full' : ''} text-black text-[8px] font-bold font-mono`}>
                                        ATUAL
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wide">
                                        {item.month.substring(0, 3)}
                                    </p>
                                    <span className="text-lg leading-none">
                                        {item.success ? '✅' : '❌'}
                                    </span>
                                </div>
                                <p className={`text-2xl font-heading mb-1 ${item.success ? accentText : 'text-red-500'
                                    }`}>
                                    {item.percentage}%
                                </p>
                                <p className="text-xs text-neutral-500 font-mono">
                                    {currencySymbol} {(item.achieved / 1000).toFixed(1)}k
                                </p>
                                {item.percentage >= 100 && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${accentBg}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
