import React from 'react';
import { Trophy, Target, TrendingUp, Zap } from 'lucide-react';

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
    const consecutiveSuccess = history.reduce((max, item, index) => {
        if (!item.success) return max;
        let count = 1;
        for (let i = index - 1; i >= 0; i--) {
            if (history[i].success) count++;
            else break;
        }
        return Math.max(max, count);
    }, 0);

    const latestGoal = history[0];
    const getMessage = () => {
        if (latestGoal.success) {
            if (consecutiveSuccess >= 3) {
                return {
                    icon: <Zap className="w-6 h-6" />,
                    text: `🔥 INCRÍVEL! ${consecutiveSuccess} meses consecutivos batendo a meta!`,
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/30'
                };
            }
            return {
                icon: <Trophy className="w-6 h-6" />,
                text: `🎉 PARABÉNS! Meta batida! Você faturou ${currencySymbol} ${latestGoal.achieved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${latestGoal.percentage}% da meta)`,
                color: 'text-green-500',
                bg: 'bg-green-500/10',
                border: 'border-green-500/30'
            };
        } else {
            if (latestGoal.percentage >= 90) {
                return {
                    icon: <Target className="w-6 h-6" />,
                    text: `💪 Quase lá! Você chegou a ${latestGoal.percentage}% da meta. Próximo mês é nosso!`,
                    color: 'text-orange-500',
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-500/30'
                };
            }
            return {
                icon: <TrendingUp className="w-6 h-6" />,
                text: `📈 Continue firme! ${latestGoal.percentage}% da meta alcançados. Cada dia conta!`,
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/30'
            };
        }
    };

    const message = getMessage();

    return (
        <div className="space-y-4">
            {/* Achievement Message */}
            <div className={`${message.bg} border ${message.border} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                    <div className={message.color}>
                        {message.icon}
                    </div>
                    <div className="flex-1">
                        <p className={`${message.color} font-medium text-sm md:text-base leading-tight`}>
                            {message.text}
                        </p>
                        <p className="text-xs text-neutral-400 mt-2 font-mono">
                            {successCount} de {history.length} metas atingidas nos últimos meses
                        </p>
                    </div>
                </div>
            </div>

            {/* History Timeline */}
            <div className="space-y-2">
                <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-3">
                    Histórico de Performance
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {history.slice(0, 6).map((item) => (
                        <div
                            key={`${item.month}-${item.year}`}
                            className={`p-3 rounded-lg border-2 ${item.success
                                ? (isBeauty ? 'bg-beauty-neon/10 border-beauty-neon/30' : 'bg-green-500/10 border-green-500/30')
                                : 'bg-red-500/10 border-red-500/30'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-mono text-neutral-400 uppercase">
                                    {item.month.substring(0, 3)} {item.year}
                                </p>
                                <span className="text-lg">
                                    {item.success ? '✅' : '❌'}
                                </span>
                            </div>
                            <p className={`text-sm font-bold ${item.success ? (isBeauty ? 'text-beauty-neon' : 'text-green-500') : 'text-red-500'}`}>
                                {item.percentage}%
                            </p>
                            <p className="text-[10px] text-neutral-500 font-mono">
                                {currencySymbol} {(item.achieved / 1000).toFixed(1)}k
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
