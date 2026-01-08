
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Calendar, Clock, MapPin, Instagram, Scissors, Sparkles, User, ArrowRight, Check, ChevronLeft, ChevronRight, Phone, Users, ImageIcon, Upload, Loader2, X, AlertTriangle } from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';
import { CalendarPicker } from '../components/CalendarPicker';
import { TimeGrid } from '../components/TimeGrid';
import { UpsellSection } from '../components/UpsellSection';
import { ProfessionalSelector } from '../components/ProfessionalSelector';
import { ClientAuthModal } from '../components/ClientAuthModal';
import { usePublicClient } from '../contexts/PublicClientContext';
import { BrutalButton } from '../components/BrutalButton';
import { formatCurrency, formatPhone } from '../utils/formatters';

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
}

export const PublicBooking: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const proIdParam = searchParams.get('pro');

    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessSettings, setBusinessSettings] = useState<any>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]); // New state for categories
    const [activeCategory, setActiveCategory] = useState<string>('all'); // New state for filter
    const [searchQuery, setSearchQuery] = useState<string>(''); // New state for search
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [gallery, setGallery] = useState<any[]>([]); // New state for gallery
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'services' | 'datetime' | 'contact' | 'success'>('services');
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    // Contact form state
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
    const [activeBooking, setActiveBooking] = useState<any>(null);
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
    const galleryRef = React.useRef<HTMLDivElement>(null);

    const { client, register } = usePublicClient();

    // Sync client data from context to form state
    useEffect(() => {
        if (client) {
            setCustomerName(client.name);
            setCustomerPhone(client.phone);
        }
    }, [client]);

    // Auto-fill client data from database when phone number is entered
    useEffect(() => {
        const fetchExistingClient = async () => {
            // Wait for a valid phone number length (e.g., +5511999999999 is 14 chars, +351912345678 is 13 chars)
            if (customerPhone.length >= 12 && businessId) {
                try {
                    // Search in public_clients first as it's for public flow
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

                    // Then search in main clients table
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

                    // Check for active pending booking
                    const { data: booking, error: bookingError } = await supabase.rpc('get_active_booking_by_phone', {
                        p_phone: customerPhone,
                        p_business_id: businessId
                    });

                    if (booking && booking[0]) {
                        // Professional Rule: Only block/show status if it is PENDING.
                        // If confirmed, user can make a NEW booking (e.g. for next month).
                        if (booking[0].status === 'pending') {
                            setActiveBooking(booking[0]);
                            setStep('success');
                        }
                    }
                } catch (error) {
                    console.error('Error fetching existing client:', error);
                }
            } else if (customerPhone.length < 9) {
                // Reset if phone is cleared
                setExistingPhotoUrl(null);
            }
        };

        fetchExistingClient();
    }, [customerPhone, businessId]);

    const fetchFreshActiveBooking = async (phone: string, bId: string) => {
        try {
            const { data: booking, error: bookingError } = await supabase.rpc('get_active_booking_by_phone', {
                p_phone: phone,
                p_business_id: bId
            });

            if (booking && booking[0]) {
                // If the booking we were tracking is confirmed, we might want to stop blocking?
                // But this function is used for REFRESHING status.
                // If it IS confirmed, we want to show that status on the success screen!
                // Wait, if it *became* confirmed, we show "Confirmed".
                // But if the user *starts* fresh, we don't block.
                setActiveBooking(booking[0]);
            } else {
                setActiveBooking(null);
            }
        } catch (error) {
            console.error('Error fetching fresh active booking:', error);
        }
    };

    // Real-time subscription for booking status changes
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
                    console.log('Booking update received:', payload);
                    // Refresh the booking data to get joined professional info etc.
                    fetchFreshActiveBooking(activeBooking.customer_phone, activeBooking.business_id);
                }
            )
            .subscribe((status) => {
                console.log(`Supabase Realtime status for booking ${activeBooking.id}:`, status);
            });

        // Fallback polling every 5 seconds in case Realtime fails
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

                const { data, error } = await supabase.rpc('get_available_slots', {
                    p_business_id: businessId,
                    p_date: dateStr,
                    p_professional_id: selectedProfessional === 'any' ? null : selectedProfessional,
                    p_duration_min: calculateDuration()
                });

                if (error) {
                    console.error('Error fetching slots:', error);
                } else if (data) {
                    setAvailableSlots(data.slots || []);
                }
            }
        };
        fetchSlots();
    }, [selectedDate, businessId, selectedProfessional]);

    // Fetch full dates for the calendar
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
                // Fetch business profile by slug - expanded columns
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, business_name, user_type, google_rating, total_reviews, phone, enable_upsells, enable_professional_selection, logo_url, cover_photo_url, address_street, instagram_handle, region')
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

                    // Fetch categories
                    const { data: categoriesData } = await supabase
                        .from('service_categories')
                        .select('id, name')
                        .eq('user_id', profileData.id)
                        .order('display_order');
                    setCategories(categoriesData || []);

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

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCancelBooking = async (bookingId: string) => {
        if (!confirm('Tem certeza que deseja cancelar sua solicitação de agendamento?')) return;

        try {
            const { error } = await supabase
                .from('public_bookings')
                .delete()
                .eq('id', bookingId);

            if (error) throw error;

            setActiveBooking(null);
            setStep('services');
            alert('Agendamento cancelado com sucesso.');
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert('Erro ao cancelar agendamento.');
        }
    };

    const handleEditBooking = (booking: any) => {
        setEditingBookingId(booking.id);

        // Populate services
        if (booking.service_ids) {
            setSelectedServices(booking.service_ids);
        }

        // Populate professional
        setSelectedProfessional(booking.professional_id || 'any');

        // Populate date/time
        const bDate = new Date(booking.appointment_time);
        if (!isNaN(bDate.getTime())) {
            setSelectedDate(bDate);
            const timeStr = bDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            setSelectedTime(timeStr);
        }

        setCustomerName(booking.customer_name);
        setStep('services');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async () => {
        if (!businessId || !customerName || !customerPhone || !selectedDate || !selectedTime || !acceptedPolicy) {
            alert('Por favor, preencha todos os campos e aceite a política de cancelamento.');
            return;
        }

        setIsSubmitting(true);

        try {
            let photoUrl = client?.photo_url || null;

            // 1. Upload photo if provided
            if (customerPhoto) {
                const fileExt = customerPhoto.name.split('.').pop();
                const fileName = `public_${businessId}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('client_photos')
                    .upload(fileName, customerPhoto);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('client_photos')
                        .getPublicUrl(fileName);
                    photoUrl = publicUrl;
                }
            }

            // 2. Register/Update client
            // This returns the FRESH client record
            const registeredClient = await register({
                name: customerName,
                phone: customerPhone,
                photo_url: photoUrl,
                business_id: businessId
            });

            // 3. Format appointment time and Calculate Total
            const dateStr = selectedDate.toISOString().split('T')[0];
            const totalPrice = calculateTotal();
            const duration = calculateDuration();

            // Handle business timezone offset to ensure consistency regardless of client location
            const getBusinessOffset = (region: string) => {
                if (region === 'BR') return '-03:00';
                if (region === 'PT') return '+00:00'; // Defaulting to winter, PT is Lisbon
                return 'Z';
            };
            const offset = getBusinessOffset(business?.region || 'BR');
            const appointmentTimeISO = `${dateStr}T${selectedTime}:00${offset}`;
            const appointmentTime = new Date(appointmentTimeISO);

            // 3.5 Check if already has an active booking (Extra safety for concurrency)
            const { data: existingBooking } = await supabase.rpc('get_active_booking_by_phone', {
                p_phone: customerPhone,
                p_business_id: businessId
            });

            if (existingBooking && existingBooking[0]) {
                setActiveBooking(existingBooking[0]);
                setStep('success');
                setIsSubmitting(false);
                return;
            }

            // 4. Auto-assign professional if "any" is selected
            let finalProfessionalId = selectedProfessional === 'any' ? null : selectedProfessional;

            if (selectedProfessional === 'any') {
                const { data: autoProId, error: autoProError } = await supabase.rpc('get_first_available_professional', {
                    p_business_id: businessId,
                    p_appointment_time: appointmentTime.toISOString(),
                    p_duration_min: duration
                });

                if (autoProId) {
                    finalProfessionalId = autoProId;
                } else {
                    console.warn('Auto-assign failed, falling back to unassigned:', autoProError);
                }
            }

            // 5. Create or Update Booking
            if (editingBookingId) {
                const { error } = await supabase
                    .from('public_bookings')
                    .update({
                        customer_name: customerName,
                        service_ids: selectedServices,
                        professional_id: finalProfessionalId,
                        appointment_time: appointmentTimeISO,
                        total_price: totalPrice,
                        status: 'pending', // Reset to pending if edited? Usually yes.
                        duration_minutes: duration
                    })
                    .eq('id', editingBookingId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('public_bookings')
                    .insert({
                        business_id: businessId,
                        customer_name: customerName,
                        customer_phone: customerPhone,
                        service_ids: selectedServices,
                        professional_id: finalProfessionalId,
                        appointment_time: appointmentTimeISO,
                        total_price: totalPrice,
                        status: 'pending',
                        duration_minutes: duration
                    });

                if (error) throw error;
            }

            setEditingBookingId(null);
            // Refresh active booking data to show up-to-date info on success screen
            const { data: refreshedBooking } = await supabase.rpc('get_active_booking_by_phone', {
                p_phone: customerPhone,
                p_business_id: businessId
            });
            if (refreshedBooking && refreshedBooking[0]) {
                setActiveBooking(refreshedBooking[0]);
            }

            setStep('success');
            // Form cleaned up when navigating away or new booking
            setSelectedServices([]);
            setSelectedProfessional(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setAcceptedPolicy(false);
        } catch (error: any) {
            console.error('Error creating booking:', error);
            alert(`Erro ao criar agendamento: ${error.message || error}`);
        } finally {
            setIsSubmitting(false);
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
    const currencyRegion = business?.region || businessSettings?.region || (businessSettings?.currency_symbol === '€' ? 'PT' : 'BR');

    const accentColorValue = isBeauty ? '#A78BFA' : '#C29B40';

    // SUCCESS SCREEN
    if (step === 'success') {
        const displayBooking = activeBooking || {
            customer_name: customerName,
            customer_phone: customerPhone,
            appointment_time: selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(selectedTime?.split(':')[0] || '0'), parseInt(selectedTime?.split(':')[1] || '0')) : new Date(),
            service_names: selectedServices.map(id => services.find(s => s.id === id)?.name).filter(Boolean),
            status: 'pending',
            professional_id: selectedProfessional === 'any' ? null : selectedProfessional
        };

        const bookingDate = new Date(displayBooking.appointment_time);
        const isConfirmed = displayBooking.status === 'confirmed';

        return (
            <div className={`min-h-screen ${bgClass} flex items-center justify-center p-6`}>
                <div className={`${cardClass} p-8 max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-300`}>
                    <div className={`absolute top-0 left-0 w-full h-1 bg-${isConfirmed ? 'green-500' : accentColor}`}></div>

                    <div className={`w-20 h-20 rounded-full bg-${isConfirmed ? 'green-500' : accentColor}/10 flex items-center justify-center mx-auto mb-6`}>
                        <Check className={`w-10 h-10 text-${isConfirmed ? 'green-500' : accentColor}`} />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {isConfirmed ? 'Agendamento Confirmado!' : (activeBooking ? 'Você já tem uma solicitação!' : 'Solicitação Recebida!')}
                    </h2>
                    <p className="text-neutral-400 mb-8 max-w-[280px] mx-auto text-sm">
                        {isConfirmed
                            ? 'Seu horário foi confirmado. Estamos te esperando!'
                            : (activeBooking
                                ? 'Você já possui uma solicitação pendente. Aguarde a nossa confirmação via WhatsApp.'
                                : 'Em breve iremos confirmar seu horário no seu WhatsApp. Fique atento às notificações.')
                        }
                    </p>

                    <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/10 text-left space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="block text-[10px] uppercase text-neutral-500 mb-1 font-mono tracking-wider">Status</span>
                                <span className={`inline-block px-2 py-0.5 ${isConfirmed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} text-[10px] font-bold rounded uppercase`}>
                                    {isConfirmed ? 'Confirmado' : 'Pendente'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] uppercase text-neutral-500 mb-1 font-mono tracking-wider">Data e Hora</span>
                                <span className="text-white font-bold text-sm">
                                    {!isNaN(bookingDate.getTime())
                                        ? `${bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${bookingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                                        : 'A definir'
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="h-px bg-white/10"></div>

                        <div className="space-y-4">
                            <div>
                                <span className="block text-[10px] uppercase text-neutral-500 mb-1 font-mono tracking-wider">Serviço(s)</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {(displayBooking.service_names && displayBooking.service_names.length > 0) ? (
                                        displayBooking.service_names.map((name: string, i: number) => (
                                            <span key={i} className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-neutral-300 border border-white/5">{name}</span>
                                        ))
                                    ) : (
                                        <span className="text-white text-sm font-bold opacity-60">
                                            {selectedServices.length > 0 ? `${selectedServices.length} serviço(s)` : 'Nenhum serviço'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                                <div className="flex-1">
                                    <span className="block text-[10px] uppercase text-neutral-500 mb-1 font-mono tracking-wider">Profissional</span>
                                    <span className="text-white font-bold text-sm">
                                        {displayBooking.professional_name || (professionals.find(p => p.id === displayBooking.professional_id)?.name) || 'A Distribuir'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] uppercase text-neutral-500 mb-1 font-mono tracking-wider">WhatsApp</span>
                                    <span className="text-white font-bold text-sm">{formatPhone(displayBooking.customer_phone, currencyRegion)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isConfirmed && activeBooking && (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => handleCancelBooking(activeBooking.id)}
                                className="p-3 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all font-mono"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={() => handleEditBooking(activeBooking)}
                                className="p-3 text-xs font-bold text-white bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all font-mono"
                            >
                                ALTERAR
                            </button>
                        </div>
                    )}

                    <BrutalButton
                        onClick={() => window.location.reload()}
                        variant="primary"
                        className="w-full"
                    >
                        Voltar ao Início
                    </BrutalButton>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${bgClass} font-sans selection:bg-${accentColor}/30`}>
            {/* Policy Modal */}
            {showPolicyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`${cardClass} max-w-lg w-full p-6 relative animate-in zoom-in-95 duration-200`}>
                        <button
                            onClick={() => setShowPolicyModal(false)}
                            className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className={`text-xl font-bold text-white mb-4 flex items-center gap-2`}>
                            <AlertTriangle className={`w-5 h-5 text-${accentColor}`} />
                            Política de Cancelamento
                        </h3>

                        <div className="text-neutral-300 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {businessSettings?.cancellation_policy ? (
                                <p className="whitespace-pre-wrap leading-relaxed">{businessSettings.cancellation_policy}</p>
                            ) : (
                                <p>Por favor, avise com antecedência caso não possa comparecer. O não comparecimento sem aviso prévio pode sujeitar a cobranças ou restrições em agendamentos futuros.</p>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                            <BrutalButton
                                onClick={() => setShowPolicyModal(false)}
                                variant="outline"
                                size="sm"
                            >
                                Entendi
                            </BrutalButton>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. CINEMATIC HERO SECTION */}
            <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
                {/* Background Cover */}
                <div className="absolute inset-0">
                    {
                        business.cover_photo_url ? (
                            <img
                                src={business.cover_photo_url}
                                alt="Cover"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className={`w-full h-full ${isBeauty ? 'bg-gradient-to-br from-beauty-dark via-beauty-card to-beauty-neon/20' : 'bg-neutral-900 border-b-4 border-neutral-800'}`}></div>
                        )
                    }
                    {/* Immersive Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
                </div >

                {/* Hero Content */}
                < div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-4 text-center" >
                    {/* Logo/Avatar */}
                    < div className={`relative w-24 h-24 md:w-32 md:h-32 mb-6 rounded-full p-1 bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-700`}>
                        {
                            business.logo_url ? (
                                <img src={business.logo_url} alt="Logo" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-800 rounded-full">
                                    <Scissors className={`w-10 h-10 md:w-14 md:h-14 text-${accentColor}`} />
                                </div>
                            )
                        }
                        {/* Status Pulse */}
                        <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                    </div >

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
                </div >
            </div >

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
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl md:text-3xl font-heading text-white uppercase tracking-tight">Menu de Serviços</h2>
                                            <p className="text-neutral-500 text-xs font-mono">{services.filter(s => activeCategory === 'all' || s.category_id === activeCategory).length} Opções</p>
                                        </div>

                                        {/* Search Bar */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Pesquisar serviço:</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Digite o nome do serviço..."
                                                    className={`w-full px-4 py-3 pl-10 rounded-lg font-medium transition-all ${isBeauty
                                                        ? 'bg-beauty-card border border-beauty-neon/20 text-white placeholder:text-neutral-500 focus:border-beauty-neon'
                                                        : 'bg-neutral-900 border-2 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-accent-gold'
                                                        }`}
                                                />
                                                <Sparkles className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${searchQuery ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-neutral-500'}`} />
                                                {searchQuery && (
                                                    <button
                                                        onClick={() => setSearchQuery('')}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Category Filter */}
                                    {categories.length > 0 && (
                                        <div className="flex gap-2 mb-2 overflow-x-auto pb-2 custom-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
                                            <button
                                                onClick={() => setActiveCategory('all')}
                                                className={`
                                                    px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all
                                                    ${activeCategory === 'all'
                                                        ? `bg-${accentColor} text-black border-2 border-${accentColor}`
                                                        : 'bg-neutral-800 text-neutral-400 border-2 border-transparent hover:bg-neutral-700 hover:text-white'}
                                                `}
                                            >
                                                Todos
                                            </button>
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveCategory(cat.id)}
                                                    className={`
                                                        px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all
                                                        ${activeCategory === cat.id
                                                            ? `bg-${accentColor} text-black border-2 border-${accentColor}`
                                                            : 'bg-neutral-800 text-neutral-400 border-2 border-transparent hover:bg-neutral-700 hover:text-white'}
                                                    `}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Services organized by category */}
                                    <div className="space-y-6">
                                        {(() => {
                                            // Group services by category with search filter
                                            const servicesByCategory = services
                                                .filter(service => {
                                                    // Category filter
                                                    const matchesCategory = activeCategory === 'all' || service.category_id === activeCategory;
                                                    // Search filter
                                                    const matchesSearch = !searchQuery ||
                                                        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
                                                    return matchesCategory && matchesSearch;
                                                })
                                                .reduce((acc, service) => {
                                                    const categoryId = service.category_id || 'uncategorized';
                                                    if (!acc[categoryId]) acc[categoryId] = [];
                                                    acc[categoryId].push(service);
                                                    return acc;
                                                }, {} as Record<string, typeof services>);

                                            // Sort services within each category alphabetically
                                            Object.keys(servicesByCategory).forEach(catId => {
                                                servicesByCategory[catId].sort((a, b) => a.name.localeCompare(b.name));
                                            });

                                            // Get category names for headers
                                            const getCategoryName = (catId: string) => {
                                                if (catId === 'uncategorized') return 'Outros Serviços';
                                                const cat = categories.find(c => c.id === catId);
                                                return cat?.name || 'Serviços';
                                            };

                                            return Object.entries(servicesByCategory).map(([categoryId, categoryServices]) => (
                                                <div key={categoryId} className="space-y-3">
                                                    {/* Category Header (only show if not filtering by specific category) */}
                                                    {activeCategory === 'all' && (
                                                        <h3 className="text-lg font-heading text-white uppercase tracking-tight border-b border-white/10 pb-2">
                                                            {getCategoryName(categoryId)}
                                                        </h3>
                                                    )}

                                                    {/* Services List - Compact Layout */}
                                                    <div className="space-y-2">
                                                        {categoryServices.map(service => {
                                                            const isSelected = selectedServices.includes(service.id);
                                                            return (
                                                                <div
                                                                    key={service.id}
                                                                    onClick={() => toggleService(service.id)}
                                                                    className={`
                                                                        relative cursor-pointer transition-all duration-200 group overflow-hidden flex items-center gap-4 p-4
                                                                        ${isBeauty
                                                                            ? 'rounded-xl border'
                                                                            : 'border-2 border-black'}
                                                                        ${isSelected
                                                                            ? (isBeauty
                                                                                ? 'bg-beauty-card border-beauty-neon shadow-neon'
                                                                                : 'bg-neutral-900 border-accent-gold shadow-heavy-sm')
                                                                            : (isBeauty
                                                                                ? 'bg-beauty-card/30 border-white/5 hover:border-beauty-neon/30 hover:bg-beauty-card/50'
                                                                                : 'bg-brutal-card border-transparent hover:border-neutral-700')}
                                                                    `}
                                                                >
                                                                    {/* Selection Indicator */}
                                                                    <div className={`
                                                                        shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                                        ${isSelected
                                                                            ? (isBeauty ? 'bg-beauty-neon border-beauty-neon' : 'bg-accent-gold border-accent-gold')
                                                                            : 'border-neutral-600 bg-transparent'}
                                                                    `}>
                                                                        {isSelected && <Check className="w-4 h-4 text-black" />}
                                                                    </div>

                                                                    {/* Service Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className={`font-bold text-base leading-tight truncate ${isSelected ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-white'}`}>
                                                                            {service.name}
                                                                        </h4>
                                                                        {service.description && (
                                                                            <p className="text-neutral-400 text-xs mt-1 line-clamp-1">
                                                                                {service.description}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    {/* Price and Duration */}
                                                                    <div className="shrink-0 text-right">
                                                                        <div className={`text-lg font-mono font-bold ${isBeauty ? 'text-white' : 'text-white'}`}>
                                                                            {formatCurrency(service.price, currencyRegion)}
                                                                        </div>
                                                                        <div className="flex items-center justify-end gap-1 text-neutral-400 text-[10px] font-mono mt-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            {service.duration_minutes}min
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ));
                                        })()}

                                        {/* Empty State */}
                                        {(() => {
                                            const filteredCount = services.filter(service => {
                                                const matchesCategory = activeCategory === 'all' || service.category_id === activeCategory;
                                                const matchesSearch = !searchQuery ||
                                                    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
                                                return matchesCategory && matchesSearch;
                                            }).length;

                                            if (filteredCount === 0) {
                                                return (
                                                    <div className={`text-center py-12 px-4 rounded-xl border-2 border-dashed ${isBeauty ? 'border-white/10 bg-beauty-card/30' : 'border-neutral-800 bg-neutral-900/30'}`}>
                                                        <Sparkles className={`w-12 h-12 mx-auto mb-4 ${isBeauty ? 'text-beauty-neon/50' : 'text-accent-gold/50'}`} />
                                                        <h3 className="text-white font-bold text-lg mb-2">Nenhum serviço encontrado</h3>
                                                        <p className="text-neutral-400 text-sm mb-4">
                                                            {searchQuery
                                                                ? `Não encontramos serviços com "${searchQuery}"`
                                                                : 'Não há serviços nesta categoria'}
                                                        </p>
                                                        {searchQuery && (
                                                            <button
                                                                onClick={() => setSearchQuery('')}
                                                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isBeauty ? 'bg-beauty-neon text-black hover:bg-beauty-neon/80' : 'bg-accent-gold text-black hover:bg-accent-gold/80'}`}
                                                            >
                                                                Limpar pesquisa
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
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

                                    {/* Region Warning/Indicator if needed */}
                                    {currencyRegion === 'PT' && (
                                        <div className="bg-neutral-900/50 border border-neutral-800 p-2 rounded text-xs text-neutral-500 text-center mb-4">
                                            Horário de Lisboa (GMT/WEST)
                                        </div>
                                    )}

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
                                        <CalendarPicker
                                            selectedDate={selectedDate}
                                            onDateSelect={setSelectedDate}
                                            isBeauty={isBeauty}
                                            fullDates={fullDates}
                                        />
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
                                    <div className="mt-8 flex justify-end">
                                        <BrutalButton
                                            disabled={!selectedTime}
                                            onClick={() => {
                                                setStep('contact');
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="w-full md:w-auto"
                                        >
                                            Continuar
                                        </BrutalButton>
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
                                            <div className={`${cardClass} p-6 md:p-8 space-y-6`}>
                                                <h3 className="text-lg font-bold text-white uppercase flex items-center gap-2">
                                                    <User className={`w-5 h-5 text-${accentColor}`} />
                                                    Seus Dados
                                                </h3>

                                                {/* Phone Input */}
                                                <div>
                                                    <label className="text-neutral-400 text-xs font-mono uppercase mb-2 block">Seu Celular (WhatsApp)</label>
                                                    <PhoneInput
                                                        value={customerPhone}
                                                        onChange={setCustomerPhone}
                                                        defaultRegion={currencyRegion as 'BR' | 'PT'}
                                                    />
                                                    <p className="text-[10px] text-neutral-500 mt-1">
                                                        Usaremos para confirmar seu agendamento.
                                                    </p>
                                                </div>

                                                {/* Name Input */}
                                                <div>
                                                    <label className="text-neutral-400 text-xs font-mono uppercase mb-2 block tracking-widest">Seu Nome Completo</label>
                                                    <div className="relative group">
                                                        <div className={`absolute inset-0 bg-${accentColor}/5 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity`}></div>
                                                        <input
                                                            type="text"
                                                            value={customerName}
                                                            onChange={(e) => setCustomerName(e.target.value)}
                                                            className={`
                                                                relative w-full p-4 text-white focus:outline-none transition-all duration-300
                                                                ${isBeauty
                                                                    ? 'bg-beauty-card/50 border border-beauty-neon/20 rounded-xl focus:border-beauty-neon focus:bg-beauty-card placeholder-beauty-neon/30 h-[56px]'
                                                                    : 'bg-neutral-900 border-2 border-brutal-border focus:border-accent-gold placeholder-neutral-600 shadow-[2px_2px_0px_0px_#000000] focus:shadow-[4px_4px_0px_0px_#C29B40] h-[56px]'
                                                                }
                                                            `}
                                                            placeholder="Como gostaria de ser chamado?"
                                                        />
                                                        <User className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${customerName ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-neutral-600'}`} />
                                                    </div>
                                                </div>

                                                {/* Photo Input (Optional) */}
                                                <div>
                                                    <label className="text-neutral-400 text-xs font-mono uppercase mb-2 block">Sua Foto (Opcional)</label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                                                            {customerPhoto ? (
                                                                <img src={URL.createObjectURL(customerPhoto)} alt="Preview" className="w-full h-full object-cover" />
                                                            ) : existingPhotoUrl ? (
                                                                <img src={existingPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-6 h-6 text-neutral-500" />
                                                            )}
                                                        </div>
                                                        <label className="cursor-pointer">
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        setCustomerPhoto(e.target.files[0]);
                                                                    }
                                                                }}
                                                            />
                                                            <span className={`text-sm font-bold text-${accentColor} hover:underline decoration-dotted flex items-center gap-2`}>
                                                                <Upload className="w-4 h-4" />
                                                                Carregar Foto
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Terms Checkbox */}
                                                <div className="pt-4 border-t border-white/5">
                                                    <label className="flex items-start gap-3 cursor-pointer group">
                                                        <div className={`
                                                            w-6 h-6 rounded border-2 flex items-center justify-center transition-all mt-0.5
                                                            ${acceptedPolicy
                                                                ? `bg-${accentColor} border-${accentColor} text-black`
                                                                : 'border-neutral-700 bg-neutral-800 group-hover:border-neutral-500'
                                                            }
                                                        `}>
                                                            {acceptedPolicy && <Check className="w-4 h-4" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={acceptedPolicy}
                                                            onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                                        />
                                                        <div className="text-sm text-neutral-400">
                                                            Concordo com a <span className="text-white underline decoration-dotted hover:opacity-80 transition-opacity" onClick={(e) => {
                                                                e.preventDefault();
                                                                setShowPolicyModal(true);
                                                            }}>política de cancelamento</span> e confirmo que comparecerei no horário agendado.
                                                        </div>
                                                    </label>
                                                </div>

                                                <BrutalButton
                                                    onClick={handleSubmit}
                                                    disabled={!customerName || !customerPhone || !acceptedPolicy || customerPhone.length < 9 || isSubmitting}
                                                    variant="primary"
                                                    size="lg"
                                                    className="w-full flex items-center justify-center gap-2"
                                                >
                                                    {isSubmitting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                                                        </>
                                                    ) : (
                                                        'Confirmar Agendamento'
                                                    )}
                                                </BrutalButton>
                                            </div>
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
            {
                selectedServices.length > 0 && step === 'services' && (
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
                )
            }
        </div >
    );
};
