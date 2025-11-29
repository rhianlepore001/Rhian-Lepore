
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Plus, Search, User, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { calculateTier, getTierConfig } from '../utils/tierSystem';

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
    const [photo, setPhoto] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

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
        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            let photoUrl = null;

            // Upload photo if provided - make this optional and non-blocking
            if (photo) {
                try {
                    const fileExt = photo.name.split('.').pop();
                    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

                    console.log('Attempting to upload photo to client_photos bucket...');

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('client_photos')
                        .upload(fileName, photo);

                    if (uploadError) {
                        console.error('Photo upload error:', uploadError);
                        // Don't throw - just warn the user and continue without photo
                        alert('Aviso: Não foi possível fazer upload da foto. O cliente será criado sem foto.');
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('client_photos')
                            .getPublicUrl(fileName);
                        photoUrl = publicUrl;
                        console.log('Photo uploaded successfully:', publicUrl);
                    }
                } catch (photoError) {
                    console.error('Photo upload exception:', photoError);
                    alert('Aviso: Erro ao fazer upload da foto. O cliente será criado sem foto.');
                }
            }

            // Create client regardless of photo upload success
            const { error } = await supabase.from('clients').insert({
                user_id: user.id,
                name,
                email,
                phone,
                photo_url: photoUrl,
                loyalty_tier: 'Bronze',
                total_visits: 0,
                rating: 0
            });

            if (error) throw error;

            alert('Cliente criado com sucesso!');
            setShowModal(false);
            fetchClients();
            setName('');
            setEmail('');
            setPhone('');
            setPhoto(null);
        } catch (error: any) {
            console.error('Error creating client:', error);
            alert(`Erro ao criar cliente: ${error.message || JSON.stringify(error)}`);
        } finally {
            setUploading(false);
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
                    filteredClients.map(client => {
                        const tier = calculateTier(client.total_visits || 0);
                        const tierConfig = getTierConfig(tier);
                        const rating = client.rating || 0;

                        return (
                            <Link key={client.id} to={`/clientes/${client.id}`}>
                                <BrutalCard className="hover:border-white/40 transition-colors cursor-pointer group h-full">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-full border-2 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'} flex items-center justify-center bg-black overflow-hidden`}>
                                            {client.photo_url ? (
                                                <img src={client.photo_url} alt={client.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'} />
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs font-mono uppercase px-2 py-1 ${tierConfig.bgColor} ${tierConfig.borderColor} ${tierConfig.color} border`}>
                                                {tier}
                                            </span>
                                            {rating > 0 && (
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <Star
                                                            key={i}
                                                            className={`w-3 h-3 ${i <= rating ? 'fill-accent-gold text-accent-gold' : 'text-neutral-600'}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-heading text-white mb-1 group-hover:text-accent-gold transition-colors">{client.name}</h3>
                                    <p className="text-sm text-text-secondary font-mono">{client.phone || 'Sem telefone'}</p>
                                </BrutalCard>
                            </Link>
                        );
                    })
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

                            <div>
                                <label className="block text-xs font-mono text-neutral-500 mb-1">Foto (Opcional - Temporariamente desabilitado)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                    className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white outline-none file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-accent-gold file:text-black hover:file:bg-accent-goldHover"
                                />
                                <p className="text-xs text-neutral-500 mt-1">⚠️ Upload de fotos será configurado em breve</p>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className={`w-full py-3 font-bold uppercase tracking-wider ${buttonClass} mt-4 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {uploading ? 'Cadastrando...' : 'Cadastrar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
