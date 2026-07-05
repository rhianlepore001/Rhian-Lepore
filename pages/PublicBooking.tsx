import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Star, Calendar, Clock, MapPin, Instagram, Scissors, Sparkles, User, ArrowRight, Check, ChevronLeft, ChevronRight, Phone, Users, Loader2, X, AlertTriangle, Send, MessageSquare, LayoutDashboard } from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';
import { CalendarPicker } from '../components/CalendarPicker';
import { TimeGrid } from '../components/TimeGrid';
import { UpsellSection } from '../components/UpsellSection';
import { ClientAuthModal } from '../components/ClientAuthModal';
import { usePublicClient } from '../contexts/PublicClientContext';
import { PublicBusinessHeader } from '../components/PublicBusinessHeader';
import { ChatBubble } from '../components/ChatBubble';
import { GoogleReviewPrompt } from '../components/GoogleReviewPrompt';
import { BookingModeToggle } from '../components/booking/BookingModeToggle';
import { useCancelPublicBooking, useFindActivePublicBooking, useSubmitPublicBooking, useBusinessProfileBySlug, useBusinessSettings, usePublicServices, usePublicCategories, usePublicProfessionals, usePublicGallery } from '../hooks/usePublicBooking';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { buildWhatsAppLink, formatCurrency, formatDuration, Region } from '../utils/formatters';
import { logger } from '../utils/Logger';
import { fetchEditBooking, fetchPublicClientByPhone, fetchClientByPhone, fetchPublicBookingById, fetchAvailableSlots, fetchFullDates, getFirstAvailableProfessional, uploadClientPhoto, upsertPublicClientSession } from '../services/publicBooking';
import { ConfirmModal, useToast } from '@/components/ui';

interface Message {
    id: string;
    text: string | React.ReactNode;
    isAssistant: boolean;
    type?: 'text' | 'services' | 'professionals' | 'datetime' | 'contact' | 'success' | 'edit_options' | 'edit_confirm';
}

interface Service {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    description: string | null;
    duration_minutes: number;
    category?: string;
    category_id?: string;
}

interface Professional {
    id: string;
    full_name: string;
    photo_url: string | null;
    specialties: string[];
    individual_rating: number;
    total_reviews: number;
    name: string;
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
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const proIdParam = searchParams.get('pro');
    const rebookParam = searchParams.get('rebook');
    const editParam = searchParams.get('edit');

    const cancelBookingMutation = useCancelPublicBooking();
    const findActiveBookingMutation = useFindActivePublicBooking();
    const submitBookingMutation = useSubmitPublicBooking();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [pendingCancelBookingId, setPendingCancelBookingId] = useState<string | null>(null);

    const { data: businessProfile, isLoading: loadingProfile, isError: profileError } = useBusinessProfileBySlug(slug ?? '');
    const business = useMemo(() => businessProfile as BusinessProfile | null ?? null, [businessProfile]);
    const businessId = business?.id ?? null;
    const { data: businessSettings } = useBusinessSettings(businessId);
    const { data: servicesData = [] } = usePublicServices(businessId);
    const { data: categoriesData = [] } = usePublicCategories(businessId);
    const { data: professionalsData = [] } = usePublicProfessionals(businessId);
    const { data: galleryData = [] } = usePublicGallery(businessId);

    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeProfessionalCategory, setActiveProfessionalCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    
    const [step, setStep] = useState<'edit_options' | 'services' | 'datetime' | 'contact' | 'edit_confirm' | 'success'>('services');
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
    const [acceptedMarketing, setAcceptedMarketing] = useState(false);
    const [isDataReady, setIsDataReady] = useState(false);
    const [activeBooking, setActiveBooking] = useState<any>(null);
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
    const [originalTimeISO, setOriginalTimeISO] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'time' | 'service' | 'both' | null>(null);
    const galleryRef = React.useRef<HTMLDivElement>(null);

    const services = useMemo(() => servicesData as Service[], [servicesData]);
    const categories = useMemo(() => {
        const cats = categoriesData as Category[];
        if (services.some(s => !(s as any).category_id)) {
            return [...cats, { id: 'no-category', name: 'Outros' }];
        }
        return cats;
    }, [categoriesData, servicesData]);
    const professionals = useMemo(() =>
        (professionalsData as any[] || []).map((p: any) => ({
            ...p,
            name: p.full_name || p.name,
            specialties: Array.isArray(p.specialties) ? p.specialties : (p.specialties ? [p.specialties] : []),
        })),
        [professionalsData]
    );
    const gallery = useMemo(() => galleryData as any[] ?? [], [galleryData]);

    // Modo único: fluxo guiado (sem chat). Decisão de produto: cliente quer agendar rápido.
    // Mantido estado interno para compatibilidade com componentes legados, mas sempre 'quick'.
    const [bookingMode, setBookingMode] = useState<'chat' | 'quick'>('quick');
    const [quickStep, setQuickStep] = useState<'services' | 'professional' | 'datetime' | 'contact' | 'success'>('services');

    const { client, register, login, establishSession } = usePublicClient();

    const isBeauty = business?.user_type === 'beauty';
    const themeOverride: ThemeVariant = isBeauty ? 'beauty' : 'barber';
    const { colors, accent, classes, shadow, radius, font, isDark } = useBrutalTheme({ override: themeOverride });

    const accentTextOnAccent = isBeauty ? 'text-white' : 'text-black';

    // Sincroniza dados do cliente logado com os campos do formulário
    useEffect(() => {
        if (client) {
            setCustomerName(client.name);
            setCustomerPhone(client.phone);
        }
    }, [client]);

    // Carrega agendamento diretamente pela tabela quando há ?edit= na URL e o cliente está logado
    useEffect(() => {
        if (!editParam || !businessId) return;
        const phone = client?.phone || customerPhone;
        if (!phone) return;

        const fetchEdit = async () => {
            try {
                logger.info('Buscando agendamento para edição:', { editParam, phone });
                const data = await fetchEditBooking(editParam, businessId, phone);
                if (data) {
                    logger.info('Agendamento encontrado para edição:', data);
                    handleEditBooking(data);
                } else {
                    logger.warn('Agendamento não encontrado ou não editável:', { editParam });
                }
            } catch (err) {
                logger.error('Exceção ao buscar agendamento para edição:', err);
            }
        };

        fetchEdit();
    }, [editParam, businessId, client?.phone]);

    // Detecta clientes existentes pelo telefone e busca agendamento ativo (fluxo normal, sem edição)
    useEffect(() => {
        const fetchExistingClient = async () => {
            if (customerPhone.length >= 12 && businessId) {
                try {
                    const publicClient = await fetchPublicClientByPhone(customerPhone, businessId);
                    if (publicClient) {
                        if (publicClient.name && !customerName) setCustomerName(publicClient.name);
                        if (publicClient.photo_url) setExistingPhotoUrl(publicClient.photo_url);
                        return;
                    }

                    const mainClient = await fetchClientByPhone(customerPhone, businessId);
                    if (mainClient) {
                        if (mainClient.name && !customerName) setCustomerName(mainClient.name);
                        if (mainClient.photo_url) setExistingPhotoUrl(mainClient.photo_url);
                    }

                    // Fluxo normal (sem edição): busca agendamento ativo pelo telefone
                    if (!editParam) {
                        const loadedBooking = await findActiveBookingMutation.mutateAsync({ phone: customerPhone, businessId: businessId! });
                        if (loadedBooking && ['pending', 'confirmed'].includes(loadedBooking.status)) {
                            setActiveBooking(loadedBooking);
                            setStep('success');
                            setQuickStep('success');
                        }
                    }
                } catch (error) {
                    logger.error('Erro ao buscar cliente existente', error);
                }
            } else if (customerPhone.length < 9) {
                setExistingPhotoUrl(null);
            }
        };
        fetchExistingClient();
    }, [customerPhone, businessId, editParam]);

    const fetchFreshActiveBooking = async (bookingId: string) => {
        const phone = client?.phone || customerPhone || activeBooking?.customer_phone;
        if (!businessId || !phone) return;

        try {
            const booking = await fetchPublicBookingById(bookingId, businessId, phone);
            if (booking) {
                setActiveBooking(booking);
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
                    fetchFreshActiveBooking(activeBooking.id);
                }
            )
            .subscribe();

        const interval = setInterval(() => {
            if (activeBooking.status === 'pending') {
                fetchFreshActiveBooking(activeBooking.id);
            }
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [activeBooking?.id, activeBooking?.status]);

    useEffect(() => {
        const fetchSlots = async () => {
            if (selectedDate && businessId) {
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const day = String(selectedDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                const duration = calculateDuration();

                try {
                    const slots = await fetchAvailableSlots(businessId, dateStr, selectedProfessional === 'any' ? null : selectedProfessional, duration);
                    setAvailableSlots(slots);
                } catch {
                    setAvailableSlots([]);
                }
            }
        };
        fetchSlots();
    }, [selectedDate, businessId, selectedProfessional]);

    useEffect(() => {
        const fetchFullDatesAsync = async () => {
            if (businessId) {
                const now = new Date();
                const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const end = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

                try {
                    const dates = await fetchFullDates(businessId, startDate, endDate, selectedProfessional === 'any' ? null : selectedProfessional, calculateDuration());
                    if (dates) setFullDates(dates);
                } catch { /* full dates fetch failed silently */ }
            }
        };
        fetchFullDatesAsync();
    }, [businessId, selectedProfessional]);

    

    useEffect(() => {
        if (business && services.length >= 0 && categories.length >= 0) {
            setIsDataReady(true);
        }
    }, [business, services, categories]);

    useEffect(() => {
        if (business) {
            const originalBg = document.body.style.backgroundColor;
            const originalColor = document.body.style.color;
            const targetBg = isBeauty ? '#1F1B2E' : '#121212';
            const targetColor = '#EAEAEA';

            document.body.style.backgroundColor = targetBg;
            document.body.style.color = targetColor;
            document.documentElement.style.backgroundColor = targetBg;
            document.documentElement.setAttribute('data-public-theme', isBeauty ? 'beauty' : 'barber');
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
                    if (editParam) {
                        const editWelcome = client
                            ? `Olá ${client.name.split(' ')[0]}! Você está no modo de edição do seu agendamento na ${business.business_name}.`
                            : `Olá! Você está no modo de edição do seu agendamento na ${business.business_name}.`;

                        setMessages([
                            {
                                id: 'welcome-edit',
                                text: editWelcome,
                                isAssistant: true
                            },
                            {
                                id: 'edit-options-ask',
                                text: "O que você gostaria de alterar no seu agendamento?",
                                isAssistant: true,
                                type: 'edit_options'
                            }
                        ]);
                    } else {
                        const welcomeText = client
                            ? `Olá de volta, ${client.name.split(' ')[0]}! Que bom ter você aqui na ${business.business_name} novamente.`
                            : `Olá! Seja bem-vindo à ${business.business_name}. Vou te ajudar a agendar em poucos passos.`;

                        setMessages([
                            {
                                id: 'welcome',
                                text: welcomeText,
                                isAssistant: true
                            },
                            {
                                id: 'services-ask',
                                text: editingBookingId
                                    ? "Notei que você deseja alterar seu agendamento. Quais serviços gostaria de manter ou adicionar?"
                                    : "Qual serviço você gostaria de realizar hoje?",
                                isAssistant: true,
                                type: 'services'
                            }
                        ]);
                    }
                    setIsTyping(false);
                }, 1000);
            };
            addWelcome();
        }
    }, [business, isDataReady, client, editParam]);

    // Pre-select services when coming from client area rebook link
    useEffect(() => {
        if (rebookParam && services.length > 0) {
            const ids = rebookParam.split(',').filter(id => services.some(s => s.id === id));
            if (ids.length > 0) setSelectedServices(ids);
        }
    }, [rebookParam, services]);

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
        try {
            await cancelBookingMutation.mutateAsync({ bookingId, businessId: businessId! });
            setActiveBooking(null);
            setStep('services');
            setQuickStep('services');
            showToast('Agendamento cancelado com sucesso.', 'success');
        } catch (error) {
            logger.error('Error cancelling booking', error);
            showToast('Erro ao cancelar agendamento.', 'error');
        }
    };

    const requestCancelBooking = (bookingId: string) => {
        setPendingCancelBookingId(bookingId);
    };

    const handleEditBooking = (booking: any) => {
        setEditingBookingId(booking.id);
        setOriginalTimeISO(booking.appointment_time);
        const bDate = new Date(booking.appointment_time);
        setSelectedDate(bDate);
        setSelectedTime(bDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

        if (booking.service_ids) setSelectedServices(booking.service_ids);
        setSelectedProfessional(booking.professional_id || 'any');

        if (booking.customer_name) setCustomerName(booking.customer_name);
        const phone = booking.customer_phone || booking.phone || client?.phone || '';
        if (phone) setCustomerPhone(phone);
        // Em modo edição o cliente já aceitou política no agendamento original;
        // re-confirmação seria fricção desnecessária.
        if (editParam) setAcceptedPolicy(true);

        setMessages(prev => [
            ...prev,
            { id: Date.now().toString(), text: "Quero remarcar/editar meu agendamento.", isAssistant: false },
            {
                id: (Date.now() + 1).toString(),
                text: "O que você gostaria de alterar no seu agendamento?",
                isAssistant: true,
                type: 'edit_options' as const
            }
        ]);
        setStep('edit_options');
    };

    const establishClientSession = async (photoUrl: string | null): Promise<boolean> => {
        if (!businessId || !customerName || !customerPhone) return false;

        try {
            const sessionClient = await upsertPublicClientSession({
                businessId,
                name: customerName,
                phone: customerPhone,
                photoUrl,
            });
            establishSession(sessionClient);
            return true;
        } catch (upsertError) {
            logger.warn('upsertPublicClientSession falhou após agendamento, tentando register/login:', upsertError);
        }

        try {
            const registered = await register({
                name: customerName,
                phone: customerPhone,
                photo_url: photoUrl,
                business_id: businessId,
            });
            if (registered) return true;
        } catch (registerError) {
            logger.warn('register() falhou após agendamento, tentando login:', registerError);
        }

        try {
            const loggedIn = await login(customerPhone, businessId);
            if (loggedIn) return true;
        } catch (loginError) {
            logger.warn('login() falhou após agendamento:', loginError);
        }

        establishSession({
            id: client?.id ?? crypto.randomUUID(),
            name: customerName,
            phone: customerPhone,
            email: client?.email ?? null,
            photo_url: photoUrl,
            business_id: businessId,
        });
        return true;
    };

    const handleOpenClientArea = () => {
        if (!slug) return;
        navigate(`/minha-area/${slug}`);
    };

    const handleSubmit = async () => {
        if (!businessId || !customerName || !customerPhone || !selectedDate || !selectedTime || !acceptedPolicy) {
            showToast('Por favor, preencha todos os campos e aceite a política de cancelamento.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            let photoUrl = client?.photo_url || null;
            if (customerPhoto) {
                try {
                    photoUrl = await uploadClientPhoto(businessId, customerPhoto);
                } catch (uploadErr) {
                    logger.warn('Photo upload failed, continuing without photo', uploadErr);
                }
            }
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const totalPrice = calculateTotal();
            const duration = calculateDuration();
            const offset = business?.region === 'PT' ? '+00:00' : '-03:00';
            const appointmentTimeISO = `${dateStr}T${selectedTime}:00${offset}`;

            if (!editingBookingId) {
                const existingBooking = await findActiveBookingMutation.mutateAsync({ phone: customerPhone, businessId });
                if (existingBooking && existingBooking.id !== editingBookingId) {
                    setActiveBooking(existingBooking);
                    await establishClientSession(photoUrl);
                    setStep('success');
                    setQuickStep('success');
                    setIsSubmitting(false);
                    return;
                }
            }

            let finalProfessionalId = selectedProfessional === 'any' ? null : selectedProfessional;
            if (selectedProfessional === 'any') {
                const autoProId = await getFirstAvailableProfessional(businessId, appointmentTimeISO, duration);
                if (autoProId) finalProfessionalId = autoProId;
            }

            const booking = await submitBookingMutation.mutateAsync({
                businessId,
                customerName,
                customerPhone,
                serviceIds: selectedServices,
                professionalId: finalProfessionalId,
                appointmentTime: appointmentTimeISO,
                totalPrice,
                durationMinutes: duration,
                editingBookingId,
                originalAppointmentTime: originalTimeISO,
            });

            setActiveBooking(booking);

            await establishClientSession(photoUrl);
            setStep('success');
            setQuickStep('success');
        } catch (error: any) {
            logger.error('Error creating booking', error);
            showToast('Não foi possível concluir seu agendamento agora. Tente novamente em instantes ou fale com a equipe pelo WhatsApp.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currencyRegion = (business?.region as Region) || (businessSettings?.currency_symbol === '€' ? 'PT' : 'BR');
    const whatsappLink = business?.phone
        ? buildWhatsAppLink(business.phone, currencyRegion)
        : null;

    const stepIndex = { services: 0, datetime: 1, contact: 2, success: 3 };
    const currentStepNum = stepIndex[step as keyof typeof stepIndex] ?? 0;
    const stepLabels = ['Serviços', 'Agenda', 'Dados', 'Confirmado'];

    // Quick flow stepper data
    const quickSteps = [
        { key: 'services' as const, label: 'Serviços' },
        { key: 'professional' as const, label: 'Profissional' },
        { key: 'datetime' as const, label: 'Data e Hora' },
        { key: 'contact' as const, label: 'Confirmar' },
    ];
    const currentQuickStepIndex = quickSteps.findIndex(s => s.key === quickStep);

    const handleQuickNext = () => {
        if (quickStep === 'services') setQuickStep('professional');
        else if (quickStep === 'professional') setQuickStep('datetime');
        else if (quickStep === 'datetime') setQuickStep('contact');
    };

    const handleQuickBack = () => {
        if (quickStep === 'professional') setQuickStep('services');
        else if (quickStep === 'datetime') setQuickStep('professional');
        else if (quickStep === 'contact') setQuickStep('datetime');
    };

    const canQuickProceed = () => {
        switch (quickStep) {
            case 'services': return selectedServices.length > 0;
            case 'professional': return selectedProfessional !== null;
            case 'datetime': return selectedDate !== null && selectedTime !== null;
            case 'contact': return (client || (customerName && customerPhone)) && acceptedPolicy;
            default: return false;
        }
    };

    if (loadingProfile) {
        return (
            <div className={`h-screen flex items-center justify-center ${colors.bg}`}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className={`w-10 h-10 ${accent.text} animate-spin`} />
                    <p className={`${colors.textMuted} font-black text-xs uppercase tracking-[0.2em]`}>
                        Preparando os horários...
                    </p>
                </div>
            </div>
        );
    }

    if (!business || profileError) {
        return (
            <div className={`h-screen flex items-center justify-center ${colors.bg}`}>
                <div className="flex flex-col items-center gap-6 text-center px-8">
                    <div className={`w-20 h-20 rounded-none ${colors.card} ${colors.border} border-2 flex items-center justify-center`}>
                        <Sparkles className={`w-10 h-10 ${colors.textMuted}`} />
                    </div>
                    <div>
                        <p className={`${colors.text} font-black text-xl uppercase tracking-widest mb-2`} style={{ fontFamily: 'Chivo,sans-serif' }}>Página indisponível</p>
                        <p className={`${colors.textMuted} text-sm`}>Este link pode estar incorreto ou fora do ar. Confira o endereço com o estabelecimento.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="booking-root" className={`min-h-screen ${colors.bg} ${colors.text} selection:${accent.bg} selection:${accentTextOnAccent} font-sans relative overflow-x-hidden pb-40 transition-colors duration-700`}>
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-noise z-[1]" />

            {/* Sophisticated Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ${accent.bgDim}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] bg-black/40`}></div>
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
                userType={business.user_type}
                gallery={gallery}
                clientSession={client}
                businessSlug={slug}
            />

            {/* Mode Toggle */}
            <div className="container mx-auto px-4 max-w-3xl relative z-10 pt-6">
                <BookingModeToggle mode={bookingMode} onChange={setBookingMode} forceTheme={themeOverride} />
            </div>

            {/* QUICK DIRECT FLOW */}
            {bookingMode === 'quick' && quickStep !== 'success' && (
                <div className="container mx-auto px-3 md:px-4 max-w-3xl relative z-10 pt-6 pb-32">
                    {/* Quick Stepper */}
                    <div className={`sticky top-0 z-[60] w-full border-b ${colors.bg}/95 ${colors.divider} backdrop-blur-md mb-8`}>
                        <div className="py-3 flex items-center gap-0">
                            {quickSteps.map((qs, idx) => (
                                <React.Fragment key={qs.key}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black transition-all duration-200 ${idx < currentQuickStepIndex
                                                ? `${accent.bg} ${accentTextOnAccent}`
                                                : idx === currentQuickStepIndex
                                                    ? `${accent.bg} ${accentTextOnAccent} scale-110 ${shadow.glow}`
                                                    : `${colors.surface} ${colors.textMuted}`
                                            }`}>
                                            {idx < currentQuickStepIndex ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-[0.1em] transition-all duration-200 ${idx === currentQuickStepIndex ? accent.text : colors.textMuted}`}>{qs.label}</span>
                                    </div>
                                    {idx < quickSteps.length - 1 && (
                                        <div className={`flex-1 h-px mx-2 transition-all duration-300 ${idx < currentQuickStepIndex ? `${accent.bg} opacity-50` : colors.divider}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Step 1: Services */}
                    {quickStep === 'services' && (
                        <div className="space-y-8 animate-reveal-fragment">
                            <div>
                                <h2 className={`text-2xl md:text-3xl font-black tracking-tight mb-2 ${colors.text}`}>Escolha seus serviços</h2>
                                <p className={`${colors.textMuted} text-sm`}>Selecione um ou mais serviços para seu atendimento.</p>
                            </div>

                            {/* Category Filters */}
                            {categories.length > 0 && (
                                <div className={`p-1.5 ${colors.card} ${colors.border} border rounded-2xl backdrop-blur-xl`}>
                                    <div className="w-full flex gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
                                        <button onClick={() => setActiveCategory('all')}
                                            className={`px-5 md:px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-200 ${activeCategory === 'all'
                                                    ? `${accent.bg} ${accentTextOnAccent} scale-105 ${shadow.button}`
                                                    : `${colors.textMuted} hover:bg-white/5`
                                                }`}>
                                            Todos
                                        </button>
                                        {categories.map(cat => (
                                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                                className={`px-5 md:px-8 py-2.5 rounded-xl border text-xs font-black uppercase tracking-[0.15em] transition-all duration-200 ${activeCategory === cat.id
                                                        ? `${accent.bg} ${accentTextOnAccent} scale-105 ${shadow.button}`
                                                        : `${colors.textMuted} ${colors.border} hover:bg-white/5`
                                                    }`}>
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Service Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                                            className={`
                                                relative overflow-hidden cursor-pointer transition-all duration-300 animate-reveal-fragment group
                                                rounded-2xl
                                                ${isSelected
                                                    ? `md:scale-[1.02] ${shadow.glow} ring-2 ${accent.ring}`
                                                    : `${colors.card} ${colors.border} border ${shadow.card} hover:-translate-y-1`
                                                }
                                            `}>
                                            <div className="h-36 sm:h-44 md:h-48 relative overflow-hidden bg-neutral-900">
                                                {service.image_url ? (
                                                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]" />
                                                ) : (
                                                    <div className={`w-full h-full flex items-center justify-center ${colors.surface}`}>
                                                        <Sparkles className={`w-12 h-12 opacity-10 ${accent.text}`} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                <div className={`absolute top-4 left-4 px-3 py-1 backdrop-blur-md border rounded-full text-xs font-black uppercase tracking-[0.1em] ${colors.card} ${colors.border} ${colors.textSecondary}`}>
                                                    {categories.find(c => c.id === service.category_id)?.name || 'Serviço'}
                                                </div>
                                                <div className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center border-2 transition-all duration-200 rounded-full ${isSelected ? `${accent.bg} ${colors.border} ${accentTextOnAccent}` : 'bg-black/20 border-white/20 text-transparent'}`}>
                                                    <Check className="w-6 h-6" />
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex-1 space-y-3">
                                                        <h4 className={`text-xl font-black tracking-tight ${colors.text} group-hover:text-theme-accent transition-colors duration-200`}>
                                                            {service.name}
                                                        </h4>
                                                        {service.description && (
                                                            <p className={`text-xs line-clamp-1 opacity-50 ${colors.textSecondary}`}>
                                                                {service.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-4">
                                                            <span className={`text-base font-black tracking-tight ${accent.text}`}>
                                                                {formatCurrency(service.price, currencyRegion)}
                                                            </span>
                                                            <div className={`w-1 h-1 rounded-full ${colors.textMuted}`} />
                                                            <span className={`text-xs font-bold ${colors.textMuted} flex items-center gap-1.5`}>
                                                                <Clock className="w-3.5 h-3.5" /> {service.duration_minutes} min
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className={`absolute bottom-0 left-0 right-0 h-1 ${accent.bg} animate-shimmer`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {services.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                                    <div className={`w-20 h-20 flex items-center justify-center border-2 ${colors.surface} ${colors.border} border rounded-2xl`}>
                                        <Sparkles className={`w-10 h-10 ${colors.textMuted}`} />
                                    </div>
                                    <div>
                                        <p className={`font-black text-lg uppercase tracking-widest mb-2 ${colors.textMuted}`}>Agenda online chegando</p>
                                        <p className={`text-sm ${colors.textMuted}`}>Ainda estamos preparando os serviços por aqui.<br />Fale com a gente pelo WhatsApp para agendar agora.</p>
                                    </div>
                                    {whatsappLink && (
                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                                            className={`flex items-center gap-3 px-8 py-4 font-black text-xs uppercase tracking-widest transition-all ${accent.bg} ${accentTextOnAccent} rounded-xl`}>
                                            <Phone className="w-4 h-4" /> Falar via WhatsApp
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Professional */}
                    {quickStep === 'professional' && (
                        <div className="space-y-8 animate-reveal-fragment">
                            <div>
                                <h2 className={`text-2xl md:text-3xl font-black tracking-tight mb-2 ${colors.text}`}>Escolha o profissional</h2>
                                <p className={`${colors.textMuted} text-sm`}>Com quem você gostaria de ser atendido?</p>
                            </div>

                            {professionalCategories.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setActiveProfessionalCategory('all')}
                                        className={`px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-lg ${activeProfessionalCategory === 'all' ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted} ${colors.border} border`}`}>
                                        Todos
                                    </button>
                                    {professionalCategories.map((cat) => (
                                        <button key={cat} onClick={() => setActiveProfessionalCategory(cat)}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-lg ${activeProfessionalCategory === cat ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted} ${colors.border} border`}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                <button onClick={() => setSelectedProfessional('any')}
                                    className={`p-6 flex flex-col items-center gap-3 transition-all duration-300 rounded-2xl ${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}>
                                    <div className={`w-16 h-16 flex items-center justify-center border-2 rounded-full ${colors.surface} ${colors.border} ${colors.textMuted}`}>
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-widest text-center ${colors.text}`}>Qualquer Profissional</span>
                                </button>

                                {filteredProfessionals.map((pro, pIdx) => (
                                    <button key={pro.id}
                                        onClick={() => setSelectedProfessional(pro.id)}
                                        className={`p-6 flex flex-col items-center gap-3 transition-all duration-300 animate-reveal-fragment rounded-2xl ${selectedProfessional === pro.id ? `${accent.bg} ${accentTextOnAccent} scale-105 ${shadow.glow}` : `${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}`}>
                                        <div className={`w-16 h-16 overflow-hidden border-2 rounded-full ${colors.surface} ${colors.border}`}>
                                            {pro.photo_url ? (
                                                <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center ${colors.surface} ${colors.text}`}>{pro.name.charAt(0)}</div>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-widest text-center ${selectedProfessional === pro.id ? accentTextOnAccent : colors.text}`}>
                                            {pro.name.split(' ')[0]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Date & Time */}
                    {quickStep === 'datetime' && (
                        <div className="space-y-8 animate-reveal-fragment">
                            <div>
                                <h2 className={`text-2xl md:text-3xl font-black tracking-tight mb-2 ${colors.text}`}>Escolha a data e hora</h2>
                                <p className={`${colors.textMuted} text-sm`}>Selecione o melhor dia e horário para você.</p>
                            </div>
                            <div className="max-w-2xl mx-auto">
                                <CalendarPicker selectedDate={selectedDate} onDateSelect={setSelectedDate} forceTheme={themeOverride} fullDates={fullDates} />
                            </div>
                            {selectedDate && (
                                <div className="animate-reveal-fragment duration-700 max-w-2xl mx-auto">
                                    <TimeGrid selectedTime={selectedTime} onTimeSelect={setSelectedTime} availableSlots={availableSlots} forceTheme={themeOverride} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Contact & Confirm */}
                    {quickStep === 'contact' && (
                        <div className="space-y-8 animate-reveal-fragment max-w-2xl mx-auto">
                            <div>
                                <h2 className={`text-2xl md:text-3xl font-black tracking-tight mb-2 ${colors.text}`}>Confirme seu agendamento</h2>
                                <p className={`${colors.textMuted} text-sm`}>Revise os detalhes e informe seus dados.</p>
                            </div>

                            {/* Summary Card */}
                            <div className={`p-6 ${colors.card} ${colors.border} border rounded-2xl ${shadow.card}`}>
                                <div className="flex justify-between items-center border-b pb-4 mb-4 ${colors.divider}">
                                    <span className={`text-xs font-black uppercase tracking-[0.2em] ${colors.textMuted}`}>Resumo da Reserva</span>
                                    <div className={`p-1.5 rounded-full ${accent.bgDim} ${accent.text}`}>
                                        <Star className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 md:gap-8 mb-4">
                                    <div className="space-y-1">
                                        <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Data e Hora</p>
                                        <p className={`text-lg font-black tracking-tight ${colors.text}`}>
                                            {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {selectedTime}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Total</p>
                                        <p className={`text-lg font-black tracking-tight ${accent.text}`}>
                                            {formatCurrency(calculateTotal(), currencyRegion)}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Serviços</p>
                                    <p className={`text-sm font-bold ${colors.textSecondary}`}>
                                        {services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(' + ')}
                                    </p>
                                </div>
                                {selectedProfessional && selectedProfessional !== 'any' && (
                                    <div className="space-y-1 mt-4 pt-4 border-t ${colors.divider}">
                                        <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Profissional</p>
                                        <p className={`text-sm font-bold ${colors.textSecondary}`}>
                                            {professionals.find(p => p.id === selectedProfessional)?.name || 'Qualquer disponível'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Contact Form */}
                            <div className="space-y-6">
                                {client ? (
                                    <div className={`p-4 rounded-xl flex items-center gap-4 ${colors.surface} ${colors.border} border`}>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accent.bgDim} ${accent.text} border ${accent.borderDim}`}>
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold ${colors.text}`}>{client.name}</p>
                                            <p className={`text-sm ${colors.textMuted}`}>{client.phone}</p>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${accent.bg} ${accentTextOnAccent}`}>
                                            <Check className="w-4 h-4" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className={`${colors.textMuted} ${font.label} text-xs uppercase tracking-widest block font-bold`}>Nome Completo</label>
                                            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                                className={`w-full py-4 px-5 outline-none transition-all ${classes.input}`}
                                                placeholder="Como devemos te chamar?" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`${colors.textMuted} ${font.label} text-xs uppercase tracking-widest block font-bold`}>WhatsApp</label>
                                            <PhoneInput value={customerPhone} onChange={setCustomerPhone} defaultRegion={currencyRegion as 'BR' | 'PT'} />
                                        </div>
                                    </div>
                                )}

                                <div className={`flex items-start gap-4 p-4 rounded-xl border ${colors.surface} ${colors.border}`}>
                                    <input type="checkbox" id="privacy-quick" checked={acceptedPolicy} onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                        className={`mt-1 w-5 h-5 rounded cursor-pointer ${accent.bg} ${accentTextOnAccent}`} />
                                    <label htmlFor="privacy-quick" className={`text-sm cursor-pointer ${colors.textSecondary} leading-snug`}>
                                        Confirmo meu compromisso e aceito as <button onClick={(e) => { e.preventDefault(); setShowPolicyModal(true); }} className={`font-bold underline ${accent.text} hover:text-theme-text`}>diretrizes de cancelamento</button>.
                                    </label>
                                </div>

                                <div className={`flex items-start gap-4 p-4 rounded-xl border ${colors.surface} ${colors.border}`}>
                                    <input type="checkbox" id="marketing-optin-quick" checked={acceptedMarketing} onChange={(e) => setAcceptedMarketing(e.target.checked)}
                                        className={`mt-1 w-5 h-5 rounded cursor-pointer ${accent.bg} ${accentTextOnAccent}`} />
                                    <label htmlFor="marketing-optin-quick" className={`text-sm cursor-pointer ${colors.textSecondary} leading-snug`}>
                                        Aceito receber lembretes do meu agendamento por WhatsApp. Posso cancelar a qualquer momento.
                                    </label>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={(!client && (!customerName || !customerPhone)) || !acceptedPolicy || isSubmitting}
                                    className={`w-full py-5 flex items-center justify-center gap-3 transition-all group overflow-hidden relative ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    {isSubmitting ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Confirmar & Agendar</span>
                                            <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Flow Bottom Navigation */}
            {bookingMode === 'quick' && quickStep !== 'success' && (
                <div className="fixed bottom-0 left-0 right-0 w-full transition-all duration-200 ease-out" style={{ zIndex: 'var(--z-modal)' }}>
                    <div className={`w-full px-4 pt-4 ${colors.bg}/90 backdrop-blur-2xl border-t ${colors.divider} ${shadow.elevated}`} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                        <div className="flex items-center gap-3 max-w-3xl mx-auto pb-4">
                            {quickStep !== 'services' && (
                                <button onClick={handleQuickBack}
                                    className={`px-6 py-4 font-bold text-xs uppercase tracking-widest transition-all ${classes.buttonSecondary}`}>
                                    Voltar
                                </button>
                            )}
                            <button
                                onClick={handleQuickNext}
                                disabled={!canQuickProceed()}
                                className={`flex-1 py-4 flex items-center justify-center gap-3 transition-all group overflow-hidden relative ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                <span className="font-semibold">Continuar</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAT FLOW */}
            {bookingMode === 'chat' && (
                <>
                    {/* Barra de Progresso de Etapas */}
                    {step !== 'success' && (
                        <div className={`sticky top-0 z-[60] w-full border-b ${colors.bg}/95 ${colors.divider} backdrop-blur-md`}>
                            <div className="container mx-auto px-4 max-w-3xl py-3 flex items-center gap-0">
                                {stepLabels.map((label, idx) => (
                                    <React.Fragment key={label}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black transition-all duration-200 ${idx < currentStepNum
                                                    ? `${accent.bg} ${accentTextOnAccent}`
                                                    : idx === currentStepNum
                                                        ? `${accent.bg} ${accentTextOnAccent} scale-110 ${shadow.glow}`
                                                        : `${colors.surface} ${colors.textMuted}`
                                                }`}>
                                                {idx < currentStepNum ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-[0.1em] transition-all duration-200 ${idx === currentStepNum ? accent.text : colors.textMuted}`}>{label}</span>
                                        </div>
                                        {idx < stepLabels.length - 1 && (
                                            <div className={`flex-1 h-px mx-2 transition-all duration-300 ${idx < currentStepNum ? `${accent.bg} opacity-50` : colors.divider}`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="container mx-auto px-3 md:px-4 max-w-3xl relative z-10 pt-10 pb-32">
                        {proIdParam && step === 'services' && (
                            <div className="mb-16 animate-reveal-fragment">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-12 h-[2px] ${accent.bg}`}></div>
                                    <span className={`text-xs font-bold uppercase tracking-[0.2em] ${accent.text}`}>
                                        Grade de Serviços: {professionals.find(p => p.id === proIdParam)?.name.split(' ')[0] || 'Profissional'}
                                    </span>
                                </div>
                                <h2 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-8 ${colors.text} font-black tracking-tighter`}>
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

                                            {msg.type === 'edit_options' && step === 'edit_options' && (
                                                <div className="w-full space-y-4">
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                        <button onClick={() => { setEditMode('time'); setMessages(prev => [...prev, { id: Date.now().toString(), text: "Gostaria de mudar apenas o horário.", isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Certo. Escolha sua nova data e horário abaixo:", isAssistant: true, type: 'datetime' }]); setStep('datetime'); }}
                                                            className={`p-4 font-bold text-sm tracking-widest uppercase transition-all flex flex-col items-center gap-3 rounded-2xl ${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}>
                                                            <Clock className="w-6 h-6" /> Mudar Horário
                                                        </button>
                                                        <button onClick={() => { setEditMode('service'); setMessages(prev => [...prev, { id: Date.now().toString(), text: "Gostaria de alterar meus serviços.", isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Quais serviços você gostaria que fossem realizados?", isAssistant: true, type: 'services' }]); setStep('services'); }}
                                                            className={`p-4 font-bold text-sm tracking-widest uppercase transition-all flex flex-col items-center gap-3 rounded-2xl ${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}>
                                                            <Scissors className="w-6 h-6" /> Editar Serviços
                                                        </button>
                                                        <button onClick={() => { setEditMode('both'); setMessages(prev => [...prev, { id: Date.now().toString(), text: "Gostaria de mudar serviços e horário.", isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Ok. Primeiro, vamos revisar seus serviços.", isAssistant: true, type: 'services' }]); setStep('services'); }}
                                                            className={`p-4 font-bold text-sm tracking-widest uppercase transition-all flex flex-col items-center gap-3 rounded-2xl ${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}>
                                                            <Calendar className="w-6 h-6" /> Mudar Ambos
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'edit_confirm' && step === 'edit_confirm' && (
                                                <div className="w-full">
                                                    <div className={`p-6 text-center ${colors.card} ${colors.border} border-2 ${shadow.elevated} rounded-2xl`}>
                                                        <AlertTriangle className={`w-8 h-8 mx-auto mb-4 ${accent.text}`} />
                                                        <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>Deseja confirmar edição?</h3>
                                                        <p className={`text-sm mb-6 ${colors.textSecondary}`}>As alterações serão aplicadas ao seu agendamento e o profissional será notificado caso necessário.</p>
                                                        <div className="flex gap-4 max-w-sm mx-auto">
                                                            <button onClick={() => setStep('edit_options')} className={`flex-1 py-3 font-black text-xs uppercase tracking-widest ${classes.buttonSecondary}`}>Cancelar</button>
                                                            <button onClick={handleSubmit} disabled={isSubmitting} className={`flex-1 py-3 font-black text-xs uppercase tracking-widest ${classes.buttonPrimary} flex items-center justify-center gap-2`}>
                                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'services' && step === 'services' && (
                                                <div className="w-full space-y-8 md:space-y-12">
                                                    <div className="animate-reveal-fragment duration-700">
                                                        <div className={`p-1.5 ${colors.card} ${colors.border} border rounded-2xl backdrop-blur-xl`}>
                                                            <div className="w-full flex gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
                                                                <button onClick={() => setActiveCategory('all')}
                                                                    className={`px-5 md:px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-200 ${activeCategory === 'all'
                                                                            ? `${accent.bg} ${accentTextOnAccent} ${shadow.button} scale-105`
                                                                            : `${colors.textMuted} hover:bg-white/5`
                                                                        }`}>
                                                                    Todos
                                                                </button>
                                                                {categories.map(cat => (
                                                                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                                                        className={`px-5 md:px-8 py-2.5 rounded-xl border text-xs font-black uppercase tracking-[0.15em] transition-all duration-200 ${activeCategory === cat.id
                                                                                ? `${accent.bg} ${accentTextOnAccent} ${shadow.button} scale-105`
                                                                                : `${colors.textMuted} ${colors.border} hover:bg-white/5`
                                                                            }`}>
                                                                        {cat.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {services.length === 0 && (
                                                        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                                                            <div className={`w-20 h-20 flex items-center justify-center border-2 ${colors.surface} ${colors.border} border rounded-2xl`}>
                                                                <Sparkles className={`w-10 h-10 ${colors.textMuted}`} />
                                                            </div>
                                                            <div>
                                                                <p className={`font-black text-lg uppercase tracking-widest mb-2 ${colors.textMuted}`}>Em Breve</p>
                                                                <p className={`text-sm ${colors.textMuted}`}>Nossos serviços serão apresentados em breve.<br />Entre em contato diretamente para agendar.</p>
                                                            </div>
                                                            {whatsappLink && (
                                                                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                                                                    className={`flex items-center gap-3 px-8 py-4 font-black text-xs uppercase tracking-widest transition-all ${accent.bg} ${accentTextOnAccent} rounded-xl`}>
                                                                    <Phone className="w-4 h-4" /> Falar via WhatsApp
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
                                                                    className={`relative overflow-hidden cursor-pointer transition-all duration-300 animate-reveal-fragment group rounded-2xl ${isSelected
                                                                            ? `md:scale-[1.03] ${shadow.glow} ring-2 ${accent.ring}`
                                                                            : `${colors.card} ${colors.border} border ${shadow.card} hover:-translate-y-1`
                                                                        }`}>
                                                                    <div className="h-36 sm:h-44 md:h-48 relative overflow-hidden bg-neutral-900">
                                                                        {service.image_url ? (
                                                                            <img src={service.image_url} alt={service.name} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]" />
                                                                        ) : (
                                                                            <div className={`w-full h-full flex items-center justify-center ${colors.surface}`}>
                                                                                <Sparkles className={`w-12 h-12 opacity-10 ${accent.text}`} />
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                                        <div className={`absolute top-4 left-4 px-3 py-1 backdrop-blur-md border rounded-full text-xs font-black uppercase tracking-[0.1em] ${colors.card} ${colors.border} ${colors.textSecondary}`}>
                                                                            {categories.find(c => c.id === service.category_id)?.name || 'Serviço'}
                                                                        </div>
                                                                        <div className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center border-2 transition-all duration-200 rounded-full ${isSelected ? `${accent.bg} ${colors.border} ${accentTextOnAccent}` : 'bg-black/20 border-white/20 text-transparent'}`}>
                                                                            <Check className="w-6 h-6" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-6">
                                                                        <div className="flex justify-between items-end">
                                                                            <div className="flex-1 space-y-3">
                                                                                <h4 className={`text-2xl font-black tracking-tight ${colors.text} group-hover:text-theme-accent transition-colors duration-200`}>
                                                                                    {service.name}
                                                                                </h4>
                                                                                {service.description && (
                                                                                    <p className={`text-xs line-clamp-1 opacity-50 ${colors.textSecondary}`}>
                                                                                        {service.description}
                                                                                    </p>
                                                                                )}
                                                                                <div className="flex items-center gap-4">
                                                                                    <span className={`text-base font-black tracking-tight ${accent.text}`}>
                                                                                        {formatCurrency(service.price, currencyRegion)}
                                                                                    </span>
                                                                                    <div className={`w-1 h-1 rounded-full ${colors.textMuted}`} />
                                                                                    <span className={`text-xs font-bold ${colors.textMuted} flex items-center gap-1.5`}>
                                                                                        <Clock className="w-3.5 h-3.5" /> {service.duration_minutes} min
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <div className={`absolute bottom-0 left-0 right-0 h-1 ${accent.bg} animate-shimmer`} />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'professionals' && step === 'datetime' && !selectedProfessional && (
                                                <div className="w-full space-y-6">
                                                    {professionalCategories.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button onClick={() => setActiveProfessionalCategory('all')}
                                                                className={`px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-lg ${activeProfessionalCategory === 'all' ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted} ${colors.border} border`}`}>
                                                                Todos
                                                            </button>
                                                            {professionalCategories.map((cat) => (
                                                                <button key={cat} onClick={() => setActiveProfessionalCategory(cat)}
                                                                    className={`px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-lg ${activeProfessionalCategory === cat ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted} ${colors.border} border`}`}>
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                        <button onClick={() => { setSelectedProfessional('any'); setMessages(prev => [...prev, { id: Date.now().toString(), text: "Qualquer profissional disponível", isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Perfeita escolha. Qual dia e horário ficam melhores para você?", isAssistant: true, type: 'datetime' }]); }}
                                                            className={`p-6 flex flex-col items-center gap-3 transition-all duration-300 rounded-2xl ${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}>
                                                            <div className={`w-16 h-16 flex items-center justify-center border-2 rounded-full ${colors.surface} ${colors.border} ${colors.textMuted}`}>
                                                                <Users className="w-8 h-8" />
                                                            </div>
                                                            <span className={`text-xs font-bold uppercase tracking-widest text-center ${colors.text}`}>Qualquer Profissional</span>
                                                        </button>

                                                        {filteredProfessionals.map((pro, pIdx) => (
                                                            <button key={pro.id}
                                                                onClick={() => { setSelectedProfessional(pro.id); setMessages(prev => [...prev, { id: Date.now().toString(), text: `Quero ser atendido(a) por ${pro.name}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: `Ótimo! Vou verificar a agenda de ${pro.name.split(' ')[0]}. Qual dia e horário você prefere para a sua visita?`, isAssistant: true, type: 'datetime' }]); }}
                                                                className={`p-6 flex flex-col items-center gap-3 transition-all duration-300 animate-reveal-fragment rounded-2xl ${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}>
                                                                <div className={`w-16 h-16 overflow-hidden border-2 rounded-full ${colors.surface} ${colors.border}`}>
                                                                    {pro.photo_url ? (
                                                                        <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className={`w-full h-full flex items-center justify-center ${colors.surface} ${colors.text}`}>{pro.name.charAt(0)}</div>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs font-bold uppercase tracking-widest text-center ${colors.text}`}>
                                                                    {pro.name.split(' ')[0]}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'datetime' && step === 'datetime' && (
                                                <div className="w-full space-y-8 md:space-y-12 max-w-2xl mx-auto">
                                                    <div className={`${colors.card} ${colors.border} border-2 p-6 md:p-8 ${shadow.elevated} rounded-2xl`}>
                                                        <h3 className={`mb-8 ${colors.text} font-heading text-xl text-center md:text-left`}>Seleção de Agenda</h3>
                                                        <CalendarPicker selectedDate={selectedDate} onDateSelect={setSelectedDate} forceTheme={themeOverride} fullDates={fullDates} />
                                                    </div>
                                                    {selectedDate && (
                                                        <div className="animate-reveal-fragment duration-700">
                                                            <h4 className={`mb-6 ${accent.text} font-heading text-lg text-center md:text-left`}>Horários Disponíveis</h4>
                                                            <TimeGrid selectedTime={selectedTime} onTimeSelect={(time) => {
                                                                setSelectedTime(time);
                                                                const isLogged = !!client;
                                                                if (editingBookingId) {
                                                                    setMessages(prev => [...prev, { id: Date.now().toString(), text: `Agendar para dia ${selectedDate.toLocaleDateString('pt-BR')} às ${time}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Quase pronto. Verifique o resumo da edição abaixo.", isAssistant: true, type: 'edit_confirm' }]);
                                                                    setStep('edit_confirm');
                                                                } else {
                                                                    setMessages(prev => [...prev, { id: Date.now().toString(), text: `Agendar para dia ${selectedDate.toLocaleDateString('pt-BR')} às ${time}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: isLogged ? "Estamos quase concluindo! Como você já tem cadastro, verifique os detalhes abaixo e confirme a sua reserva." : "Estamos quase concluindo! Agora, para confirmar sua reserva, informe seus dados de contato.", isAssistant: true, type: 'contact' }]);
                                                                    setStep('contact');
                                                                }
                                                            }} availableSlots={availableSlots} forceTheme={themeOverride} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </ChatBubble>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start mb-12 animate-fade-in">
                                    <div className={`px-8 py-5 ${colors.card} ${colors.border} border rounded-2xl flex items-center gap-2`}>
                                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${colors.textMuted}`} />
                                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${colors.textMuted} opacity-60`} />
                                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${colors.textMuted} opacity-30`} />
                                    </div>
                                </div>
                            )}

                            {step === 'success' && activeBooking && (
                                <div className="max-w-xl mx-auto text-center py-20 animate-reveal-fragment">
                                    <div className="relative inline-block mb-10">
                                        <div className={`w-32 h-32 md:w-36 md:h-36 flex items-center justify-center border-4 animate-scale-check ${accent.bg} ${accentTextOnAccent} rounded-full ${shadow.elevated}`}>
                                            <Check className="w-16 h-16 md:w-20 md:h-20 stroke-[4]" />
                                        </div>
                                        <div className="absolute -top-4 -right-4 animate-bounce delay-100">
                                            <Sparkles className={`w-8 h-8 ${accent.text}`} />
                                        </div>
                                        <div className="absolute -bottom-2 -left-6 animate-bounce delay-300">
                                            <Sparkles className={`w-6 h-6 ${accent.text} opacity-50`} />
                                        </div>
                                    </div>

                                    <h2 className={`${colors.text} font-black tracking-tighter text-5xl md:text-7xl mb-6`}>
                                        {isBeauty ? 'Sua beleza agendada' : 'RESERVA CONFIRMADA'}
                                    </h2>

                                    <p className={`text-lg md:text-xl mb-12 max-w-md mx-auto leading-relaxed ${colors.textMuted}`}>
                                        {editingBookingId
                                            ? (isBeauty ? "Edição feita com sucesso! Acesse sua área de membros." : "EDIÇÃO CONCLUÍDA. ACESSE SUA ÁREA DE MEMBROS.")
                                            : (isBeauty ? "Prepare-se para um momento único de auto-cuidado e transformação." : "VOCÊ ESTÁ UM PASSO À FRENTE. PREPARAMOS TUDO PARA SUA CHEGADA.")
                                        }
                                    </p>

                                    <div className={`p-8 mb-12 text-left relative overflow-hidden group ${colors.card} ${colors.border} border-2 ${shadow.elevated} rounded-2xl`}>
                                        <div className="relative z-10 flex flex-col gap-6">
                                            <div className={`flex justify-between items-center border-b pb-4 ${colors.divider}`}>
                                                <span className={`text-xs font-black uppercase tracking-[0.2em] ${colors.textMuted}`}>Resumo da Reserva</span>
                                                <div className={`p-1.5 rounded-full ${accent.bgDim} ${accent.text}`}>
                                                    <Star className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 md:gap-8">
                                                <div className="space-y-1">
                                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Data e Hora</p>
                                                    <p className={`text-lg font-black tracking-tight ${colors.text}`}>
                                                        {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {selectedTime}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Total</p>
                                                    <p className={`text-lg font-black tracking-tight ${accent.text}`}>
                                                        {formatCurrency(calculateTotal(), currencyRegion)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Serviços</p>
                                                <p className={`text-sm font-bold ${colors.textSecondary}`}>
                                                    {services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(' + ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${accent.bgDim} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                    </div>

                                    <div className="flex flex-col gap-5">
                                        <a href={buildWhatsAppLink(business.phone, currencyRegion, `Olá! Gostaria de confirmar meu agendamento na *${business.business_name}* para o dia ${selectedDate?.toLocaleDateString('pt-BR')} às ${selectedTime}. Nos vemos em breve!`)} target="_blank" rel="noopener noreferrer"
                                            className={`group flex items-center justify-center gap-4 py-6 px-10 transition-all duration-200 relative overflow-hidden rounded-2xl ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
                                            <div className={`p-2 bg-white/10 rounded-lg group-hover:bg-white/20`}>
                                                <Send className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-black uppercase tracking-[0.2em]">Confirmar no WhatsApp</span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                                        </a>

                                        <button
                                            type="button"
                                            onClick={handleOpenClientArea}
                                            className={`group relative overflow-hidden flex flex-col gap-2 py-6 px-8 text-left transition-all duration-300 rounded-2xl border-2 w-full ${colors.card} ${colors.border} hover:border-[var(--color-accent-border)] ${shadow.card}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${colors.surface}`}>
                                                        <LayoutDashboard className={`w-5 h-5 ${colors.textSecondary}`} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-black text-sm uppercase tracking-wider ${colors.text}`}>Minha Área de Cliente</p>
                                                        <p className={`text-xs mt-0.5 ${colors.textMuted}`}>Acompanhe e gerencie seus agendamentos</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${colors.textMuted}`} />
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {[
                                                    { icon: <Calendar className="w-3 h-3" />, label: 'Histórico' },
                                                    { icon: <Check className="w-3 h-3" />, label: 'Status em tempo real' },
                                                    { icon: <MessageSquare className="w-3 h-3" />, label: 'Fale conosco' },
                                                ].map(tag => (
                                                    <span key={tag.label} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${colors.surface} ${colors.textMuted}`}>
                                                        {tag.icon}{tag.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>

                                        <button onClick={() => window.location.reload()}
                                            className={`text-xs font-black uppercase tracking-[0.3em] py-4 transition-all opacity-40 hover:opacity-100 ${colors.text} underline decoration-2 underline-offset-8 ${accent.text}`}>
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
                    </div>
                </>
            )}

            {/* Chat Flow: Modal/Bottom Sheet de Contato e Resumo */}
            {bookingMode === 'chat' && step === 'contact' && (
                <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ zIndex: 'var(--z-modal)' }}>
                    <div className={`${colors.card} ${colors.border} border w-full max-w-2xl p-6 md:p-10 relative shadow-promax-depth overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 rounded-t-3xl sm:rounded-3xl`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-2xl ${colors.text} font-heading`}>Confirmação do Agendamento</h3>
                            <button onClick={() => setStep('datetime')} className={`${colors.textMuted} hover:text-theme-text transition-colors rounded-full p-2 hover:bg-white/5`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className={`p-4 mb-8 flex justify-between items-center ${colors.surface} ${colors.border} border rounded-xl`}>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-widest ${colors.textMuted}`}>Resumo</p>
                                <p className={`font-medium ${colors.text}`}>
                                    {selectedDate?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {selectedTime}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`text-xs font-bold uppercase tracking-widest ${colors.textMuted}`}>Total</p>
                                <p className={`font-black ${accent.text}`}>
                                    {formatCurrency(calculateTotal(), currencyRegion)}
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 space-y-6">
                            {client ? (
                                <div className={`p-4 rounded-xl flex items-center gap-4 ${colors.surface} ${colors.border} border`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accent.bgDim} ${accent.text} border ${accent.borderDim}`}>
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-bold ${colors.text}`}>{client.name}</p>
                                        <p className={`text-sm ${colors.textMuted}`}>{client.phone}</p>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${accent.bg} ${accentTextOnAccent}`}>
                                        <Check className="w-4 h-4" />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className={`${colors.textMuted} ${font.label} text-xs uppercase tracking-widest block font-bold`}>Nome Completo</label>
                                        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                            className={`w-full py-4 px-5 outline-none transition-all ${classes.input}`}
                                            placeholder="Como devemos te chamar?" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`${colors.textMuted} ${font.label} text-xs uppercase tracking-widest block font-bold`}>WhatsApp</label>
                                        <PhoneInput value={customerPhone} onChange={setCustomerPhone} defaultRegion={currencyRegion as 'BR' | 'PT'} />
                                    </div>
                                </div>
                            )}

                            <div className={`flex items-start gap-4 p-4 rounded-xl border ${colors.surface} ${colors.border}`}>
                                <input type="checkbox" id="privacy" checked={acceptedPolicy} onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                    className={`mt-1 w-5 h-5 rounded cursor-pointer ${accent.bg} ${accentTextOnAccent}`} />
                                <label htmlFor="privacy" className={`text-sm cursor-pointer ${colors.textSecondary} leading-snug`}>
                                    Confirmo meu compromisso e aceito as <button onClick={(e) => { e.preventDefault(); setShowPolicyModal(true); }} className={`font-bold underline ${accent.text} hover:text-theme-text`}>diretrizes de cancelamento</button>.
                                </label>
                            </div>

                            <div className={`flex items-start gap-4 p-4 rounded-xl border ${colors.surface} ${colors.border}`}>
                                <input type="checkbox" id="marketing-optin" checked={acceptedMarketing} onChange={(e) => setAcceptedMarketing(e.target.checked)}
                                    className={`mt-1 w-5 h-5 rounded cursor-pointer ${accent.bg} ${accentTextOnAccent}`} />
                                <label htmlFor="marketing-optin" className={`text-sm cursor-pointer ${colors.textSecondary} leading-snug`}>
                                    Aceito receber lembretes do meu agendamento por WhatsApp. Posso cancelar a qualquer momento.
                                </label>
                            </div>

                            <div className="pt-2">
                                <button onClick={handleSubmit}
                                    disabled={(!client && (!customerName || !customerPhone)) || !acceptedPolicy || isSubmitting}
                                    className={`w-full py-5 flex items-center justify-center gap-3 transition-all group overflow-hidden relative ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    {isSubmitting ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Confirmar & Agendar</span>
                                            <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Flow: Botão Flutuante "Avançar" */}
            {bookingMode === 'chat' && step === 'services' && (
                <div
                  className={`fixed bottom-0 left-0 right-0 w-full transition-all duration-200 ease-out ${selectedServices.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
                  style={{ zIndex: 'var(--z-modal)' }}
                >
                    <div className={`w-full px-4 pt-4 ${colors.bg}/90 backdrop-blur-2xl border-t ${colors.divider} ${shadow.elevated}`} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                        <button id="next-button" onClick={() => {
                            const serviceNames = services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(', ');
                            if (editMode === 'service') {
                                setMessages(prev => [...prev, { id: Date.now().toString(), text: `Quero confirmar os novos serviços: ${serviceNames}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Perfeito. As alterações estão prontas para serem salvas.", isAssistant: true, type: 'edit_confirm' }]);
                                setStep('edit_confirm');
                            } else if (editMode === 'both') {
                                setMessages(prev => [...prev, { id: Date.now().toString(), text: `Confirmado os serviços: ${serviceNames}. Agora quero mudar o horário.`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Ótimo! Agora escolha a nova data e horário para o seu agendamento.", isAssistant: true, type: 'datetime' }]);
                                setStep('datetime');
                            } else {
                                setMessages(prev => [...prev, { id: Date.now().toString(), text: `Quero agendar: ${serviceNames}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Com qual profissional você gostaria de realizar esses serviços? Nossa equipe está pronta para te atender.", isAssistant: true, type: 'professionals' }]);
                                setStep('datetime');
                            }
                        }}
                            className={`w-full flex items-center justify-between overflow-hidden group relative py-4 sm:py-5 px-6 sm:px-8 rounded-2xl ${classes.buttonPrimary} transition-all duration-200`}>
                            <div className="flex flex-col items-start z-10">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase opacity-60">Total</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-xs font-black bg-black/15`}>
                                        {selectedServices.length} {selectedServices.length === 1 ? 'ITEM' : 'ITENS'}
                                    </span>
                                </div>
                                <span className="text-xl sm:text-2xl font-black leading-none mt-0.5">
                                    {formatCurrency(calculateTotal(), currencyRegion)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 z-10">
                                <span className="font-black text-xs uppercase tracking-widest">
                                    {editingBookingId ? 'Continuar Edição' : 'Avançar'}
                                </span>
                                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1.5 transition-transform duration-300" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                        </button>
                    </div>
                </div>
            )}

            {/* Success State (shared between modes) */}
            {quickStep === 'success' && activeBooking && (
                <div className="max-w-xl mx-auto text-center py-20 animate-reveal-fragment px-4">
                    <div className="relative inline-block mb-10">
                        <div className={`w-32 h-32 md:w-36 md:h-36 flex items-center justify-center border-4 animate-scale-check ${accent.bg} ${accentTextOnAccent} rounded-full ${shadow.elevated}`}>
                            <Check className="w-16 h-16 md:w-20 md:h-20 stroke-[4]" />
                        </div>
                        <div className="absolute -top-4 -right-4 animate-bounce delay-100">
                            <Sparkles className={`w-8 h-8 ${accent.text}`} />
                        </div>
                        <div className="absolute -bottom-2 -left-6 animate-bounce delay-300">
                            <Sparkles className={`w-6 h-6 ${accent.text} opacity-50`} />
                        </div>
                    </div>

                    <h2 className={`${colors.text} font-black tracking-tighter text-5xl md:text-7xl mb-6`}>
                        {isBeauty ? 'Sua beleza agendada' : 'RESERVA CONFIRMADA'}
                    </h2>

                    <p className={`text-lg md:text-xl mb-12 max-w-md mx-auto leading-relaxed ${colors.textMuted}`}>
                        {editingBookingId
                            ? (isBeauty ? "Edição feita com sucesso! Acesse sua área de membros." : "EDIÇÃO CONCLUÍDA. ACESSE SUA ÁREA DE MEMBROS.")
                            : (isBeauty ? "Prepare-se para um momento único de auto-cuidado e transformação." : "VOCÊ ESTÁ UM PASSO À FRENTE. PREPARAMOS TUDO PARA SUA CHEGADA.")
                        }
                    </p>

                    <div className={`p-8 mb-12 text-left relative overflow-hidden group ${colors.card} ${colors.border} border-2 ${shadow.elevated} rounded-2xl`}>
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className={`flex justify-between items-center border-b pb-4 ${colors.divider}`}>
                                <span className={`text-xs font-black uppercase tracking-[0.2em] ${colors.textMuted}`}>Resumo da Reserva</span>
                                <div className={`p-1.5 rounded-full ${accent.bgDim} ${accent.text}`}>
                                    <Star className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:gap-8">
                                <div className="space-y-1">
                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Data e Hora</p>
                                    <p className={`text-lg font-black tracking-tight ${colors.text}`}>
                                        {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {selectedTime}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Total</p>
                                    <p className={`text-lg font-black tracking-tight ${accent.text}`}>
                                        {formatCurrency(calculateTotal(), currencyRegion)}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Serviços</p>
                                <p className={`text-sm font-bold ${colors.textSecondary}`}>
                                    {services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(' + ')}
                                </p>
                            </div>
                        </div>
                        <div className={`absolute inset-0 bg-gradient-to-br ${accent.bgDim} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    </div>

                    <div className="flex flex-col gap-5">
                        <a href={buildWhatsAppLink(business.phone, currencyRegion, `Olá! Gostaria de confirmar meu agendamento na *${business.business_name}* para o dia ${selectedDate?.toLocaleDateString('pt-BR')} às ${selectedTime}. Nos vemos em breve!`)} target="_blank" rel="noopener noreferrer"
                            className={`group flex items-center justify-center gap-4 py-6 px-10 transition-all duration-200 relative overflow-hidden rounded-2xl ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
                            <div className={`p-2 bg-white/10 rounded-lg group-hover:bg-white/20`}>
                                <Send className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.2em]">Confirmar no WhatsApp</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                        </a>

                        <button
                            type="button"
                            onClick={handleOpenClientArea}
                            className={`group relative overflow-hidden flex flex-col gap-2 py-6 px-8 text-left transition-all duration-300 rounded-2xl border-2 w-full ${colors.card} ${colors.border} hover:border-[var(--color-accent-border)] ${shadow.card}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${colors.surface}`}>
                                        <LayoutDashboard className={`w-5 h-5 ${colors.textSecondary}`} />
                                    </div>
                                    <div>
                                        <p className={`font-black text-sm uppercase tracking-wider ${colors.text}`}>Minha Área de Cliente</p>
                                        <p className={`text-xs mt-0.5 ${colors.textMuted}`}>Acompanhe e gerencie seus agendamentos</p>
                                    </div>
                                </div>
                                <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${colors.textMuted}`} />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {[
                                    { icon: <Calendar className="w-3 h-3" />, label: 'Histórico' },
                                    { icon: <Check className="w-3 h-3" />, label: 'Status em tempo real' },
                                    { icon: <MessageSquare className="w-3 h-3" />, label: 'Fale conosco' },
                                ].map(tag => (
                                    <span key={tag.label} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${colors.surface} ${colors.textMuted}`}>
                                        {tag.icon}{tag.label}
                                    </span>
                                ))}
                            </div>
                        </button>

                        <button onClick={() => window.location.reload()}
                            className={`text-xs font-black uppercase tracking-[0.3em] py-4 transition-all opacity-40 hover:opacity-100 ${colors.text} underline decoration-2 underline-offset-8 ${accent.text}`}>
                            Realizar novo agendamento
                        </button>
                    </div>

                    <div className="mt-16 opacity-0 animate-fade-in [animation-delay:1500ms]">
                        <GoogleReviewPrompt businessName={business.business_name} isBeauty={isBeauty} googlePlaceId={businessSettings?.google_place_id} />
                    </div>
                </div>
            )}

            {/* Float Gallery (Desktop) */}
            {gallery.length > 0 && quickStep !== 'success' && step !== 'success' && (
                <div className="fixed bottom-10 left-10 z-[60] hidden xl:block animate-fade-in">
                    <div className={`p-4 ${colors.card} ${colors.border} border ${shadow.elevated} rounded-2xl w-72`}>
                        <p className={`text-xs uppercase tracking-[0.2em] mb-4 ${colors.textMuted} font-medium`}>Atmosfera & Arte</p>
                        <div className="grid grid-cols-2 gap-2">
                            {gallery.slice(0, 4).map((item) => (
                                <div key={item.id} className={`aspect-square overflow-hidden rounded-lg border ${colors.border}`}>
                                    <img src={item.image_url} alt="Portfolio" className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Policy Modal */}
            {showPolicyModal && (
                <div className="fixed inset-0 flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" style={{ zIndex: 'var(--z-modal)' }}>
                    <div className={`${colors.card} ${colors.border} border max-w-xl w-full p-10 relative shadow-promax-depth overflow-hidden rounded-3xl`}>
                        <button onClick={() => setShowPolicyModal(false)} className={`absolute top-6 right-6 ${colors.textMuted} hover:text-theme-text transition-colors z-30`}><X className="w-8 h-8" /></button>
                        <div className="relative z-10 space-y-6">
                            <h3 className={`text-2xl ${colors.text} flex items-center gap-3`}>
                                <AlertTriangle className={`w-6 h-6 ${accent.text}`} />
                                Políticas Administrativas
                            </h3>
                            <div className={`leading-relaxed ${colors.textSecondary} max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar`}>
                                {businessSettings?.cancellation_policy ?
                                    <p className="whitespace-pre-wrap">{businessSettings.cancellation_policy}</p> :
                                    <p>Nossos profissionais reservam tempo exclusivo para você. Cancelamentos devem ser realizados com antecedência mínima de 24h. O não comparecimento impacta a logística de nossa equipe.</p>
                                }
                            </div>
                            <button onClick={() => setShowPolicyModal(false)}
                                className={`w-full py-4 ${classes.buttonPrimary}`}>
                                Compreendi as Políticas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!pendingCancelBookingId}
                title="Cancelar agendamento"
                message="Tem certeza que deseja cancelar sua solicitação de agendamento?"
                confirmLabel="Cancelar agendamento"
                variant="danger"
                onCancel={() => setPendingCancelBookingId(null)}
                onConfirm={() => {
                    if (pendingCancelBookingId) void handleCancelBooking(pendingCancelBookingId);
                    setPendingCancelBookingId(null);
                }}
            />
        </div>
    );
};
