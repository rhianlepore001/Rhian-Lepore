import React from 'react';
import { BrutalCard } from '../BrutalCard';
import { Sparkles, Send, TrendingUp, Users } from 'lucide-react';
import { InfoButton } from '../HelpButtons';

interface AIOSCampaignStatsProps {
    campaignsSent: number;
    recoveredRevenue: number;
    isBeauty: boolean;
    currencySymbol: string;
}

export const AIOSCampaignStats = React.memo(({
    campaignsSent,
    recoveredRevenue,
    isBeauty,
    currencySymbol
}: AIOSCampaignStatsProps) => {
    const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const accentBorder = isBeauty ? 'border-beauty-neon' : 'border-accent-gold';

    return (
        <BrutalCard
            className={`relative overflow-hidden border-l-4 ${accentBorder} bg-gradient-to-r from-neutral-900 to-black/40`}
        >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${accentBg} bg-opacity-20`}>
                        <Sparkles className={`w-6 h-6 ${accentColor}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-heading text-lg uppercase leading-tight">Métricas de Campanha</h3>
                            <div className="mb-1">
                                <InfoButton text="Acompanhe o desempenho real das suas campanhas de reativação. O ROI Direto é calculado apenas quando um agendamento concluído possui uma mensagem enviada ao cliente nos últimos 30 dias, garantindo atribuição precisa e 100% honesta." />
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary font-mono uppercase tracking-wider">Desempenho do AIOS 2.0</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 md:gap-12 w-full md:w-auto">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <Send className="w-3 h-3 text-text-secondary" />
                            <span className="text-[10px] uppercase font-mono text-text-secondary">Enviadas</span>
                        </div>
                        <p className="text-2xl font-bold text-white leading-none">{campaignsSent}</p>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] uppercase font-mono text-text-secondary">ROI Direto</span>
                        </div>
                        <p className={`text-2xl font-bold ${accentColor} leading-none`}>
                            {currencySymbol} {recoveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className={`hidden md:flex flex-col items-center justify-center border-l border-white/10 pl-6 h-12`}>
                    <div className="flex items-center gap-2 text-xs font-mono text-text-secondary uppercase">
                        <Users className="w-4 h-4" />
                        <span>Conversão Real</span>
                    </div>
                </div>
            </div>

            {/* Background decoration */}
            <Send className={`absolute -bottom-6 -right-6 w-32 h-32 opacity-5 ${accentColor} rotate-12`} />
        </BrutalCard>
    );
});

AIOSCampaignStats.displayName = 'AIOSCampaignStats';
