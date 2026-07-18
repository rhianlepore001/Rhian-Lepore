import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { PhoneInput } from '../components/PhoneInput';
import { Button } from '../components/ui';
import { User, Scissors, Clock, Loader2, AlertTriangle, Users, Search, Sparkles, MapPin } from 'lucide-react';
import { formatCurrency, formatPhone } from '../utils/formatters';
import { joinQueue } from '../services/queue';
import {
  fetchBusinessProfileBySlug,
  fetchPublicCategories,
  fetchPublicProfessionals,
  fetchPublicServices,
} from '../services/publicBooking';

interface Service {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    category_id?: string;
    description?: string;
}

interface Professional {
    id: string;
    name: string;
    photo_url: string | null;
}

interface Category {
    id: string;
    name: string;
}

interface BusinessProfile {
    id: string;
    business_name: string;
    logo_url: string | null;
    cover_photo_url: string | null;
    user_type: string;
    region?: 'BR' | 'PT'; // Add Region
}

export const QueueJoin: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const preSelectedPro = searchParams.get('pro');

    const navigate = useNavigate();
    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]); // New Categories state
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [joinError, setJoinError] = useState(false);

    // Filter Stats
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Form Stats
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedService, setSelectedService] = useState<string>('');
    const [selectedProfessional, setSelectedProfessional] = useState<string | null>(preSelectedPro || null);

    useEffect(() => {
        const fetchData = async () => {
            if (!slug) return;
            try {
                const profile = await fetchBusinessProfileBySlug(slug);
                setBusiness(profile);

                const [servicesData, catData, proData] = await Promise.all([
                    fetchPublicServices(profile.id),
                    fetchPublicCategories(profile.id),
                    fetchPublicProfessionals(profile.id),
                ]);

                setServices(servicesData || []);
                setCategories(catData || []);
                setProfessionals(
                    (proData || []).map((pro: Professional) => ({
                        id: pro.id,
                        name: pro.name,
                        photo_url: pro.photo_url,
                    })),
                );
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);

    const handleJoin = async () => {
        if (!name || !phone || !selectedService || !business) return;
        setSubmitting(true);
        setJoinError(false);
        try {
            const data = await joinQueue({
                businessId: business.id,
                clientName: name,
                clientPhone: phone,
                serviceId: selectedService,
                professionalId: selectedProfessional,
            });
            navigate(`/queue-status/${data.id}`);

        } catch (err) {
            console.error('Error joining queue:', err);
            setJoinError(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!business) return <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center">Estabelecimento não encontrado</div>;

    const accentColor = business.user_type === 'beauty' ? 'text-beauty-neon' : 'text-accent-gold';
    const borderColor = business.user_type === 'beauty' ? 'border-beauty-neon/20' : 'border-accent-gold/20';
    const bgCard = business.user_type === 'beauty'
        ? 'bg-theme-surface backdrop-blur-xl border-[var(--color-divider)]'
        : 'bg-theme-surface backdrop-blur-lg border-[var(--color-divider)]';
    const inputBg = 'bg-[var(--color-input-bg)]';

    // Filtering Logic
    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || s.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-theme-bg font-sans text-theme-text pb-12 relative overflow-hidden">
            {/* Background blobs for Beauty Mode */}
            {business.user_type === 'beauty' && (
                <>
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-beauty-acid/10 blur-[100px] pointer-events-none"></div>
                    <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none"></div>
                </>
            )}

            {/* Header / Hero */}
            <div className="relative h-48 w-full overflow-hidden z-10">
                <div className="absolute inset-0 bg-theme-card">
                    {business.cover_photo_url && <img src={business.cover_photo_url} className="w-full h-full object-cover opacity-50" />}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] to-transparent"></div>

                <div className="absolute bottom-0 left-0 w-full p-6 flex items-end gap-4">
                    <div className={`w-16 h-16 rounded-full border-2 ${borderColor} overflow-hidden bg-theme-surface shadow-xl`}>
                        {business.logo_url ? <img src={business.logo_url} className="w-full h-full object-cover" /> : <Scissors className="m-auto mt-4 text-[var(--color-text-muted)]" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-theme-text leading-none mb-1">{business.business_name}</h1>
                        <p className={`text-sm font-bold uppercase tracking-wider ${accentColor}`}>Fila Digital</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 sm:px-6 -mt-4 relative z-20 space-y-5">

                {/* Intro Card */}
                <div className={`${bgCard} border ${borderColor} rounded-2xl p-5 shadow-xl`}>
                    <h2 className="text-lg font-bold text-theme-text mb-2">Entre na fila sem esperar em pé!</h2>
                    <p className="text-sm text-theme-textSecondary">Preencha seus dados, escolha o serviço e acompanhe sua vez pelo celular.</p>
                </div>

                {/* Form */}
                <div className={`${bgCard} border ${borderColor} rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl`}>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1.5 ml-1">Seu Nome</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className={`w-full ${inputBg} border ${borderColor} rounded-xl p-4 pl-12 text-theme-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-theme-accent transition-all font-medium`}
                                placeholder="Como quer ser chamado?"
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1.5 ml-1">WhatsApp</label>
                        <PhoneInput
                            value={phone}
                            onChange={setPhone}
                            placeholder="(00) 00000-0000"
                            className={`${inputBg} ${borderColor} rounded-xl`}
                            forceTheme={business.user_type === 'beauty' ? 'beauty' : undefined}
                            defaultRegion={business.region || 'BR'} // Use business region as default
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1.5 ml-1">Serviço</label>

                        {/* Search & Filter UI */}
                        <div className="space-y-3 mb-3">
                            {/* Category Filter */}
                            {categories.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1 noscroll">
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        className={`px-4 py-2.5 min-w-[60px] rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === 'all' ? `${business.user_type === 'beauty' ? 'bg-beauty-neon/15 text-beauty-neon border-beauty-neon/35' : 'bg-accent-gold/15 text-accent-gold border-accent-gold/35'}` : 'bg-theme-surface border-[var(--color-divider)] text-theme-textSecondary'}`}
                                    >
                                        Todos
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-4 py-2.5 min-w-[60px] rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat.id ? `${business.user_type === 'beauty' ? 'bg-beauty-neon/15 text-beauty-neon border-beauty-neon/35' : 'bg-accent-gold/15 text-accent-gold border-accent-gold/35'}` : 'bg-theme-surface border-[var(--color-divider)] text-theme-textSecondary'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Search Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Buscar serviço..."
                                    className={`w-full ${inputBg} border ${borderColor} rounded-xl p-3.5 pl-10 text-base text-theme-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-theme-accent transition-all`}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                            </div>
                        </div>

                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredServices.length === 0 ? (
                                <div className="text-center text-[var(--color-text-muted)] text-sm py-4">Nenhum serviço encontrado.</div>
                            ) : (
                                filteredServices.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => setSelectedService(service.id)}
                                        className={`w-full p-4 rounded-2xl border flex justify-between items-center transition-all text-left min-h-[60px] ${selectedService === service.id ? `bg-[var(--color-card-hover)] ${borderColor} border-opacity-100 shadow-[0_0_15px_rgba(168,85,247,0.12)]` : `${inputBg} border-[var(--color-divider)] hover:border-[var(--color-input-border)]`}`}
                                    >
                                        <span className="font-medium text-theme-text text-base">{service.name}</span>
                                        <div className="text-right">
                                            <span className="block text-sm text-theme-textSecondary font-bold">{formatCurrency(service.price, business.region || 'BR')}</span>
                                            <span className="text-xs text-[var(--color-text-muted)]">{service.duration_minutes} min</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1.5 ml-1">Profissional (Opcional)</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 noscroll">
                            <button
                                onClick={() => setSelectedProfessional(null)}
                                className={`flex-shrink-0 w-20 p-2 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedProfessional === null ? `bg-[var(--color-card-hover)] ${borderColor}` : `${inputBg} border-[var(--color-divider)]`}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-theme-surface flex items-center justify-center border border-[var(--color-divider)]">
                                    <Users className="w-5 h-5 text-theme-textSecondary" />
                                </div>
                                <span className="text-xs font-bold text-center">Qualquer</span>
                            </button>
                            {professionals.map(pro => (
                                <button
                                    key={pro.id}
                                    onClick={() => setSelectedProfessional(pro.id)}
                                    className={`flex-shrink-0 w-20 p-2 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedProfessional === pro.id ? `bg-[var(--color-card-hover)] ${borderColor}` : `${inputBg} border-[var(--color-divider)]`}`}
                                >
                                    {pro.photo_url ? (
                                        <img src={pro.photo_url} className="w-10 h-10 rounded-full object-cover border border-[var(--color-divider)]" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-theme-surface flex items-center justify-center border border-[var(--color-divider)]">
                                            <span className="text-xs font-bold">{pro.name.substring(0, 2)}</span>
                                        </div>
                                    )}
                                    <span className="text-xs font-bold text-center truncate w-full">{pro.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            loading={submitting}
                            disabled={!name || !phone || !selectedService}
                            onClick={handleJoin}
                            className={`w-full ${business.user_type === 'beauty' ? 'shadow-[0_0_20px_rgba(168,85,247,0.3)]' : ''}`}
                        >
                            Entrar na Fila
                        </Button>
                        {joinError && (
                            <p className="text-center text-xs text-red-400 mt-3 p-3 rounded-xl bg-red-500/8 border border-red-500/30">
                                Não foi possível entrar na fila. Tente novamente ou avise no balcão.
                            </p>
                        )}
                        <p className="text-center text-xs text-[var(--color-text-muted)] mt-3">
                            Você receberá atualizações em tempo real nesta página.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
