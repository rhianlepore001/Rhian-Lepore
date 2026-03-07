import React, { useState } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { useAuth } from '../contexts/AuthContext';
import { useAIOSDiagnostic } from '../hooks/useAIOSDiagnostic';
import { useDashboardData } from '../hooks/useDashboardData';
import {
    Megaphone, Sparkles, Calendar, Target,
    ImageIcon, Wand2, Clock, Bell, Info, Plus,
    TrendingUp, Send, Users, ArrowRight
} from 'lucide-react';
import { BrutalButton } from '../components/BrutalButton';
import { InfoButton } from '../components/HelpButtons';
import { ChurnRadar } from '../components/ChurnRadar';

export const Marketing: React.FC = () => {
    const { userType, user, businessName } = useAuth();
    const { diagnostic, loading: diagnosticLoading, logCampaignActivity, refetch: refetchDiagnostic } = useAIOSDiagnostic();
    const { profitMetrics, loading: dashboardLoading } = useDashboardData();

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const accentBorder = isBeauty ? 'border-beauty-neon' : 'border-accent-gold';

    const loading = diagnosticLoading || dashboardLoading;

    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Marketing Inteligente</h2>
                    <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
                        Atraia e fidelize mais clientes usando o poder da IA
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <BrutalButton
                        variant="primary"
                        icon={<Sparkles className="w-4 h-4" />}
                        onClick={() => alert('O Criador de Campanhas com IA está analisando seus dados para sugerir a melhor promoção.')}
                        id="ai-suggest-btn"
                    >
                        IA Sugerir Campanha
                    </BrutalButton>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BrutalCard className="bg-gradient-to-br from-neutral-900 to-black border-l-4 border-green-500">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <span className="text-xs font-mono text-text-secondary uppercase">ROI Direto (Mês)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">R$ {profitMetrics.recoveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <InfoButton text="Receita gerada por clientes que voltaram após receberem uma campanha de reativação nos últimos 30 dias." />
                    </div>
                </BrutalCard>

                <BrutalCard className={`bg-gradient-to-br from-neutral-900 to-black border-l-4 ${accentBorder}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <Target className={`w-5 h-5 ${accentText}`} />
                        <span className="text-xs font-mono text-text-secondary uppercase">Potencial Recuperável</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-bold ${accentText}`}>R$ {diagnostic?.recoverable_revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                        <InfoButton text="Soma do ticket médio de todos os clientes recorrentes que estão há mais de 30 dias sem visitar e não possuem agendamento futuro." />
                    </div>
                </BrutalCard>

                <BrutalCard className="bg-gradient-to-br from-neutral-900 to-black border-l-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-2">
                        <Send className="w-5 h-5 text-blue-500" />
                        <span className="text-xs font-mono text-text-secondary uppercase">Campanhas Enviadas</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{profitMetrics.campaignsSent}</div>
                </BrutalCard>
            </div>

            {/* Radar de Reativação */}
            <ChurnRadar clients={diagnostic?.at_risk_clients} loading={diagnosticLoading} />

            {/* Outras Features (Future Phase) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/10">
                <BrutalCard className="opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed relative overflow-hidden group">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-[10px] font-mono text-white border border-white/30 z-20">PHASE 2</div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-neutral-800 rounded-lg">
                            <Calendar className="w-6 h-6 text-neutral-400" />
                        </div>
                        <h4 className="text-white font-bold text-lg">Calendário de Conteúdo IA</h4>
                    </div>
                    <p className="text-neutral-500 text-sm mb-4">Sugestões diárias de posts, stories e reels baseadas nas tendências do seu segmento.</p>
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-600">
                        <Clock className="w-3 h-3" />
                        <span>Previsão: Março/2026</span>
                    </div>
                </BrutalCard>

                <BrutalCard className="opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed relative overflow-hidden group">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-[10px] font-mono text-white border border-white/30 z-20">PHASE 2</div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-neutral-800 rounded-lg">
                            <ImageIcon className="w-6 h-6 text-neutral-400" />
                        </div>
                        <h4 className="text-white font-bold text-lg">Estúdio de Fotos Pro</h4>
                    </div>
                    <p className="text-neutral-500 text-sm mb-4">Remoção de fundo, ajuste de iluminação e aplicação de filtros profissionais em fotos de cortes.</p>
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-600">
                        <Sparkles className="w-3 h-3" />
                        <span>Previsão: Março/2026</span>
                    </div>
                </BrutalCard>
            </div>
        </div>
    );
};
