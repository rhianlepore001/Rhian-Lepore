import React, { useState } from 'react';
import { BrutalCard } from './BrutalCard';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Loader2, Users } from 'lucide-react';
import { BrutalButton } from './BrutalButton';
import { generateReactivationMessage, getWhatsAppUrl } from '../utils/aiosCopywriter';
import { useAIOSDiagnostic } from '../hooks/useAIOSDiagnostic';

interface ChurnRadarProps {
    clients?: any[];
    loading?: boolean;
    onReactivateSuccess?: () => void;
    onReactivate?: (client: any) => void;
}

export const ChurnRadar: React.FC<ChurnRadarProps> = ({ clients, loading, onReactivateSuccess, onReactivate }) => {
    const { userType, businessName } = useAuth();
    const { logCampaignActivity, refetch } = useAIOSDiagnostic();
    const [sendingId, setSendingId] = useState<string | null>(null);

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    const handleReactivate = async (client: any) => {
        if (onReactivate) {
            onReactivate(client);
            return;
        }

        if (sendingId) return;
        setSendingId(client.id);

        try {
            const message = generateReactivationMessage({
                name: client.name,
                businessName: businessName || 'nosso estabelecimento',
                userType: userType || 'barber',
                daysMissing: (client.days_since_last_visit && typeof client.days_since_last_visit === 'object')
                    ? client.days_since_last_visit.days || 30
                    : parseInt(client.days_since_last_visit) || 30
            });

            await logCampaignActivity(client.id, 'AIOSMarketingAgent', 'whatsapp_reactivation');

            const url = getWhatsAppUrl(client.phone, message);
            window.open(url, '_blank');

            if (onReactivateSuccess) {
                setTimeout(() => onReactivateSuccess(), 2000);
            } else {
                setTimeout(() => refetch(), 2000);
            }
        } catch (error) {
            console.error('Erro ao reativar cliente:', error);
        } finally {
            setSendingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-heading text-white uppercase italic">Clientes para Recuperar</h3>
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse">
                        Oportunidades Reais
                    </div>
                </div>
                <p className="text-xs font-mono text-text-secondary hidden md:block">
                    Foco em clientes Sumidos ({'>'}30 dias)
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <BrutalCard key={i} className="animate-pulse flex items-center justify-between h-24">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-white/10 rounded"></div>
                                <div className="h-3 w-24 bg-white/5 rounded"></div>
                            </div>
                            <div className="h-10 w-24 bg-white/10 rounded"></div>
                        </BrutalCard>
                    ))}
                </div>
            ) : clients && clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                        <BrutalCard key={client.id} className="hover:border-white/30 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-white font-bold">{client.name}</h4>
                                    <p className="text-xs text-text-secondary font-mono">Última vez: {new Date(client.last_visit).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-mono text-red-400">Sumido há {client.days_since_last_visit && typeof client.days_since_last_visit === 'object' ? client.days_since_last_visit.days || 30 : client.days_since_last_visit || 30} dias</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-mono text-text-secondary">Valor Médio</span>
                                    <span className={`text-sm font-bold ${accentText}`}>R$ {client.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <BrutalButton
                                    variant="secondary"
                                    size="sm"
                                    className="py-1 px-3 text-xs"
                                    onClick={() => handleReactivate(client)}
                                    disabled={sendingId === client.id}
                                >
                                    {sendingId === client.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <span>Reativar</span>
                                            <MessageSquare className="w-3 h-3" />
                                        </div>
                                    )}
                                </BrutalButton>
                            </div>
                        </BrutalCard>
                    ))}
                </div>
            ) : (
                <BrutalCard className="text-center py-12 border-dashed border-white/10">
                    <Users className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
                    <h4 className="text-white font-heading text-lg uppercase">Nenhum cliente em risco iminente</h4>
                    <p className="text-neutral-500 text-sm max-w-sm mx-auto">
                        Parabéns! Sua taxa de retenção está ótima ou ainda não temos dados suficientes para identificar padrões de abandono.
                    </p>
                </BrutalCard>
            )}
        </div>
    );
};
