import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../BrutalCard';
import { BrutalButton } from '../BrutalButton';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Users, Send, CheckSquare, Square, Filter, Loader2 } from 'lucide-react';
import { formatPhone } from '../../utils/formatters';
import { getWhatsAppUrl } from '../../utils/aiosCopywriter';
import { logger } from '../../utils/Logger';

export const WhatsAppCampaign: React.FC = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [message, setMessage] = useState('Olá! Temos uma novidade especial para você hoje. Vamos agendar seu próximo horário?');

    useEffect(() => {
        fetchClients();
    }, [user]);

    const fetchClients = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            logger.error('Erro ao buscar contatos para campanha:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredClients.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredClients.map(c => c.id));
        }
    };

    const handleSendBulk = () => {
        const selectedClients = clients.filter(c => selectedIds.includes(c.id));
        if (selectedClients.length === 0) return;

        // Para campanhas em massa no web, abrimos o primeiro e sugerimos continuar
        // Ou simulamos uma fila. Aqui, abriremos o primeiro para demonstração.
        const first = selectedClients[0];
        if (first.phone) {
            const url = getWhatsAppUrl(first.phone, encodeURIComponent(message));
            window.open(url, '_blank');
            alert(`Iniciando campanha para ${selectedClients.length} contatos. O primeiro WhatsApp foi aberto. Continue enviando para os demais da lista.`);
        }
    };

    return (
        <BrutalCard title="Campanha WhatsApp (Busca em Massa)" className="bg-neutral-900 border-white/10 h-full flex flex-col">
            <div className="space-y-4 flex-1 flex flex-col">
                {/* Search & Filter */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-accent-gold/50 outline-none"
                    />
                </div>

                {/* Message Editor */}
                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-text-secondary uppercase">Texto da Campanha</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white h-20 resize-none outline-none focus:border-accent-gold/50"
                    />
                </div>

                {/* Selection Controls */}
                <div className="flex justify-between items-center px-1">
                    <button
                        onClick={toggleSelectAll}
                        className="text-[10px] font-mono text-text-secondary uppercase flex items-center gap-2 hover:text-white transition-colors"
                    >
                        {selectedIds.length === filteredClients.length && filteredClients.length > 0
                            ? <CheckSquare className="w-3 h-3 text-accent-gold" />
                            : <Square className="w-3 h-3" />
                        }
                        Selecionar Todos ({filteredClients.length})
                    </button>
                    <span className="text-[10px] font-mono text-accent-gold uppercase font-bold">
                        {selectedIds.length} selecionados
                    </span>
                </div>

                {/* Contact List */}
                <div className="flex-1 overflow-y-auto max-h-[300px] border border-white/5 rounded-xl bg-black/20 scrollbar-thin">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 text-accent-gold animate-spin" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-neutral-600">
                            <Users className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-[10px] uppercase font-mono">Nenhum contato encontrado</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredClients.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => toggleSelect(client.id)}
                                    className={`
                                        flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors
                                        ${selectedIds.includes(client.id) ? 'bg-accent-gold/5' : ''}
                                    `}
                                >
                                    {selectedIds.includes(client.id)
                                        ? <CheckSquare className="w-4 h-4 text-accent-gold" />
                                        : <Square className="w-4 h-4 text-neutral-700" />
                                    }
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-white uppercase">{client.name}</p>
                                        <p className="text-[10px] text-text-secondary font-mono">{formatPhone(client.phone || '', 'BR')}</p>
                                    </div>
                                    {client.total_spent > 0 && (
                                        <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold">VIP</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <BrutalButton
                    variant="primary"
                    fullWidth
                    disabled={selectedIds.length === 0}
                    onClick={handleSendBulk}
                    icon={<Send className="w-4 h-4" />}
                    className="py-4 uppercase font-bold text-xs"
                >
                    Disparar para {selectedIds.length} Contatos
                </BrutalButton>
            </div>
        </BrutalCard>
    );
};
