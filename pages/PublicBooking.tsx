import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Clock, Check, Sparkles, Scissors, Calendar, Phone, Users } from 'lucide-react';
import { CalendarPicker } from '../components/CalendarPicker';
import { TimeGrid } from '../components/TimeGrid';
import { UpsellSection } from '../components/UpsellSection';
import { ProfessionalSelector } from '../components/ProfessionalSelector';
import { ClientAuthModal } from '../components/ClientAuthModal';
import { usePublicClient } from '../contexts/PublicClientContext';
import { BrutalButton } from '../components/BrutalButton';
import { formatCurrency } from '../utils/formatters';

interface Service {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    description: string | null;
    duration_minutes: number;
    category: string;
}

interface Professional {
    id: string;
    full_name: string;
    photo_url: string | null;
    specialties: string[];
    individual_rating: number;
    total_reviews: number;
    name: string; // Added for compatibility
}

interface BusinessProfile {
    id: string;
    business_name: string;
    user_type: string;
    google_rating: number;
    total_reviews: number;
    phone: string;
    enable_upsells: boolean;
    enable_professional_selection: boolean;
}

export const PublicBooking: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const proIdParam = searchParams.get('pro');

    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessSettings, setBusinessSettings] = useState<any>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [gallery, setGallery] = useState<any[]>([]); // New state for gallery
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'services' | 'datetime' | 'contact'>('services');

    // Contact form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedProfessional, setSelectedProfessional] = useState<string | null>(proIdParam || null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [acceptedPolicy, setAcceptedPolicy] = useState(false);
    const galleryRef = React.useRef<HTMLDivElement>(null);

    const { client } = usePublicClient();

    // Sync client data from context to form state
    useEffect(() => {
        if (client) {
            setCustomerName(client.name);
            setCustomerPhone(client.phone);
        }
    }, [client]);

    const isBeauty = business?.user_type === 'beauty';

    useEffect(() => {
        const fetchSlots = async () => {
            if (selectedDate && businessId) {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const { data, error } = await supabase.rpc('get_available_slots', {
                    p_business_id: businessId,
                    p_date: dateStr
                });

                if (error) {
                    console.error('Error fetching slots:', error);
                } else if (data) {
                    setAvailableSlots(data.slots || []);
                }
            }
        };
        fetchSlots();
    }, [selectedDate, businessId]);

    useEffect(() => {
        const fetchBusinessData = async () => {
            try {
                // Fetch business profile by slug - expanded columns
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, business_name, user_type, google_rating, total_reviews, phone, enable_upsells, enable_professional_selection, logo_url, cover_photo_url, address_street, instagram_handle')
                    .eq('business_slug', slug)
                    .single();

                if (profileError) throw profileError;

                if (profileData) {
                    setBusiness(profileData);
                    setBusinessId(profileData.id);

                    // Fetch settings
                    const { data: settings } = await supabase
                        .from('business_settings')
                        .select('*')
                        .eq('user_id', profileData.id)
                        .single();

                    if (settings) setBusinessSettings(settings);

                    // Fetch services for this business
                    const { data: servicesData, error: servicesError } = await supabase
                        .from('services')
                        .select('*')
                        .eq('user_id', profileData.id)
                        .eq('active', true)
                        .order('price', { ascending: true });

                    if (servicesError) throw servicesError;
                    setServices(servicesData || []);

                    // Fetch professionals
                    const { data: professionalsData, error: professionalsError } = await supabase
                        .from('team_members')
                        .select('*')
                        .eq('user_id', profileData.id)
                        .eq('active', true)
                        .order('display_order');

                    if (professionalsError) throw professionalsError;
                    const mappedPros = (professionalsData || []).map((p: any) => ({
                        ...p,
                        name: p.full_name || p.name
                    }));
                    setProfessionals(mappedPros);

                    // Fetch gallery
                    const { data: galleryData } = await supabase
                        .from('business_galleries')
                        .select('*')
                        .eq('user_id', profileData.id)
                        .eq('is_active', true)
                        .order('display_order');
                    setGallery(galleryData || []);
                }
            } catch (error) {
                console.error('Error fetching business data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchBusinessData();
        }
    }, [slug]);

    // Auto-scroll for gallery
    useEffect(() => {
        const interval = setInterval(() => {
            if (galleryRef.current) {
                const maxScroll = galleryRef.current.scrollWidth - galleryRef.current.clientWidth;
                if (galleryRef.current.scrollLeft >= maxScroll - 1) {
                    galleryRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    galleryRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                }
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [gallery]);

    const toggleService = (serviceId: string) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const calculateTotal = () => {
        return services
            .filter(s => selectedServices.includes(s.id))
            .reduce((sum, s) => sum + s.price, 0);
    };

    const calculateDuration = () => {
        return services
            .filter(s => selectedServices.includes(s.id))
            .reduce((sum, s) => sum + s.duration_minutes, 0);
    };

    const handleSubmit = async () => {
        if (!businessId || !customerName || !customerPhone || !selectedDate || !selectedTime || !acceptedPolicy) {
            alert('Por favor, preencha todos os campos e aceite a política de cancelamento.');
            return;
        }

        try {
            // Format date and time
            const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const appointmentTime = new Date(`${dateStr}T${selectedTime}`);

            const { error } = await supabase
                .from('public_bookings')
                .insert({
                    business_id: businessId,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    service_ids: selectedServices,
                    professional_id: selectedProfessional === 'any' ? null : selectedProfessional,
                    appointment_time: appointmentTime.toISOString(),
                    total_price: calculateTotal(),
                    status: 'pending'
                });

            if (error) throw error;

            alert('Agendamento realizado com sucesso! Você receberá uma confirmação em breve.');
            // Reset form
            setSelectedServices([]);
            setCustomerName('');
            setCustomerPhone('');
            setSelectedProfessional(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setAcceptedPolicy(false);
            setStep('services');
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Erro ao criar agendamento. Tente novamente.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-white text-xl font-mono">Carregando...</div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-white text-xl font-mono">Estabelecimento não encontrado</div>
            </div>
        );
    }

    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const bgClass = isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main';
    const cardClass = isBeauty
        ? 'bg-beauty-card/40 backdrop-blur-md border border-beauty-neon/20 rounded-2xl shadow-soft transition-all duration-300'
        : 'bg-brutal-card border-4 border-brutal-border shadow-heavy transition-all duration-300';
    const currencyRegion = businessSettings?.currency_symbol === '€' ? 'PT' : 'BR';

    const accentColorValue = isBeauty ? '#A78BFA' : '#C29B40';

    return (
        <div className={`min-h-screen ${bgClass} font-sans selection:bg-${accentColor}/30`}>
            {/* 1. CINEMATIC HERO SECTION */}
            <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
                {/* Background Cover */}
                <div className="absolute inset-0">
                    {business.cover_photo_url ? (
                        <img
                            src={business.cover_photo_url}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className={`w-full h-full ${isBeauty ? 'bg-gradient-to-br from-beauty-dark via-beauty-card to-beauty-neon/20' : 'bg-neutral-900 border-b-4 border-neutral-800'}`}></div>
                    )}
                    {/* Immersive Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
                </div>

                {/* Hero Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-4 text-center">
                    {/* Logo/Avatar */}
                    <div className={`relative w-24 h-24 md:w-32 md:h-32 mb-6 rounded-full p-1 bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-700`}>
                        {business.logo_url ? (
                            <img src={business.logo_url} alt="Logo" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 rounded-full">
                                <Scissors className={`w-10 h-10 md:w-14 md:h-14 text-${accentColor}`} />
                            </div>
                        )}
                        {/* Status Pulse */}
                        <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                    </div>

                    <h1 className="text-4xl md:text-7xl font-heading text-white uppercase tracking-tighter mb-4 drop-shadow-2xl">
                        {business.business_name}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:text-base">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                            <Star className={`w-4 h-4 text-${accentColor} fill-current`} />
                            <span className="text-white font-bold">{business.google_rating || '5.0'}</span>
                            <span className="text-neutral-400">({business.total_reviews || '0'})</span>
                        </div>
                        {business.address_street && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-neutral-300">
                                <Calendar className="w-4 h-4" />
                                <span>{business.address_street.split(',')[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* Quick CTA */}
                    <BrutalButton
                        variant="primary"
                        size="lg"
                        className="mt-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300"
                        onClick={() => document.getElementById('booking-start')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Agendar Agora
                    </BrutalButton>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-10 pb-32">
                {/* 2. ABOUT & GALLERY GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12" id="booking-start">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Business Gallery (The Portfolio Part) */}
                        {gallery.length > 0 && (
                            <section className={`${cardClass} p-6 md:p-8 animate-in slide-in-from-bottom duration-500 overflow-hidden`}>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl md:text-2xl font-heading text-white uppercase tracking-tight flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 text-${accentColor}`} />
                                        Galeria de Trabalhos
                                    </h2>
                                    <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-widest hidden md:block">Arraste para ver mais →</p>
                                </div>
                                <div
                                    ref={galleryRef}
                                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {gallery.map((item) => (
                                        <div
                                            key={item.id}
                                            className="min-w-[280px] md:min-w-[400px] aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer relative snap-start shadow-2xl border border-white/10"
                                        >
                                            {/* Blurred Background */}
                                            <div className="absolute inset-0 scale-110 blur-2xl opacity-50">
                                                <img
                                                    src={item.image_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            {/* Clear Foreground Image */}
                                            <div className="w-full h-full relative z-10 flex items-center justify-center p-2">
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title || "Trabalho"}
                                                    className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105"
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 z-20">
                                                {item.title && <p className="text-white font-bold text-sm uppercase tracking-wider font-mono">{item.title}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* STEPPER NAV */}
                        <div className={`
                            ${isBeauty
                                ? 'bg-beauty-card/90 border-b border-beauty-neon/20 backdrop-blur-xl'
                                : 'bg-brutal-card border-4 border-brutal-border shadow-heavy'
                            }
                            p-4 rounded-xl flex items-center justify-center gap-4 md:gap-12 sticky top-4 z-40 transition-all duration-300
                        `}>
                            {[
                                { id: 'services', label: 'Serviços', num: 1 },
                                { id: 'datetime', label: 'Data & Hora', num: 2 },
                                { id: 'contact', label: 'Finalizar', num: 3 }
                            ].map((s) => (
                                <div
                                    key={s.id}
                                    className={`flex items-center gap-2 transition-all duration-300 ${step === s.id ? `text-${accentColor} scale-105` : 'text-neutral-500 opacity-60'}`}
                                >
                                    <span className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                        ${step === s.id
                                            ? (isBeauty ? 'bg-beauty-neon text-black shadow-neon' : 'bg-accent-gold text-black border-2 border-black')
                                            : 'bg-neutral-800 border border-neutral-700'
                                        }
                                    `}>
                                        {step === s.id ? <Check className="w-4 h-4" /> : s.num}
                                    </span>
                                    <span className="text-xs font-mono uppercase font-bold hidden md:block tracking-wider">{s.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Booking Steps Content */}
                        <div className="animate-in fade-in duration-700">
                            {step === 'services' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl md:text-3xl font-heading text-white uppercase tracking-tight">Menu de Serviços</h2>
                                        <p className="text-neutral-500 text-xs font-mono">{services.length} Opções</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {services.map(service => {
                                            const isSelected = selectedServices.includes(service.id);
                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => toggleService(service.id)}
                                                    className={`
                                                        relative cursor-pointer transition-all duration-300 group overflow-hidden flex flex-col h-full
                                                        ${isBeauty
                                                            ? 'rounded-2xl border'
                                                            : 'border-2 border-black'
                                                        }
                                                        ${isSelected
                                                            ? (isBeauty
                                                                ? 'bg-beauty-card border-beauty-neon shadow-neon scale-[1.02] z-10'
                                                                : 'bg-neutral-900 border-accent-gold shadow-heavy-sm translate-x-[-2px] translate-y-[-2px]')
                                                            : (isBeauty
                                                                ? 'bg-beauty-card/30 border-white/5 hover:border-beauty-neon/30 hover:bg-beauty-card/50'
                                                                : 'bg-brutal-card border-transparent hover:border-neutral-700 hover:shadow-heavy-sm')
                                                        }
                                                    `}
                                                >
                                                    {service.image_url && (
                                                        <div className="h-56 overflow-hidden relative bg-neutral-900 flex items-center justify-center group-hover:shadow-2xl transition-all duration-500">
                                                            {/* Blurred Background Continuation */}
                                                            <div className="absolute inset-0 scale-125 blur-xl opacity-40">
                                                                <img
                                                                    src={service.image_url}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            {/* Actual Full Image */}
                                                            <img
                                                                src={service.image_url}
                                                                alt={service.name}
                                                                className="relative z-10 max-w-full max-h-full object-contain transition-all duration-700 p-2 group-hover:scale-[1.03]"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-20"></div>

                                                            {/* Selection Checkmark Overlay */}
                                                            <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 flex items-center justify-center ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                                                                <div className={`
                                                                    w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transform transition-transform duration-300
                                                                    ${isSelected ? 'scale-100' : 'scale-50'}
                                                                    ${isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black border-2 border-black'}
                                                                `}>
                                                                    <Check className="w-6 h-6" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="p-5 flex flex-col flex-1">
                                                        <div className="flex justify-between items-start gap-2 mb-2">
                                                            <h3 className={`text-lg md:text-xl font-bold leading-tight ${isSelected ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-white'}`}>
                                                                {service.name}
                                                            </h3>
                                                            {service.category && (
                                                                <span className="text-[10px] font-mono uppercase bg-black/30 text-neutral-400 px-2 py-0.5 rounded border border-white/5">
                                                                    {service.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-neutral-400 text-xs leading-relaxed mb-4 flex-1 line-clamp-2">
                                                            {service.description || "Atendimento especializado com produtos premium."}
                                                        </p>
                                                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                                            <div className={`text-xl font-mono font-bold ${isBeauty ? 'text-white' : 'text-white'}`}>
                                                                {formatCurrency(service.price, currencyRegion)}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-mono bg-black/20 px-2 py-1 rounded">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {service.duration_minutes} MIN
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {step === 'datetime' && (
                                <div className="space-y-8 animate-in slide-in-from-right duration-500">
                                    <div className="flex items-center gap-4 mb-2">
                                        <button onClick={() => setStep('services')} className="p-2 bg-neutral-800 rounded-lg text-white hover:bg-neutral-700 transition-colors">
                                            ←
                                        </button>
                                        <h2 className="text-2xl font-heading text-white uppercase tracking-tight">Agendamento</h2>
                                    </div>

                                    {/* Profissional */}
                                    {business?.enable_professional_selection !== false && professionals.length > 0 && (
                                        <section>
                                            <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-4">Selecione quem irá te atender:</h3>
                                            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                                <button
                                                    onClick={() => setSelectedProfessional('any')}
                                                    className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${selectedProfessional === 'any' ? `border-${accentColor} bg-${accentColor}/10` : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}`}
                                                >
                                                    <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                                                        <Users className="w-6 h-6 text-neutral-500" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white uppercase">Qualquer um</span>
                                                </button>
                                                {professionals.map(pro => (
                                                    <button
                                                        key={pro.id}
                                                        onClick={() => setSelectedProfessional(pro.id)}
                                                        className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${selectedProfessional === pro.id ? `border-${accentColor} bg-${accentColor}/10` : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}`}
                                                    >
                                                        <div className="w-14 h-14 rounded-full overflow-hidden border border-neutral-700 shadow-lg">
                                                            {pro.photo_url ? (
                                                                <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white font-bold">{pro.name.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-white uppercase truncate max-w-[80px]">{pro.name.split(' ')[0]}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className={`${cardClass} p-4`}>
                                            <CalendarPicker selectedDate={selectedDate} onDateSelect={setSelectedDate} isBeauty={isBeauty} />
                                        </div>
                                        {selectedDate ? (
                                            <div className="animate-in fade-in duration-500">
                                                <TimeGrid selectedTime={selectedTime} onTimeSelect={setSelectedTime} availableSlots={availableSlots} isBeauty={isBeauty} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center bg-neutral-900/30 rounded-2xl border-2 border-dashed border-neutral-800 text-neutral-600 italic text-sm p-12 text-center">
                                                Selecione uma data para ver os horários disponíveis.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {step === 'contact' && (
                                <div className="space-y-8 animate-in slide-in-from-right duration-500">
                                    <div className="flex items-center gap-4 mb-2">
                                        <button onClick={() => setStep('datetime')} className="p-2 bg-neutral-800 rounded-lg text-white hover:bg-neutral-700 transition-colors">
                                            ←
                                        </button>
                                        <h2 className="text-2xl font-heading text-white uppercase tracking-tight">Confirmar</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                                        <div className="md:col-span-3">
                                            <ClientAuthModal
                                                businessId={businessId!}
                                                onSuccess={() => { }}
                                                accentColor={accentColor}
                                            />

                                            {client && (
                                                <div className={`mt-8 ${cardClass} p-6 border-l-4 border-green-500`}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                                            <Check className="w-5 h-5 text-green-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold">Identificado como {client.name}</p>
                                                            <p className="text-neutral-500 text-xs">{client.phone}</p>
                                                        </div>
                                                    </div>
                                                    <label className="flex items-start gap-3 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={acceptedPolicy}
                                                            onChange={e => setAcceptedPolicy(e.target.checked)}
                                                            className={`mt-1 h-5 w-5 rounded border-neutral-700 bg-black text-${accentColor} focus:ring-0`}
                                                        />
                                                        <span className="text-xs text-neutral-400 leading-relaxed group-hover:text-neutral-300">
                                                            Declaro estar ciente da política de agendamento e cancelamento do estabelecimento.
                                                        </span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        <div className="md:col-span-2 space-y-6">
                                            <div className={`${cardClass} p-6 bg-black shadow-inner`}>
                                                <h4 className="text-white font-bold uppercase text-xs tracking-widest mb-4 opacity-50 font-mono">Resumo do Pedido</h4>
                                                <div className="space-y-3 mb-6">
                                                    {services.filter(s => selectedServices.includes(s.id)).map(s => (
                                                        <div key={s.id} className="flex justify-between items-center text-sm">
                                                            <span className="text-neutral-400">{s.name}</span>
                                                            <span className="text-white font-mono">{formatCurrency(s.price, currencyRegion)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="border-t border-neutral-800 pt-4 space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-neutral-500">Data</span>
                                                        <span className="text-white font-bold">{selectedDate?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} • {selectedTime}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-neutral-500">Duração</span>
                                                        <span className="text-white font-bold">{calculateDuration()} min</span>
                                                    </div>
                                                    <div className="flex justify-between pt-4">
                                                        <span className="text-white font-bold">Total</span>
                                                        <span className={`text-2xl font-bold text-${accentColor}`}>
                                                            {formatCurrency(calculateTotal(), currencyRegion)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <BrutalButton
                                                onClick={handleSubmit}
                                                disabled={!client || !acceptedPolicy}
                                                variant="primary"
                                                size="lg"
                                                fullWidth
                                                icon={<Sparkles className={isBeauty ? 'animate-pulse-neon' : ''} />}
                                                className="mt-6"
                                            >
                                                Confirmar Agendamento
                                            </BrutalButton>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Info */}
                    <div className="space-y-6">
                        <div className={`${cardClass} p-6`}>
                            <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-4">Informações</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Phone className={`w-4 h-4 text-${accentColor} mt-1`} />
                                    <div>
                                        <p className="text-white text-sm font-bold">{business.phone || 'N/A'}</p>
                                        <p className="text-neutral-500 text-[10px] uppercase">Contato WhatsApp</p>
                                    </div>
                                </div>
                                {business.address_street && (
                                    <div className="flex items-start gap-3">
                                        <Calendar className={`w-4 h-4 text-${accentColor} mt-1`} />
                                        <div>
                                            <p className="text-white text-sm font-bold truncate max-w-[180px]">{business.address_street || 'Confirme o local'}</p>
                                            <p className="text-neutral-500 text-[10px] uppercase">Localização</p>
                                        </div>
                                    </div>
                                )}
                                {business.instagram_handle && (
                                    <a
                                        href={`https://instagram.com/${business.instagram_handle.replace('@', '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-start gap-3 group"
                                    >
                                        <div className={`p-1 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors`}>
                                            <Scissors className={`w-4 h-4 text-${accentColor}`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold group-hover:text-${accentColor} transition-colors text-white`}>@{business.instagram_handle.replace('@', '')}</p>
                                            <p className="text-neutral-500 text-[10px] uppercase">Portfólio Instagram</p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Professional Preview (Small) */}
                        <div className={`${cardClass} p-6 bg-gradient-to-br from-neutral-900 to-black`}>
                            <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-4">Profissionais</h3>
                            <div className="flex -space-x-3 overflow-hidden">
                                {professionals.slice(0, 5).map(pro => (
                                    <img
                                        key={pro.id}
                                        className="inline-block h-10 w-10 md:h-12 md:w-12 rounded-full ring-2 ring-black"
                                        src={pro.photo_url || `https://ui-avatars.com/api/?name=${pro.name}&background=111&color=fff`}
                                        alt={pro.name}
                                    />
                                ))}
                                {professionals.length > 5 && (
                                    <div className="inline-flex h-10 w-10 md:h-12 md:w-12 rounded-full ring-2 ring-black bg-neutral-800 items-center justify-center text-[10px] font-bold text-neutral-400">
                                        +{professionals.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STICKY BOTTOM SUMMARY */}
            {selectedServices.length > 0 && step === 'services' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className={`
                                        max-w-6xl mx-auto
                                        ${isBeauty ? 'bg-beauty-card/90 border border-beauty-neon/20' : 'bg-neutral-900 border-4 border-brutal-border'} 
                                        backdrop-blur-xl p-4 md:p-6 rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex items-center justify-between
                                    `}>
                        <div>
                            <p className="text-neutral-500 text-[10px] md:text-xs uppercase font-mono tracking-widest">{selectedServices.length} {selectedServices.length === 1 ? 'Serviço' : 'Serviços'}</p>
                            <p className={`text-2xl md:text-4xl font-bold text-${accentColor}`}>{formatCurrency(calculateTotal(), currencyRegion)}</p>
                        </div>
                        <BrutalButton
                            onClick={() => {
                                setStep('datetime');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            variant="primary"
                            size="lg"
                            className="px-8 md:px-12"
                        >
                            Próximo Passo
                        </BrutalButton>
                    </div>
                </div>
            )}
        </div>
    );
};
