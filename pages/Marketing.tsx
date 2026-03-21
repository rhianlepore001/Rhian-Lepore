import React, { useState } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { useAuth } from '../contexts/AuthContext';
import { useAIOSDiagnostic } from '../hooks/useAIOSDiagnostic';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMarketingOpportunities } from '../hooks/useMarketingOpportunities';
import {
    Target, Clock, Info,
    Users, Star,
    Zap, Lightbulb
} from 'lucide-react';
import { BrutalButton } from '../components/BrutalButton';
import { ChurnRadar } from '../components/ChurnRadar';
import { CampaignModal } from '../components/marketing/CampaignModal';
import { OpportunityCard } from '../components/marketing/OpportunityCard';

export const Marketing: React.FC = () => {
    const { userType } = useAuth();
    const { diagnostic, loading: diagnosticLoading } = useAIOSDiagnostic();
    const { financialDoctor } = useDashboardData();
    const { insights, loading: insightsLoading } = useMarketingOpportunities();

    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    // Cálculo de Receita Potencial em risco
    const avgTicketValue = financialDoctor?.avgTicket || 75;
    const gapsRevenue = (insights?.empty_slots?.length || 0) * avgTicketValue;
    const vipsRevenue = (insights?.high_value_clients || []).reduce((acc, c) => acc + (c.total_spent / 5), 0);

    const totalRiskRevenue = (diagnostic?.recoverable_revenue || 0) + gapsRevenue + vipsRevenue;
    const hasGaps = (insights?.empty_slots?.length || 0) > 0;
    const hasVIPs = (insights?.high_value_clients?.length || 0) > 0;
    const avgTicket = financialDoctor?.avgTicket || 75;

    const handleAISuggest = (client?: any) => {
        if (client) {
            setSelectedClient({
                name: client.name,
                phone: client.phone,
                daysMissing: client.days_missing || 30,
                lastService: client.last_service || 'serviço anterior',
                ltv: client.total_spent || client.ltv
            });
        } else if (diagnostic?.at_risk_clients?.length > 0) {
            const topClient = diagnostic.at_risk_clients[0];
            setSelectedClient({
                name: topClient.name,
                phone: topClient.phone,
                daysMissing: topClient.days_since_last_visit || 30
            });
        }
        setIsCampaignModalOpen(true);
    };

    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* HEADER: Recuperação & Oportunidades */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-black p-6 border-b-4 border-white border-t-2 border-t-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Zap className="w-40 h-40 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono bg-accent-gold/20 text-accent-gold px-2 py-0.5 font-bold uppercase border border-accent-gold/30">Oportunidade</span>
                            <span className="text-[10px] font-mono text-text-secondary uppercase">Recuperação & Oportunidades</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-heading text-white uppercase leading-none">
                            {totalRiskRevenue > 0
                                ? `R$ ${totalRiskRevenue.toLocaleString()} em risco`
                                : "Agenda em dia"
                            }
                        </h2>
                        <p className="text-text-secondary font-mono mt-2 text-sm max-w-xl">
                            {totalRiskRevenue > 0
                                ? `Identifiquei clientes VIP e horários vagos que podem gerar receita hoje. Vamos agir?`
                                : `Sua retenção está excelente. Que tal aproveitar para atrair novos clientes agora?`
                            }
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <BrutalButton
                            variant="primary"
                            className="h-12 px-8 uppercase font-bold"
                            onClick={() => handleAISuggest()}
                            icon={<Zap className="w-5 h-5 fill-black" />}
                        >
                            Criar Campanha
                        </BrutalButton>
                    </div>
                </div>
            </div>

            {/* OPORTUNIDADES PROATIVAS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUNA 1: FEED DE OPORTUNIDADES */}
                <div className="lg:col-span-8 space-y-6">
                    <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
                        <Zap className={`w-6 h-6 ${accentText}`} /> Oportunidades Proativas
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gaps na Agenda */}
                        {insights?.empty_slots?.slice(0, 2).map((slot, i) => (
                            <OpportunityCard
                                key={`gap-${i}`}
                                type="emergency"
                                icon={Clock}
                                title={`Gap às ${new Date(slot.time_slot!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                description={`Você tem um espaço vago. ${slot.suggested_clients?.[0]?.name || 'Um cliente fiel'} costuma vir neste horário.`}
                                badge="Urgente"
                                impact={`+ R$ ${avgTicket.toFixed(2)}`}
                                actionLabel="Preencher via WhatsApp"
                                onAction={() => handleAISuggest(slot.suggested_clients?.[0])}
                            />
                        ))}

                        {/* VIPs que não voltaram */}
                        {insights?.high_value_clients?.slice(0, 2).map((client, i) => (
                            <OpportunityCard
                                key={`vip-${i}`}
                                type="high-value"
                                icon={Star}
                                title={`Resgatar VIP: ${client.name}`}
                                description={`${client.name} (Total R$ ${client.total_spent.toFixed(0)}) não aparece há ${client.days_missing} dias.`}
                                badge="Prioridade"
                                impact={`Gasto por visita: R$ ${(client.total_spent / 5).toFixed(0)}`}
                                actionLabel="Enviar Convite VIP"
                                onAction={() => handleAISuggest(client)}
                            />
                        ))}

                        {(!hasGaps && !hasVIPs && !insightsLoading) && (
                            <OpportunityCard
                                type="strategy"
                                icon={Lightbulb}
                                title="Campanha de Upsell"
                                description="Temos 5 clientes vindo hoje para serviços básicos. Oferecer hidratação?"
                                badge="Dica"
                                actionLabel="Ver Agenda"
                                onAction={() => window.location.href = '/agenda'}
                            />
                        )}
                    </div>

                    {/* Clientes que não voltaram */}
                    <div className="pt-8 border-t border-white/10">
                        <h3 className="text-xl font-heading text-white uppercase mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-neutral-500" /> Clientes que não voltaram
                        </h3>
                        <ChurnRadar
                            clients={diagnostic?.at_risk_clients}
                            loading={diagnosticLoading}
                            onReactivate={(c) => handleAISuggest({ ...c, days_missing: c.days_since_last_visit })}
                        />
                    </div>
                </div>

                {/* COLUNA 2: SAÚDE DA BASE */}
                <div className="lg:col-span-4 space-y-6">
                    <BrutalCard className="bg-neutral-900 border-white/20">
                        <h3 className="text-lg font-heading text-white uppercase mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" /> Saúde da Base
                        </h3>
                        <div className="space-y-4 font-mono">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-text-secondary">Clientes Retidos</span>
                                <span className="text-green-500">82%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: '82%' }}></div>
                            </div>

                            <div className="flex justify-between items-center text-sm pt-2">
                                <span className="text-text-secondary">Clientes que não voltaram</span>
                                <span className="text-red-500">18%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div className="bg-red-500 h-full" style={{ width: '18%' }}></div>
                            </div>
                        </div>
                    </BrutalCard>

                    <BrutalCard className="bg-gradient-to-br from-neutral-900 to-black border-dashed border-white/20 p-4">
                        <h3 className="text-sm font-heading text-white uppercase mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4" /> Insight Narrativo
                        </h3>
                        <p className="text-[11px] text-text-secondary leading-relaxed font-mono italic">
                            {isBeauty
                                ? "Imagine sua cliente VIP recebendo um convite exclusivo agora. Historicamente, clientes de Estética que não voltam em 30 dias têm 60% de chance de nunca mais voltar. Vamos mudar essa história hoje?"
                                : "Seu cliente mais fiel está a um passo de esquecer a rotina de cuidados. Um simples 'E aí, vamos renovar?' entre 09:00 e 10:30 aumenta em 35% suas chances de preencher a agenda. Bora agir?"
                            }
                        </p>
                    </BrutalCard>
                </div>
            </div>

            <CampaignModal
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
                clientData={selectedClient}
            />
        </div>
    );
};
