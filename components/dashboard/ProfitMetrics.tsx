import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrutalCard } from '../BrutalCard';
import { DollarSign } from 'lucide-react';
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
        currentMonthRevenue?: number;
        monthScheduledValue?: number;
        todayRevenue?: number;
    };
    dataMaturity: DataMaturity;
    currencySymbol: string;
    currencyRegion: 'BR' | 'PT';
    isBeauty: boolean;
}

export const ProfitMetrics = React.memo(({
    metrics,
    dataMaturity: _dataMaturity,
    currencySymbol: _currencySymbol,
    currencyRegion,
    isBeauty
}: ProfitMetricsProps) => {
    const navigate = useNavigate();
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentIcon = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentIconBg = isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10';
    const hoverShadow = isBeauty
        ? 'hover:border-beauty-neon/30 hover:shadow-neon'
        : 'hover:border-accent-gold/30 hover:shadow-gold';
    const todayRevenue = metrics.todayRevenue ?? 0;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">

            {/* Card: Receita do Dia */}
            <BrutalCard className={`brutal-card-enhanced transition-all duration-300 ${hoverShadow}`} noPadding>
                <div className="p-6 md:p-8 flex flex-col justify-between bg-white/[0.01]">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-[0.15em] font-bold">Receita do Dia</span>
                            <InfoButton text="Valor recebido hoje (atendimentos com status Concluído)." />
                        </div>
                        <div className={`p-2.5 rounded-xl ${accentIconBg}`}>
                            <DollarSign className={`w-4 h-4 ${accentIcon}`} />
                        </div>
                    </div>

                    {todayRevenue > 0 ? (
                        <div>
                            <div className={`text-3xl md:text-4xl font-bold font-mono tracking-tight ${accentText} mb-2`}>
                                {formatCurrency(todayRevenue, currencyRegion)}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-[0.15em]">
                                HOJE
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-text-secondary mb-3">
                                Nenhum atendimento concluído hoje ainda.
                            </p>
                            <button
                                onClick={() => navigate('/agenda')}
                                className={`text-xs font-mono ${accentText} hover:opacity-70 transition-opacity`}
                            >
                                Registrar atendimento →
                            </button>
                        </div>
                    )}
                </div>
            </BrutalCard>

            {/* FUTURE: card-recuperado
            <div className="h-full">
                {hasCampaignData ? (
                    <BrutalCard className="h-full border-green-500/20" noPadding>
                        <div className="p-6 md:p-8 flex flex-col justify-between h-full bg-green-500/[0.02]">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono uppercase text-green-400 tracking-[0.2em] font-bold">Recuperado</span>
                                    <InfoButton text="Receita de clientes que voltaram graças às campanhas automatizadas." />
                                </div>
                                <TrendingUp className="w-4 h-4 text-green-400" />
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold font-heading tracking-tight text-white mb-1">
                                    {formatCurrency(metrics.recoveredRevenue, currencyRegion)}
                                </div>
                                <p className="text-xs text-text-secondary font-mono flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Clientes Reativados
                                </p>
                            </div>
                        </div>
                    </BrutalCard>
                ) : (
                    <LearningCard
                        title="Recuperado"
                        color="text-green-400"
                        message="Ative sua 1ª campanha de retorno no CRM para visualizar o faturamento recuperado."
                    />
                )}
            </div>
            */}

            {/* FUTURE: card-economia
            <div className="h-full">
                {hasCampaignData && hasBasicData ? (
                    <BrutalCard className="h-full border-blue-500/20" noPadding>
                        <div className="p-6 md:p-8 flex flex-col justify-between h-full bg-blue-500/[0.02]">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono uppercase text-blue-400 tracking-[0.2em] font-bold">Economia</span>
                                    <InfoButton text="Faltas evitadas pelas confirmações automáticas." />
                                </div>
                                <UserCheck className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold font-heading tracking-tight text-white mb-1">
                                    {formatCurrency(metrics.avoidedNoShows, currencyRegion)}
                                </div>
                                <p className="text-xs text-text-secondary font-mono flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Faltas Evitadas
                                </p>
                            </div>
                        </div>
                    </BrutalCard>
                ) : (
                    <LearningCard
                        title="Economia"
                        color="text-blue-400"
                        message={!hasBasicData
                            ? `O diagnóstico de faltas requer pelo menos 5 agendamentos realizados.`
                            : "Ative as mensagens de confirmação para proteger seu faturamento."
                        }
                    />
                )}
            </div>
            */}

            {/* FUTURE: card-vagas
            <div className="h-full">
                {hasPublicBookingData ? (
                    <BrutalCard className="h-full border-purple-500/20" noPadding>
                        <div className="p-6 md:p-8 flex flex-col justify-between h-full bg-purple-500/[0.02]">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono uppercase text-purple-400 tracking-[0.2em] font-bold">Vagas</span>
                                    <InfoButton text="Agendamentos feitos pelo link público (Self-Service)." />
                                </div>
                                <CalendarCheck className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold font-heading tracking-tight text-white mb-1">
                                    {formatCurrency(metrics.filledSlots, currencyRegion)}
                                </div>
                                <p className="text-xs text-text-secondary font-mono flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    Vendas Automáticas
                                </p>
                            </div>
                        </div>
                    </BrutalCard>
                ) : (
                    <LearningCard
                        title="Vagas"
                        color="text-purple-400"
                        message="Comece a usar seu link público de agendamento para ver as vendas automáticas aqui."
                    />
                )}
            </div>
            */}

        </div>
    );
});

ProfitMetrics.displayName = 'ProfitMetrics';
