import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Clock, Check, Sparkles, Scissors, Calendar, Phone, Users } from 'lucide-react';
import { CalendarPicker } from '../components/CalendarPicker';
import { TimeGrid } from '../components/TimeGrid';
import { UpsellSection } from '../components/UpsellSection';
import { ProfessionalSelector } from '../components/ProfessionalSelector';

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
    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessSettings, setBusinessSettings] = useState<any>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'services' | 'datetime' | 'contact'>('services');

    // Contact form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [acceptedPolicy, setAcceptedPolicy] = useState(false);

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
                // Fetch business profile by slug
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, business_name, user_type, google_rating, total_reviews, phone, enable_upsells, enable_professional_selection')
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

                    // Fetch professionals if feature is enabled (or check settings later)
                    const { data: professionalsData, error: professionalsError } = await supabase
                        .from('team_members')
                        .select('*')
                        .eq('user_id', profileData.id)
                        .eq('active', true)
                        .order('display_order');

                    if (professionalsError) throw professionalsError;
                    // Map to ensure name property exists if needed
                    const mappedPros = (professionalsData || []).map((p: any) => ({
                        ...p,
                        name: p.full_name || p.name // Ensure name exists
                    }));
                    setProfessionals(mappedPros);
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
        ? 'bg-beauty-card/80 backdrop-blur-xl border border-white/10 rounded-2xl'
        : 'bg-brutal-card border-4 border-neutral-800';

    return (
        <div className={`h-screen overflow-y-auto ${bgClass} py-8 px-4`}>
            <div className="max-w-4xl mx-auto">

                {/* STEP 1: HERO BRANDING */}
                <div className={`${cardClass} p-8 mb-8`}>
                    <div className="text-center mb-6">
                        {isBeauty ? (
                            <Sparkles className="w-16 h-16 text-beauty-neon mx-auto mb-4" />
                        ) : (
                            <Scissors className="w-16 h-16 text-accent-gold mx-auto mb-4" />
                        )}
                        <h1 className="text-4xl md:text-5xl font-heading text-white uppercase mb-2">
                            {business.business_name}
                        </h1>

                        {/* Social Proof */}
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                                <Star className={`w-5 h-5 text-${accentColor} fill-current`} />
                                <span className="text-white font-bold">{business.google_rating}</span>
                            </div>
                            <span className="text-neutral-400">({business.total_reviews} avaliações)</span>
                        </div>
                        <p className="text-neutral-400 text-sm mt-2 italic">
                            "O melhor atendimento da região! Sempre saio satisfeito." - Cliente Verificado
                        </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <div className={`flex items-center gap-2 ${step === 'services' ? `text-${accentColor}` : 'text-neutral-500'}`}>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step === 'services' ? `border-${accentColor}` : 'border-neutral-500'}`}>
                                1
                            </div>
                            <span className="text-sm font-mono hidden md:block">Serviços</span>
                        </div>
                        <div className="w-12 h-0.5 bg-neutral-700"></div>
                        <div className={`flex items-center gap-2 ${step === 'datetime' ? `text-${accentColor}` : 'text-neutral-500'}`}>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step === 'datetime' ? `border-${accentColor}` : 'border-neutral-500'}`}>
                                2
                            </div>
                            <span className="text-sm font-mono hidden md:block">Data/Hora</span>
                        </div>
                        <div className="w-12 h-0.5 bg-neutral-700"></div>
                        <div className={`flex items-center gap-2 ${step === 'contact' ? `text-${accentColor}` : 'text-neutral-500'}`}>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step === 'contact' ? `border-${accentColor}` : 'border-neutral-500'}`}>
                                3
                            </div>
                            <span className="text-sm font-mono hidden md:block">Confirmar</span>
                        </div>
                    </div>
                </div>

                {/* STEP 2: VISUAL SERVICE MENU */}
                {step === 'services' && (
                    <div>
                        <h2 className="text-2xl font-heading text-white uppercase mb-6 text-center">
                            Escolha seus Serviços
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {services.map(service => {
                                const isSelected = selectedServices.includes(service.id);

                                return (
                                    <button
                                        key={service.id}
                                        onClick={() => toggleService(service.id)}
                                        className={`
                                            ${cardClass} overflow-hidden text-left transition-all
                                            ${isSelected
                                                ? `ring-4 ring-${accentColor} scale-[1.02] shadow-2xl`
                                                : 'hover:scale-[1.01] hover:shadow-xl'
                                            }
                                            relative group
                                        `}
                                    >
                                        {/* Service Image with Overlay */}
                                        {service.image_url && (
                                            <div className="relative w-full h-48 overflow-hidden">
                                                <img
                                                    src={service.image_url}
                                                    alt={service.name}
                                                    className={`w-full h-full object-cover transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
                                                />
                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                                                {/* Category Badge */}
                                                {service.category && (
                                                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isBeauty ? 'bg-beauty-neon/90 text-black' : 'bg-accent-gold/90 text-black'}`}>
                                                        {service.category}
                                                    </div>
                                                )}

                                                {/* Selected Checkmark */}
                                                {isSelected && (
                                                    <div className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-${accentColor} flex items-center justify-center animate-bounce`}>
                                                        <Check className="w-5 h-5 text-black font-bold" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="p-6">
                                            {/* Title */}
                                            <h3 className="text-2xl font-heading text-white mb-2 leading-tight">
                                                {service.name}
                                            </h3>

                                            {/* Description */}
                                            {service.description && (
                                                <p className="text-sm text-neutral-400 mb-4 leading-relaxed line-clamp-2">
                                                    {service.description}
                                                </p>
                                            )}

                                            {/* Price & Duration - Prominent */}
                                            <div className="flex items-end justify-between mt-4 pt-4 border-t border-neutral-700">
                                                <div>
                                                    <div className="text-neutral-400 text-xs uppercase tracking-wider mb-1">
                                                        Preço
                                                    </div>
                                                    <div className={`text-4xl font-bold text-${accentColor} leading-none`}>
                                                        R$ {service.price.toFixed(0)}
                                                        <span className="text-lg">,{(service.price % 1).toFixed(2).substring(2)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 text-neutral-400">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="text-sm font-mono">{service.duration_minutes} min</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedServices.length > 0 && (
                            <div className={`${cardClass} p-6`}>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-white font-mono">Total:</span>
                                    <span className={`text-3xl font-bold text-${accentColor}`}>
                                        R$ {calculateTotal().toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-neutral-400 text-sm">Duração estimada:</span>
                                    <span className="text-white">{calculateDuration()} minutos</span>
                                </div>
                                <button
                                    onClick={() => setStep('datetime')}
                                    className={`w-full py-4 ${isBeauty ? 'bg-beauty-neon hover:bg-beauty-neonHover rounded-xl' : 'bg-accent-gold hover:bg-accent-goldHover'} text-white font-heading text-lg uppercase tracking-wider transition-all`}
                                >
                                    Continuar para Data/Hora
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: DATE/TIME SELECTION */}
                {step === 'datetime' && (
                    <div>
                        <button
                            onClick={() => setStep('services')}
                            className="text-neutral-400 hover:text-white mb-6 flex items-center gap-2"
                        >
                            ← Voltar aos Serviços
                        </button>

                        <h2 className="text-2xl font-heading text-white uppercase mb-6 text-center">
                            Escolha Data e Horário
                        </h2>

                        {/* Professional Selection (Conditional) */}
                        {businessSettings?.enable_professional_selection !== false && (
                            <div className="mb-8">
                                <h3 className={`text-lg font-heading uppercase mb-4 ${isBeauty ? 'text-neutral-600' : 'text-white'}`}>
                                    2. Escolha o Profissional
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <button
                                        onClick={() => setSelectedProfessional('any')}
                                        className={`
                                            p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3
                                            ${selectedProfessional === 'any'
                                                ? `border-${accentColor} bg-${accentColor}/10`
                                                : isBeauty ? 'border-neutral-200 hover:border-neutral-300' : 'border-neutral-800 hover:border-neutral-700'
                                            }
                                        `}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isBeauty ? 'bg-neutral-100' : 'bg-neutral-800'}`}>
                                            <Users className="w-6 h-6 text-neutral-500" />
                                        </div>
                                        <span className={`font-bold text-sm ${isBeauty ? 'text-neutral-800' : 'text-white'}`}>Qualquer um</span>
                                    </button>

                                    {professionals.map(pro => (
                                        <button
                                            key={pro.id}
                                            onClick={() => setSelectedProfessional(pro.id)}
                                            className={`
                                                p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3
                                                ${selectedProfessional === pro.id
                                                    ? `border-${accentColor} bg-${accentColor}/10`
                                                    : isBeauty ? 'border-neutral-200 hover:border-neutral-300' : 'border-neutral-800 hover:border-neutral-700'
                                                }
                                            `}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden">
                                                {pro.photo_url ? (
                                                    <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-neutral-700 text-white font-bold">
                                                        {pro.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`font-bold text-sm ${isBeauty ? 'text-neutral-800' : 'text-white'}`}>{pro.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Visual Calendar */}
                        <div className="mb-6">
                            <CalendarPicker
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                                isBeauty={isBeauty}
                            />
                        </div>

                        {/* Time Grid (only show after date selected) */}
                        {selectedDate && (
                            <div className="mb-6">
                                <TimeGrid
                                    selectedTime={selectedTime}
                                    onTimeSelect={setSelectedTime}
                                    availableSlots={availableSlots}
                                    isBeauty={isBeauty}
                                />
                            </div>
                        )}

                        <button
                            onClick={() => setStep('contact')}
                            disabled={!selectedDate || !selectedTime}
                            className={`w-full py-4 mt-6 ${isBeauty ? 'bg-beauty-neon hover:bg-beauty-neonHover rounded-xl' : 'bg-accent-gold hover:bg-accent-goldHover'} text-white font-heading text-lg uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            Continuar para Confirmação
                        </button>
                    </div>
                )}

                {/* STEP 4: CONTACT & CHECKOUT */}
                {step === 'contact' && (
                    <div>
                        <button
                            onClick={() => setStep('datetime')}
                            className="text-neutral-400 hover:text-white mb-6 flex items-center gap-2"
                        >
                            ← Voltar para Data/Hora
                        </button>

                        <h2 className="text-2xl font-heading text-white uppercase mb-6 text-center">
                            Confirme seu Agendamento
                        </h2>

                        {/* Summary */}
                        <div className={`${cardClass} p-6 mb-6`}>
                            <h3 className="text-white font-heading uppercase mb-4">Resumo do Agendamento</h3>

                            {services.filter(s => selectedServices.includes(s.id)).map(service => (
                                <div key={service.id} className="flex justify-between items-center py-2 border-b border-neutral-700">
                                    <span className="text-neutral-300">{service.name}</span>
                                    <span className="text-white">R$ {service.price.toFixed(2)}</span>
                                </div>
                            ))}

                            <div className="flex justify-between items-center py-4 mt-4 border-t-2 border-neutral-600">
                                <div>
                                    <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{selectedDate?.toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                        <Clock className="w-4 h-4" />
                                        <span>{selectedTime} ({calculateDuration()} min)</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-neutral-400 text-sm">TOTAL</div>
                                    <div className={`text-3xl font-bold text-${accentColor}`}>
                                        R$ {calculateTotal().toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className={`${cardClass} p-6 mb-6`}>
                            <h3 className="text-white font-heading uppercase mb-4">Seus Dados</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-white font-mono text-sm mb-2 block">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="João Silva"
                                        className={`w-full p-4 ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl' : 'bg-black/40 border-2 border-neutral-800'} text-white focus:outline-none`}
                                    />
                                </div>

                                <div>
                                    <label className="text-white font-mono text-sm mb-2 block">WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="(11) 98765-4321"
                                        className={`w-full p-4 ${isBeauty ? 'bg-white/5 border border-white/10 rounded-xl' : 'bg-black/40 border-2 border-neutral-800'} text-white focus:outline-none`}
                                    />
                                </div>

                                <div className="flex items-start gap-3 mt-6">
                                    <input
                                        type="checkbox"
                                        id="policy"
                                        checked={acceptedPolicy}
                                        onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                        className="mt-1"
                                    />
                                    <label htmlFor="policy" className="text-sm text-neutral-400">
                                        Li e aceito a política de cancelamento. Cancelamentos devem ser feitos com até 24h de antecedência.
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!customerName || !customerPhone || !acceptedPolicy}
                                className={`w-full py-4 mt-6 ${isBeauty ? 'bg-beauty-neon hover:bg-beauty-neonHover rounded-xl shadow-soft' : 'bg-accent-gold hover:bg-accent-goldHover shadow-heavy'} text-white font-heading text-lg uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
                            >
                                {isBeauty ? <Sparkles className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                Reservar Minha Experiência
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
