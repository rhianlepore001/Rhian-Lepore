import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { DashboardKpiCard } from './DashboardKpiCard';
import { MiniSparkline } from './MiniSparkline';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Send } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { InfoButton } from '../HelpButtons';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { DataMaturity } from '../../hooks/useDashboardData';

interface ProfitMetricsProps {
    metrics: {
        totalProfit: number;
        recoveredRevenue: number;
        avoidedNoShows: number;
        filledSlots: number;
        weeklyGrowth: number;
        campaignsSent: number;
        currentMonthRevenue?: number;
        monthScheduledValue?: number;
        todayRevenue?: number;
    };
    dataMaturity: DataMaturity;
    currencySymbol: string;
    currencyRegion: 'BR' | 'PT';
    isBeauty: boolean;
}

function generateSparkline(base: number, count = 7): number[] {
    return Array.from({ length: count }, (_, i) => {
        const variance = base * 0.2;
        return Math.max(0, Math.round(base + (Math.sin(i * 1.2) * variance) + (Math.random() - 0.5) * variance));
    });
}

export const ProfitMetrics = React.memo(({
    metrics,
    dataMaturity,
    currencySymbol: _currencySymbol,
    currencyRegion,
    isBeauty: _isBeauty
}: ProfitMetricsProps) => {
    const navigate = useNavigate();
    const { accent, colors, status } = useBrutalTheme();
    const todayRevenue = metrics.todayRevenue ?? 0;

    const todaySparkline = React.useMemo(() => generateSparkline(todayRevenue || 100), [todayRevenue]);
    const monthSparkline = React.useMemo(() => generateSparkline(metrics.currentMonthRevenue ?? 0), [metrics.currentMonthRevenue]);
    const appointmentsSparkline = React.useMemo(() => generateSparkline(dataMaturity.appointmentsThisMonth || 5), [dataMaturity.appointmentsThisMonth]);
    const recoveredSparkline = React.useMemo(() => generateSparkline(metrics.recoveredRevenue), [metrics.recoveredRevenue]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card: Receita do Dia — custom render para preservar testes e empty state */}
                <Card variant="elevated" className="h-full" noPadding>
                    <div className="p-4 md:p-6 flex flex-col justify-between h-full relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono uppercase tracking-[0.15em] font-bold ${colors.textMuted}`}>
                                    Receita do Dia
                                </span>
                                <InfoButton text="Valor recebido hoje (atendimentos com status Concluído)." />
                            </div>
                            <div className={`p-2 rounded-xl ${accent.bgDim}`}>
                                <DollarSign className={`w-4 h-4 ${accent.text}`} />
                            </div>
                        </div>

                        {todayRevenue > 0 ? (
                            <div>
                                <div className={`text-2xl md:text-3xl font-bold font-mono tabular-nums tracking-tight ${accent.text} mb-1`}>
                                    {formatCurrency(todayRevenue, currencyRegion)}
                                </div>
                                <div className={`text-xs font-mono uppercase tracking-[0.15em] ${colors.textMuted}`}>
                                    HOJE
                                </div>
                                {metrics.weeklyGrowth !== 0 && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                        {metrics.weeklyGrowth >= 0 ? (
                                            <TrendingUp className={`w-3 h-3 ${status.success}`} aria-hidden="true" />
                                        ) : (
                                            <TrendingDown className={`w-3 h-3 ${status.danger}`} aria-hidden="true" />
                                        )}
                                        <span className={`text-xs font-mono font-bold ${metrics.weeklyGrowth >= 0 ? status.success : status.danger}`}>
                                            {metrics.weeklyGrowth >= 0 ? '+' : ''}{metrics.weeklyGrowth}%
                                        </span>
                                    </div>
                                )}
                                <div className="mt-3 -mx-1">
                                    <MiniSparkline data={todaySparkline} color={accent.hex} height={40} showArea />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className={`text-sm ${colors.textSecondary} mb-3`}>
                                    Nenhum atendimento concluído hoje ainda.
                                </p>
                                <button
                                    onClick={() => navigate('/agenda')}
                                    className={`text-xs font-mono ${accent.text} hover:opacity-70 transition-opacity`}
                                >
                                    Registrar atendimento →
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

                <DashboardKpiCard
                    title="Faturamento do Mês"
                    value={formatCurrency(metrics.currentMonthRevenue ?? 0, currencyRegion)}
                    sparklineData={monthSparkline}
                    icon={<TrendingUp className="w-4 h-4" />}
                />

                <DashboardKpiCard
                    title="Agendamentos"
                    value={String(dataMaturity.appointmentsThisMonth ?? 0)}
                    variation={metrics.weeklyGrowth}
                    sparklineData={appointmentsSparkline}
                    icon={<Calendar className="w-4 h-4" />}
                />

                <DashboardKpiCard
                    title="Recuperado"
                    value={formatCurrency(metrics.recoveredRevenue, currencyRegion)}
                    sparklineData={recoveredSparkline}
                    icon={<Send className="w-4 h-4" />}
                />
            </div>
        </div>
    );
});

ProfitMetrics.displayName = 'ProfitMetrics';
