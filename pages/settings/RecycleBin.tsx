import { Card, Button } from '../../components/ui';
import React, { useState } from 'react';


import { SettingsLayout } from '../../components/SettingsLayout';
import {
    Trash2, RefreshCw, Undo2, AlertTriangle,
    Clock, Calendar, FileText, Users, Scissors,
    Wallet, CheckCircle2
} from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useDeletedItems, useRestoreDeletedItem } from '../../hooks/useRecycleBin';
import type { DeletedItem } from '@/types/recycleBin';

export const RecycleBin: React.FC = () => {
    const { accent, colors } = useBrutalTheme();
    const [filter, setFilter] = useState<string>('');
    const { data: items = [], isLoading: loading, refetch } = useDeletedItems(filter || undefined);
    const restoreMutation = useRestoreDeletedItem();
    const [restoring, setRestoring] = useState<string | null>(null);

    const handleRestore = async (item: DeletedItem) => {
        setRestoring(item.id);
        try {
            await restoreMutation.mutateAsync({
                resourceType: item.resource_type,
                itemId: item.id,
            });
            alert('Item restaurado com sucesso!');
        } catch (error) {
            console.error('Erro ao restaurar item:', error);
            alert('Erro ao restaurar item. Tente novamente.');
        } finally {
            setRestoring(null);
        }
    };

    const getResourceIcon = (resourceType: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            'appointments': <Calendar className="w-4 h-4" />,
            'clients': <Users className="w-4 h-4" />,
            'services': <Scissors className="w-4 h-4" />,
            'financial_records': <Wallet className="w-4 h-4" />,
            'team_members': <Users className="w-4 h-4" />
        };
        return iconMap[resourceType] || <FileText className="w-4 h-4" />;
    };

    const getResourceLabel = (resourceType: string) => {
        const labelMap: Record<string, string> = {
            'appointments': 'Agendamento',
            'clients': 'Cliente',
            'services': 'Serviço',
            'financial_records': 'Registro Financeiro',
            'team_members': 'Membro da Equipe'
        };
        return labelMap[resourceType] || resourceType;
    };

    const getDaysColor = (days: number) => {
        if (days <= 7) return 'text-red-500';
        if (days <= 15) return 'text-orange-500';
        return 'text-green-500';
    };

    return (
        <SettingsLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-white/10 pb-4">
                    <div>
                        <h2 className={`text-2xl md:text-4xl font-heading ${colors.text} uppercase flex items-center gap-3`}>
                            <Trash2 className={`w-8 h-8 ${accent.text}`} />
                            Lixeira
                        </h2>
                        <p className="text-text-secondary font-mono mt-2 text-sm">
                            Recupere itens deletados nos últimos 30 dias
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<RefreshCw />}
                        onClick={() => { void refetch(); }}
                        disabled={loading}
                    >
                        Atualizar
                    </Button>
                </div>

                <Card className="border border-orange-500/30 bg-orange-500/5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className={`${colors.text} font-bold mb-1`}>Atenção: Exclusão Permanente</h3>
                            <p className={`${colors.textSecondary} text-sm`}>
                                Itens permanecem na lixeira por <span className={`${colors.text} font-bold`}>30 dias</span>.
                                Após esse período, serão <span className="text-red-500 font-bold">excluídos permanentemente</span> e
                                não poderão ser recuperados.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <label className={`${colors.text} font-bold whitespace-nowrap`}>Filtrar por tipo:</label>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className={`flex-1 md:flex-initial ${colors.surface} border ${colors.border} rounded-lg px-4 py-2 ${colors.text} focus:outline-none focus:border-white/30`}
                        >
                            <option value="">Todos os tipos</option>
                            <option value="appointments">Agendamentos</option>
                            <option value="clients">Clientes</option>
                            <option value="services">Serviços</option>
                            <option value="financial_records">Registros Financeiros</option>
                            <option value="team_members">Equipe</option>
                        </select>
                    </div>
                </Card>

                <Card noPadding>
                    {loading ? (
                        <div className="p-8 text-center">
                            <RefreshCw className={`w-8 h-8 animate-spin mx-auto ${colors.textSecondary} mb-2`} />
                            <p className={`${colors.textSecondary}`}>Carregando lixeira...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
                            <p className={`${colors.text} font-bold mb-1`}>Lixeira Vazia</p>
                            <p className={`${colors.textSecondary} text-sm`}>Nenhum item deletado recentemente</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-800">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`p-2 ${colors.surface} rounded-lg ${colors.textSecondary}`}>
                                                {getResourceIcon(item.resource_type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`${colors.text} font-medium truncate`}>
                                                        {item.name}
                                                    </span>
                                                    <span className={`px-2 py-0.5 ${colors.surface} rounded text-xs ${colors.textSecondary} whitespace-nowrap`}>
                                                        {getResourceLabel(item.resource_type)}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center gap-3 text-xs ${colors.textMuted}`}>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Deletado em {new Date(item.deleted_at).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${getDaysColor(item.days_until_permanent)}`}>
                                                    {item.days_until_permanent} dias
                                                </p>
                                                <p className={`text-xs ${colors.textMuted}`}>
                                                    até exclusão
                                                </p>
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                icon={<Undo2 />}
                                                onClick={() => handleRestore(item)}
                                                disabled={restoring === item.id}
                                            >
                                                {restoring === item.id ? 'Restaurando...' : 'Restaurar'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {items.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="text-center">
                            <p className={`${colors.textSecondary} text-sm uppercase tracking-wider mb-1`}>
                                Total na Lixeira
                            </p>
                            <p className={`text-3xl font-bold ${accent.text}`}>
                                {items.length}
                            </p>
                        </Card>
                        <Card className="text-center">
                            <p className={`${colors.textSecondary} text-sm uppercase tracking-wider mb-1`}>
                                Expirando em Breve
                            </p>
                            <p className="text-3xl font-bold text-orange-500">
                                {items.filter(i => i.days_until_permanent <= 7).length}
                            </p>
                            <p className={`text-xs ${colors.textMuted} mt-1`}>
                                ({"<"} 7 dias)
                            </p>
                        </Card>
                        <Card className="text-center">
                            <p className={`${colors.textSecondary} text-sm uppercase tracking-wider mb-1`}>
                                Período de Retenção
                            </p>
                            <p className={`${colors.text} text-sm font-mono mt-2`}>
                                30 dias
                            </p>
                        </Card>
                    </div>
                )}
            </div>
        </SettingsLayout>
    );
};
