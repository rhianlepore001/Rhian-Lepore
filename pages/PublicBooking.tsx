import { useBookingStatusLive } from '../hooks/useBookingStatusLive';
import { isDemoMode } from '../lib/demo/mode';
import { accessibleAccent } from '../lib/establishment/model';
import '../styles/booking-embed.css';
import { matchesServiceSearch } from '../utils/serviceSearch';
import React, { useState, useEffect, useMemo } from 'react';
import { useWhatsAppTemplates } from '../hooks/useWhatsAppTemplates';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Star, Calendar, Clock, MapPin, Instagram, Scissors, Sparkles, User, ArrowRight, Check, ChevronLeft, ChevronRight, Phone, Users, Loader2, X, AlertTriangle, Send, MessageSquare, LayoutDashboard, Package, Crown } from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';
import { CalendarPicker } from '../components/CalendarPicker';
import {
    addDaysToDateString,
    dateStringToLocalDate,
    formatTimeInTimeZone,
    getDateStringInTimeZone,
    getTodayInTimeZone,
    isZonedSlotInPast,
    resolveBusinessTimezone,
    zonedDateTimeToIso,
} from '../utils/businessTimezone';
import { parseDate } from '../utils/date';
import { TimeGrid } from '../components/TimeGrid';
import { ClientAuthModal } from '../components/ClientAuthModal';
import { usePublicClient } from '../contexts/PublicClientContext';
import { PublicBusinessHeader } from '../components/PublicBusinessHeader';
import { PublicProductsShowcase } from '../components/booking/PublicProductsShowcase';
import { ChatBubble } from '../components/ChatBubble';
import { useCancelPublicBooking, useFindActivePublicBooking, useSubmitPublicBooking, useBusinessProfileBySlug, useBusinessSettings, usePublicServices, usePublicCategories, usePublicProfessionals, usePublicGallery, usePublicProducts } from '../hooks/usePublicBooking';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { formatCurrency, formatDuration, normalizeRegion } from '../utils/formatters';
import { buildWhatsAppLink } from '../utils/whatsappTemplates';
import { capBookingDuration } from '../utils/serviceDuration';
import { logger } from '../utils/Logger';
import { useZonedAvailableSlots } from '../hooks/useZonedAvailableSlots';
import { mergeFreshPublicBooking } from '../utils/publicBookingFresh';
import { fetchEditBooking, fetchPublicClientByPhone, fetchClientByPhone, fetchPublicBookingById, fetchFullDates, findNextDateWithSlots, getFirstAvailableProfessional, uploadClientPhoto, upsertPublicClientSession } from '../services/publicBooking';
import { getPublicBookingSection, shouldLandOnClientArea } from '../utils/publicBookingLanding';
import { getPublicBookingAwaitingWhatsAppText, getPublicGroupBookingWhatsAppText, getPublicBookingSubmitLabel, getPublicBookingSuccessCopy } from '../utils/publicBookingCopy';
import { isPublicBookingAutoConfirm } from '../utils/onlineBookingApproval';
import { resolveCancellationPolicyParts } from '../utils/cancellationPolicyCopy';
import { CancellationPolicyText } from '../components/CancellationPolicyText';
import {
    CANCEL_WINDOW_CLOSED_MESSAGE,
    isCancelWindowClosedError,
    readCancelCutoffHours,
    talkToBusinessLabel,
} from '../utils/clientCancelCutoff';
import { clientEditRequestSentMessage, isClientEditPending } from '../utils/clientEditRequest';
import { isSlotUnavailableError } from '../utils/supabaseRpc';
import {
    isLeadTimeViolationError,
    leadTimeEmptySlotsMessageMinutes,
    leadTimeMinutesFromError,
    leadTimeViolationMessageMinutes,
} from '../utils/bookingLeadTime';
import { Checkbox, ConfirmModal, Button, useToast } from '@/components/ui';
import { PublicGroupBooking } from '@/components/booking/PublicGroupBooking';
import { PublicBookingMemberships } from '@/components/membership/PublicBookingMemberships';
import { ClubPromotion } from '@/components/membership/ClubPromotion';
import { usePublicMembershipPlans } from '@/hooks/useMemberships';
import { PublicCustomerReviews } from '@/components/reviews/PublicCustomerReviews';
import { usePublicCustomerReviews } from '@/hooks/useCustomerReviews';
import FocusTrap from 'focus-trap-react';
import { openWhatsApp } from '../utils/openWhatsApp';

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
    const whatsapp = useWhatsAppTemplates(slug ?? '');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const proIdParam = searchParams.get('pro');
    const embeddedSite = searchParams.get('embed') === 'site';
    const embeddedAppearance = searchParams.get('appearance') === 'light' ? 'light' : 'dark';
    const embeddedPreset = searchParams.get('preset');
    const embeddedAccent = accessibleAccent(searchParams.get('brand') || '#C89B79', embeddedAppearance);
    const rebookParam = searchParams.get('rebook') || searchParams.get('service');
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
    const customerReviews = usePublicCustomerReviews(businessId);
    const [reviewsOpen, setReviewsOpen] = useState(() => searchParams.get('avaliacoes') === '1');
    const { data: businessSettings, isFetched: businessSettingsFetched } = useBusinessSettings(businessId);
    // Fuso fixo do negócio (nunca o do navegador). Antes da migration
    // business_settings.timezone, a chave não existe e caímos na região.
    const businessTimezone = useMemo(
        () => resolveBusinessTimezone({
            timezone: (businessSettings as { timezone?: string | null } | null | undefined)?.timezone,
            region: business?.region,
        }),
        [businessSettings, business?.region],
    );
    const businessToday = getTodayInTimeZone(businessTimezone);
    const { data: servicesData = [] } = usePublicServices(businessId);
    const { data: categoriesData = [] } = usePublicCategories(businessId);
    const { data: professionalsData = [] } = usePublicProfessionals(businessId);
    const { data: galleryData = [] } = usePublicGallery(businessId);
    const { data: publicProducts = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = usePublicProducts(businessId);
    const { data: clubPlans = [] } = usePublicMembershipPlans(businessId);

    const bookingSection = getPublicBookingSection(searchParams);
    const catalogNavRef = React.useRef<HTMLElement>(null);
    const quickFlowRef = React.useRef<HTMLElement>(null);

    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeProfessionalCategory, setActiveProfessionalCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [productSearch, setProductSearch] = useState('');
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
    const [slotsRefreshKey, setSlotsRefreshKey] = useState(0);
    const [nextDayBusy, setNextDayBusy] = useState(false);
    const [leadTimeAlert, setLeadTimeAlert] = useState<string | null>(null);
    const [leadTimeAlertKey, setLeadTimeAlertKey] = useState(0);
    const [editWindowClosed, setEditWindowClosed] = useState(false);
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
    const [groupMode, setGroupMode] = useState(false);
    const [groupBooked, setGroupBooked] = useState(false);

    const { client, register, login, establishSession, hydrateFromStorage } = usePublicClient();

    const isBeauty = business?.user_type === 'beauty';
    const themeOverride: ThemeVariant = isBeauty ? 'beauty' : 'barber';
    const { colors, accent, classes, shadow, radius, font, isDark } = useBrutalTheme({ override: themeOverride });

    useEffect(() => {
        if (!business) return;
        const html = document.documentElement;
        html.setAttribute('data-theme', themeOverride);
        if (embeddedSite) {
            html.setAttribute('data-mode', embeddedAppearance);
        } else if (!isDemoMode()) {
            html.setAttribute('data-mode', themeOverride === 'beauty' ? 'light' : 'dark');
        }
    }, [business, themeOverride, embeddedSite, embeddedAppearance]);

    const accentTextOnAccent = 'text-[var(--color-on-accent)]';
    // Classes literais estáticas (variante interpolada não gera CSS no build estático do Tailwind)
    const selectionClasses = isBeauty
        ? 'selection:bg-theme-accent selection:text-[#fff]'
        : 'selection:bg-theme-accent selection:text-[#000]';

    // Sincroniza dados do cliente logado com os campos do formulário
    useEffect(() => {
        if (client) {
            setCustomerName(client.name);
            setCustomerPhone(client.phone);
        }
    }, [client]);

    useEffect(() => {
        if (!businessId) return;
        hydrateFromStorage(businessId);
    }, [businessId, hydrateFromStorage]);

    useEffect(() => {
        if (!slug || !businessId || !client) return;
        if (client.business_id !== businessId) return;
        // Acabou de agendar nesta visita: fica na tela de confirmação (que tem o
        // atalho para a Minha Área). O redirecionamento continua valendo para quem
        // já chega logado no link.
        if (step === 'success' || groupBooked) return;
        if (!shouldLandOnClientArea({ isLoggedInForBusiness: true, searchParams })) return;
        navigate(`/minha-area/${slug}`, { replace: true });
    }, [slug, businessId, client, searchParams, navigate, step, groupBooked]);

    // Carrega agendamento diretamente pela tabela quando há ?edit= na URL e o cliente está logado
    useEffect(() => {
        // Espera o fuso do negócio para converter o horário do agendamento.
        if (!editParam || !businessId || !businessSettingsFetched) return;
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
    }, [editParam, businessId, client?.phone, businessSettingsFetched]);

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
                // Junta (não substitui): a RPC devolve só parte dos campos do pedido.
                setActiveBooking((prev: any) => mergeFreshPublicBooking(prev, booking));
            }
        } catch (error) {
            logger.error('Error fetching fresh active booking', error);
        }
    };

    const activeBookingId = activeBooking?.id;
    const refreshActiveStatus = () => {
        if (activeBookingId) void fetchFreshActiveBooking(activeBookingId);
    };
    useBookingStatusLive(activeBookingId ? [activeBookingId] : [], refreshActiveStatus, refreshActiveStatus);

    useEffect(() => {
        if (!activeBookingId || activeBooking?.status !== 'pending') return;
        const interval = setInterval(() => void fetchFreshActiveBooking(activeBookingId), 5000);
        return () => clearInterval(interval);
    }, [activeBookingId, activeBooking?.status, businessId, client?.phone, customerPhone, activeBooking?.customer_phone]);

    useEffect(() => {
        // Mesmo cuidado dos horários: fuso muda quando os settings chegam;
        // resposta de uma busca já substituída não sobrescreve a atual.
        let cancelled = false;
        const fetchFullDatesAsync = async () => {
            if (businessId) {
                const startDate = getTodayInTimeZone(businessTimezone);
                const endDate = addDaysToDateString(startDate, 60);

                try {
                    const dates = await fetchFullDates(businessId, startDate, endDate, selectedProfessional === 'any' ? null : selectedProfessional, calculateDuration());
                    if (dates && !cancelled) setFullDates(dates);
                } catch { /* full dates fetch failed silently */ }
            }
        };
        fetchFullDatesAsync();
        return () => {
            cancelled = true;
        };
    }, [businessId, selectedProfessional, businessTimezone]);

    

    useEffect(() => {
        if (business && services.length >= 0 && categories.length >= 0) {
            setIsDataReady(true);
        }
    }, [business, services, categories]);

    useEffect(() => {
        if (business) {
            const originalBg = document.body.style.backgroundColor;
            const originalColor = document.body.style.color;
            const targetBg = isBeauty ? 'var(--color-card)' : '#121212';
            const targetColor = 'var(--color-text)';

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
    const successRef = React.useRef<HTMLDivElement>(null);
    const previousQuickStep = React.useRef(quickStep);
    useEffect(() => {
        if (previousQuickStep.current === quickStep) return;
        previousQuickStep.current = quickStep;
        const heading = quickFlowRef.current?.querySelector('h2');
        if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
        }
        quickFlowRef.current?.scrollIntoView?.({ block: 'start' });
    }, [quickStep]);

    const showingSuccess = step === 'success' && Boolean(activeBooking);
    useEffect(() => {
        if (showingSuccess) successRef.current?.scrollIntoView?.({ block: 'start' });
    }, [showingSuccess]);
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

    const bookingSections = [
        { id: 'services', label: 'Serviços', icon: Scissors },
        ...(publicProducts.length > 0 || bookingSection === 'products' ? [{ id: 'products', label: 'Produtos', icon: Package } as const] : []),
        ...(!editingBookingId && clubPlans.length > 0 ? [{ id: 'club', label: 'Clube', icon: Crown } as const] : []),
    ] as const;
    const browseSection = quickStep === 'services' && (bookingSection !== 'club' || (!editingBookingId && clubPlans.length > 0))
        ? bookingSection
        : 'services';

    const openBookingSection = (section: typeof bookingSection, focusNav = false) => {
        if (section !== bookingSection) {
            const next = new URLSearchParams(searchParams);
            if (section === 'services') {
                next.delete('secao');
                next.set('agendar', '1');
            } else {
                next.set('secao', section === 'products' ? 'produtos' : 'clube');
            }
            setSearchParams(next);
        }
        if (focusNav) {
            const button = catalogNavRef.current?.querySelector<HTMLButtonElement>(`[data-section="${section}"]`);
            button?.focus();
            button?.scrollIntoView?.({ block: 'nearest' });
        }
    };

    const calculateTotal = () =>
        services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0);
    const calculateDuration = () => capBookingDuration(services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.duration_minutes, 0));

    const selectedDateStr = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : null;
    // Horários livres no fuso do negócio; respostas obsoletas (fuso padrão da
    // região vs. fuso dos settings, ou troca rápida de data) são descartadas.
    const slotsResult = useZonedAvailableSlots({
        businessId,
        dateStr: selectedDateStr,
        professionalId: selectedProfessional === 'any' ? null : selectedProfessional,
        durationMinutes: calculateDuration(),
        timezone: businessTimezone,
        refreshKey: slotsRefreshKey,
    });
    const availableSlots = slotsResult.slots;
    const leadEmptyMessage = slotsResult.emptyReason === 'lead_time'
        ? leadTimeEmptySlotsMessageMinutes(slotsResult.leadTimeMinutes, selectedDateStr === businessToday, { hasCta: true })
        : undefined;

    const handleSeeNextDay = async () => {
        if (!businessId || !selectedDateStr) return;
        setNextDayBusy(true);
        try {
            const next = await findNextDateWithSlots(
                businessId,
                selectedDateStr,
                selectedProfessional === 'any' ? null : selectedProfessional,
                calculateDuration(),
                businessTimezone,
            );
            if (!next) {
                showToast('Não há horários nos próximos 14 dias. Escolha outro dia no calendário.', { type: 'info' });
                return;
            }
            setLeadTimeAlert(null);
            setSelectedDate(dateStringToLocalDate(next));
            setSelectedTime(null);
        } catch {
            showToast('Não foi possível buscar o próximo dia. Tente outro dia no calendário.', 'error');
        } finally {
            setNextDayBusy(false);
        }
    };

    const leadEmptyAction = slotsResult.emptyReason === 'lead_time' ? (
        <Button
            type="button"
            variant="outline"
            data-testid="lead-time-next-day"
            onClick={() => { void handleSeeNextDay(); }}
            disabled={nextDayBusy}
            className="shadow-none"
        >
            {nextDayBusy ? 'Buscando…' : 'Ver próximo dia com horário'}
        </Button>
    ) : undefined;

    const professionalCategories = Array.from(new Set((professionals || []).flatMap((p: any) => p.specialties || []))).filter(Boolean);
    const filteredBookingServices = services.filter(service =>
        (activeCategory === 'all' || (activeCategory === 'no-category' && !service.category_id) || service.category_id === activeCategory)
        && matchesServiceSearch(service, searchQuery),
    );

    const filteredProfessionals = activeProfessionalCategory === 'all'
        ? professionals
        : professionals.filter((p: any) => (p.specialties || []).includes(activeProfessionalCategory));

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Item 5b: pedido/agendamento cancelado -> recomeça o fluxo com os
    // mesmos serviços; o cliente escolhe um novo horário.
    const handleRescheduleCancelled = () => {
        const ids: string[] = (activeBooking?.service_ids ?? []).filter((id: string) => services.some((s) => s.id === id));
        setActiveBooking(null);
        setEditingBookingId(null);
        setSelectedServices(ids);
        setSelectedDate(null);
        setSelectedTime(null);
        setStep('services');
        setQuickStep('services');
    };

    const handleCancelBooking = async (bookingId: string) => {
        const phone = customerPhone || client?.phone || '';
        if (!phone) {
            showToast('Não foi possível cancelar. Informe o WhatsApp usado no agendamento.', 'error');
            return;
        }
        try {
            await cancelBookingMutation.mutateAsync({ bookingId, phone });
            setActiveBooking(null);
            setStep('services');
            setQuickStep('services');
            showToast('Agendamento cancelado com sucesso.', 'success');
        } catch (error) {
            logger.error('Error cancelling booking', error);
            showToast('Não foi possível cancelar o agendamento. Tente de novo ou fale com o salão.', 'error');
        }
    };

    const requestCancelBooking = (bookingId: string) => {
        setPendingCancelBookingId(bookingId);
    };

    const handleEditBooking = (booking: any) => {
        setEditingBookingId(booking.id);
        setOriginalTimeISO(booking.original_appointment_time || booking.appointment_time);
        // Data/hora do agendamento no fuso do negócio (não do navegador).
        setSelectedDate(dateStringToLocalDate(getDateStringInTimeZone(booking.appointment_time, businessTimezone)));
        setSelectedTime(formatTimeInTimeZone(booking.appointment_time, businessTimezone));

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
            showToast('Por favor, preencha todos os campos e aceite a política de agendamento.', 'warning');
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
            if (isZonedSlotInPast(dateStr, selectedTime, businessTimezone)) {
                showToast('Esse horário já passou. Escolha outro horário.', 'warning');
                return;
            }
            // Hora de parede do negócio + offset real daquele dia (horário de
            // verão incluso). Antes: offset fixo -03:00 / +00:00 por região.
            const appointmentTimeISO = zonedDateTimeToIso(dateStr, selectedTime, businessTimezone);

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
                productLines: [],
                reviewToken: !editingBookingId && !isDemoMode() ? globalThis.crypto?.randomUUID?.() : undefined,
            });

            setActiveBooking(booking);

            await establishClientSession(photoUrl);
            setStep('success');
            setQuickStep('success');
        } catch (error: any) {
            logger.error('Error creating booking', error);
            if (isLeadTimeViolationError(error)) {
                setSelectedTime(null);
                setQuickStep('datetime');
                setStep('datetime');
                setSlotsRefreshKey((key) => key + 1);
                setLeadTimeAlert(
                    leadTimeViolationMessageMinutes(leadTimeMinutesFromError(error, slotsResult.leadTimeMinutes)),
                );
                setLeadTimeAlertKey((key) => key + 1);
            } else if (isCancelWindowClosedError(error)) {
                setEditWindowClosed(true);
                showToast(CANCEL_WINDOW_CLOSED_MESSAGE, 'info');
            } else if (isSlotUnavailableError(error)) {
                showToast('Este horário acabou de ser ocupado. Escolha outro.', 'error');
            } else {
                showToast('Não foi possível concluir seu agendamento agora. Tente novamente em instantes ou fale com a equipe pelo WhatsApp.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const currencyRegion = normalizeRegion(business?.region || businessSettings?.currency_symbol);
    const whatsappLink = business?.phone
        ? buildWhatsAppLink(business.phone, currencyRegion)
        : null;

    const handleTalkEdit = () => {
        if (!business?.phone) {
            showToast('O estabelecimento ainda não informou um WhatsApp.', 'info');
            return;
        }
        const name = (customerName || client?.name || '').trim();
        const msg = whatsapp.render('client_change', isBeauty ? 'beauty' : 'barber', {
            cliente: name,
        });
        openWhatsApp(buildWhatsAppLink(business.phone, currencyRegion, msg));
    };

    const stepIndex = { services: 0, datetime: 1, contact: 2, success: 3 };
    const currentStepNum = stepIndex[step as keyof typeof stepIndex] ?? 0;
    const isBookingCancelled = activeBooking?.status === 'cancelled';
    const editSentIso = activeBooking?.original_appointment_time || originalTimeISO || activeBooking?.appointment_time;
    const pendingEdit = isClientEditPending(activeBooking ?? {});
    const autoConfirm = isPublicBookingAutoConfirm(businessSettings);
    const policySettings = businessSettings as {
        client_cancel_cutoff_hours?: number;
        client_cancel_note?: string | null;
        client_cancel_policy_text?: string | null;
        cancellation_policy?: string | null;
    } | null | undefined;
    const cancellationPolicyParts = resolveCancellationPolicyParts({
        cutoffHours: readCancelCutoffHours(policySettings?.client_cancel_cutoff_hours),
        businessName: business?.business_name,
        clientCancelPolicyText: policySettings?.client_cancel_policy_text,
        clientCancelNote: policySettings?.client_cancel_note,
        legacyPolicy: policySettings?.cancellation_policy,
    });
    const inlinePolicy = (
        <div
            className={`rounded-xl border px-4 py-3 ${colors.surface} ${colors.border}`}
            data-testid="public-cancellation-policy-inline"
        >
            <p className={`mb-1.5 text-sm font-semibold ${colors.text}`}>Política de agendamento</p>
            <CancellationPolicyText
                parts={cancellationPolicyParts}
                className={`text-sm leading-relaxed ${colors.textSecondary}`}
                labelClassName={colors.text}
            />
        </div>
    );
    const submitLabel = getPublicBookingSubmitLabel({ autoConfirm, isEdit: Boolean(editingBookingId) });
    const successCopy = getPublicBookingSuccessCopy({
        isBeauty,
        userType: business?.user_type,
        status: activeBooking?.status,
        isEdit: pendingEdit,
        editSentSubtitle: pendingEdit && editSentIso
            ? clientEditRequestSentMessage(editSentIso, businessTimezone)
            : null,
    });
    const talkEditLabel = talkToBusinessLabel(business?.business_name);
    const successServiceIds = selectedServices.length > 0
        ? selectedServices
        : ((activeBooking?.service_ids as string[] | undefined) ?? []);
    const successTotal = selectedServices.length > 0
        ? calculateTotal()
        : Number(activeBooking?.total_price ?? 0);
    const successServiceNames = services.filter(s => successServiceIds.includes(s.id)).map(s => s.name).join(' + ');
    const stepLabels = ['Serviços', 'Agenda', 'Dados', successCopy.stepperLastLabel];
    // Resumo pós-agendamento: usa o horário gravado, exibido no fuso do negócio.
    const bookedAt: Date | null = parseDate(activeBooking?.appointment_time ?? null);
    const successDateLong = bookedAt
        ? bookedAt.toLocaleDateString('pt-BR', { timeZone: businessTimezone, weekday: 'short', day: '2-digit', month: 'short' })
        : selectedDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    const successTime = bookedAt ? formatTimeInTimeZone(bookedAt, businessTimezone) : selectedTime;
    const successWhatsAppText = getPublicBookingAwaitingWhatsAppText({
        template: whatsapp.templates.client_request_confirm,
        confirmed: activeBooking?.status === 'confirmed',
        theme: isBeauty ? 'beauty' : 'barber',
        businessName: business?.business_name || '',
        dateLabel: bookedAt
            ? bookedAt.toLocaleDateString('pt-BR', { timeZone: businessTimezone })
            : selectedDate?.toLocaleDateString('pt-BR') ?? '',
        timeLabel: successTime ?? '',
        serviceLabel: services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(', '),
        professionalName: selectedProfessional && selectedProfessional !== 'any'
            ? (professionals.find(p => p.id === selectedProfessional)?.name
                || professionals.find(p => p.id === selectedProfessional)?.full_name
                || null)
            : null,
    });

    // Quick flow stepper data
    const quickSteps = [
        { key: 'services' as const, label: 'Serviços' },
        { key: 'professional' as const, label: 'Profissional' },
        { key: 'datetime' as const, label: 'Data e Hora' },
        { key: 'contact' as const, label: 'Revisão' },
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
        <div id="booking-root" data-site-embed={embeddedSite || undefined} data-appearance={embeddedAppearance} data-preset={embeddedSite ? embeddedPreset || undefined : undefined} style={embeddedSite ? { '--color-accent': embeddedAccent.background, '--color-on-accent': embeddedAccent.foreground } as React.CSSProperties : undefined} className={`min-h-screen ${colors.bg} ${colors.text} ${selectionClasses} font-sans relative overflow-x-hidden pb-40 transition-colors duration-700`}>
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-noise z-[1]" />

            {/* Sophisticated Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ${accent.bgDim}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] bg-[var(--color-bg)]/40`}></div>
            </div>

            {!embeddedSite && <PublicBusinessHeader
                showThemeToggle={!isDemoMode()}
                businessName={business.business_name}
                logoUrl={business.logo_url}
                coverPhotoUrl={business.cover_photo_url}
                instagramHandle={business.instagram_handle}
                phone={business.phone}
                region={currencyRegion}
                address={business.address_street}
                reviewSummary={customerReviews.data?.pages[0]}
                onOpenReviews={() => setReviewsOpen(true)}
                userType={business.user_type}
                gallery={gallery}
                clientSession={client}
                businessSlug={slug}
            />}
            {reviewsOpen && <PublicCustomerReviews open={reviewsOpen} onClose={() => setReviewsOpen(false)} query={customerReviews} />}

            {/* QUICK DIRECT FLOW */}
            {bookingMode === 'quick' && quickStep !== 'success' && !groupMode && (
                <main ref={quickFlowRef} className="container relative z-10 mx-auto max-w-5xl px-3 pb-40 pt-4 md:px-6 md:pt-7">
                    {!embeddedSite && quickStep === 'services' && bookingSections.length > 1 && (
                        <nav ref={catalogNavRef} aria-label="Explore o estabelecimento" className={`mb-5 flex gap-1 rounded-2xl border p-1 ${colors.card} ${colors.border}`}>
                            {bookingSections.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    data-section={id}
                                    aria-current={browseSection === id ? 'true' : undefined}
                                    onClick={() => openBookingSection(id)}
                                    className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors ${browseSection === id
                                        ? `${accent.bg} ${accentTextOnAccent}`
                                        : `${colors.textSecondary} hover:bg-theme-surface`}`}
                                >
                                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                                    {label}
                                </button>
                            ))}
                        </nav>
                    )}

                    {browseSection === 'services' && (
                        <ol aria-label="Etapas do agendamento" className={`mb-6 flex items-center gap-2 rounded-2xl border px-3 py-2.5 sm:px-4 ${colors.border} ${colors.card}`}>
                            {quickSteps.map((qs, idx) => (
                                <li key={qs.key} aria-current={idx === currentQuickStepIndex ? 'step' : undefined} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                                    <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${idx <= currentQuickStepIndex
                                        ? `${accent.bg} ${accentTextOnAccent}`
                                        : `${colors.surface} ${colors.textMuted}`}`}>
                                        {idx < currentQuickStepIndex ? <Check className="size-3.5" /> : idx + 1}
                                    </span>
                                    <span className={`text-center text-xs font-semibold leading-tight ${idx === currentQuickStepIndex ? colors.text : colors.textMuted}`}>{qs.label}</span>
                                    {idx < quickSteps.length - 1 && <span className={`ml-0.5 hidden h-px flex-1 border-t ${colors.border} sm:block`} aria-hidden="true" />}
                                </li>
                            ))}
                        </ol>
                    )}

                    {quickStep === 'services' && browseSection === 'products' && (
                        productsLoading ? (
                            <p role="status" className={colors.textSecondary}>Carregando produtos…</p>
                        ) : productsError && publicProducts.length === 0 ? (
                            <div className="space-y-2">
                                <p role="alert" className={colors.textSecondary}>Não foi possível carregar os produtos.</p>
                                <button type="button" onClick={() => void refetchProducts()} className={`min-h-11 text-sm font-semibold ${accent.text}`}>Tentar novamente</button>
                            </div>
                        ) : (
                            publicProducts.length > 0 ? (
                                <div className="space-y-4">
                                    <input
                                        type="search"
                                        aria-label="Buscar produto"
                                        placeholder="Buscar produto"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        className={classes.input}
                                    />
                                    <PublicProductsShowcase
                                        products={publicProducts}
                                        currencyRegion={currencyRegion}
                                        searchQuery={productSearch}
                                        mode="tab"
                                        onClearSearch={() => setProductSearch('')}
                                    />
                                </div>
                            ) : (
                                <p className="rounded-xl border border-theme-border bg-theme-card p-4 text-sm text-theme-textSecondary">
                                    Nenhum produto disponível no momento.
                                </p>
                            )
                        )
                    )}

                    {quickStep === 'services' && !editingBookingId && browseSection === 'club' && (
                        <PublicBookingMemberships
                            businessId={businessId}
                            slug={slug ?? ''}
                            region={currencyRegion}
                            themeOverride={themeOverride}
                            services={services}
                        />
                    )}

                    {quickStep === 'services' && browseSection === 'services' && (
                        <div className="space-y-5 animate-reveal-fragment md:space-y-6">
                            <div>
                                <h2 className={`mb-1 text-2xl font-bold tracking-tight md:text-3xl ${colors.text}`}>Escolha seus serviços</h2>
                                <p className={`${colors.textMuted} text-sm`}>Selecione um ou mais serviços para seu atendimento.</p>
                            </div>

                            {!editingBookingId && clubPlans.length > 0 && (
                                <ClubPromotion plans={clubPlans} region={currencyRegion} onOpen={() => openBookingSection('club', true)} />
                            )}

                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <input type="search" aria-label={publicProducts.length ? 'Buscar serviço ou produto' : 'Buscar serviço'} placeholder={embeddedSite || !publicProducts.length ? 'Buscar serviço…' : 'Buscar serviço ou produto'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={classes.input} />
                                </div>
                                {!editingBookingId && professionals.length > 0 && services.length > 0 && (
                                    <button
                                        type="button"
                                        data-testid="group-booking-entry"
                                        onClick={() => setGroupMode(true)}
                                        className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold ${colors.card} ${colors.border} ${colors.text} hover:bg-theme-surface sm:px-3`}
                                    >
                                        <Users className={`size-4 shrink-0 ${accent.text}`} aria-hidden="true" />
                                        Agendar em grupo
                                    </button>
                                )}
                            </div>

                            {/* Category Filters */}
                            {categories.length > 0 && (
                                <div className={`p-1.5 ${colors.card} ${colors.border} border rounded-2xl backdrop-blur-xl`}>
                                    <div className="w-full flex flex-wrap gap-2 p-1">
                                        <button type="button" aria-pressed={activeCategory === 'all'} onClick={() => setActiveCategory('all')}
                                            className={`px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 whitespace-nowrap ${activeCategory === 'all'
                                                    ? `${accent.bg} ${accentTextOnAccent} ${shadow.button}`
                                                    : `${colors.textMuted} hover:bg-[var(--color-card-hover)]`
                                                }`}>
                                            Todos
                                        </button>
                                        {categories.map(cat => (
                                            <button key={cat.id} type="button" aria-pressed={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id)}
                                                className={`px-4 md:px-6 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 whitespace-nowrap ${activeCategory === cat.id
                                                        ? `${accent.bg} ${accentTextOnAccent} ${shadow.button}`
                                                        : `${colors.textMuted} ${colors.border} hover:bg-[var(--color-card-hover)]`
                                                    }`}>
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                                {filteredBookingServices.map(service => {
                                    const isSelected = selectedServices.includes(service.id);
                                    const category = categories.find(c => c.id === service.category_id)?.name;
                                    return (
                                        <button
                                            key={service.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => toggleService(service.id)}
                                            className={`group flex min-w-0 items-stretch gap-3 rounded-2xl border p-3 text-left transition-colors sm:gap-4 sm:p-4
                                                ${colors.card} ${isSelected ? 'border-theme-accent ring-1 ring-theme-accent' : `${colors.border} hover:border-theme-accent`}`}
                                        >
                                            <span className={`relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:size-20 ${colors.surface}`}>
                                                {service.image_url ? (
                                                    <img src={service.image_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                                                ) : (
                                                    <Scissors className={`size-5 ${colors.textSecondary}`} aria-hidden="true" />
                                                )}
                                            </span>
                                            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                <span className={`break-words text-base font-bold leading-snug ${colors.text}`}>{service.name}</span>
                                                {service.description && (
                                                    <span className={`line-clamp-2 text-sm leading-snug ${colors.textSecondary}`}>{service.description}</span>
                                                )}
                                                <span className={`mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${colors.textSecondary}`}>
                                                    <span className={`font-semibold tabular-nums ${colors.text}`}>{formatCurrency(service.price, currencyRegion)}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span>{service.duration_minutes} min</span>
                                                </span>
                                            </span>
                                            <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full border
                                                ${isSelected ? `${accent.bg} ${accentTextOnAccent} border-transparent` : colors.border}`}>
                                                {isSelected && <Check className="size-4" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {services.length > 0 && filteredBookingServices.length === 0 && (
                                <div className={`rounded-2xl border p-4 ${colors.card} ${colors.border}`}>
                                    <p className={`text-sm ${colors.textSecondary}`}>Nenhum serviço corresponde à sua busca.</p>
                                    <button type="button" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} className={`min-h-11 text-sm font-semibold ${accent.text}`}>
                                        Limpar filtros
                                    </button>
                                </div>
                            )}

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

                            {activeCategory === 'all' && publicProducts.length > 0 && (
                                <PublicProductsShowcase
                                    products={publicProducts}
                                    currencyRegion={currencyRegion}
                                    searchQuery={searchQuery}
                                    mode="section"
                                />
                            )}
                        </div>
                    )}

                    {/* Step 2: Professional */}
                    {quickStep === 'professional' && (
                        <div className="space-y-4 md:space-y-6">
                            <div>
                                <h2 className={`font-heading text-2xl md:text-3xl font-bold tracking-tight mb-1.5 ${colors.text}`}>Escolha o profissional</h2>
                                <p className={`${colors.textMuted} text-sm`}>Com quem você gostaria de ser atendido?</p>
                            </div>

                            {professionalCategories.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" aria-pressed={activeProfessionalCategory === 'all'} onClick={() => setActiveProfessionalCategory('all')}
                                        className={`px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-lg ${activeProfessionalCategory === 'all' ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted} ${colors.border} border`}`}>
                                        Todos
                                    </button>
                                    {professionalCategories.map((cat) => (
                                        <button key={cat} type="button" aria-pressed={activeProfessionalCategory === cat} onClick={() => setActiveProfessionalCategory(cat)}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-lg ${activeProfessionalCategory === cat ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted} ${colors.border} border`}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                <button type="button" aria-pressed={selectedProfessional === 'any'} onClick={() => setSelectedProfessional('any')}
                                    className={`flex min-w-0 flex-col items-center gap-3 rounded-2xl border p-4 transition-colors sm:p-5
                                        ${selectedProfessional === 'any' ? `${accent.bg} ${accentTextOnAccent} border-transparent` : `${colors.card} ${colors.border} hover:border-theme-accent`}`}>
                                    <div className={`w-16 h-16 flex items-center justify-center border-2 rounded-full ${colors.surface} ${colors.border} ${colors.textMuted}`}>
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <span className={`text-center text-sm font-semibold ${selectedProfessional === 'any' ? accentTextOnAccent : colors.text}`}>Qualquer profissional</span>
                                </button>

                                {filteredProfessionals.map(pro => (
                                    <button key={pro.id} type="button" aria-pressed={selectedProfessional === pro.id}
                                        onClick={() => setSelectedProfessional(pro.id)}
                                        className={`flex min-w-0 flex-col items-center gap-3 rounded-2xl border p-4 transition-colors sm:p-5 ${selectedProfessional === pro.id ? `${accent.bg} ${accentTextOnAccent} border-transparent` : `${colors.card} ${colors.border} hover:border-theme-accent`}`}>
                                        <div className={`w-16 h-16 overflow-hidden border-2 rounded-full ${colors.surface} ${colors.border}`}>
                                            {pro.photo_url ? (
                                                <img src={pro.photo_url} alt="" loading="lazy" decoding="async" width={96} height={96} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center ${colors.surface} ${colors.text}`} aria-hidden="true">{pro.name.charAt(0)}</div>
                                            )}
                                        </div>
                                        <span className={`max-w-full break-words text-center text-sm font-semibold leading-tight ${selectedProfessional === pro.id ? accentTextOnAccent : colors.text}`}>
                                            {pro.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Date & Time */}
                    {quickStep === 'datetime' && (
                        <div className="space-y-4 md:space-y-6">
                            <div>
                                <h2 className={`font-heading text-2xl md:text-3xl font-bold tracking-tight mb-1.5 ${colors.text}`}>Escolha a data e hora</h2>
                                <p className={`${colors.textMuted} text-sm`}>Selecione o melhor dia e horário para você.</p>
                            </div>
                            <div className="max-w-2xl mx-auto">
                                <CalendarPicker selectedDate={selectedDate} onDateSelect={(date) => { setLeadTimeAlert(null); setEditWindowClosed(false); setSelectedDate(date); }} forceTheme={themeOverride} fullDates={fullDates} today={businessToday} />
                            </div>
                            {selectedDate && (
                                <div className="animate-reveal-fragment duration-700 max-w-2xl mx-auto">
                                    <TimeGrid selectedTime={selectedTime} onTimeSelect={(time) => { setLeadTimeAlert(null); setEditWindowClosed(false); setSelectedTime(time); }} availableSlots={availableSlots} emptyMessage={leadEmptyMessage} emptyAction={leadEmptyAction} alertMessage={leadTimeAlert} alertKey={leadTimeAlertKey} forceTheme={themeOverride} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Contact & Confirm */}
                    {quickStep === 'contact' && (
                        <div className="space-y-6 md:space-y-4 md:space-y-6 max-w-2xl mx-auto w-full">
                            <div>
                                <h2 className={`text-xl md:text-3xl font-bold tracking-tight mb-1.5 ${colors.text}`}>Revise seu agendamento</h2>
                                <p className={`${colors.textSecondary} text-sm`}>
                                    {editingBookingId
                                        ? 'Confira os detalhes antes de enviar a alteração.'
                                        : autoConfirm
                                            ? 'Confira os detalhes e informe seus dados para confirmar o horário.'
                                            : 'Confira os detalhes e envie o pedido. O horário fica confirmado após a aprovação do estabelecimento.'}
                                </p>
                            </div>

                            {/* Summary Card */}
                            <div className={`p-4 md:p-6 ${colors.card} ${colors.border} border rounded-2xl ${shadow.card}`}>
                                <div className={`flex justify-between items-center border-b pb-3 mb-4 ${colors.divider}`}>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${colors.textMuted}`}>Resumo</span>
                                    <span className={`text-base md:text-lg font-bold tabular-nums ${accent.text}`}>
                                        {formatCurrency(calculateTotal(), currencyRegion)}
                                    </span>
                                </div>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className={colors.textMuted}>Data e hora</dt>
                                        <dd className={`font-semibold text-right ${colors.text}`}>
                                            {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} · {selectedTime}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className={colors.textMuted}>Serviços</dt>
                                        <dd className={`font-semibold text-right ${colors.text}`}>
                                            {services.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(' + ')}
                                        </dd>
                                    </div>
                                    {selectedProfessional && (
                                        <div className="flex justify-between gap-4">
                                            <dt className={colors.textMuted}>Profissional</dt>
                                            <dd className={`font-semibold text-right ${colors.text}`}>
                                                {selectedProfessional === 'any'
                                                    ? 'Qualquer disponível'
                                                    : (professionals.find(p => p.id === selectedProfessional)?.name || '—')}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>

                            {/* Contact Form */}
                            <div className="space-y-4 md:space-y-5">
                                {client ? (
                                    <div className={`p-3.5 rounded-xl flex items-center gap-3 ${colors.surface} ${colors.border} border`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accent.bgDim} ${accent.text}`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold truncate ${colors.text}`}>{client.name}</p>
                                            <p className={`text-sm ${colors.textMuted}`}>{client.phone}</p>
                                        </div>
                                        <Check className={`w-5 h-5 shrink-0 ${accent.text}`} aria-hidden="true" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label htmlFor="public-booking-name" className={`block text-sm font-semibold ${colors.textSecondary}`}>Nome completo</label>
                                            <input id="public-booking-name" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                                className={`w-full py-3 px-4 outline-none transition-all ${classes.input}`}
                                                placeholder="Como devemos te chamar?"
                                                autoComplete="name"
                                            />
                                        </div>
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label htmlFor="public-booking-phone" className={`block text-sm font-semibold ${colors.textSecondary}`}>WhatsApp</label>
                                            <PhoneInput id="public-booking-phone" value={customerPhone} onChange={setCustomerPhone} defaultRegion={currencyRegion} />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {inlinePolicy}
                                    <Checkbox
                                        id="privacy-quick"
                                        checked={acceptedPolicy}
                                        onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                        label={
                                            <>
                                                Confirmo meu compromisso e aceito a{' '}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setShowPolicyModal(true); }}
                                                    className={`font-semibold underline underline-offset-2 ${accent.text}`}
                                                >
                                                    política de agendamento
                                                </button>
                                                .
                                            </>
                                        }
                                    />
                                    <Checkbox
                                        id="marketing-optin-quick"
                                        checked={acceptedMarketing}
                                        onChange={(e) => setAcceptedMarketing(e.target.checked)}
                                        label="Quero receber lembretes do agendamento por WhatsApp."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* Quick Flow Bottom Navigation — uma CTA por passo (no confirm = submit) */}
            {bookingMode === 'quick' && quickStep !== 'success' && !groupMode && browseSection !== 'club' && (
                <div className="fixed bottom-0 left-0 right-0 w-full" style={{ zIndex: 'var(--z-modal)' }}>
                    <div
                        className={`${colors.card} border-t ${colors.divider} px-4 pt-2.5`}
                        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
                    >
                        <div className="flex items-center gap-2 md:gap-3 max-w-4xl lg:max-w-5xl mx-auto">
                            {quickStep !== 'services' && (
                                <button
                                    type="button"
                                    onClick={handleQuickBack}
                                    className={`px-4 md:px-5 py-3.5 min-h-12 font-semibold text-sm transition-all ${classes.buttonSecondary}`}
                                >
                                    Voltar
                                </button>
                            )}
                            {browseSection === 'products' ? (
                                <button type="button" onClick={() => openBookingSection('services', true)} className={`flex-1 min-h-12 ${classes.buttonPrimary}`}>
                                    Voltar aos serviços
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={quickStep === 'contact' && editWindowClosed ? handleTalkEdit : (quickStep === 'contact' ? handleSubmit : handleQuickNext)}
                                    disabled={quickStep === 'contact' && editWindowClosed
                                        ? false
                                        : (!canQuickProceed() || (quickStep === 'contact' && isSubmitting))}
                                    className={`flex-1 py-3.5 min-h-12 flex items-center justify-center gap-2 transition-all ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    data-testid={quickStep === 'contact' && editWindowClosed ? 'client-edit-talk' : undefined}
                                >
                                    {quickStep === 'contact' && editWindowClosed ? (
                                        <>
                                            <MessageSquare className="w-5 h-5" />
                                            <span className="font-semibold">{talkEditLabel}</span>
                                        </>
                                    ) : quickStep === 'contact' && isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : quickStep === 'contact' ? (
                                        <>
                                            <span className="font-semibold" data-testid="public-booking-submit-label">{submitLabel}</span>
                                            <Check className="w-5 h-5" />
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-semibold">Continuar</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            )}
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
                                                            {editWindowClosed ? (
                                                                <button type="button" onClick={handleTalkEdit} data-testid="client-edit-talk" className={`flex-1 py-3 font-black text-xs uppercase tracking-widest ${classes.buttonPrimary} flex items-center justify-center gap-2`}>
                                                                    <MessageSquare className="w-4 h-4" />
                                                                    {talkEditLabel}
                                                                </button>
                                                            ) : (
                                                            <button onClick={handleSubmit} disabled={isSubmitting} className={`flex-1 py-3 font-black text-xs uppercase tracking-widest ${classes.buttonPrimary} flex items-center justify-center gap-2`}>
                                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                                                            </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'services' && step === 'services' && (
                                                <div className="w-full space-y-8 md:space-y-12">
                                                    <input type="search" aria-label="Buscar serviço" placeholder="Buscar serviço..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={classes.input} />
                                                    <div className="animate-reveal-fragment duration-700">
                                                        <div className={`p-1.5 ${colors.card} ${colors.border} border rounded-2xl backdrop-blur-xl`}>
                                                            <div className="w-full flex gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
                                                                <button type="button" aria-pressed={activeCategory === 'all'} onClick={() => setActiveCategory('all')}
                                                                    className={`px-5 md:px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-200 ${activeCategory === 'all'
                                                                            ? `${accent.bg} ${accentTextOnAccent} ${shadow.button} scale-105`
                                                                            : `${colors.textMuted} hover:bg-[var(--color-card-hover)]`
                                                                        }`}>
                                                                    Todos
                                                                </button>
                                                                {categories.map(cat => (
                                                                    <button key={cat.id} type="button" aria-pressed={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id)}
                                                                        className={`px-5 md:px-8 py-2.5 rounded-xl border text-xs font-black uppercase tracking-[0.15em] transition-all duration-200 ${activeCategory === cat.id
                                                                                ? `${accent.bg} ${accentTextOnAccent} ${shadow.button} scale-105`
                                                                                : `${colors.textMuted} ${colors.border} hover:bg-[var(--color-card-hover)]`
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
                                                            const matchesSearch = matchesServiceSearch(s, searchQuery);
                                                            return matchesCategory && matchesSearch;
                                                        }).map((service, sIdx) => {
                                                            const isSelected = selectedServices.includes(service.id);
                                                            return (
                                                                <button key={service.id} type="button" aria-pressed={isSelected}
                                                                    onClick={() => toggleService(service.id)}
                                                                    className={`relative overflow-hidden cursor-pointer text-left transition-all duration-300 animate-reveal-fragment group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-2xl ${isSelected
                                                                            ? `md:scale-[1.03] ${shadow.glow} ring-2 ${accent.ring}`
                                                                            : `${colors.card} ${colors.border} border ${shadow.card} hover:-translate-y-1`
                                                                        }`}>
                                                                    <span className="block h-36 sm:h-44 md:h-48 relative overflow-hidden bg-[var(--color-card)]">
                                                                        {service.image_url ? (
                                                                            <img src={service.image_url} alt="" loading="lazy" decoding="async" width={400} height={300} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]" />
                                                                        ) : (
                                                                            <span className={`w-full h-full flex items-center justify-center ${colors.surface}`}>
                                                                                <Sparkles className={`w-12 h-12 opacity-10 ${accent.text}`} />
                                                                            </span>
                                                                        )}
                                                                        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                                        <span className={`absolute top-4 left-4 px-3 py-1 backdrop-blur-md border rounded-full text-xs font-black uppercase tracking-[0.1em] ${colors.card} ${colors.border} ${colors.textSecondary}`}>
                                                                            {categories.find(c => c.id === service.category_id)?.name || 'Serviço'}
                                                                        </span>
                                                                        <span className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center border-2 transition-all duration-200 rounded-full ${isSelected ? `${accent.bg} ${colors.border} ${accentTextOnAccent}` : 'bg-[var(--color-bg)]/20 border-[var(--color-border-strong)] text-transparent'}`}>
                                                                            <Check className="w-6 h-6" aria-hidden="true" />
                                                                        </span>
                                                                    </span>
                                                                    <span className="block p-6">
                                                                        <span className="flex justify-between items-end">
                                                                            <span className="block flex-1 space-y-3">
                                                                                <span className={`block text-2xl font-black tracking-tight ${colors.text} group-hover:text-theme-accent transition-colors duration-200`}>
                                                                                    {service.name}
                                                                                </span>
                                                                                {service.description && (
                                                                                    <span className={`text-xs line-clamp-1 opacity-50 ${colors.textSecondary}`}>
                                                                                        {service.description}
                                                                                    </span>
                                                                                )}
                                                                                <span className="flex items-center gap-4">
                                                                                    <span className={`text-base font-black tracking-tight ${accent.text}`}>
                                                                                        {formatCurrency(service.price, currencyRegion)}
                                                                                    </span>
                                                                                    <span className={`w-1 h-1 rounded-full ${colors.textMuted}`} />
                                                                                    <span className={`text-xs font-bold ${colors.textMuted} flex items-center gap-1.5`}>
                                                                                        <Clock className="w-3.5 h-3.5" /> {service.duration_minutes} min
                                                                                    </span>
                                                                                </span>
                                                                            </span>
                                                                        </span>
                                                                    </span>
                                                                    {isSelected && (
                                                                        <span className={`absolute bottom-0 left-0 right-0 h-1 ${accent.bg} animate-shimmer`} />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'professionals' && step === 'datetime' && !selectedProfessional && (
                                                <div className="w-full space-y-6">
                                                    {professionalCategories.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button type="button" aria-pressed={activeProfessionalCategory === 'all'} onClick={() => setActiveProfessionalCategory('all')}
                                                                className={`px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-lg ${activeProfessionalCategory === 'all' ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted} ${colors.border} border`}`}>
                                                                Todos
                                                            </button>
                                                            {professionalCategories.map((cat) => (
                                                                <button key={cat} type="button" aria-pressed={activeProfessionalCategory === cat} onClick={() => setActiveProfessionalCategory(cat)}
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
                                                            <span className={`text-xs font-bold uppercase tracking-wide text-center leading-tight ${colors.text}`}>Qualquer profissional</span>
                                                        </button>

                                                        {filteredProfessionals.map((pro, pIdx) => (
                                                            <button key={pro.id}
                                                                onClick={() => { setSelectedProfessional(pro.id); setMessages(prev => [...prev, { id: Date.now().toString(), text: `Quero ser atendido(a) por ${pro.name}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: `Ótimo! Vou verificar a agenda de ${pro.name.split(' ')[0]}. Qual dia e horário você prefere para a sua visita?`, isAssistant: true, type: 'datetime' }]); }}
                                                                className={`p-6 flex flex-col items-center gap-3 transition-all duration-300 animate-reveal-fragment rounded-2xl ${colors.card} ${colors.border} border ${shadow.card} hover:border-[var(--color-accent-border)]`}>
                                                                <div className={`w-16 h-16 overflow-hidden border-2 rounded-full ${colors.surface} ${colors.border}`}>
                                                                    {pro.photo_url ? (
                                                                        <img src={pro.photo_url} alt={pro.name} loading="lazy" decoding="async" width={96} height={96} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className={`w-full h-full flex items-center justify-center ${colors.surface} ${colors.text}`}>{pro.name.charAt(0)}</div>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs font-bold uppercase tracking-wide text-center leading-tight ${colors.text}`}>
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
                                                        <CalendarPicker selectedDate={selectedDate} onDateSelect={(date) => { setLeadTimeAlert(null); setEditWindowClosed(false); setSelectedDate(date); }} forceTheme={themeOverride} fullDates={fullDates} today={businessToday} />
                                                    </div>
                                                    {selectedDate && (
                                                        <div className="animate-reveal-fragment duration-700">
                                                            <h4 className={`mb-6 ${accent.text} font-heading text-lg text-center md:text-left`}>Horários Disponíveis</h4>
                                                            <TimeGrid selectedTime={selectedTime} onTimeSelect={(time) => {
                                                                setLeadTimeAlert(null);
                                                                setEditWindowClosed(false);
                                                                setSelectedTime(time);
                                                                const isLogged = !!client;
                                                                if (editingBookingId) {
                                                                    setMessages(prev => [...prev, { id: Date.now().toString(), text: `Agendar para dia ${selectedDate.toLocaleDateString('pt-BR')} às ${time}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: "Quase pronto. Verifique o resumo da edição abaixo.", isAssistant: true, type: 'edit_confirm' }]);
                                                                    setStep('edit_confirm');
                                                                } else {
                                                                    setMessages(prev => [...prev, { id: Date.now().toString(), text: `Agendar para dia ${selectedDate.toLocaleDateString('pt-BR')} às ${time}`, isAssistant: false }, { id: (Date.now() + 1).toString(), text: isLogged ? "Estamos quase concluindo! Como você já tem cadastro, verifique os detalhes abaixo e confirme o seu agendamento." : "Estamos quase concluindo! Agora, para confirmar seu agendamento, informe seus dados de contato.", isAssistant: true, type: 'contact' }]);
                                                                    setStep('contact');
                                                                }
                                                            }} availableSlots={availableSlots} emptyMessage={leadEmptyMessage} emptyAction={leadEmptyAction} alertMessage={leadTimeAlert} alertKey={leadTimeAlertKey} forceTheme={themeOverride} />
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
                                <div ref={successRef} className="max-w-xl mx-auto text-center py-20 scroll-mt-24 animate-reveal-fragment">
                                    <div className="relative inline-block mb-10">
                                        <div className={`w-32 h-32 md:w-36 md:h-36 flex items-center justify-center border-4 animate-scale-check ${accent.bg} ${accentTextOnAccent} rounded-full ${shadow.elevated}`}>
                                            {isBookingCancelled ? <X className="w-16 h-16 md:w-20 md:h-20 stroke-[4]" /> : <Check className="w-16 h-16 md:w-20 md:h-20 stroke-[4]" />}
                                        </div>
                                        <div className="absolute -top-4 -right-4 animate-bounce delay-100">
                                            <Sparkles className={`w-8 h-8 ${accent.text}`} />
                                        </div>
                                        <div className="absolute -bottom-2 -left-6 animate-bounce delay-300">
                                            <Sparkles className={`w-6 h-6 ${accent.text} opacity-50`} />
                                        </div>
                                    </div>

                                    <h2 data-testid="public-booking-success-title" data-status={activeBooking.status} className={`${colors.text} font-black tracking-tighter text-[2.6rem] leading-[1.05] min-[400px]:text-5xl md:text-7xl mb-6 break-words`}>
                                        {successCopy.title}
                                    </h2>

                                    <p
                                        className={`text-lg md:text-xl mb-12 max-w-md mx-auto leading-relaxed ${colors.textMuted}`}
                                        data-testid={pendingEdit ? 'client-edit-sent-message' : undefined}
                                    >
                                        {successCopy.subtitle}
                                    </p>

                                    <div className={`p-8 mb-12 text-left relative overflow-hidden group ${colors.card} ${colors.border} border-2 ${shadow.elevated} rounded-2xl`}>
                                        <div className="relative z-10 flex flex-col gap-6">
                                            <div className={`flex justify-between items-center border-b pb-4 ${colors.divider}`}>
                                                <span className={`text-xs font-black uppercase tracking-[0.2em] ${colors.textMuted}`}>Resumo do Agendamento</span>
                                                <div className={`p-1.5 rounded-full ${accent.bgDim} ${accent.text}`}>
                                                    <Star className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 md:gap-8">
                                                <div className="space-y-1">
                                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Data e Hora</p>
                                                    <p className={`text-lg font-black tracking-tight ${colors.text}`}>
                                                        {successDateLong} às {successTime}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Total</p>
                                                    <p className={`text-lg font-black tracking-tight ${accent.text}`}>
                                                        {formatCurrency(successTotal, currencyRegion)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Serviços</p>
                                                <p className={`text-sm font-bold ${colors.textSecondary}`}>
                                                    {successServiceNames}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${accent.bgDim} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                    </div>

                                    <div className="flex flex-col gap-5">
                                        {isBookingCancelled ? (
                                            <button type="button" onClick={handleRescheduleCancelled} data-testid="booking-cancelled-reschedule"
                                                className={`group flex items-center justify-center gap-4 py-6 px-10 transition-all duration-200 relative overflow-hidden rounded-2xl ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
                                                <div className={`p-2 bg-[var(--color-card-hover)] rounded-lg group-hover:bg-white/20`}>
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <span className="text-sm font-black uppercase tracking-[0.2em]">Reagendar horário</span>
                                            </button>
                                        ) : (
                                            <a href={buildWhatsAppLink(business.phone, currencyRegion, successWhatsAppText)} target="_blank" rel="noopener noreferrer"
                                                className={`group flex items-center justify-center gap-4 py-6 px-10 transition-all duration-200 relative overflow-hidden rounded-2xl ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
                                                <div className={`p-2 bg-[var(--color-card-hover)] rounded-lg group-hover:bg-white/20`}>
                                                    <Send className="w-5 h-5" />
                                                </div>
                                                <span className="text-sm font-black uppercase tracking-[0.2em]">{successCopy.whatsappCta}</span>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                                            </a>
                                        )}

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

                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </div>
                </>
            )}

            {/* Chat Flow: Modal/Bottom Sheet de Contato e Resumo */}
            {bookingMode === 'chat' && step === 'contact' && (
                <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[var(--color-bg)]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ zIndex: 'var(--z-modal)' }}>
                    <FocusTrap active focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, initialFocus: false, fallbackFocus: '[data-booking-contact-dialog]' }}>
                    <div
                        data-booking-contact-dialog
                        role="dialog"
                        aria-modal="true"
                        aria-label="Confirmação do agendamento"
                        tabIndex={-1}
                        onKeyDown={(e) => { if (e.key === 'Escape') setStep('datetime'); }}
                        className={`${colors.card} ${colors.border} border w-full max-w-2xl p-6 max-sm:pb-[calc(1.5rem+var(--safe-bottom))] md:p-10 relative shadow-promax-depth overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 rounded-t-3xl sm:rounded-3xl`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-2xl ${colors.text} font-heading`}>Confirmação do Agendamento</h3>
                            <button onClick={() => setStep('datetime')} className={`${colors.textMuted} hover:text-theme-text transition-colors rounded-full p-2 hover:bg-[var(--color-card-hover)]`}>
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
                                        <label htmlFor="booking-chat-name" className={`${colors.textMuted} ${font.label} text-xs uppercase tracking-widest block font-bold`}>Nome Completo</label>
                                        <input id="booking-chat-name" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                            className={`w-full py-4 px-5 outline-none transition-all ${classes.input}`}
                                            placeholder="Como devemos te chamar?" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`${colors.textMuted} ${font.label} text-xs uppercase tracking-widest block font-bold`}>WhatsApp</label>
                                        <PhoneInput value={customerPhone} onChange={setCustomerPhone} defaultRegion={currencyRegion} />
                                    </div>
                                </div>
                            )}

                            {inlinePolicy}

                            <div className={`flex items-start gap-4 p-4 rounded-xl border ${colors.surface} ${colors.border}`}>
                                <Checkbox
                                    id="privacy"
                                    checked={acceptedPolicy}
                                    onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                    className="shrink-0"
                                />
                                <label htmlFor="privacy" className={`text-sm cursor-pointer ${colors.textSecondary} leading-snug`}>
                                    Confirmo meu compromisso e aceito a <button type="button" onClick={(e) => { e.preventDefault(); setShowPolicyModal(true); }} className={`font-bold underline ${accent.text} hover:text-theme-text`}>política de agendamento</button>.
                                </label>
                            </div>

                            <div className={`p-4 rounded-xl border ${colors.surface} ${colors.border}`}>
                                <Checkbox
                                    id="marketing-optin"
                                    checked={acceptedMarketing}
                                    onChange={(e) => setAcceptedMarketing(e.target.checked)}
                                    label="Aceito receber lembretes do meu agendamento por WhatsApp. Posso cancelar a qualquer momento."
                                />
                            </div>

                            <div className="pt-2">
                                {editWindowClosed ? (
                                    <button type="button" onClick={handleTalkEdit} data-testid="client-edit-talk"
                                        className={`w-full py-5 flex items-center justify-center gap-3 transition-all group overflow-hidden relative ${classes.buttonPrimary}`}>
                                        <MessageSquare className="w-5 h-5" />
                                        <span>{talkEditLabel}</span>
                                    </button>
                                ) : (
                                <button onClick={handleSubmit}
                                    disabled={(!client && (!customerName || !customerPhone)) || !acceptedPolicy || isSubmitting}
                                    className={`w-full py-5 flex items-center justify-center gap-3 transition-all group overflow-hidden relative ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    {isSubmitting ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <span>{submitLabel}</span>
                                            <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                                )}
                            </div>
                        </div>
                    </div>
                    </FocusTrap>
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
                                    <span className={`px-1.5 py-0.5 rounded-md text-xs font-black bg-[var(--color-bg)]/15`}>
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
                <div
                    data-testid="booking-success"
                    className="max-w-xl mx-auto text-center py-20 animate-reveal-fragment px-4"
                >
                    <div className="relative inline-block mb-10">
                        <div className={`w-32 h-32 md:w-36 md:h-36 flex items-center justify-center border-4 animate-scale-check ${accent.bg} ${accentTextOnAccent} rounded-full ${shadow.elevated}`}>
                            {isBookingCancelled ? <X className="w-16 h-16 md:w-20 md:h-20 stroke-[4]" /> : <Check className="w-16 h-16 md:w-20 md:h-20 stroke-[4]" />}
                        </div>
                        <div className="absolute -top-4 -right-4 animate-bounce delay-100">
                            <Sparkles className={`w-8 h-8 ${accent.text}`} />
                        </div>
                        <div className="absolute -bottom-2 -left-6 animate-bounce delay-300">
                            <Sparkles className={`w-6 h-6 ${accent.text} opacity-50`} />
                        </div>
                    </div>

                    <h2 data-testid="public-booking-success-title" data-status={activeBooking.status} className={`${colors.text} font-black tracking-tighter text-[2.6rem] leading-[1.05] min-[400px]:text-5xl md:text-7xl mb-6 break-words`}>
                        {successCopy.title}
                    </h2>

                    <p
                        className={`text-lg md:text-xl mb-12 max-w-md mx-auto leading-relaxed ${colors.textMuted}`}
                        data-testid={pendingEdit ? 'client-edit-sent-message' : undefined}
                    >
                        {successCopy.subtitle}
                    </p>

                    <div className={`p-8 mb-12 text-left relative overflow-hidden group ${colors.card} ${colors.border} border-2 ${shadow.elevated} rounded-2xl`}>
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className={`flex justify-between items-center border-b pb-4 ${colors.divider}`}>
                                <span className={`text-xs font-black uppercase tracking-[0.2em] ${colors.textMuted}`}>Resumo do Agendamento</span>
                                <div className={`p-1.5 rounded-full ${accent.bgDim} ${accent.text}`}>
                                    <Star className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:gap-8">
                                <div className="space-y-1">
                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Data e Hora</p>
                                    <p className={`text-lg font-black tracking-tight ${colors.text}`}>
                                        {successDateLong} às {successTime}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Total</p>
                                    <p className={`text-lg font-black tracking-tight ${accent.text}`}>
                                        {formatCurrency(successTotal, currencyRegion)}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Serviços</p>
                                <p className={`text-sm font-bold ${colors.textSecondary}`}>
                                    {successServiceNames}
                                </p>
                            </div>
                        </div>
                        <div className={`absolute inset-0 bg-gradient-to-br ${accent.bgDim} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    </div>

                    <div className="flex flex-col gap-5">
                        {isBookingCancelled ? (
                            <button type="button" onClick={handleRescheduleCancelled} data-testid="booking-cancelled-reschedule"
                                className={`group flex items-center justify-center gap-4 py-6 px-10 transition-all duration-200 relative overflow-hidden rounded-2xl ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
                                <div className={`p-2 bg-[var(--color-card-hover)] rounded-lg group-hover:bg-white/20`}>
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Reagendar horário</span>
                            </button>
                        ) : (
                            <a href={buildWhatsAppLink(business.phone, currencyRegion, successWhatsAppText)} target="_blank" rel="noopener noreferrer"
                                className={`group flex items-center justify-center gap-4 py-6 px-10 transition-all duration-200 relative overflow-hidden rounded-2xl ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
                                <div className={`p-2 bg-[var(--color-card-hover)] rounded-lg group-hover:bg-white/20`}>
                                    <Send className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-[0.2em]">{successCopy.whatsappCta}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
                            </a>
                        )}

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

                </div>
            )}

            {groupMode && businessId && (
                <PublicGroupBooking
                    businessId={businessId}
                    userType={business?.user_type}
                    isBeauty={isBeauty}
                    currencyRegion={currencyRegion}
                    timezone={businessTimezone}
                    services={services as any}
                    categories={categories as any}
                    professionals={professionals}
                    isLoggedIn={Boolean(client)}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    customerPhone={customerPhone}
                    setCustomerPhone={setCustomerPhone}
                    acceptedPolicy={acceptedPolicy}
                    setAcceptedPolicy={setAcceptedPolicy}
                    inlinePolicy={inlinePolicy}
                    onOpenPolicy={() => setShowPolicyModal(true)}
                    autoConfirm={autoConfirm}
                    onBooked={() => { setGroupBooked(true); return establishClientSession(client?.photo_url ?? null); }}
                    onOpenClientArea={handleOpenClientArea}
                    onExit={() => setGroupMode(false)}
                    buildWhatsAppHref={({ confirmed, dateLabel, timeLabel, people }) => {
                        if (!business?.phone) return null;
                        const text = getPublicGroupBookingWhatsAppText({
                            template: whatsapp.templates.client_request_confirm,
                            confirmed,
                            theme: isBeauty ? 'beauty' : 'barber',
                            businessName: business.business_name || '',
                            dateLabel,
                            timeLabel,
                            people,
                        });
                        return buildWhatsAppLink(business.phone, currencyRegion, text);
                    }}
                />
            )}

            {/* Policy Modal */}
            {showPolicyModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-6 bg-[var(--color-bg)]/95 backdrop-blur-md animate-in fade-in duration-300"
                    style={{ zIndex: 'var(--z-modal)' }}
                    onClick={() => setShowPolicyModal(false)}
                >
                    <FocusTrap active focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, initialFocus: '[data-policy-dialog]', fallbackFocus: '[data-policy-dialog]' }}>
                    <div
                        data-policy-dialog
                        role="dialog"
                        aria-modal="true"
                        aria-label="Política de agendamento"
                        tabIndex={-1}
                        onKeyDown={(e) => { if (e.key === 'Escape') setShowPolicyModal(false); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`${colors.card} ${colors.border} border max-w-xl w-full p-6 md:p-8 relative shadow-promax-depth overflow-hidden rounded-3xl`}>
                        <button onClick={() => setShowPolicyModal(false)} aria-label="Fechar" className={`absolute right-2 top-2 z-30 grid size-11 place-items-center rounded-xl ${colors.textMuted} hover:bg-theme-surface hover:text-theme-text`}><X className="size-5" aria-hidden="true" /></button>
                        <div className="relative z-10 space-y-5">
                            <h3 className={`pr-7 text-xl md:text-2xl font-semibold tracking-tight ${colors.text}`}>
                                Política de agendamento
                            </h3>
                            <div
                                role="region"
                                aria-label="Texto da política de agendamento"
                                tabIndex={0}
                                className={`max-h-[50vh] overflow-y-auto rounded-lg pr-1 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-theme-accent md:pr-2 md:text-base custom-scrollbar ${colors.textSecondary}`}
                            >
                                <CancellationPolicyText
                                    parts={cancellationPolicyParts}
                                    data-testid="public-cancellation-policy"
                                    labelClassName={colors.text}
                                />
                            </div>
                            <button onClick={() => setShowPolicyModal(false)}
                                className={`w-full py-3.5 min-h-12 ${classes.buttonPrimary}`}>
                                Entendi
                            </button>
                        </div>
                    </div>
                    </FocusTrap>
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
