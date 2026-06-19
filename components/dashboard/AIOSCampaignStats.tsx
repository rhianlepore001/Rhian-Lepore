import React from 'react';
import { Card } from '../ui/Card';
import { Sparkles, Send, TrendingUp, Users } from 'lucide-react';
import { InfoButton } from '../HelpButtons';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

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
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });

    return (
        <Card
            variant="outlined"
            className={`relative overflow-hidden ${accent.border}`}
        >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${accent.bgDim} ${accent.border} border`}>
                        <Sparkles className={`w-6 h-6 ${accent.text}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className={`${colors.text} ${font.heading} text-lg uppercase leading-tight`}>Resultado das Campanhas</h3>
                            <div className="mb-1">
                                <InfoButton text="Acompanhe quanto suas mensagens de WhatsApp estão trazendo de resultado. O Retorno Direto mostra o valor dos agendamentos feitos por clientes que receberam uma mensagem sua nos últimos 30 dias." />
                            </div>
                        </div>
                        <p className={`text-xs ${colors.textSecondary} ${font.mono} uppercase tracking-wider`}>Resultado das suas mensagens</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 md:gap-12 w-full md:w-auto">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <Send className={`w-3 h-3 ${colors.textSecondary}`} />
                            <span className={`text-[10px] uppercase ${font.mono} ${colors.textSecondary}`}>Enviadas</span>
                        </div>
                        <p className={`text-2xl font-bold ${colors.text} leading-none`}>{campaignsSent}</p>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className={`w-3 h-3 ${status.success}`} />
                            <span className={`text-[10px] uppercase ${font.mono} ${colors.textSecondary}`}>Faturou de volta</span>
                        </div>
                        <p className={`text-2xl font-bold ${accent.text} leading-none`}>
                            {currencySymbol} {recoveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className={`hidden md:flex flex-col items-center justify-center border-l ${colors.divider} pl-6 h-12`}>
                    <div className={`flex items-center gap-2 text-xs ${font.mono} ${colors.textSecondary} uppercase`}>
                        <Users className="w-4 h-4" />
                        <span>Clientes que voltaram</span>
                    </div>
                </div>
            </div>

            <Send className={`absolute -bottom-6 -right-6 w-32 h-32 opacity-5 ${accent.text} rotate-12`} />
        </Card>
    );
});

AIOSCampaignStats.displayName = 'AIOSCampaignStats';
