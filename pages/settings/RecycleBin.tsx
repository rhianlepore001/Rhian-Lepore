import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import {
    Trash2, RefreshCw, Undo2, AlertTriangle,
    Clock, Calendar, FileText, Users, Scissors,
    Wallet, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface DeletedItem {
    id: string;
    resource_type: string;
    name: string;
    deleted_at: string;
    days_until_permanent: number;
}

export const RecycleBin: React.FC = () => {
    const { userType } = useAuth();
    const [items, setItems] = useState<DeletedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('');

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    useEffect(() => {
        loadDeletedItems();
    }, [filter]);

    const loadDeletedItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_deleted_items', {
                p_resource_type: filter || null
            });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Erro ao carregar itens deletados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (item: DeletedItem) => {
        setRestoring(item.id);
        try {
            const resourceMap: Record<string, string> = {
                'appointments': 'restore_appointment',
                'clients': 'restore_client',
                'services': 'restore_service',
                'financial_records': 'restore_financial_record',
                'team_members': 'restore_team_member'
            };

            const functionName = resourceMap[item.resource_type];

            if (!functionName) {
                throw new Error(`Tipo de recurso desconhecido: ${item.resource_type}`);
            }

            const { error } = await supabase.rpc(functionName, {
                p_id: item.id
            });

            if (error) throw error;

            // Remover item da lista
            setItems(items.filter(i => i.id !== item.id));

            // Mostrar mensagem de sucesso
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl md:text-4xl font-heading text-white uppercase flex items-center gap-3">
                        <Trash2 className={`w-8 h-8 ${accentText}`} />
                        Lixeira
                    </h2>
                    <p className="text-text-secondary font-mono mt-2 text-sm">
                        Recupere itens deletados nos últimos 30 dias
                    </p>
                </div>
                <BrutalButton
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw />}
                    onClick={loadDeletedItems}
                    disabled={loading}
                >
                    Atualizar
                </BrutalButton>
            </div>

            {/* Alerta de Exclusão Permanente */}
            <BrutalCard className="border-l-4 border-orange-500">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="text-white font-bold mb-1">Atenção: Exclusão Permanente</h3>
                        <p className="text-neutral-400 text-sm">
                            Itens permanecem na lixeira por <span className="text-white font-bold">30 dias</span>.
                            Após esse período, serão <span className="text-red-500 font-bold">excluídos permanentemente</span> e
                            não poderão ser recuperados.
                        </p>
                    </div>
                </div>
            </BrutalCard>

            {/* Filtros */}
            <BrutalCard>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <label className="text-white font-bold whitespace-nowrap">Filtrar por tipo:</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="flex-1 md:flex-initial bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/30"
                    >
                        <option value="">Todos os tipos</option>
                        <option value="appointments">Agendamentos</option>
                        <option value="clients">Clientes</option>
                        <option value="services">Serviços</option>
                        <option value="financial_records">Registros Financeiros</option>
                        <option value="team_members">Equipe</option>
                    </select>
                </div>
            </BrutalCard>

            {/* Lista de Itens Deletados */}
            <BrutalCard noPadding>
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neutral-400 mb-2" />
                        <p className="text-neutral-400">Carregando lixeira...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center">
                        <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
                        <p className="text-white font-bold mb-1">Lixeira Vazia</p>
                        <p className="text-neutral-400 text-sm">Nenhum item deletado recentemente</p>
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
                                        <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400">
                                            {getResourceIcon(item.resource_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-white font-medium truncate">
                                                    {item.name}
                                                </span>
                                                <span className="px-2 py-0.5 bg-neutral-800 rounded text-xs text-neutral-400 whitespace-nowrap">
                                                    {getResourceLabel(item.resource_type)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-neutral-500">
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
                                            <p className="text-xs text-neutral-500">
                                                até exclusão
                                            </p>
                                        </div>
                                        <BrutalButton
                                            variant="primary"
                                            size="sm"
                                            icon={<Undo2 />}
                                            onClick={() => handleRestore(item)}
                                            disabled={restoring === item.id}
                                        >
                                            {restoring === item.id ? 'Restaurando...' : 'Restaurar'}
                                        </BrutalButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </BrutalCard>

            {/* Estatísticas */}
            {items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BrutalCard className="text-center">
                        <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">
                            Total na Lixeira
                        </p>
                        <p className={`text-3xl font-bold ${accentText}`}>
                            {items.length}
                        </p>
                    </BrutalCard>
                    <BrutalCard className="text-center">
                        <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">
                            Expirando em Breve
                        </p>
                        <p className="text-3xl font-bold text-orange-500">
                            {items.filter(i => i.days_until_permanent <= 7).length}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                            ({"<"} 7 dias)
                        </p>
                    </BrutalCard>
                    <BrutalCard className="text-center">
                        <p className="text-neutral-400 text-sm uppercase tracking-wider mb-1">
                            Período de Retenção
                        </p>
                        <p className="text-white text-sm font-mono mt-2">
                            30 dias
                        </p>
                    </BrutalCard>
                </div>
            )}
        </div>
    );
};
