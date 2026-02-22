import React from 'react';
import { BrutalCard } from '../BrutalCard';
import { TrendingUp, UserCheck, CalendarCheck, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { InfoButton } from '../HelpButtons';

interface ProfitMetricsProps {
    metrics: {
        totalProfit: number;
        recoveredRevenue: number;
        avoidedNoShows: number;
        filledSlots: number;
        weeklyGrowth: number;
    };
    currencySymbol: string;
    currencyRegion: 'BR' | 'PT';
    isBeauty: boolean;
}

export const ProfitMetrics = React.memo(({
    metrics,
    currencySymbol,
    currencyRegion,
    isBeauty
}: ProfitMetricsProps) => {
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentIcon = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    return (
        <>
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Lucro Total (Mantido mas compactado) */}
                <BrutalCard
                    className="h-full brutal-card-enhanced"
                    noPadding
                    style={{
                        animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                        opacity: 0,
                        animationDelay: '0ms'
                    }}
                >
                    <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-neutral-900/50">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1">
                                <span className="text-xs md:text-sm font-mono uppercase text-text-secondary tracking-wider">Lucro</span>
                                <InfoButton text="Este é o seu lucro real (líquido). Calculamos o valor total dos serviços e subtraímos automaticamente o custo das comissões pagas aos profissionais e as despesas registradas." />
                            </div>
                            <DollarSign className={`w-3 h-3 md:w-4 md:h-4 ${accentIcon}`} />
                        </div>
                        <div>
                            <span className={`text-2xl md:text-3xl font-bold font-heading ${accentText}`}>
                                {formatCurrency(metrics.totalProfit, currencyRegion)}
                            </span>
                            <div className={`text-xs md:text-sm ${metrics.weeklyGrowth >= 0 ? 'text-green-500' : 'text-red-500'} font-mono flex items-center gap-1 mt-1`}>
                                <TrendingUp className="w-3 h-3" />
                                <span>{metrics.weeklyGrowth >= 0 ? '+' : ''}{metrics.weeklyGrowth}% sem</span>
                            </div>
                        </div>
                    </div>
                </BrutalCard>

                {/* Lucro Recuperado (NOVO) */}
                <BrutalCard
                    className="h-full brutal-card-enhanced border-green-500/30"
                    noPadding
                    style={{
                        animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                        opacity: 0,
                        animationDelay: '100ms'
                    }}
                >
                    <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-green-900/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1">
                                <span className="text-xs md:text-sm font-mono uppercase text-green-400 tracking-wider">Recup.</span>
                                <InfoButton text="Receita vinda de clientes 'esquecidos' que voltaram graças às nossas campanhas automáticas. São pessoas captadas que não agendavam há mais de 30 dias." />
                            </div>
                            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
                        </div>
                        <div>
                            <span className="text-2xl md:text-3xl font-bold font-heading text-white">
                                {formatCurrency(metrics.recoveredRevenue, currencyRegion)}
                            </span>
                            <p className="text-xs md:text-sm text-text-secondary mt-1 font-mono leading-tight">
                                Clientes resgatados
                            </p>
                        </div>
                    </div>
                </BrutalCard>

                {/* No-Shows Evitados (NOVO) */}
                <BrutalCard
                    className="h-full brutal-card-enhanced border-blue-500/30"
                    noPadding
                    style={{
                        animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                        opacity: 0,
                        animationDelay: '200ms'
                    }}
                >
                    <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-blue-900/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1">
                                <span className="text-xs md:text-sm font-mono uppercase text-blue-400 tracking-wider">Economia</span>
                                <InfoButton text="Dinheiro que você deixou de perder! Este valor representa os horários que foram confirmados via WhatsApp e que provavelmente seriam 'furos' sem o nosso sistema." />
                            </div>
                            <UserCheck className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
                        </div>
                        <div>
                            <span className="text-2xl md:text-3xl font-bold font-heading text-white">
                                {formatCurrency(metrics.avoidedNoShows, currencyRegion)}
                            </span>
                            <p className="text-xs md:text-sm text-text-secondary mt-1 font-mono leading-tight">
                                Em No-Shows evitados
                            </p>
                        </div>
                    </div>
                </BrutalCard>

                {/* Vagas Preenchidas (NOVO) */}
                <BrutalCard
                    className="h-full brutal-card-enhanced border-purple-500/30"
                    noPadding
                    style={{
                        animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                        opacity: 0,
                        animationDelay: '300ms'
                    }}
                >
                    <div className="p-4 md:p-5 flex flex-col justify-between h-full bg-purple-900/10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1">
                                <span className="text-xs md:text-sm font-mono uppercase text-purple-400 tracking-wider">Vagas</span>
                                <InfoButton text="Receita extra gerada através da nossa página de agendamento online, preenchendo janelas vazias na sua agenda sem que você precise fazer uma única ligação." />
                            </div>
                            <CalendarCheck className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
                        </div>
                        <div>
                            <span className="text-2xl md:text-3xl font-bold font-heading text-white">
                                {formatCurrency(metrics.filledSlots, currencyRegion)}
                            </span>
                            <p className="text-xs md:text-sm text-text-secondary mt-1 font-mono leading-tight">
                                Horários ociosos vendidos
                            </p>
                        </div>
                    </div>
                </BrutalCard>
            </div>
        </>
    );
});

ProfitMetrics.displayName = 'ProfitMetrics';
