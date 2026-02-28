
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Calendar, Clock, MapPin, Instagram, Scissors, Sparkles, User, ArrowRight, Check, ChevronLeft, ChevronRight, Phone, Users, ImageIcon, Upload, Loader2, X, AlertTriangle, Send, MessageSquare } from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';
import { CalendarPicker } from '../components/CalendarPicker';
import { TimeGrid } from '../components/TimeGrid';
import { UpsellSection } from '../components/UpsellSection';
import { ProfessionalSelector } from '../components/ProfessionalSelector';
import { ClientAuthModal } from '../components/ClientAuthModal';
import { usePublicClient } from '../contexts/PublicClientContext';
import { BrutalButton } from '../components/BrutalButton';
import { PublicBusinessHeader } from '../components/PublicBusinessHeader';
import { ChatBubble } from '../components/ChatBubble';
import { GoogleReviewPrompt } from '../components/GoogleReviewPrompt';
import { formatCurrency, formatDuration, Region } from '../utils/formatters';
import { logger } from '../utils/Logger';

interface Message {
    id: string;
    text: string | React.ReactNode;
    isAssistant: boolean;
    type?: 'text' | 'services' | 'professionals' | 'datetime' | 'contact' | 'success';
}

interface Service {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    description: string | null;
    duration_minutes: number;
    category?: string; // Legacy
    category_id?: string; // New FK
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

interface Category {
    id: string;
    name: string;
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
    region?: string;
    cover_photo_url?: string | null;
    logo_url?: string | null;
    address_street?: string | null;
    instagram_handle?: string | null;
}

export const PublicBooking: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const proIdParam = searchParams.get('pro');

    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessSettings, setBusinessSettings] = useState<any>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeProfessionalCategory, setActiveProfessionalCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [gallery, setGallery] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'services' | 'datetime' | 'contact' | 'success'>('services');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerPhoto, setCustomerPhoto] = useState<File | null>(null);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<string | null>(proIdParam || null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [fullDates, setFullDates] = useState<string[]>([]);
    const [acceptedPolicy, setAcceptedPolicy] = useState(false);
    const [isDataReady, setIsDataReady] = useState(false);
    const [activeBooking, setActiveBooking] = useState<any>(null);
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
    const galleryRef = React.useRef<HTMLDivElement>(null);

    const { client, register } = usePublicClient();

    useEffect(() => {
        if (client) {
            setCustomerName(client.name);
            setCustomerPhone(client.phone);
        }
    }, [client]);

    useEffect(() => {
        const fetchExistingClient = async () => {
            if (customerPhone.length >= 12 && businessId) {
                try {
                    const { data: publicClient } = await supabase
                        .from('public_clients')
                        .select('name, photo_url')
                        .eq('phone', customerPhone)
                        .eq('business_id', businessId)
                        .maybeSingle();

                    if (publicClient) {
                        if (publicClient.name && !customerName) setCustomerName(publicClient.name);
                        if (publicClient.photo_url) setExistingPhotoUrl(publicClient.photo_url);
                        return;
                    }

                    const { data: mainClient } = await supabase
                        .from('clients')
                        .select('name, photo_url')
                        .eq('phone', customerPhone)
                        .eq('user_id', businessId)
                        .maybeSingle();

                    if (mainClient) {
                        if (mainClient.name && !customerName) setCustomerName(mainClient.name);
                        if (mainClient.photo_url) setExistingPhotoUrl(mainClient.photo_url);
                    }

                    const { data: booking } = await supabase.rpc('get_active_booking_by_phone', {
                        p_phone: customerPhone,
                        p_business_id: businessId
                    });

                    if (booking && booking[0]) {
                        if (booking[0].status === 'pending') {
                            setActiveBooking(booking[0]);
                            setStep('success');
                        }
                    }
                } catch (error) {
                    logger.error('Error fetching existing client', error);
                }
            } else if (customerPhone.length < 9) {
                setExistingPhotoUrl(null);
            }
        };
        fetchExistingClient();
    }, [customerPhone, businessId]);

    const fetchFreshActiveBooking = async (phone: string, bId: string) => {
        try {
            const { data: booking } = await supabase.rpc('get_active_booking_by_phone', {
                p_phone: phone,
                p_business_id: bId
            });
            if (booking && booking[0]) {
                setActiveBooking(booking[0]);
            } else {
                setActiveBooking(null);
            }
        } catch (error) {
            logger.error('Error fetching fresh active booking', error);
        }
    };

    useEffect(() => {
        if (!activeBooking?.id) return;
        const channel = supabase
            .channel(`booking_status_${activeBooking.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'public_bookings',
                    filter: `id=eq.${activeBooking.id}`
                },
                (payload) => {
                    logger.info('Booking update received', { payload });
                    fetchFreshActiveBooking(activeBooking.customer_phone, activeBooking.business_id);
                }
            )
            .subscribe();

        const interval = setInterval(() => {
            if (activeBooking.status === 'pending') {
                fetchFreshActiveBooking(activeBooking.customer_phone, activeBooking.business_id);
            }
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [activeBooking?.id, activeBooking?.status]);

    const isBeauty = business?.user_type === 'beauty';

    useEffect(() => {
        const fetchSlots = async () => {
            if (selectedDate && businessId) {
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const day = String(selectedDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                const duration = calculateDuration();

                const { data, error } = await supabase.rpc('get_available_slots', {
                    p_business_id: businessId,
                    p_date: dateStr,
                    p_professional_id: selectedProfessional === 'any' ? null : selectedProfessional,
                    p_duration_min: duration
                });

                if (!error) {
                    setAvailableSlots(data.slots || []);
                }
            }
        };
        fetchSlots();
    }, [selectedDate, businessId, selectedProfessional]);

    useEffect(() => {
        const fetchFullDates = async () => {
            if (businessId) {
                const now = new Date();
                const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const end = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

                const { data, error } = await supabase.rpc('get_full_dates', {
                    p_business_id: businessId,
                    p_start_date: startDate,
                    p_end_date: endDate,
                    p_professional_id: selectedProfessional === 'any' ? null : selectedProfessional,
                    p_duration_min: calculateDuration()
                });

                if (!error && data) {
                    setFullDates(data);
                }
            }
        };
        fetchFullDates();
    }, [businessId, selectedProfessional]);

    useEffect(() => {
        const fetchBusinessData = async () => {
            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, business_name, user_type, google_rating, total_reviews, phone, enable_upsells, enable_professional_selection, logo_url, cover_photo_url, address_street, instagram_handle, region, business_slug')
                    .eq('business_slug', slug)
                    .single();

                if (profileError) throw profileError;

                if (profileData) {
                    setBusiness(profileData);
                    setBusinessId(profileData.id);

                    // Fetch settings, services, categories in parallel or with individual error handling
                    try {
                        const { data: settings, error: sErr } = await supabase
                            .from('business_settings')
                            .select('*')
                            .eq('user_id', profileData.id)
                            .maybeSingle();
                        if (sErr) console.warn('PublicBooking: Error loading settings:', sErr);
                        if (settings) setBusinessSettings(settings);
                    } catch (e) { console.error('Settings fetch failed', e); }

                    try {
                        const { data: servicesData, error: svErr } = await supabase
                            .from('services')
                            .select('*')
                            .eq('user_id', profileData.id)
                            .eq('active', true)
                            .order('price', { ascending: true });
                        if (svErr) logger.error('PublicBooking: Error loading services:', svErr);
                        logger.info('PublicBooking: Services loaded:', servicesData?.length || 0);
                        setServices(servicesData || []);

                        const { data: categoriesData, error: catErr } = await supabase
                            .from('service_categories')
                            .select('id, name')
                            .eq('user_id', profileData.id)
                            .order('display_order');
                        if (catErr) logger.error('PublicBooking: Error loading categories:', catErr);
                        logger.info('PublicBooking: Categories loaded:', categoriesData?.length || 0);

                        // Add virtual "Outros" category if there are services without category
                        let finalCategories = categoriesData || [];
                        if ((servicesData || []).some(s => !s.category_id)) {
                            finalCategories = [...finalCategories, { id: 'no-category', name: 'Outros' }];
                        }
                        setCategories(finalCategories);
                    } catch (e) { console.error('Services/Categories fetch failed', e); }

                    try {
                        const { data: professionalsData, error: pErr } = await supabase
                            .from('team_members')
                            .select('*')
                            .eq('user_id', profileData.id)
                            .eq('active', true)
                            .order('display_order');
                        if (pErr) console.warn('PublicBooking: Error loading professionals:', pErr);

                        const mappedPros = (professionalsData || []).map((p: any) => ({
                            ...p,
                            name: p.full_name || p.name,
                            specialties: Array.isArray(p.specialties)
                                ? p.specialties
                                : (p.specialties ? [p.specialties] : [])
                        }));
                        setProfessionals(mappedPros);
                    } catch (e) { console.error('Professionals fetch failed', e); }

                    try {
                        const { data: galleryData } = await supabase
                            .from('business_galleries')
                            .select('*')
                            .eq('user_id', profileData.id)
                            .eq('is_active', true)
                            .order('display_order');
                        setGallery(galleryData || []);
                    } catch (e) { console.error('Gallery fetch failed', e); }

                    // Signal that we are ready to show the chat even if some data failed
                    setIsDataReady(true);
                }
            } catch (error) {
                console.error('PublicBooking: Critical error in fetchBusinessData:', error);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchBusinessData();
        }
    }, [slug]);

    useEffect(() => {
        if (business) {
            const originalBg = document.body.style.backgroundColor;
            const originalColor = document.body.style.color;

            // Override body styles for public booking
            const targetBg = isBeauty ? '#E2E1DA' : '#050505';
            const targetColor = isBeauty ? '#1D1D1F' : '#EAEAEA';

            document.body.style.backgroundColor = targetBg;
            document.body.style.color = targetColor;

            // Force documentElement background to avoid white flashes
            document.documentElement.style.backgroundColor = targetBg;

            // Atualiza o atributo de tema no <html> para o CSS pre-carregado do index.html atuar
            document.documentElement.setAttribute('data-public-theme', isBeauty ? 'silk' : 'obsidian');

            // Add a class for specific overrides
            document.body.classList.add('public-booking-root');
            if (isBeauty) document.body.classList.add('beauty-theme');
            else document.body.classList.remove('beauty-theme');

            return () => {
                document.body.style.backgroundColor = originalBg;
                document.body.style.color = originalColor;
                document.documentElement.style.backgroundColor = '';
                document.documentElement.removeAttribute('data-public-theme');
                document.body.classList.remove('public-booking-root');
                document.body.classList.remove('beauty-theme');
            };
        }
    }, [business, isBeauty]);

    useEffect(() => {
        if (isDataReady && business && messages.length === 0) {
            const addWelcome = async () => {
                setIsTyping(true);
                setTimeout(() => {
                    setMessages([
                        {
                            id: 'welcome',
                            text: `Olá! Seja bem-vindo à ${business.business_name}. Eu sou seu assistente virtual de agendamento.`,
                            isAssistant: true
                        },
                        {
                            id: 'services-ask',
                            text: "Qual serviço você gostaria de realizar hoje?",
                            isAssistant: true,
                            type: 'services'
                        }
                    ]);
                    setIsTyping(false);
                }, 1000);
            };
            addWelcome();
        }
    }, [business, isDataReady]);

    const chatEndRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

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

    // Narrative Auto-Scroll (Pro-Max UX)
    useEffect(() => {
        if (messages.length > 0) {
            const timer = setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [messages, step, isTyping]);

    const toggleService = (serviceId: string) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const calculateTotal = () => services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0);
    const calculateDuration = () => services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.duration_minutes, 0);

    const professionalCategories = Array.from(new Set((professionals || []).flatMap((p: any) => p.specialties || []))).filter(Boolean);
    const filteredProfessionals = activeProfessionalCategory === 'all'
        ? professionals
        : professionals.filter((p: any) => (p.specialties || []).includes(activeProfessionalCategory));

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCancelBooking = async (bookingId: string) => {
        if (!confirm('Tem certeza que deseja cancelar sua solicitação de agendamento?')) return;
        try {
            const { error } = await supabase.from('public_bookings').delete().eq('id', bookingId);
            if (error) throw error;
            setActiveBooking(null);
            setStep('services');
            alert('Agendamento cancelado com sucesso.');
        } catch (error) {
            logger.error('Error cancelling booking', error);
            alert('Erro ao cancelar agendamento.');
        }
    };

    const handleEditBooking = (booking: any) => {
        setEditingBookingId(booking.id);
        if (booking.service_ids) setSelectedServices(booking.service_ids);
        setSelectedProfessional(booking.professional_id || 'any');
        const bDate = new Date(booking.appointment_time);
        if (!isNaN(bDate.getTime())) {
            setSelectedDate(bDate);
            setSelectedTime(bDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
        setCustomerName(booking.customer_name);
        setStep('services');
    };

    const handleSubmit = async () => {
        if (!businessId || !customerName || !customerPhone || !selectedDate || !selectedTime || !acceptedPolicy) {
            alert('Por favor, preencha todos os campos e aceite a política de cancelamento.');
            return;
        }
        setIsSubmitting(true);
        try {
            let photoUrl = client?.photo_url || null;
            if (customerPhoto) {
                const fileExt = customerPhoto.name.split('.').pop();
                const fileName = `public_${businessId}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('client_photos').upload(fileName, customerPhoto);
                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('client_photos').getPublicUrl(fileName);
                    photoUrl = publicUrl;
                }
            }
            await register({ name: customerName, phone: customerPhone, photo_url: photoUrl, business_id: businessId });
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const totalPrice = calculateTotal();
            const duration = calculateDuration();
            const offset = business?.region === 'PT' ? '+00:00' : '-03:00';
            const appointmentTimeISO = `${dateStr}T${selectedTime}:00${offset}`;

            const { data: existingBooking } = await supabase.rpc('get_active_booking_by_phone', { p_phone: customerPhone, p_business_id: businessId });
            if (existingBooking && existingBooking[0]) {
                setActiveBooking(existingBooking[0]);
                setStep('success');
                setIsSubmitting(false);
                return;
            }

            let finalProfessionalId = selectedProfessional === 'any' ? null : selectedProfessional;
            if (selectedProfessional === 'any') {
                const { data: autoProId } = await supabase.rpc('get_first_available_professional', { p_business_id: businessId, p_appointment_time: appointmentTimeISO, p_duration_min: duration });
                if (autoProId) finalProfessionalId = autoProId;
            }

            if (editingBookingId) {
                await supabase.from('public_bookings').update({ customer_name: customerName, service_ids: selectedServices, professional_id: finalProfessionalId, appointment_time: appointmentTimeISO, total_price: totalPrice, status: 'pending', duration_minutes: duration }).eq('id', editingBookingId);
            } else {
                await supabase.from('public_bookings').insert({ business_id: businessId, customer_name: customerName, customer_phone: customerPhone, service_ids: selectedServices, professional_id: finalProfessionalId, appointment_time: appointmentTimeISO, total_price: totalPrice, status: 'pending', duration_minutes: duration });
            }

            const { data: refreshedBooking } = await supabase.rpc('get_active_booking_by_phone', { p_phone: customerPhone, p_business_id: businessId });
            if (refreshedBooking && refreshedBooking[0]) setActiveBooking(refreshedBooking[0]);
            setStep('success');
        } catch (error: any) {
            logger.error('Error creating booking', error);
            alert(`Erro ao criar agendamento: ${error.message || error}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const accentColor = isBeauty ? 'silk-accent' : 'obsidian-accent';
    const bgClass = isBeauty ? 'bg-[#E2E1DA]' : 'bg-obsidian-bg';
    const cardClass = isBeauty ? 'bg-white shadow-silk-shadow border border-[#CAC9BF] rounded-lg' : 'bg-obsidian-surface border border-white/5 shadow-heavy rounded-none';
    const currencyRegion = (business?.region as Region) || (businessSettings?.currency_symbol === '€' ? 'PT' : 'BR');

    // Link do WhatsApp do estabelecimento (usado no empty state e na tela de sucesso)
    const whatsappLink = business?.phone
        ? `https://wa.me/${business.phone.replace(/\D/g, '')}`
        : null;

    // Barra de progresso: mapeia steps para números
    const stepIndex = { services: 0, datetime: 1, contact: 2, success: 3 };
    const currentStepNum = stepIndex[step];
    const stepLabels = ['Serviços', 'Agenda', 'Dados', 'Confirmado'];

    if (loading) {
        return (
            <div className={`h-screen flex items-center justify-center ${isBeauty ? 'bg-[#E2E1DA]' : 'bg-[#050505]'}`}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className={`w-10 h-10 ${isBeauty ? 'text-stone-500' : 'text-accent-gold'} animate-spin`} />
                    <p className={`${isBeauty ? 'text-stone-400' : 'text-white/30'} font-black text-[10px] uppercase tracking-[0.2em]`}>
                        Carregando Experiência...
                    </p>
                </div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className={`h-screen flex items-center justify-center bg-[#050505]`}>
                <div className="flex flex-col items-center gap-6 text-center px-8">
                    <div className="w-20 h-20 rounded-none bg-neutral-900 border-2 border-white/10 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-white/10" />
                    </div>
                    <div>
                        <p className="text-white font-black text-xl uppercase tracking-widest mb-2" style={{ fontFamily: 'Chivo,sans-serif' }}>Não encontrado</p>
                        <p className="text-white/30 text-sm">O estabelecimento não existe ou o link está incorreto.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="booking-root" className={`min-h-screen ${bgClass} ${isBeauty ? 'text-stone-800' : 'text-white'} selection:bg-accent-gold selection:text-black font-sans relative overflow-x-hidden pb-40 transition-colors duration-700`}>
            {/* Background Texture Overlay (Pro-Max Detail) */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-noise z-[1]" />

            {/* Sophisticated Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ${isBeauty ? 'bg-silk-accent/5' : 'bg-obsidian-accent/5'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ${isBeauty ? 'bg-stone-200/5' : 'bg-neutral-900/40'}`}></div>
            </div>

            <PublicBusinessHeader
                businessName={business.business_name}
                logoUrl={business.logo_url}
                coverPhotoUrl={business.cover_photo_url}
                instagramHandle={business.instagram_handle}
                phone={business.phone}
                address={business.address_street}
                googleRating={business.google_rating}
                totalReviews={business.total_reviews}
                isBeauty={isBeauty}
                userType={business.user_type}
                gallery={gallery}
            />

            {/* Barra de Progresso de Etapas */}
            {step !== 'success' && (
                <div className={`sticky top-0 z-30 w-full border-b ${isBeauty ? 'bg-[#E2E1DA]/95 border-stone-200' : 'bg-[#050505]/95 border-white/5'} backdrop-blur-md`}>
                    <div className="container mx-auto px-4 max-w-3xl py-3 flex items-center gap-0">
                        {stepLabels.map((label, idx) => (
                            <React.Fragment key={label}>
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black transition-all duration-500 ${idx < currentStepNum
                                        ? (isBeauty ? 'bg-stone-800 text-white' : 'bg-accent-gold text-black')
                                        : idx === currentStepNum
                                            ? (isBeauty ? 'bg-stone-800 text-white scale-110 shadow-lg' : 'bg-accent-gold text-black scale-110 shadow-[0_0_12px_rgba(194,155,64,0.4)]')
                                            : (isBeauty ? 'bg-stone-200 text-stone-400' : 'bg-white/5 text-white/20')
                                        }`}>
                                        {idx < currentStepNum ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-500 ${idx === currentStepNum
                                        ? (isBeauty ? 'text-stone-800' : 'text-accent-gold')
                                        : (isBeauty ? 'text-stone-300' : 'text-white/20')
                                        }`}>{label}</span>
                                </div>
                                {idx < stepLabels.length - 1 && (
                                    <div className={`flex-1 h-px mx-2 transition-all duration-700 ${idx < currentStepNum
                                        ? (isBeauty ? 'bg-stone-400' : 'bg-accent-gold/50')
                                        : (isBeauty ? 'bg-stone-200' : 'bg-white/5')
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 max-w-3xl relative z-10 pt-10 pb-32">
                {/* Professional Service Grade (Strategic Section) */}
                {proIdParam && step === 'services' && (
                    <div className="mb-16 animate-reveal-fragment">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`w-12 h-[2px] ${isBeauty ? 'bg-silk-accent' : 'bg-obsidian-accent'}`}></div>
                            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isBeauty ? 'text-stone-400' : 'text-obsidian-accent'}`}>
                                Grade de Serviços: {professionals.find(p => p.id === proIdParam)?.name.split(' ')[0] || 'Profissional'}
                            </span>
                        </div>
                        <h2 className={`text-4xl md:text-5xl lg:text-6xl mb-8 ${isBeauty ? 'text-stone-800 font-light italic leading-tight' : 'massive-text text-white'}`}>
                            Escolha sua <br /> Experiência
                        </h2>
                    </div>
                )}

                <div className="space-y-12">
                    {messages.map((msg, idx) => (
                        <ChatBubble
                            key={msg.id}
                            message={msg.text}
                            isAssistant={msg.isAssistant}
                            delay={idx === messages.length - 1 ? 200 : 0}
                            isBeauty={isBeauty}
                        >
                            {msg.isAssistant && idx === messages.length - 1 && !isSubmitting && (
                                <div className="mt-8 animate-reveal-fragment duration-700">
                                    {msg.type === 'services' && step === 'services' && (
                                        <div className="space-y-12">
                                            {/* Luxury Filters - Staggered Slide Animation */}
                                            <div className="animate-reveal-fragment duration-700">
                                                <div className={`p-1.5 ${isBeauty ? 'bg-white shadow-silk-shadow border border-stone-100 rounded-2xl' : 'bg-white/5 border border-white/10 rounded-none'} backdrop-blur-xl`}>
                                                    <div className="flex gap-2 overflow-x-auto p-1 scrollbar-thin scrollbar-thumb-stone-200">
                                                        <button onClick={() => setActiveCategory('all')}
                                                            className={`px-5 md:px-8 py-2.5 ${isBeauty ? 'rounded-xl' : 'rounded-none'} text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500
                                                            ${activeCategory === 'all'
                                                                    ? (isBeauty ? 'bg-stone-800 text-white shadow-lg scale-105' : 'bg-accent-gold text-black shadow-heavy scale-105')
                                                                    : (isBeauty ? 'text-stone-400 hover:bg-stone-100' : 'text-neutral-500 hover:bg-white/5')}`}>
                                                            Todos
                                                        </button>
                                                        {categories.map(cat => (
                                                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                                                className={`px-5 md:px-8 py-2.5 ${isBeauty ? 'rounded-xl border border-stone-50' : 'rounded-none'} text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500
                                                                ${activeCategory === cat.id
                                                                        ? (isBeauty ? 'bg-stone-800 text-white shadow-lg scale-105' : 'bg-accent-gold text-black shadow-heavy scale-105')
                                                                        : (isBeauty ? 'text-stone-400 bg-transparent hover:bg-stone-100' : 'text-neutral-500 hover:bg-white/5')}`}>
                                                                {cat.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Empty state se não há serviços */}
                                            {services.length === 0 && (
                                                <div className={`flex flex-col items-center justify-center py-20 gap-6 text-center ${isBeauty ? '' : ''}`}>
                                                    <div className={`w-20 h-20 flex items-center justify-center border-2 ${isBeauty ? 'bg-stone-100 border-stone-200 rounded-2xl' : 'bg-white/5 border-white/10 rounded-none'}`}>
                                                        <Sparkles className={`w-10 h-10 ${isBeauty ? 'text-stone-300' : 'text-white/20'}`} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-black text-lg uppercase tracking-widest mb-2 ${isBeauty ? 'text-stone-500' : 'text-white/40'}`}>Em Breve</p>
                                                        <p className={`text-sm ${isBeauty ? 'text-stone-400' : 'text-white/30'}`}>Nossos serviços serão apresentados em breve.<br />Entre em contato diretamente para agendar.</p>
                                                    </div>
                                                    {whatsappLink && (
                                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                                                            className={`flex items-center gap-3 px-8 py-4 font-black text-xs uppercase tracking-widest transition-all ${isBeauty ? 'bg-stone-800 text-white rounded-xl hover:scale-105' : 'bg-accent-gold text-black border-4 border-black shadow-heavy hover:translate-x-1 hover:translate-y-1'}`}>
                                                            <Phone className="w-4 h-4" /> Falar via WhatsApp
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Service Staggered Grid - Extra Polish */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                                {services.filter(s => {
                                                    const matchesCategory = activeCategory === 'all'
                                                        || (activeCategory === 'no-category' && !s.category_id)
                                                        || s.category_id === activeCategory;
                                                    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
                                                    return matchesCategory && matchesSearch;
                                                }).map((service, sIdx) => {
                                                    const isSelected = selectedServices.includes(service.id);
                                                    return (
                                                        <div key={service.id}
                                                            onClick={() => toggleService(service.id)}
                                                            style={{ animationDelay: `${sIdx * 80}ms` }}
                                                            className={`
                                                                relative overflow-hidden cursor-pointer transition-all duration-700 animate-reveal-fragment group
                                                                ${isBeauty ? 'rounded-3xl' : 'rounded-none'}
                                                                ${isSelected
                                                                    ? (isBeauty ? 'md:scale-[1.03] shadow-2xl ring-2 ring-stone-800' : 'md:scale-[1.03] shadow-heavy-lg border-4 border-accent-gold ring-4 ring-black')
                                                                    : (isBeauty ? 'bg-white shadow-silk-shadow hover:-translate-y-1' : 'bg-obsidian-card border border-white/5 shadow-heavy hover:-translate-y-1')
                                                                }
                                                            `}>
                                                            {/* Service Image/Cover with Persistent Category — Mobile-first height */}
                                                            <div className="h-36 sm:h-44 md:h-48 relative overflow-hidden bg-neutral-900">
                                                                {service.image_url ? (
                                                                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover object-center grayscale-[30%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" />
                                                                ) : (
                                                                    <div className={`w-full h-full flex items-center justify-center ${isBeauty ? 'bg-stone-50' : 'bg-neutral-800'}`}>
                                                                        <Sparkles className={`w-12 h-12 opacity-10 ${isBeauty ? 'text-stone-800' : 'text-accent-gold'}`} />
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                                                {/* Persistent Category Label */}
                                                                <div className={`absolute top-4 left-4 px-3 py-1 backdrop-blur-md border rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${isBeauty ? 'bg-white/90 border-stone-100 text-stone-800' : 'bg-black/60 border-white/10 text-white/70'}`}>
                                                                    {categories.find(c => c.id === service.category_id)?.name || 'Especial'}
                                                                </div>

                                                                {/* Select Indicator Over Image */}
                                                                <div className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center border-2 transition-all duration-500 ${isBeauty ? 'rounded-full' : 'rounded-none'} ${isSelected ? (isBeauty ? 'bg-stone-800 border-white text-white rotate-12 scale-110' : 'bg-accent-gold border-black text-black scale-110 rotate-12') : 'bg-black/20 border-white/20 text-transparent'}`}>
                                                                    <Check className="w-6 h-6" />
                                                                </div>
                                                            </div>

                                                            {/* Service Content - Massive Design */}
                                                            <div className="p-6">
                                                                <div className="flex justify-between items-end">
                                                                    <div className="flex-1 space-y-3">
                                                                        <h4 className={`
                                                                            ${isBeauty ? 'font-black text-stone-800 tracking-tight' : 'massive-text text-white tracking-tighter'} 
                                                                            text-2xl group-hover:text-accent-gold transition-colors duration-500
                                                                        `}>
                                                                            {service.name}
                                                                        </h4>
                                                                        {service.description && (
                                                                            <p className={`text-xs line-clamp-1 opacity-50 ${isBeauty ? 'font-medium' : 'font-mono'}`}>
                                                                                {service.description}
                                                                            </p>
                                                                        )}
                                                                        <div className="flex items-center gap-4">
                                                                            <span className={`text-base font-black tracking-tight ${isBeauty ? 'text-stone-800' : 'text-accent-gold'}`}>
                                                                                {formatCurrency(service.price, currencyRegion)}
                                                                            </span>
                                                                            <div className="w-1 h-1 rounded-full bg-neutral-500/30" />
                                                                            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1.5">
                                                                                <Clock className="w-3.5 h-3.5" /> {service.duration_minutes} min
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Bottom Glow on Selection */}
                                                            {isSelected && !isBeauty && (
                                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-gold animate-shimmer" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {msg.type === 'professionals' && step === 'datetime' && !selectedProfessional && (
                                        <div className="space-y-6">
                                            {professionalCategories.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setActiveProfessionalCategory('all')}
                                                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeProfessionalCategory === 'all' ? (isBeauty ? 'bg-stone-800 text-white' : 'bg-accent-gold text-black border-2 border-black') : (isBeauty ? 'bg-stone-100 text-stone-600' : 'bg-white/5 text-white/50 border border-white/10')}`}
                                                    >
                                                        Todos
                                                    </button>
                                                    {professionalCategories.map((cat) => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setActiveProfessionalCategory(cat)}
                                                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeProfessionalCategory === cat ? (isBeauty ? 'bg-stone-800 text-white' : 'bg-accent-gold text-black border-2 border-black') : (isBeauty ? 'bg-stone-100 text-stone-600' : 'bg-white/5 text-white/50 border border-white/10')}`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                <button
                                                    onClick={() => {
                                                        setSelectedProfessional('any');
                                                        setMessages(prev => [...prev,
                                                        { id: Date.now().toString(), text: "Qualquer profissional disponível", isAssistant: false },
                                                        { id: (Date.now() + 1).toString(), text: "Perfeito escolha. Qual dia e horário ficam melhores para você explorar nossa agenda?", isAssistant: true, type: 'datetime' }
                                                        ]);
                                                    }}
                                                    className={`
                                                    p-6 flex flex-col items-center gap-3 transition-all duration-300
                                                    ${isBeauty ? 'bg-stone-50 hover:bg-white rounded-2xl shadow-sm hover:shadow-silk-shadow' : 'bg-obsidian-card border border-white/10 hover:border-obsidian-accent shadow-heavy'}
                                                `}>
                                                    <div className={`w-16 h-16 flex items-center justify-center border-2 ${isBeauty ? 'bg-white border-stone-200 text-stone-300 rounded-full' : 'bg-neutral-900 border-black text-neutral-600 rounded-none'}`}>
                                                        <Users className="w-8 h-8" />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest text-center ${isBeauty ? 'text-stone-800' : 'text-white'}`}>Qualquer Profissional</span>
                                                </button>

                                                {filteredProfessionals.map((pro, pIdx) => (
                                                    <button
                                                        key={pro.id}
                                                        style={{ animationDelay: `${pIdx * 100}ms` }}
                                                        onClick={() => {
                                                            setSelectedProfessional(pro.id);
                                                            setMessages(prev => [...prev,
                                                            { id: Date.now().toString(), text: `Quero ser atendido(a) por ${pro.name}`, isAssistant: false },
                                                            { id: (Date.now() + 1).toString(), text: `Ótimo! Vou verificar a agenda de ${pro.name.split(' ')[0]}. Qual dia e horário você prefere para sua visita?`, isAssistant: true, type: 'datetime' }
                                                            ]);
                                                        }}
                                                        className={`
                                                        p-6 flex flex-col items-center gap-3 transition-all duration-300 animate-reveal-fragment
                                                        ${isBeauty ? 'bg-stone-50 hover:bg-white rounded-2xl shadow-sm hover:shadow-silk-shadow' : 'bg-obsidian-card border border-white/10 hover:border-obsidian-accent shadow-heavy'}
                                                    `}>
                                                        <div className={`w-16 h-16 overflow-hidden border-2 ${isBeauty ? 'bg-white border-stone-200 rounded-full' : 'bg-neutral-900 border-black rounded-none'}`}>
                                                            {pro.photo_url ? (
                                                                <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white font-bold">{pro.name.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest text-center ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                                            {pro.name.split(' ')[0]}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {msg.type === 'datetime' && step === 'datetime' && (
                                        <div className="space-y-12 max-w-2xl mx-auto">
                                            <div className={`${isBeauty ? 'bg-white shadow-silk-shadow p-8 rounded-3xl' : 'bg-obsidian-card border-2 border-black p-8 shadow-heavy-lg'}`}>
                                                <h3 className={`mb-8 ${isBeauty ? 'text-stone-800 silk-text' : 'massive-text text-white'} text-center md:text-left`}>Seleção de Agenda</h3>
                                                <CalendarPicker selectedDate={selectedDate} onDateSelect={setSelectedDate} isBeauty={isBeauty} fullDates={fullDates} />
                                            </div>

                                            {selectedDate && (
                                                <div className="animate-reveal-fragment duration-700">
                                                    <h4 className={`mb-6 ${isBeauty ? 'text-stone-400 silk-text text-sm' : 'text-obsidian-accent massive-text text-xl'} text-center md:text-left`}>Horários Disponíveis</h4>
                                                    <TimeGrid
                                                        selectedTime={selectedTime}
                                                        onTimeSelect={(time) => {
                                                            setSelectedTime(time);
                                                            setMessages(prev => [...prev,
                                                            { id: Date.now().toString(), text: `Agendar para dia ${selectedDate.toLocaleDateString('pt-BR')} às ${time}`, isAssistant: false },
                                                            { id: (Date.now() + 1).toString(), text: "Estamos quase concluindo! Agora, para confirmar sua reserva, informe seus dados de contato.", isAssistant: true, type: 'contact' }
                                                            ]);
                                                            setStep('contact');
                                                        }}
                                                        availableSlots={availableSlots}
                                                        isBeauty={isBeauty}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {msg.type === 'contact' && step === 'contact' && (
                                        <div className={`p-8 md:p-12 ${isBeauty ? 'bg-white shadow-silk-shadow rounded-3xl' : 'bg-obsidian-card border-2 border-black shadow-heavy-lg'} animate-reveal-fragment overflow-hidden relative`}>
                                            {!isBeauty && <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none select-none massive-text text-8xl">INFO</div>}

                                            <div className="relative z-10 space-y-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-2">
                                                        <label className={`${isBeauty ? 'text-stone-400 silk-text text-[10px]' : 'text-neutral-600 massive-text text-xs'} block`}>Nome Completo</label>
                                                        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                                            className={`w-full py-4 px-5 outline-none transition-all ${isBeauty ? 'bg-stone-50 border-stone-100 focus:bg-white rounded-lg' : 'bg-black/40 border-white/5 focus:border-obsidian-accent rounded-none'}`}
                                                            placeholder="Como devemos te chamar?" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className={`${isBeauty ? 'text-stone-400 silk-text text-[10px]' : 'text-neutral-600 massive-text text-xs'} block`}>WhatsApp</label>
                                                        <PhoneInput value={customerPhone} onChange={setCustomerPhone} defaultRegion={currencyRegion as 'BR' | 'PT'} />
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-4 p-4 bg-stone-50/50 rounded-xl border border-stone-100">
                                                    <input type="checkbox" id="privacy" checked={acceptedPolicy} onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                                        className={`mt-1.5 w-5 h-5 ${isBeauty ? 'rounded text-stone-800' : 'rounded-none text-obsidian-accent'} border-stone-200`} />
                                                    <label htmlFor="privacy" className={`text-xs ${isBeauty ? 'text-stone-500 font-light' : 'text-neutral-400 font-medium'} leading-relaxed`}>
                                                        Confirmo meu compromisso e aceito as <button onClick={() => setShowPolicyModal(true)} className={`font-bold underline ${isBeauty ? 'text-stone-800' : 'text-obsidian-accent'}`}>diretrizes de cancelamento</button>.
                                                    </label>
                                                </div>

                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={!customerName || !customerPhone || !acceptedPolicy || isSubmitting}
                                                    className={`
                                                        w-full py-6 flex items-center justify-center gap-4 transition-all group overflow-hidden relative
                                                        ${isBeauty ? 'bg-stone-800 text-white rounded-xl shadow-xl hover:scale-[1.01]' : 'bg-obsidian-accent text-black font-bold massive-text text-lg shadow-heavy border-4 border-black'}
                                                        disabled:opacity-40 disabled:grayscale
                                                    `}>
                                                    {isSubmitting ? (
                                                        <Loader2 className="w-6 h-6 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <span>Confirmar Agendamento</span>
                                                            <Check className="w-6 h-6 group-hover:scale-125 transition-transform" />
                                                        </>
                                                    )}
                                                    {/* Shine effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ChatBubble>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start mb-12 animate-fade-in">
                            <div className={`px-8 py-5 ${isBeauty ? 'bg-white rounded-2xl shadow-sm' : 'bg-obsidian-card border border-white/5 shadow-heavy rounded-none'} flex items-center gap-2`}>
                                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isBeauty ? 'bg-stone-300' : 'bg-obsidian-accent'}`} />
                                <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${isBeauty ? 'bg-stone-200' : 'bg-obsidian-accent/60'}`} />
                                <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${isBeauty ? 'bg-stone-100' : 'bg-obsidian-accent/30'}`} />
                            </div>
                        </div>
                    )}

                    {step === 'success' && activeBooking && (
                        <div className="max-w-xl mx-auto text-center py-20 animate-reveal-fragment">
                            <div className="relative inline-block mb-10">
                                <div className={`w-32 h-32 md:w-36 md:h-36 flex items-center justify-center border-4 animate-scale-check ${isBeauty ? 'bg-stone-800 border-white text-white rounded-full shadow-2xl' : 'bg-accent-gold border-black text-black rounded-none shadow-heavy-lg'}`}>
                                    <Check className="w-16 h-16 md:w-20 md:h-20 stroke-[4]" />
                                </div>
                                {/* Decorative sparkles around success icon */}
                                <div className="absolute -top-4 -right-4 animate-bounce delay-100">
                                    <Sparkles className="w-8 h-8 text-accent-gold" />
                                </div>
                                <div className="absolute -bottom-2 -left-6 animate-bounce delay-300">
                                    <Sparkles className="w-6 h-6 text-accent-gold opacity-50" />
                                </div>
                            </div>

                            <h2 className={`${isBeauty ? 'font-light tracking-widest text-stone-800' : 'massive-text text-white tracking-tighter'} text-5xl md:text-7xl mb-6`}>
                                {isBeauty ? 'Sua beleza agendada' : 'RESERVA CONFIRMADA'}
                            </h2>

                            <p className={`text-lg md:text-xl mb-12 max-w-md mx-auto leading-relaxed ${isBeauty ? 'text-stone-500 italic' : 'text-white/40 font-mono uppercase tracking-widest'}`}>
                                {isBeauty
                                    ? "Prepare-se para um momento único de auto-cuidado e transformação."
                                    : "VOCÊ ESTÁ UM PASSO À FRENTE. PREPARAMOS TUDO PARA SUA CHEGADA."
                                }
                            </p>

                            {/* Summary Card - Premium Detail */}
                            <div className={`p-8 mb-12 text-left relative overflow-hidden group ${isBeauty ? 'bg-white shadow-silk-shadow rounded-3xl border border-stone-100' : 'bg-obsidian-card border-4 border-black shadow-heavy-lg rounded-none'}`}>
                                <div className="relative z-10 flex flex-col gap-6">
                                    <div className="flex justify-between items-center border-b pb-4 border-neutral-500/10">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Resumo da Reserva</span>
                                        <div className="p-1.5 rounded-full bg-accent-gold/10 text-accent-gold">
                                            <Star className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[9px] uppercase font-black tracking-widest opacity-40">Data e Hora</p>
                                            <p className={`text-lg font-black tracking-tight ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                                {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {selectedTime}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] uppercase font-black tracking-widest opacity-40">Total</p>
                                            <p className={`text-lg font-black tracking-tight ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                                {formatCurrency(calculateTotal(), currencyRegion)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-black tracking-widest opacity-40">Serviços</p>
                                        <p className={`text-sm font-bold opacity-60 ${isBeauty ? 'text-stone-700' : 'text-white'}`}>
                                            {services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(' + ')}
                                        </p>
                                    </div>
                                </div>
                                {/* Animated background gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            </div>

                            <div className="flex flex-col gap-5">
                                <a
                                    href={`https://wa.me/${(business.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de confirmar meu agendamento na *${business.business_name}* para o dia ${selectedDate?.toLocaleDateString('pt-BR')} às ${selectedTime}. Nos vemos em breve! 🚀`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`
                                        group flex items-center justify-center gap-4 py-6 px-10 transition-all duration-500 relative overflow-hidden
                                        ${isBeauty ? 'bg-stone-800 text-white rounded-2xl shadow-2xl hover:scale-105' : 'bg-green-500 text-black font-black border-4 border-black shadow-heavy-lg hover:translate-x-1 hover:translate-y-1 uppercase tracking-widest'}
                                    `}
                                >
                                    <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20">
                                        <Send className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-[0.2em]">Confirmar no WhatsApp</span>
                                    {/* Animated highlight shine */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                                </a>

                                <button
                                    onClick={() => window.location.reload()}
                                    className={`text-xs font-black uppercase tracking-[0.3em] py-4 transition-all opacity-40 hover:opacity-100 ${isBeauty ? 'text-stone-800' : 'text-white underline decoration-accent-gold decoration-2 underline-offset-8'}`}
                                >
                                    Realizar novo agendamento
                                </button>
                            </div>

                            <div className="mt-16 opacity-0 animate-fade-in [animation-delay:1500ms]">
                                <GoogleReviewPrompt businessName={business.business_name} isBeauty={isBeauty} googlePlaceId={businessSettings?.google_place_id} />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div >


            {/* Bot?o Flutuante "Avancar" ? aparece ao selecionar servi?os com anima??o slide-up */}
            {step === 'services' && (
                <div
                    className={`
                        fixed bottom-0 left-0 right-0 z-[200] w-full
                        transition-all duration-500 ease-out
                        ${selectedServices.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
                    `}
                >
                    <div
                        className={`
                            w-full px-4 pt-4
                            ${isBeauty ? 'bg-[#E2E1DA]/90' : 'bg-black/85'}
                            backdrop-blur-2xl
                            border-t ${isBeauty ? 'border-stone-300' : 'border-white/10'}
                            shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.4)]
                        `}
                        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
                    >
                        <button
                            id="next-button"
                            onClick={() => {
                                const serviceNames = services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(', ');
                                setMessages(prev => [...prev,
                                { id: Date.now().toString(), text: `Quero agendar: ${serviceNames}`, isAssistant: false },
                                { id: (Date.now() + 1).toString(), text: "Com qual profissional voc? gostaria de realizar esses servi?os? Nossa equipe de elite est? pronta para te atender.", isAssistant: true, type: 'professionals' }
                                ]);
                                setStep('datetime');
                            }}
                            className={`
                                w-full flex items-center justify-between overflow-hidden group relative
                                py-4 sm:py-5 px-6 sm:px-8
                                ${isBeauty
                                    ? 'rounded-2xl bg-stone-800 text-white shadow-2xl hover:bg-stone-700 active:scale-95'
                                    : 'rounded-none bg-accent-gold text-black shadow-heavy-lg border-4 border-black font-black uppercase tracking-[0.2em] active:translate-x-0.5 active:translate-y-0.5'
                                }
                                transition-all duration-200
                            `}
                        >
                            <div className="flex flex-col items-start z-10">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase opacity-60">Total</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${isBeauty ? 'bg-white/10' : 'bg-black/15'}`}>
                                        {selectedServices.length} {selectedServices.length === 1 ? 'ITEM' : 'ITENS'}
                                    </span>
                                </div>
                                <span className="text-xl sm:text-2xl font-black leading-none mt-0.5">
                                    {formatCurrency(calculateTotal(), currencyRegion)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 z-10">
                                <span className="font-black text-xs uppercase tracking-widest">Avancar</span>
                                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1.5 transition-transform duration-300" />
                            </div>
                            {/* Shine effect no hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                        </button>
                    </div>
                </div>
            )}

            {/* Float Gallery (Pro-Max Refinement for Desktop) */}
            {
                gallery.length > 0 && step !== 'success' && (
                    <div className="fixed bottom-10 left-10 z-[60] hidden xl:block animate-fade-in">
                        <div className={`p-4 ${isBeauty ? 'bg-white shadow-silk-shadow rounded-2xl' : 'bg-obsidian-card border-2 border-black shadow-heavy-lg'} w-72`}>
                            <p className={`text-[10px] uppercase tracking-[0.2em] mb-4 ${isBeauty ? 'text-stone-400 font-light' : 'text-neutral-500 font-medium'}`}>Atmosfera & Arte</p>
                            <div className="grid grid-cols-2 gap-2">
                                {gallery.slice(0, 4).map((item, idx) => (
                                    <div key={item.id} className={`aspect-square overflow-hidden ${isBeauty ? 'rounded-lg' : 'rounded-none border border-white/5'}`}>
                                        <img src={item.image_url} alt="Portfolio" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showPolicyModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                        <div className={`${isBeauty ? 'bg-white rounded-3xl' : 'bg-obsidian-card border-4 border-black'} max-w-xl w-full p-10 relative shadow-2xl overflow-hidden`}>
                            {!isBeauty && <div className="absolute top-0 left-0 w-32 h-32 opacity-5 massive-text text-9xl select-none -translate-x-8 -translate-y-8">RULE</div>}

                            <button onClick={() => setShowPolicyModal(false)} className="absolute top-6 right-6 text-neutral-400 hover:text-black transition-colors z-30"><X className="w-8 h-8" /></button>

                            <div className="relative z-10 space-y-6">
                                <h3 className={`text-2xl ${isBeauty ? 'text-stone-800 italic font-light' : 'massive-text text-white'} flex items-center gap-3`}>
                                    <AlertTriangle className={`w-6 h-6 ${isBeauty ? 'text-stone-800' : 'text-obsidian-accent'}`} />
                                    Políticas Administrativas
                                </h3>
                                <div className={`leading-relaxed ${isBeauty ? 'text-stone-500 font-light' : 'text-neutral-300 font-medium'} max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar`}>
                                    {businessSettings?.cancellation_policy ?
                                        <p className="whitespace-pre-wrap">{businessSettings.cancellation_policy}</p> :
                                        <p>Nossos profissionais reservam tempo exclusivo para você. Cancelamentos devem ser realizados com antecedência mínima de 24h. O não comparecimento impacta a logística de nossa equipe.</p>
                                    }
                                </div>
                                <button
                                    onClick={() => setShowPolicyModal(false)}
                                    className={`w-full py-4 ${isBeauty ? 'bg-stone-800 text-white rounded-xl' : 'bg-white text-black font-bold massive-text shadow-heavy'}`}>
                                    Compreendi as Políticas
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
