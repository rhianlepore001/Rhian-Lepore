import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { PhoneInput } from '../components/PhoneInput';
import { Button } from '../components/ui';
import { User, Scissors, Loader2, Users, Search } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { joinQueue } from '../services/queue';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
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

    const isBeauty = business?.user_type === 'beauty';
    const themeOverride: ThemeVariant = isBeauty ? 'beauty' : 'barber';
    const { colors, accent } = useBrutalTheme({ override: themeOverride });

    useEffect(() => {
        if (!business) return;
        document.documentElement.setAttribute('data-public-theme', isBeauty ? 'beauty' : 'barber');
        return () => {
            document.documentElement.removeAttribute('data-public-theme');
        };
    }, [business, isBeauty]);

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

    if (loading) return <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}><Loader2 className="animate-spin" /></div>;
    if (!business) return <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}>Estabelecimento não encontrado</div>;

    const bgCard = `${colors.card} backdrop-blur-xl ${colors.border}`;
    const pillActive = `${accent.bgDim} ${accent.text} ${accent.border}`;
    const pillInactive = `bg-[var(--color-card-hover)] ${colors.border} ${colors.textMuted}`;
    const cardSelected = `bg-[var(--color-card-hover)] ${accent.border} border-opacity-100 ${accent.shadow}`;
    const cardUnselected = `${colors.inputBg} ${colors.border} hover:border-[var(--color-accent-border)]`;

    // Filtering Logic
    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || s.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className={`min-h-screen ${colors.bg} font-sans ${colors.textSecondary} pb-12 relative overflow-hidden`}>
            {isBeauty && (
                <>
                    <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full ${accent.bgDim} blur-[100px] pointer-events-none`}></div>
                    <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[var(--color-info-bg)] blur-[100px] pointer-events-none"></div>
                </>
            )}

            {/* Header / Hero */}
            <div className="relative h-48 w-full overflow-hidden z-10">
                <div className="absolute inset-0 bg-[var(--color-card)]">
                    {business.cover_photo_url && <img src={business.cover_photo_url} className="w-full h-full object-cover opacity-50" />}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] to-transparent"></div>

                <div className="absolute bottom-0 left-0 w-full p-6 flex items-end gap-4">
                    <div className={`w-16 h-16 rounded-full border-2 ${accent.borderDim} overflow-hidden ${colors.card} shadow-xl`}>
                        {business.logo_url ? <img src={business.logo_url} className="w-full h-full object-cover" /> : <Scissors className={`m-auto mt-4 ${colors.textMuted}`} />}
                    </div>
                    <div>
                        <h1 className={`text-2xl font-bold ${colors.text} leading-none mb-1`}>{business.business_name}</h1>
                        <p className={`text-sm font-bold uppercase tracking-wider ${accent.text}`}>Fila Digital</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 sm:px-6 -mt-4 relative z-20 space-y-5">

                {/* Intro Card */}
                <div className={`${bgCard} border rounded-2xl p-5 shadow-xl`}>
                    <h2 className={`text-lg font-bold ${colors.text} mb-2`}>Entre na fila sem esperar em pé!</h2>
                    <p className={`text-sm ${colors.textMuted}`}>Preencha seus dados, escolha o serviço e acompanhe sua vez pelo celular.</p>
                </div>

                {/* Form */}
                <div className={`${bgCard} border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl`}>
                    <div>
                        <label className={`block text-xs font-bold uppercase ${colors.textMuted} mb-1.5 ml-1`}>Seu Nome</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className={`w-full ${colors.inputBg} border ${accent.borderDim} rounded-xl p-4 pl-12 ${colors.text} placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-[var(--color-input-focus)] transition-all font-medium`}
                                placeholder="Como quer ser chamado?"
                            />
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase ${colors.textMuted} mb-1.5 ml-1`}>WhatsApp</label>
                        <PhoneInput
                            value={phone}
                            onChange={setPhone}
                            placeholder="(00) 00000-0000"
                            className={`${colors.inputBg} ${accent.borderDim} rounded-xl`}
                            forceTheme={themeOverride}
                            defaultRegion={business.region || 'BR'}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase ${colors.textMuted} mb-1.5 ml-1`}>Serviço</label>

                        {/* Search & Filter UI */}
                        <div className="space-y-3 mb-3">
                            {/* Category Filter */}
                            {categories.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1 noscroll">
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        className={`px-4 py-2.5 min-w-[60px] rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === 'all' ? pillActive : pillInactive}`}
                                    >
                                        Todos
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-4 py-2.5 min-w-[60px] rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat.id ? pillActive : pillInactive}`}
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
                                    className={`w-full ${colors.inputBg} border ${accent.borderDim} rounded-xl p-3.5 pl-10 text-base ${colors.text} placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-theme-accent transition-all`}
                                />
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
                            </div>
                        </div>

                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredServices.length === 0 ? (
                                <div className={`text-center ${colors.textMuted} text-sm py-4`}>Nenhum serviço encontrado.</div>
                            ) : (
                                filteredServices.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => setSelectedService(service.id)}
                                        className={`w-full p-4 rounded-2xl border flex justify-between items-center transition-all text-left min-h-[60px] ${selectedService === service.id ? cardSelected : cardUnselected}`}
                                    >
                                        <span className={`font-medium ${colors.text} text-base`}>{service.name}</span>
                                        <div className="text-right">
                                            <span className={`block text-sm ${colors.textSecondary} font-bold`}>{formatCurrency(service.price, business.region || 'BR')}</span>
                                            <span className={`text-xs ${colors.textMuted}`}>{service.duration_minutes} min</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase ${colors.textMuted} mb-1.5 ml-1`}>Profissional (Opcional)</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 noscroll">
                            <button
                                onClick={() => setSelectedProfessional(null)}
                                className={`flex-shrink-0 w-20 p-2 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedProfessional === null ? cardSelected : cardUnselected}`}
                            >
                                <div className={`w-10 h-10 rounded-full bg-[var(--color-card-hover)] flex items-center justify-center border ${colors.border}`}>
                                    <Users className={`w-5 h-5 ${colors.textMuted}`} />
                                </div>
                                <span className="text-xs font-bold text-center">Qualquer</span>
                            </button>
                            {professionals.map(pro => (
                                <button
                                    key={pro.id}
                                    onClick={() => setSelectedProfessional(pro.id)}
                                    className={`flex-shrink-0 w-20 p-2 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedProfessional === pro.id ? cardSelected : cardUnselected}`}
                                >
                                    {pro.photo_url ? (
                                        <img src={pro.photo_url} className={`w-10 h-10 rounded-full object-cover border ${colors.border}`} />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full bg-[var(--color-card-hover)] flex items-center justify-center border ${colors.border}`}>
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
                            className={`w-full ${isBeauty ? accent.shadow : ''}`}
                        >
                            Entrar na Fila
                        </Button>
                        {joinError && (
                            <p className="text-center text-xs text-[var(--color-danger)] mt-3 p-3 rounded-xl bg-[var(--color-danger)]/8 border border-[var(--color-danger-border)]/30">
                                Não foi possível entrar na fila. Tente novamente ou avise no balcão.
                            </p>
                        )}
                        <p className={`text-center text-xs ${colors.textMuted} mt-3`}>
                            Você receberá atualizações em tempo real nesta página.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
