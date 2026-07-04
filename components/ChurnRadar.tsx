import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Skeleton, SkeletonCard } from './ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { MessageSquare, Loader2, Users } from 'lucide-react';
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

    const { accent, colors, font } = useBrutalTheme();

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
                    <h3 className={`text-xl ${font.heading} ${colors.text} uppercase italic`}>Clientes para Recuperar</h3>
                    <Badge variant="danger" className="animate-pulse">Oportunidades Reais</Badge>
                </div>
                <p className={`text-xs ${font.mono} ${colors.textSecondary} hidden md:block`}>
                    Foco em clientes Sumidos ({'>'}30 dias)
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <SkeletonCard key={i} className="h-24" />
                    ))}
                </div>
            ) : clients && clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                        <Card
                            key={client.id}
                            variant="outlined"
                            className="hover:border-[var(--color-border-strong)] transition-colors group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className={`${colors.text} font-bold`}>{client.name}</h4>
                                    <p className={`text-xs ${colors.textSecondary} ${font.mono}`}>Última vez: {new Date(client.last_visit).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs ${font.mono} ${colors.textMuted}`}>Sumido há {client.days_since_last_visit && typeof client.days_since_last_visit === 'object' ? client.days_since_last_visit.days || 30 : client.days_since_last_visit || 30} dias</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex flex-col">
                                    <span className={`text-xs uppercase ${font.mono} ${colors.textSecondary}`}>Gasto por visita</span>
                                    <span className={`text-sm font-bold ${accent.text}`}>R$ {client.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleReactivate(client)}
                                    disabled={sendingId === client.id}
                                    loading={sendingId === client.id}
                                    icon={!sendingId || sendingId !== client.id ? <MessageSquare className="w-3 h-3" /> : undefined}
                                >
                                    {sendingId === client.id ? '' : 'Chamar de volta'}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card variant="outlined" className="text-center py-12">
                    <Users className={`w-12 h-12 ${colors.textMuted} mx-auto mb-4 opacity-50`} />
                    <h4 className={`${colors.text} ${font.heading} text-lg uppercase`}>Todos os clientes estão voltando</h4>
                    <p className={`${colors.textMuted} text-sm max-w-sm mx-auto`}>
                        Parabéns! Seus clientes estão retornando normalmente ou ainda não temos atendimentos suficientes para identificar quem sumiu.
                    </p>
                </Card>
            )}
        </div>
    );
};
