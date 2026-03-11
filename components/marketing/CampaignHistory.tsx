import React, { useState } from 'react';
import { Send, TrendingUp, Users, CheckCircle, XCircle, ChevronRight, BarChart3, MessageCircle } from 'lucide-react';
import { useCampaignHistory, CampaignRecord } from '../../hooks/useCampaignHistory';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { InfoButton } from '../HelpButtons';

export const CampaignHistory: React.FC = () => {
    const { roi, loading } = useCampaignHistory();
    const { userType, region } = useAuth();
    const [expanded, setExpanded] = useState(false);

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-white/5 rounded w-48" />
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-16 bg-white/5 rounded-xl" />
                        <div className="h-16 bg-white/5 rounded-xl" />
                        <div className="h-16 bg-white/5 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (roi.totalSent === 0) {
        return (
            <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <BarChart3 className={`w-4 h-4 ${accentText}`} />
                    </div>
                    <h3 className="text-sm font-bold font-heading text-white">Histórico de campanhas</h3>
                </div>
                <div className="text-center py-6">
                    <Send className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
                    <p className="text-sm text-text-secondary mb-1">Nenhuma campanha enviada ainda</p>
                    <p className="text-[11px] text-text-secondary/60">
                        Envie mensagens pela aba de Oportunidades para começar a rastrear resultados.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <BarChart3 className={`w-4 h-4 ${accentText}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold font-heading text-white">Resultado das campanhas</h3>
                                <InfoButton text="Mostra o resultado real das mensagens enviadas. Quando um cliente recebe sua mensagem e agenda nos 30 dias seguintes, contamos como retorno." />
                            </div>
                            <p className="text-[11px] text-text-secondary font-mono">Últimos 90 dias</p>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Send className="w-3 h-3 text-text-secondary" />
                            <span className="text-[9px] font-mono uppercase text-text-secondary">Enviadas</span>
                        </div>
                        <p className="text-xl font-bold text-white">{roi.totalSent}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Users className="w-3 h-3 text-green-400" />
                            <span className="text-[9px] font-mono uppercase text-text-secondary">Voltaram</span>
                        </div>
                        <p className="text-xl font-bold text-green-400">{roi.returnRate}%</p>
                        <p className="text-[9px] text-text-secondary font-mono">{roi.totalReturned} de {roi.totalSent}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            <span className="text-[9px] font-mono uppercase text-text-secondary">Faturou</span>
                        </div>
                        <p className={`text-xl font-bold ${accentText}`}>
                            {formatCurrency(roi.totalRecoveredRevenue, currencyRegion as any)}
                        </p>
                    </div>
                </div>

                {/* ROI per campaign */}
                {roi.avgRevenuePerCampaign > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg bg-green-500/5 border border-green-500/10">
                        <p className="text-[11px] text-green-400 font-mono text-center">
                            Cada mensagem enviada gerou em média {formatCurrency(roi.avgRevenuePerCampaign, currencyRegion as any)} de retorno
                        </p>
                    </div>
                )}
            </div>

            {/* Recent campaigns toggle */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 border-t border-white/5 hover:bg-white/3 transition-colors"
            >
                <span className="text-[11px] font-mono text-text-secondary uppercase">
                    Últimas mensagens ({roi.recentCampaigns.length})
                </span>
                <ChevronRight
                    className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                />
            </button>

            {/* Recent campaigns list */}
            {expanded && (
                <div className="px-5 pb-4 space-y-1.5">
                    {roi.recentCampaigns.slice(0, 10).map((campaign) => (
                        <CampaignRow
                            key={campaign.id}
                            campaign={campaign}
                            currencyRegion={currencyRegion}
                            accentText={accentText}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

function CampaignRow({
    campaign,
    currencyRegion,
    accentText
}: {
    campaign: CampaignRecord;
    currencyRegion: string;
    accentText: string;
}) {
    const sentDate = new Date(campaign.sentAt);
    const dateStr = sentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const timeStr = sentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${campaign.hadReturn ? 'bg-green-500/15' : 'bg-white/5'}`}>
                {campaign.hadReturn
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    : <MessageCircle className="w-3.5 h-3.5 text-text-secondary" />
                }
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{campaign.clientName}</p>
                <p className="text-[10px] text-text-secondary font-mono">{dateStr} às {timeStr}</p>
            </div>
            {campaign.hadReturn ? (
                <span className={`text-[10px] font-mono font-semibold ${accentText}`}>
                    +{formatCurrency(campaign.returnRevenue, currencyRegion as any)}
                </span>
            ) : (
                <span className="text-[10px] font-mono text-text-secondary/50">
                    aguardando
                </span>
            )}
        </div>
    );
}
