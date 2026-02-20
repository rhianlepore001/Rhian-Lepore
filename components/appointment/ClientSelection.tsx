import React, { useState } from 'react';
import { Plus, User, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BrutalButton } from '../BrutalButton';
import { SearchableSelect } from '../SearchableSelect';
import { formatPhone, Region } from '../../utils/formatters';
import { PhoneInput } from '../PhoneInput';
import { logger } from '../../utils/Logger';

interface ClientSelectionProps {
    clients: any[];
    selectedClientId: string;
    setSelectedClientId: (id: string) => void;
    onRefreshClients: () => void;
    onClientCreated: (id: string) => void;
    isBeauty: boolean;
    currencyRegion: Region;
    cardBg: string;
}

export const ClientSelection: React.FC<ClientSelectionProps> = ({
    clients,
    selectedClientId,
    setSelectedClientId,
    onRefreshClients,
    onClientCreated,
    isBeauty,
    currencyRegion,
    cardBg
}) => {
    const { user } = useAuth();
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateClient = async () => {
        if (!newClientName || !newClientPhone) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .insert({
                    user_id: user?.id,
                    name: newClientName,
                    phone: newClientPhone
                })
                .select()
                .single();

            if (error) throw error;
            if (data) {
                onRefreshClients();
                onClientCreated(data.id);
                setIsCreatingClient(false);
            }
        } catch (error) {
            logger.error('Erro ao criar cliente:', error);
            alert('Erro ao criar cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Quem será atendido hoje?</h3>
                <p className="text-neutral-400">Selecione um cliente existente ou cadastre um novo.</p>
            </div>

            {!isCreatingClient ? (
                <div className="space-y-4">
                    <SearchableSelect
                        label=""
                        placeholder="🔍 Buscar cliente por nome ou telefone..."
                        options={clients.map(c => ({
                            id: c.id,
                            name: c.name,
                            subtext: formatPhone(c.phone || '', currencyRegion)
                        }))}
                        value={selectedClientId}
                        onChange={(val) => setSelectedClientId(val)}
                        accentColor={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}
                    />

                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px bg-white/10 flex-1"></div>
                        <span className="text-neutral-500 text-sm">OU</span>
                        <div className="h-px bg-white/10 flex-1"></div>
                    </div>

                    <BrutalButton
                        onClick={() => setIsCreatingClient(true)}
                        variant="secondary"
                        className="w-full py-4 border-dashed"
                        icon={<Plus />}
                    >
                        Cadastrar Novo Cliente
                    </BrutalButton>
                </div>
            ) : (
                <div className={`p-6 rounded-xl border ${cardBg} space-y-4`}>
                    <h4 className="text-white font-bold flex items-center gap-2">
                        <User className="w-5 h-5" /> Novo Cadastro
                    </h4>
                    <div>
                        <label className="text-sm text-neutral-400 block mb-1">Nome Completo</label>
                        <input
                            value={newClientName}
                            onChange={e => setNewClientName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30"
                            placeholder="Ex: Maria Silva"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-neutral-400 block mb-1">Telefone / WhatsApp</label>
                        <PhoneInput
                            value={newClientPhone}
                            onChange={setNewClientPhone}
                            placeholder="Telefone"
                            defaultRegion={currencyRegion === 'PT' ? 'PT' : 'BR'}
                            forceTheme={isBeauty ? 'beauty' : 'barber'}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <BrutalButton variant="secondary" onClick={() => setIsCreatingClient(false)} className="flex-1">Cancelar</BrutalButton>
                        <BrutalButton
                            variant="primary"
                            onClick={handleCreateClient}
                            className="flex-1"
                            disabled={loading || !newClientName || !newClientPhone}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Cadastrar e Continuar'}
                        </BrutalButton>
                    </div>
                </div>
            )}
        </div>
    );
};
