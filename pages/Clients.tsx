
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Plus, Search, User } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Clients: React.FC = () => {
    const { user, userType } = useAuth();
    const [searchParams] = useSearchParams();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const isBeauty = userType === 'beauty';
    const buttonClass = isBeauty ? 'bg-beauty-neon hover:bg-beauty-neonHover text-black' : 'bg-accent-gold hover:bg-accent-goldHover text-black';

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) throw error;
            if (data) setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        const querySearch = searchParams.get('search');
        if (querySearch) {
            setSearchTerm(querySearch);
        }
    }, [searchParams]);

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { error } = await supabase.from('clients').insert({
                user_id: user.id,
                name,
                email,
                phone,
                loyalty_tier: 'Bronze',
                total_visits: 0
            });

            if (error) throw error;

            setShowModal(false);
            fetchClients();
            setName('');
            setEmail('');
            setPhone('');
        } catch (error: any) {
            console.error('Error creating client:', error);
            alert(`Erro ao criar cliente: ${error.message || JSON.stringify(error)}`);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-white/10 pb-4 gap-4">
                <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Clientes</h2>
                <BrutalButton variant="primary" icon={<Plus />} onClick={() => setShowModal(true)} className="w-full md:w-auto">Novo Cliente</BrutalButton>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border-2 border-neutral-800 p-4 pl-12 text-white font-mono text-sm focus:border-white outline-none transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center text-text-secondary p-10">Carregando clientes...</div>
                ) : filteredClients.length === 0 ? (
                    <div className="col-span-full text-center text-text-secondary p-10">Nenhum cliente encontrado.</div>
                ) : (
                    filteredClients.map(client => (
                        <Link key={client.id} to={`/clientes/${client.id}`}>
                            <BrutalCard className="hover:border-white/40 transition-colors cursor-pointer group h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-full border-2 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'} flex items-center justify-center bg-black`}>
                                        <User className={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} />
                                    </div>
                                    <span className="text-xs font-mono text-neutral-500 uppercase">{client.loyalty_tier}</span>
                                </div>
                                <h3 className="text-lg font-heading text-white mb-1 group-hover:text-accent-gold transition-colors">{client.name}</h3>
                                <p className="text-sm text-text-secondary font-mono">{client.phone || 'Sem telefone'}</p>
                            </BrutalCard>
                        </Link>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border-2 border-white/20 w-full max-w-md p-6 shadow-heavy relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                        >
                            X
                        </button>
                        <h3 className="text-xl font-heading text-white mb-6 uppercase">Novo Cliente</h3>

                        <form onSubmit={handleCreateClient} className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-neutral-500 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-neutral-500 mb-1">Telefone</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white outline-none"
                                    placeholder="(XX) 9XXXX-XXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-neutral-500 mb-1">Email (Opcional)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className={`w-full py-3 font-bold uppercase tracking-wider ${buttonClass} mt-4`}
                            >
                                Cadastrar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
