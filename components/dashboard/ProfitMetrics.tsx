import React from 'react';
import { BrutalCard } from '../BrutalCard';
import { TrendingUp, UserCheck, CalendarCheck, DollarSign, Lock, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { InfoButton } from '../HelpButtons';
import type { DataMaturity } from '../../hooks/useDashboardData';

interface ProfitMetricsProps {
    metrics: {
        totalProfit: number;
        recoveredRevenue: number;
        avoidedNoShows: number;
        filledSlots: number;
        weeklyGrowth: number;
        campaignsSent: number;
    };
    dataMaturity: DataMaturity;
    currencySymbol: string;
    currencyRegion: 'BR' | 'PT';
    isBeauty: boolean;
}

// Card de estado "Em Aprendizado" para métricas bloqueadas por falta de dados
const LearningCard: React.FC<{ title: string; message: string; daysLeft?: number; color: string }> = ({
    title, message, daysLeft, color
}) => (
    <BrutalCard className="h-full" noPadding>
        <div className={`p-4 md:p-5 flex flex-col justify-between h-full bg-neutral-900/50 border border-dashed border-white/10`}>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs md:text-sm font-mono uppercase ${color} tracking-wider`}>{title}</span>
                <Lock className="w-3 h-3 text-text-secondary/40" />
            </div>
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-text-secondary/50 animate-pulse" />
                    <span className="text-xs text-text-secondary font-mono">Em Aprendizado</span>
                </div>
                <p className="text-xs text-text-secondary/60 leading-relaxed">{message}</p>
                {daysLeft !== undefined && daysLeft > 0 && (
                    <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000`}
                            style={{
                                width: `${Math.min(((14 - daysLeft) / 14) * 100, 100)}%`,
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3))'
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    </BrutalCard>
);

export const ProfitMetrics = React.memo(({
    metrics,
    dataMaturity,
    currencySymbol: _currencySymbol,
    currencyRegion,
    isBeauty
}: ProfitMetricsProps) => {
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentIcon = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    // Guards de maturidade: cada card tem um critério diferente
    const hasBasicData = dataMaturity.appointmentsTotal >= 5;
    const hasCampaignData = metrics.campaignsSent > 0;
    const hasPublicBookingData = dataMaturity.hasPublicBookings;
    const hasWeeklyData = dataMaturity.accountDaysOld >= 14;

    return (
        <>
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

                {/* Card 1: Lucro Total — sempre exibido, mas crescimento semanal só com dados */}
                <BrutalCard
                    className="h-full brutal-card-enhanced"
                    noPadding
                    style={{ animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards', opacity: 0, animationDelay: '0ms' }}
                >
                    <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-neutral-900/50">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1">
                                <span className="text-xs md:text-sm font-mono uppercase text-text-secondary tracking-wider">Lucro</span>
                                <InfoButton text="Valor total dos serviços concluídos, já descontados comissões e despesas." />
                            </div>
                            <DollarSign className={`w-3 h-3 md:w-4 md:h-4 ${accentIcon}`} />
                        </div>
                        <div>
                            <span className={`text-2xl md:text-3xl font-bold font-heading ${accentText}`}>
                                {formatCurrency(metrics.totalProfit, currencyRegion)}
                            </span>
                            {hasWeeklyData ? (
                                <div className={`text-xs md:text-sm ${metrics.weeklyGrowth >= 0 ? 'text-green-500' : 'text-red-500'} font-mono flex items-center gap-1 mt-1`}>
                                    <TrendingUp className="w-3 h-3" />
                                    <span>{metrics.weeklyGrowth >= 0 ? '+' : ''}{metrics.weeklyGrowth}% sem</span>
                                </div>
                            ) : (
                                <div className="text-xs text-text-secondary/50 font-mono mt-1">
                                    Crescimento disponível em {14 - dataMaturity.accountDaysOld}d
                                </div>
                            )}
                        </div>
                    </div>
                </BrutalCard>

                {/* Card 2: Receita Recuperada — requer campanhas enviadas */}
                <div style={{ animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards', opacity: 0, animationDelay: '100ms' }}>
                    {hasCampaignData ? (
                        <BrutalCard className="h-full brutal-card-enhanced border-green-500/30" noPadding>
                            <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-green-900/10">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs md:text-sm font-mono uppercase text-green-400 tracking-wider">Recuperado</span>
                                        <InfoButton text="Receita de clientes que voltaram graças às campanhas automatizadas." />
                                    </div>
                                    <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
                                </div>
                                <div>
                                    <span className="text-2xl md:text-3xl font-bold font-heading text-white">
                                        {formatCurrency(metrics.recoveredRevenue, currencyRegion)}
                                    </span>
                                    <p className="text-xs md:text-sm text-text-secondary mt-1 font-mono">Clientes resgatados</p>
                                </div>
                            </div>
                        </BrutalCard>
                    ) : (
                        <LearningCard
                            title="Recuperado"
                            color="text-green-400"
                            message="Ative quando enviar sua 1ª campanha de reativação pelo CRM."
                        />
                    )}
                </div>

                {/* Card 3: No-Shows Evitados — requer campanhas + dados básicos */}
                <div style={{ animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards', opacity: 0, animationDelay: '200ms' }}>
                    {hasCampaignData && hasBasicData ? (
                        <BrutalCard className="h-full brutal-card-enhanced border-blue-500/30" noPadding>
                            <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-blue-900/10">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs md:text-sm font-mono uppercase text-blue-400 tracking-wider">Economia</span>
                                        <InfoButton text="Valor estimado de no-shows evitados graças às confirmações automáticas." />
                                    </div>
                                    <UserCheck className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
                                </div>
                                <div>
                                    <span className="text-2xl md:text-3xl font-bold font-heading text-white">
                                        {formatCurrency(metrics.avoidedNoShows, currencyRegion)}
                                    </span>
                                    <p className="text-xs md:text-sm text-text-secondary mt-1 font-mono">Em no-shows evitados</p>
                                </div>
                            </div>
                        </BrutalCard>
                    ) : (
                        <LearningCard
                            title="No-Shows"
                            color="text-blue-400"
                            message={!hasBasicData
                                ? `Visível após ${5 - dataMaturity.appointmentsTotal} agendamentos.`
                                : "Ative enviando campanhas de confirmação pelo CRM."
                            }
                            daysLeft={!hasBasicData ? undefined : 0}
                        />
                    )}
                </div>

                {/* Card 4: Vagas Preenchidas — requer link público ativo */}
                <div style={{ animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards', opacity: 0, animationDelay: '300ms' }}>
                    {hasPublicBookingData ? (
                        <BrutalCard className="h-full brutal-card-enhanced border-purple-500/30" noPadding>
                            <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-purple-900/10">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs md:text-sm font-mono uppercase text-purple-400 tracking-wider">Vagas</span>
                                        <InfoButton text="Receita de agendamentos feitos pelo link público, sem intervenção manual." />
                                    </div>
                                    <CalendarCheck className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
                                </div>
                                <div>
                                    <span className="text-2xl md:text-3xl font-bold font-heading text-white">
                                        {formatCurrency(metrics.filledSlots, currencyRegion)}
                                    </span>
                                    <p className="text-xs md:text-sm text-text-secondary mt-1 font-mono">Horários ociosos vendidos</p>
                                </div>
                            </div>
                        </BrutalCard>
                    ) : (
                        <LearningCard
                            title="Vagas"
                            color="text-purple-400"
                            message="Compartilhe o link de agendamento público com seus clientes para ativar."
                        />
                    )}
                </div>
            </div>
        </>
    );
});

ProfitMetrics.displayName = 'ProfitMetrics';
