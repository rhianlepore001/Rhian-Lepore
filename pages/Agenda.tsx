import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useToast } from '../components/ui/Toast';
import { Calendar, Clock, Plus, User, Users, Check, X, ChevronLeft, ChevronRight, History, AlertTriangle, Loader2, Trash2, Edit2, Tag, Scissors, MessageCircle, Info, DollarSign, Phone, Ban } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppointmentEditModal } from '../components/AppointmentEditModal';
import { AppointmentWizard } from '../components/AppointmentWizard';
import { AllAppointmentsModal } from '../components/dashboard/modals/AllAppointmentsModal';
import { CheckoutModal } from '../components/CheckoutModal';
import { EmptyState } from '../components/EmptyState';
import { confirmPublicBooking, createAcceptedAppointmentFromBooking, rejectPublicBooking } from '../services/publicBooking';
import { deleteAppointmentWithFinance } from '../services/scheduling';

import { buildWhatsAppLink, formatCurrency, formatPhone } from '../utils/formatters';
import { formatDateForInput } from '../utils/date';
import { useAppTour } from '../hooks/useAppTour';
import { logger } from '../utils/Logger';
import { combineDateAndTime } from '../utils/date';
import { getVisualStatus, VISUAL_STATUS_CLASSES, VISUAL_STATUS_LABEL, type VisualStatus } from '../utils/appointmentStatus';
import { useTenantLocale } from '../hooks/useTenantLocale';

// Ícone por estado visual — indicador secundário (forma + cor) para daltônicos/baixa visão.
const VISUAL_STATUS_ICON: Record<VisualStatus, React.ComponentType<{ className?: string }>> = {
    completed: Check,
    overdue: AlertTriangle,
    normal: Clock,
    noshow: Ban,
    cancelled: X,
};


interface Appointment {
    id: string;
    client_id: string;
    clientName: string;
    service: string;
    appointment_time: string;
    price: number;
    status: string;
    professional_id: string | null;
    basePrice?: number; // Base price for discount calculation
    clientPhone?: string;
    notes?: string;
    payment_method?: string | null;
    duration_minutes?: number;
    edited_at?: string | null;
}

interface TeamMember {
    id: string;
    name: string;
    photo_url?: string;
}

interface Service {
    id: string;
    name: string;
    price: number;
    duration_minutes?: number;
    category_id?: string;
    description?: string | null;
}

interface Category {
    id: string;
    name: string;
}

interface Client {
    id: string;
    name: string;
    phone?: string;
}

// Helper para obter a data inicial (da URL ou hoje)
const getInitialDate = (searchParams: URLSearchParams): Date => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
        const date = new Date(dateParam);
        // Verifica se a data é válida e não é NaN
        if (!isNaN(date.getTime())) {
            // Ajusta para o fuso horário local para evitar problemas de dia
            const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            return localDate;
        }
    }
    return new Date();
};

export const Agenda: React.FC = () => {
    const { user, region, role, companyId, teamMemberId } = useAuth();
    const isStaff = role === 'staff';
    const effectiveUserId = companyId ?? user?.id;
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    useAppTour(); // Instancia para detectar continuação do tour
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [publicBookings, setPublicBookings] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getInitialDate(searchParams));
    const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showAllAppointmentsModal, setShowAllAppointmentsModal] = useState(false);
    const [historyAppointments, setHistoryAppointments] = useState<Appointment[]>([]);
    const [historyMonth, setHistoryMonth] = useState(new Date());
    // Filtro de profissionais (multi-select). [] = "Todos" (apenas owner).
    // Staff inicia com o próprio teamMemberId e nunca enxerga "Todos".
    const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>([]);
    const staffFilterInitialized = useRef(false);
    const [overdueAppointments, setOverdueAppointments] = useState<Appointment[]>([]);
    const [isOverdueLoading, setIsOverdueLoading] = useState(false);
    const [businessName, setBusinessName] = useState(''); // NEW STATE FOR BUSINESS NAME

    // State for editing
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

    // State for checkout (Fase 3)
    const [checkoutAppointment, setCheckoutAppointment] = useState<import('../types').Appointment | null>(null);
    const [checkoutTeamMembers, setCheckoutTeamMembers] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
    const [financialSettings, setFinancialSettings] = useState<{
        machine_fee_enabled: boolean;
        debit_fee_percent: number;
        credit_fee_percent: number;
    } | null>(null);

    // Form state (for new appointment modal)
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [customTime, setCustomTime] = useState('');
    const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(formatDateForInput(selectedDate));
    const [discountPercentage, setDiscountPercentage] = useState('0'); // NEW STATE FOR DISCOUNT
    const [notes, setNotes] = useState(''); // NEW STATE FOR NOTES
    const [finalPriceInput, setFinalPriceInput] = useState('');


    const { accent, colors, isBeauty, classes, font, radius, shadow, status } = useBrutalTheme();
    const { showToast } = useToast();
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel?: string;
        variant?: 'danger' | 'default';
        onConfirm: () => void;
    } | null>(null);
    const { region: currencyRegion, currencySymbol } = useTenantLocale();

    const isOverdueFilter = searchParams.get('filter') === 'overdue';

    // Helper for initials
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Atualiza selectedDate se o parâmetro de URL mudar
    useEffect(() => {
        setSelectedDate(getInitialDate(searchParams));
    }, [searchParams]);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const newDate = new Date(dateParam);
            const userTimezoneOffset = newDate.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(newDate.getTime() + userTimezoneOffset);
            setSelectedDate(adjustedDate);
        }
    }, [searchParams]);

    // Real-time subscription for public bookings
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel('public_bookings_agenda')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'public_bookings',
                filter: `business_id=eq.${user.id}`
            }, () => {
                fetchPublicBookings();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, selectedDate]);

    // State for viewing appointment details
    const [showingDetailsAppointment, setShowingDetailsAppointment] = useState<Appointment | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOverdueFilter) {
            fetchOverdueAppointments();
        }
    }, [user, isOverdueFilter]);

    // Effect to fetch history appointments when historyMonth changes and modal is open
    useEffect(() => {
        if (showHistoryModal) {
            fetchHistoryAppointments();
        }
    }, [historyMonth, showHistoryModal]);

    const fetchAllFutureAppointments = useCallback(async () => {
        if (!user) return [];
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('appointments')
            .select('*, clients(name)')
            .eq('user_id', effectiveUserId)
            .gte('appointment_time', now)
            .in('status', ['Confirmed', 'Pending'])
            .order('appointment_time', { ascending: true });

        if (error) {
            logger.error('Erro ao buscar todos os agendamentos futuros:', error);
            return [];
        }

        if (!data) return [];

        // Formatar dados igual ao AllAppointmentsModal espera
        return data.map((apt: any) => ({
            id: apt.id,
            clientName: apt.clients?.name || 'Cliente Desconhecido',
            service: apt.service,
            time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
            status: apt.status,
            price: apt.price,
            appointment_time: apt.appointment_time
        }));
    }, [user]);


    // Price Calculation & Sync Effect
    const selectedServicesDetails = services.filter(s => selectedServices.includes(s.id));
    const basePriceNew = selectedServicesDetails.reduce((sum, s) => sum + s.price, 0);
    const discountRateNew = parseFloat(discountPercentage) / 100;
    const finalPriceNew = basePriceNew * (1 - (isNaN(discountRateNew) ? 0 : discountRateNew));

    useEffect(() => {
        setFinalPriceInput(finalPriceNew.toFixed(2));
    }, [basePriceNew, discountPercentage]);



    // Update selectedAppointmentDate when modal opens or selectedDate changes
    // Staff inicia vendo apenas a própria agenda (R27).
    useEffect(() => {
        if (isStaff && teamMemberId && !staffFilterInitialized.current) {
            setSelectedProfessionalIds([teamMemberId]);
            staffFilterInitialized.current = true;
        }
    }, [isStaff, teamMemberId]);

    useEffect(() => {
        if (showNewAppointmentModal) {
            setSelectedAppointmentDate(formatDateForInput(selectedDate));

            // Auto-select professional: 1 selecionado → ele; staff → o próprio; senão único do time
            if (selectedProfessionalIds.length === 1) {
                setSelectedProfessional(selectedProfessionalIds[0]);
            } else if (isStaff && teamMemberId) {
                setSelectedProfessional(teamMemberId);
            } else if (teamMembers.length === 1) {
                setSelectedProfessional(teamMembers[0].id);
            }
        }
    }, [showNewAppointmentModal, selectedDate, selectedProfessionalIds, teamMembers, isStaff, teamMemberId]);

    // Handle clientId and service from URL (coming from CRM history)
    useEffect(() => {
        const clientIdParam = searchParams.get('clientId');
        const serviceNameParam = searchParams.get('service');
        const isNewQuery = searchParams.get('new') === 'true';

        if (isNewQuery) {
            setShowNewAppointmentModal(true);
            // Limpar o parâmetro da URL para evitar reabrir ao atualizar
            searchParams.delete('new');
            navigate({ search: searchParams.toString() }, { replace: true });
        } else if (showNewAppointmentModal) {
            // Ensure URL has ?new=true if modal is open via state, so Layout hides nav
            // But be careful not to trigger loop. 
            // Better approach: when opening modal via button, use navigate.
        }

        if (clientIdParam && clients.length > 0) {
            // Pre-select the client
            setSelectedClient(clientIdParam);

            // Pre-select service if provided
            if (serviceNameParam && services.length > 0) {
                const matchedService = services.find(s => s.name === serviceNameParam);
                if (matchedService) {
                    setSelectedServices([matchedService.id]);
                }
            }

            // Open the new appointment modal
            setShowNewAppointmentModal(true);
        }
    }, [searchParams, clients, services]);

    const fetchData = async () => {
        await Promise.all([
            fetchTeamMembers(),
            fetchAppointments(),
            fetchPublicBookings(),
            fetchClients(),
            fetchServices(),
            fetchCategories(),
            fetchBusinessProfile(),
            fetchCheckoutData()
        ]);
        setLoading(false);
    };

    const fetchCheckoutData = async () => {
        if (!user) return;
        // Buscar team members para o dropdown "Recebido por" no CheckoutModal
        const { data: membersData } = await supabase
            .from('team_members')
            .select('id, name, active')
            .eq('user_id', companyId || user.id)
            .eq('active', true)
            .order('name');
        setCheckoutTeamMembers(membersData || []);

        // Buscar configurações financeiras para pré-preencher taxa
        const { data: finSettings } = await supabase
            .from('business_settings')
            .select('machine_fee_enabled, debit_fee_percent, credit_fee_percent')
            .eq('user_id', companyId || user.id)
            .maybeSingle();
        setFinancialSettings(finSettings);
    };

    const fetchTeamMembers = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('team_members')
            .select('id, name, photo_url')
            .eq('user_id', effectiveUserId)
            .eq('active', true)
            .order('name');
        if (data) setTeamMembers(data);
    };

    const fetchAppointments = async () => {
        if (!user) return;
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        const now = new Date();

        // 1. Fetch all services to map names to prices later
        const { data: allServices } = await supabase
            .from('services')
            .select('name, price')
            .eq('user_id', effectiveUserId);

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        // 2. Fetch appointments for the selected day (Confirmed status)
        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name, id, phone)')
            .eq('user_id', effectiveUserId)
            .gte('appointment_time', startOfDay.toISOString())
            .lte('appointment_time', endOfDay.toISOString())
            .in('status', ['Confirmed', 'Pending', 'Completed', 'Cancelled', 'NoShow']) // Agenda v2: todos os status visíveis na grade com cores
            .order('appointment_time');

        if (data) {
            setAppointments(data.map((apt: any) => {
                // Use the price from the service table as the base price
                const basePrice = servicePriceMap.get(apt.service) || apt.price;
                return {
                    id: apt.id,
                    client_id: apt.client_id,
                    clientName: apt.clients?.name || 'Cliente Desconhecido',
                    clientPhone: apt.clients?.phone || '',
                    service: apt.service,
                    appointment_time: apt.appointment_time,
                    price: apt.price,
                    status: apt.status,
                    professional_id: apt.professional_id,
                    basePrice: basePrice,
                    notes: apt.notes,
                    payment_method: apt.payment_method,
                    duration_minutes: apt.duration_minutes,
                    edited_at: apt.edited_at
                };
            }));
        }
    };

    const fetchOverdueAppointments = async () => {
        if (!user) return;
        setIsOverdueLoading(true);
        const now = new Date().toISOString();

        // 1. Fetch all services to map names to prices later
        const { data: allServices } = await supabase
            .from('services')
            .select('name, price')
            .eq('user_id', effectiveUserId);

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name, phone)')
            .eq('user_id', effectiveUserId)
            .in('status', ['Confirmed', 'Pending'])
            .lt('appointment_time', now) // Agendamentos no passado
            .order('appointment_time', { ascending: false });

        if (data) {
            setOverdueAppointments(data.map((apt: any) => {
                const basePrice = servicePriceMap.get(apt.service) || apt.price;
                return {
                    id: apt.id,
                    client_id: apt.client_id,
                    clientName: apt.clients?.name || 'Cliente Desconhecido',
                    clientPhone: apt.clients?.phone || '',
                    service: apt.service,
                    appointment_time: apt.appointment_time,
                    price: apt.price,
                    status: apt.status,
                    professional_id: apt.professional_id,
                    basePrice: basePrice,
                    notes: apt.notes
                };
            }));
        }
        setIsOverdueLoading(false);
    };

    const fetchPublicBookings = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('public_bookings')
            .select('*')
            .eq('business_id', user.id)
            .eq('status', 'pending')
            .order('appointment_time');
        if (data) setPublicBookings(data);
    };

    const fetchClients = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('clients')
            .select('id, name, phone') // Adicionando phone para subtext
            .eq('user_id', effectiveUserId)
            .order('name');
        if (data) setClients(data as Client[]);
    };

    const fetchServices = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('services')
            .select('id, name, price, duration_minutes, category_id, description') // Adicionando details para wizard
            .eq('user_id', effectiveUserId)
            .eq('active', true)
            .order('name');
        if (data) setServices(data as Service[]);
    };

    const fetchCategories = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('service_categories')
            .select('id, name')
            .eq('user_id', effectiveUserId)
            .order('name');
        if (data) setCategories(data);
    };

    const fetchBusinessProfile = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', effectiveUserId)
            .single();
        if (data) setBusinessName(data.business_name || 'Seu Estabelecimento');
    };

    const fetchHistoryAppointments = async () => {
        if (!user) return;
        const startOfMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth(), 1);
        const endOfMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 0, 23, 59, 59);

        // 1. Fetch all services to map names to prices later
        const { data: allServices } = await supabase
            .from('services')
            .select('name, price')
            .eq('user_id', effectiveUserId);

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name)')
            .eq('user_id', effectiveUserId)
            .gte('appointment_time', startOfMonth.toISOString())
            .lte('appointment_time', endOfMonth.toISOString())
            .in('status', ['Completed', 'Cancelled'])
            .order('appointment_time', { ascending: false });

        if (data) {
            setHistoryAppointments(data.map((apt: any) => {
                const basePrice = servicePriceMap.get(apt.service) || apt.price;
                return {
                    id: apt.id,
                    client_id: apt.client_id,
                    clientName: apt.clients?.name || 'Cliente Desconhecido',
                    service: apt.service,
                    appointment_time: apt.appointment_time,
                    price: apt.price,
                    status: apt.status,
                    professional_id: apt.professional_id,
                    basePrice: basePrice,
                    notes: apt.notes
                };
            }));
        }
    };

    const handleDeleteHistoryAppointment = (appointmentId: string) => {
        if (isStaff) {
            showToast('Apenas o dono pode excluir agendamentos do histórico.', 'warning');
            return;
        }
        setConfirmDialog({
            title: 'Excluir do histórico',
            message: 'Esta ação é irreversível e remove também o registro financeiro associado. Excluir mesmo assim?',
            confirmLabel: 'Excluir',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    // Exclusão atômica (agendamento + registro financeiro) via RPC transacional, com escopo de tenant no banco.
                    await deleteAppointmentWithFinance({ appointmentId });
                    showToast('Agendamento e registro financeiro excluídos.', 'success');
                    fetchHistoryAppointments();
                    fetchData();
                } catch (error) {
                    logger.error('Error deleting history appointment', error);
                    showToast('Erro ao excluir agendamento do histórico.', 'error');
                }
            },
        });
    };

    const handleAcceptBooking = async (booking: any) => {
        if (!user || isProcessing) return;
        setIsProcessing(true);

        try {
            let clientId = null;

            // 1. Check for existing client by phone number
            // Sanitize phone number for search (remove non-digits?) 
            // Better to search exactly as stored first, or maybe both formats if possible.
            // We search for both Raw (+55...) and Formatted ((11)...) to catch legacy clients.
            const rawPhone = booking.customer_phone;
            const formattedPhoneBR = formatPhone(rawPhone, 'BR'); // Try BR mask
            const formattedPhonePT = formatPhone(rawPhone, 'PT'); // Try PT mask

            // Or filter construction: phone.eq.RAW,phone.eq.FORMATTED...
            // Note: supabase .or() syntax expects comma separated filters
            const orFilter = `phone.eq.${rawPhone},phone.eq.${formattedPhoneBR},phone.eq.${formattedPhonePT}`;

            const { data: existingClient } = await supabase
                .from('clients')
                .select('id, photo_url')
                .eq('user_id', user.id)
                .or(orFilter)
                .maybeSingle();

            if (existingClient) {
                clientId = existingClient.id;

                // 2. Update photo if booking has one and client doesn't (or if we want to auto-update)
                // Let's only update if client has no photo, to avoid overwriting a chosen photo.
                // UNLESS the user wants to update it. The request said: "queria que pelomenos a foto que ele selecionou, se atualizasse na lista de clientes"
                // So we should try to update it.
                if (booking.customer_photo_url && (!existingClient.photo_url || existingClient.photo_url !== booking.customer_photo_url)) {
                    // We can't access customer_photo_url directly from public_bookings table easily if it wasn't selected in the query?
                    // Wait, public_bookings doesn't have photo_url usually?
                    // Ah, the user said "a foto que ele selecionou". 
                    // In PublicBooking.tsx, we upload to `client_photos` but do we save it to public_bookings?
                    // Looking at PublicBooking.tsx: handleSubmit uploads and calls `register` (context) or saves to public_bookings?
                    // Actually PublicBooking.tsx implementation of handleSubmit does NOT save photo_url to public_bookings table explicitly in the INSERT.
                    // It registers the client in public_clients table via `register`. 

                    // Let's check if we can get the photo from public_clients table for this booking phone?
                    const { data: publicClient } = await supabase
                        .from('public_clients')
                        .select('photo_url')
                        .eq('phone', booking.customer_phone)
                        .eq('business_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (publicClient && publicClient.photo_url) {
                        await supabase
                            .from('clients')
                            .update({ photo_url: publicClient.photo_url })
                            .eq('id', clientId)
                            .eq('user_id', user.id);
                    }
                }

            } else {
                // 3. Create new client if not found
                // First try to get photo from public_clients (where it might have been saved during public flow)
                const { data: publicClient } = await supabase
                    .from('public_clients')
                    .select('photo_url')
                    .eq('phone', booking.customer_phone)
                    .eq('business_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert({
                        user_id: user.id,
                        name: booking.customer_name,
                        phone: booking.customer_phone,
                        email: booking.customer_email,
                        photo_url: publicClient?.photo_url || null
                    })
                    .select()
                    .single();

                if (clientError) throw clientError;
                clientId = newClient.id;
            }

            // Fetch service names based on IDs
            const { data: serviceDetails } = await supabase
                .from('services')
                .select('name')
                .in('id', booking.service_ids)
                .eq('user_id', user.id);

            const serviceNames = (serviceDetails || []).map(s => s.name).join(', ');

            // Auto-assign professional if not specified (e.g., "Anyone" booking)
            let finalProfessionalId = booking.professional_id;
            if (!finalProfessionalId) {
                if (teamMembers.length === 1) {
                    finalProfessionalId = teamMembers[0].id;
                } else if (teamMembers.length > 1) {
                    // Try to find the owner or just assign to first available as a fallback
                    // for "Anyone" bookings in multi-pro shops, we could leave it
                    // but for this user (1 pro), we definitely want to assignment.
                    finalProfessionalId = teamMembers[0].id;
                }
            }

            if (booking.is_edit) {
                await createAcceptedAppointmentFromBooking({
                    businessId: user.id,
                    clientId,
                    professionalId: finalProfessionalId,
                    serviceNames,
                    bookingId: booking.id,
                    appointmentTime: booking.appointment_time,
                    totalPrice: booking.total_price,
                    durationMinutes: booking.duration_minutes || 30,
                    preservePublicBookingLink: true,
                });
            } else {
                await createAcceptedAppointmentFromBooking({
                    businessId: user.id,
                    clientId,
                    professionalId: finalProfessionalId,
                    serviceNames,
                    bookingId: booking.id,
                    appointmentTime: booking.appointment_time,
                    totalPrice: booking.total_price,
                    durationMinutes: booking.duration_minutes || 30,
                    preservePublicBookingLink: false,
                });
            }


            await confirmPublicBooking(booking.id, user.id);

            const phone = booking.customer_phone;
            const dateObj = new Date(booking.appointment_time);
            const formattedDate = dateObj.toLocaleDateString('pt-BR');
            const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const establishment = businessName;
            const formattedPrice = booking.total_price.toFixed(2).replace('.', ',');

            const message = isBeauty
                ? `Olá ${booking.customer_name}! Tudo bem? ✨\n` +
                `Sua reserva na *${establishment || 'Estética'}* está confirmada!\n` +
                `📅 *${formattedDate}* às *${formattedTime}*\n` +
                `💼 *Serviço*: ${serviceNames}\n` +
                `💰 *Valor*: ${currencySymbol} ${formattedPrice}\n` +
                `📍  Local: estamos te esperando!\n\n` +
                `Estamos preparando tudo para te receber com a melhor experiência. Até logo! 💖`
                : `Fala, ${booking.customer_name}! Seu horário está garantido! 🛡️ \n` +
                `Marque na sua agenda:\n` +
                `🗓️  *${formattedDate}* às *${formattedTime}*\n` +
                `✂️  *Serviço*: ${serviceNames}\n` +
                `💰 *Valor*: ${currencySymbol} ${formattedPrice}\n` +
                `📍  Onde: *${establishment || 'Barbearia'}*.\n\n` +
                `Prepare-se para o trato! Nos vemos em breve. 👋`;

            fetchData();

            if (phone) {
                setConfirmDialog({
                    title: 'Agendamento aceito',
                    message: 'Deseja enviar a confirmação para o cliente via WhatsApp?',
                    confirmLabel: 'Enviar no WhatsApp',
                    cancelLabel: 'Agora não',
                    onConfirm: () => {
                        setConfirmDialog(null);
                        window.open(buildWhatsAppLink(phone, currencyRegion, message), '_blank');
                    },
                });
            } else {
                showToast('Agendamento aceito com sucesso!', 'success');
            }
        } catch (error) {
            logger.error('Error accepting booking', error);
            showToast('Erro ao aceitar agendamento.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        try {
            await rejectPublicBooking(bookingId, user.id);
            showToast('Solicitação recusada.', 'info');
            fetchData();
        } catch (error) {
            logger.error('Error rejecting booking', error);
            showToast('Erro ao recusar a solicitação.', 'error');
        }
    };

    const handleCompleteAppointment = async (appointmentId: string, isOverdue: boolean = false) => {
        if (isStaff) {
            showToast('Apenas o dono pode concluir agendamentos.', 'warning');
            return;
        }
        try {
            const { error } = await supabase.rpc('complete_appointment', { p_appointment_id: appointmentId });

            if (error) throw error;

            if (isOverdue) {
                fetchOverdueAppointments();
            } else {
                fetchData();
            }
        } catch (error: any) {
            logger.error('Error completing appointment', error);
            showToast('Erro ao concluir agendamento. Tente novamente.', 'error');
        }
    };
    const handleCancelAppointment = (appointmentId: string, isOverdue: boolean = false) => {
        if (isStaff) {
            showToast('Apenas o dono pode cancelar agendamentos.', 'warning');
            return;
        }
        setConfirmDialog({
            title: 'Cancelar agendamento',
            message: 'O agendamento será movido para o histórico. Cancelar mesmo assim?',
            confirmLabel: 'Cancelar agendamento',
            cancelLabel: 'Voltar',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    await supabase
                        .from('appointments')
                        .update({ status: 'Cancelled' })
                        .eq('id', appointmentId);
                    showToast('Agendamento cancelado e movido para o histórico.', 'success');
                    if (isOverdue) {
                        fetchOverdueAppointments();
                    } else {
                        fetchData();
                    }
                } catch (error) {
                    logger.error('Error cancelling appointment', error);
                    showToast('Erro ao cancelar agendamento.', 'error');
                }
            },
        });
    };

    const handleNoShowAppointment = (appointmentId: string) => {
        setConfirmDialog({
            title: 'Cliente faltou',
            message: 'Marcar como "Não compareceu"? O agendamento permanece no histórico.',
            confirmLabel: 'Marcar falta',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    const { error } = await supabase
                        .from('appointments')
                        .update({ status: 'NoShow' })
                        .eq('id', appointmentId)
                        .eq('user_id', effectiveUserId);
                    if (error) throw error;
                    setShowingDetailsAppointment(null);
                    fetchData();
                } catch (error) {
                    logger.error('Error marking appointment as no-show', error);
                    showToast('Erro ao marcar como não compareceu.', 'error');
                }
            },
        });
    };

    const handleAssignToProfessional = async (appointmentId: string, professionalId: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ professional_id: professionalId })
                .eq('id', appointmentId);
            if (error) throw error;
            fetchData();
        } catch (error) {
            logger.error('Error assigning professional', error);
            showToast('Erro ao atribuir profissional.', 'error');
        }
    };

    const resetForm = () => {
        setSelectedClient('');
        setSelectedServices([]);
        setSelectedProfessional('');
        setSelectedTime('');
        setCustomTime('');
        setSelectedAppointmentDate(formatDateForInput(selectedDate));
        setDiscountPercentage('0'); // Reset discount
        setNotes('');
        setFinalPriceInput('');
    };


    const handleCreateAppointment = async () => {
        if (!user || !selectedClient || selectedServices.length === 0 || !selectedProfessional || !selectedTime || !selectedAppointmentDate) {
            showToast('Preencha todos os campos!', 'warning');
            return;
        }

        try {
            const selectedServicesDetails = services.filter(s => selectedServices.includes(s.id));
            if (selectedServicesDetails.length === 0) {
                showToast('Serviço inválido.', 'warning');
                return;
            }

            const basePrice = selectedServicesDetails.reduce((sum, s) => sum + s.price, 0);

            // Use manually edited price
            const finalPrice = parseFloat(finalPriceInput);
            if (isNaN(finalPrice)) {
                showToast('Preço inválido!', 'warning');
                return;
            }

            const serviceNames = selectedServicesDetails.map(s => s.name).join(', ');

            const timeToUse = selectedTime === 'custom' ? customTime : selectedTime;

            const dateTime = combineDateAndTime(selectedAppointmentDate, timeToUse);


            const { error } = await supabase
                .from('appointments')
                .insert({
                    user_id: user.id,
                    client_id: selectedClient,
                    professional_id: selectedProfessional,
                    service: serviceNames,
                    appointment_time: dateTime.toISOString(),
                    price: finalPrice, // Use final price after discount
                    status: 'Confirmed',
                    notes: notes
                });

            if (error) throw error;

            // Prompt for WhatsApp confirmation
            const client = clients.find(c => c.id === selectedClient);
            if (client?.phone) {
                const clientPhone = client.phone;
                const formattedDate = dateTime.toLocaleDateString('pt-BR');
                const formattedTime = dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const formattedPrice = finalPrice.toFixed(2).replace('.', ',');

                const message = `Agendamento confirmado! ✨
Data: ${formattedDate}
Horário: ${formattedTime}
Serviço: ${serviceNames}
Valor: ${currencySymbol} ${formattedPrice}

Obrigada pela confiança! Te espero no ${businessName}.`;

                setConfirmDialog({
                    title: 'Agendamento criado',
                    message: 'Deseja enviar a confirmação para o cliente via WhatsApp?',
                    confirmLabel: 'Enviar no WhatsApp',
                    cancelLabel: 'Agora não',
                    onConfirm: () => {
                        setConfirmDialog(null);
                        window.open(buildWhatsAppLink(clientPhone, currencyRegion, message), '_blank');
                    },
                });
            } else {
                showToast('Agendamento criado com sucesso!', 'success');
            }

            setShowNewAppointmentModal(false);
            const newDate = new Date(selectedAppointmentDate);
            const userTimezoneOffset = newDate.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(newDate.getTime() + userTimezoneOffset);
            setSelectedDate(adjustedDate);

            resetForm();


            // 1. Redirecionar para a data do novo agendamento
            const newDateStr = selectedAppointmentDate;
            navigate(`/agenda?date=${newDateStr}`);


        } catch (error) {
            logger.error('Error creating appointment', error);
            showToast('Erro ao criar agendamento.', 'error');
        }
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);

        // Atualiza a URL para refletir a nova data
        const newDateStr = newDate.toISOString().split('T')[0];
        navigate(`/agenda?date=${newDateStr}`);
    };

    const changeHistoryMonth = (months: number) => {
        const newMonth = new Date(historyMonth);
        newMonth.setMonth(newMonth.getMonth() + months);
        setHistoryMonth(newMonth);
    };

    const getAppointmentsForProfessional = (professionalId: string) => {
        return appointments.filter(apt => apt.professional_id === professionalId);
    };

    const getPendingBookingsForProfessional = (professionalId: string) => {
        return publicBookings.filter(booking => booking.professional_id === professionalId);
    };

    // Generate time slots with half-hour intervals
    const timeSlots = [];
    for (let hour = 8; hour <= 20; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 20) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }

    // Filtrar profissionais exibidos (R27)
    // selectedProfessionalIds = [] significa "Todos" — disponível só para owner.
    // Staff sem seleção (ainda não inicializado ou sem teamMemberId) NUNCA vê todos: fallback seguro vazio.
    const displayedMembers = selectedProfessionalIds.length > 0
        ? teamMembers.filter(m => selectedProfessionalIds.includes(m.id))
        : (isStaff ? [] : teamMembers);

    // Coluna de "não atribuídos" só faz sentido para o owner em modo "Todos".
    const showUnassigned = !isStaff && selectedProfessionalIds.length === 0;

    const toggleProfessional = (id: string) => {
        setSelectedProfessionalIds(prev => {
            const has = prev.includes(id);
            if (isStaff) {
                // O próprio staff é fixo (não removível); colegas são opcionais.
                if (id === teamMemberId) return prev;
                if (has) {
                    const next = prev.filter(p => p !== id);
                    return next.length > 0 ? next : (teamMemberId ? [teamMemberId] : []);
                }
                return [...prev, id];
            }
            // Owner: multi-select simples; lista vazia volta a "Todos".
            return has ? prev.filter(p => p !== id) : [...prev, id];
        });
    };

    // Modal de detalhes: re-deriva do state por id para não exibir dado stale (realtime/refetch).
    const detailsApt = showingDetailsAppointment
        ? (appointments.find(a => a.id === showingDetailsAppointment.id) ?? showingDetailsAppointment)
        : null;

    // Prepare options for SearchableSelect
    const clientOptions = clients.map(c => ({
        id: c.id,
        name: c.name,
        subtext: (c as any).phone // Assuming phone is available on client object
    }));

    const serviceOptions = services.map(s => ({
        id: s.id,
        name: s.name,
        subtext: `${formatCurrency(s.price, currencyRegion)} | ${s.duration_minutes} min` // Using generic currency formatting
    }));

    // Calculate price preview for the modal
    // Values are now calculated at the top level for the useEffect sync
    // const selectedServicesDetails... (moved up)
    // const basePriceNew... (moved up)
    // const discountRateNew... (moved up)
    // const finalPriceNew... (moved up)

    // Helper to calculate discount info for display
    const getDiscountInfo = (apt: Appointment) => {
        // Check if the saved price is lower than the base price of the service
        const hasDiscount = apt.basePrice && apt.price < apt.basePrice;

        // Check if the saved price is higher than the base price (custom price)
        const isCustomPriceHigher = apt.basePrice && apt.price > apt.basePrice;

        if (hasDiscount) {
            const discountAmount = apt.basePrice! - apt.price;
            const discountPercentage = Math.round((discountAmount / apt.basePrice!) * 100);
            return {
                hasDiscount: true,
                basePrice: apt.basePrice,
                discountAmount: discountAmount,
                discountPercentage: discountPercentage,
                isCustomPriceHigher: false
            };
        } else if (isCustomPriceHigher) {
            // If price is higher, treat it as a custom price without discount
            return {
                hasDiscount: false,
                basePrice: apt.basePrice,
                discountAmount: 0,
                discountPercentage: 0,
                isCustomPriceHigher: true
            };
        }

        return { hasDiscount: false, basePrice: apt.basePrice, discountAmount: 0, discountPercentage: 0, isCustomPriceHigher: false };
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center h-screen ${colors.bg}`}>
                <div className={`${colors.textSecondary} text-xl animate-pulse`}>Carregando agenda...</div>
            </div>
        );
    }

    return (
        <div className={`${colors.bg} min-h-screen pb-8 space-y-6 md:space-y-8`}>
            {/* Header */}
            <div className={`${classes.section} px-4 pt-6 md:px-6`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-heading ${colors.text} uppercase`}>Agenda</h1>
                        <p className={`${colors.textSecondary} mt-1`}>Gerencie os agendamentos por profissional</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button
                            variant="secondary"
                            icon={<History />}
                            onClick={() => setShowHistoryModal(true)}
                            className="flex-1 md:flex-none"
                        >
                            <span className="hidden md:inline">Histórico</span>
                        </Button>
                        <Button
                            variant="secondary"
                            icon={<Calendar />}
                            onClick={() => setShowAllAppointmentsModal(true)}
                            className="flex-1 md:flex-none"
                        >
                            <span className="hidden md:inline">Todos Agendamentos</span>
                        </Button>
                        <Button
                            id="btn-new-appointment"
                            variant="primary"
                            icon={<Plus />}
                            onClick={() => navigate('?new=true')}
                            className="hidden md:flex"
                        >
                            Novo Agendamento
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- Agendamentos Atrasados (Overdue) --- */}
            {isOverdueFilter && (
                <div className="px-4 md:px-6">
                    <Card variant="outlined" className="border-l-4 border-red-500 bg-red-500/5">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h3 className={`${colors.text} font-heading text-lg uppercase mb-2`}>
                                    Agendamentos Atrasados ({overdueAppointments.length})
                                </h3>
                                <p className={`${colors.textSecondary} text-sm mb-4`}>
                                    Estes agendamentos estão no passado e precisam ser marcados como Concluídos (para faturamento) ou Cancelados.
                                </p>

                                {isOverdueLoading ? (
                                    <div className={`flex items-center gap-2 ${colors.textMuted}`}>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                                    </div>
                                ) : overdueAppointments.length === 0 ? (
                                    <EmptyState icon={Check} message="Nenhum agendamento atrasado encontrado." className="py-6" />
                                ) : (
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                        {overdueAppointments.map(apt => {
                                            const professional = teamMembers.find(m => m.id === apt.professional_id);
                                            return (
                                                <div key={apt.id} className={`${colors.card} ${colors.border} p-4 rounded-xl flex items-center justify-between`}>
                                                    <div>
                                                        <p className={`${colors.text} font-bold text-sm`}>{apt.clientName}</p>
                                                        <p className={`${colors.textSecondary} text-xs`}>{apt.service}</p>
                                                        <p className={`${colors.textMuted} text-xs`}>
                                                            {new Date(apt.appointment_time).toLocaleDateString('pt-BR')} às {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            {professional && ` | Profissional: ${professional.name}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => setShowingDetailsAppointment(apt)}
                                                            className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold rounded-lg transition-all flex items-center gap-2 text-xs"
                                                            title="Informações"
                                                        >
                                                            <Info className="w-4 h-4" /> Info
                                                        </button>
                                                        {!isStaff && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleCompleteAppointment(apt.id, true)}
                                                                    className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg transition-all flex items-center gap-2 text-xs"
                                                                    title="Concluir e Faturar"
                                                                >
                                                                    <Check className="w-4 h-4" /> Faturar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelAppointment(apt.id, true)}
                                                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold rounded-lg transition-all flex items-center gap-2 text-xs"
                                                                    title="Cancelar"
                                                                >
                                                                    <X className="w-4 h-4" /> Cancelar
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
            {/* --- FIM: Agendamentos Atrasados --- */}


            {/* Date Navigator */}
            <div className="px-4 md:px-6 flex items-center justify-between gap-2">
                <button
                    onClick={() => changeDate(-7)}
                    aria-label="Semana anterior"
                    className={`p-3 rounded-2xl transition-colors hover:bg-theme-surface ${colors.card} ${colors.border} border shadow-lite-glass`}
                >
                    <ChevronLeft className={`w-5 h-5 ${colors.text}`} />
                </button>

                {/* Faixa semanal (seg–dom da data selecionada). Clicar num dia só TROCA a seleção
                    — a faixa não desliza. As setas avançam/voltam uma semana inteira.
                    Único carrossel horizontal da tela é o dos avatares de profissionais. */}
                <div className="flex-1 flex items-center gap-1.5 py-1">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date(selectedDate);
                        const dow = (d.getDay() + 6) % 7; // segunda = 0
                        d.setDate(d.getDate() - dow + i);
                        const isSelected = d.toDateString() === selectedDate.toDateString();
                        const isToday = d.toDateString() === new Date().toDateString();
                        const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                        const dayNum = d.getDate();
                        return (
                            <button
                                key={i}
                                onClick={() => {
                                    const newDateStr = d.toISOString().split('T')[0];
                                    navigate(`/agenda?date=${newDateStr}`);
                                }}
                                className={`flex flex-1 min-w-0 flex-col items-center justify-center h-[64px] rounded-2xl transition-all border ${isSelected ? `${accent.bg} ${accent.text} border-transparent shadow-[0_0_15px_rgba(200,160,50,0.3)]` : `${colors.card} ${colors.border} ${colors.textMuted} hover:text-theme-text ${isToday ? `ring-1 ring-current ${accent.text}` : ''}`}`}
                            >
                                <span className="text-xs sm:text-xs font-medium capitalize mb-0.5">{dayName}</span>
                                <span className={`text-lg sm:text-xl font-heading font-bold ${isSelected ? 'text-black' : colors.text}`}>{dayNum}</span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => changeDate(7)}
                    aria-label="Próxima semana"
                    className={`p-3 rounded-2xl transition-colors hover:bg-theme-surface ${colors.card} ${colors.border} border shadow-lite-glass`}
                >
                    <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                </button>
            </div>

            {/* Professional Filter - Avatars */}
            {teamMembers.length > 0 && (
                <div className="px-4 md:px-6">
                    <div className={`flex items-center gap-5 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scrollbar-hide`}>
                        {/* "Todos" só para owner — staff nunca vê agenda completa de uma vez (R27) */}
                        {!isStaff && (
                            <button
                                onClick={() => setSelectedProfessionalIds([])}
                                className="flex flex-col items-center gap-2 min-w-[72px] snap-start"
                            >
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${selectedProfessionalIds.length === 0 ? `${accent.bg} border-transparent text-[var(--color-bg)] shadow-[0_0_15px_rgba(200,160,50,0.3)]` : `${colors.border} ${colors.card} ${colors.textSecondary}`}`}>
                                    <Users className="w-5 h-5" />
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${selectedProfessionalIds.length === 0 ? accent.text : colors.textMuted}`}>Todos</span>
                            </button>
                        )}
                        {teamMembers.map(member => {
                            const isSelected = selectedProfessionalIds.includes(member.id);
                            const isSelf = isStaff && member.id === teamMemberId;
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => toggleProfessional(member.id)}
                                    aria-pressed={isSelected}
                                    className="flex flex-col items-center gap-2 min-w-[72px] snap-start"
                                >
                                    <div className="relative">
                                        {member.photo_url ? (
                                            <img
                                                src={member.photo_url}
                                                alt={member.name}
                                                className={`w-14 h-14 rounded-full object-cover border-2 transition-all ${isSelected ? `${accent.border} shadow-[0_0_15px_rgba(200,160,50,0.3)]` : colors.border}`}
                                            />
                                        ) : (
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-all ${isSelected ? `${accent.bg} border-transparent text-[var(--color-bg)] shadow-[0_0_15px_rgba(200,160,50,0.3)]` : `${colors.card} ${colors.border} ${colors.text}`}`}>
                                                {getInitials(member.name)}
                                            </div>
                                        )}
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full" />
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wider truncate max-w-[72px] ${isSelected ? accent.text : colors.textMuted}`}>
                                        {isSelf ? 'Você' : member.name.split(' ')[0]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pending Public Bookings Alert */}
            {publicBookings.length > 0 && (
                <div className="px-4 md:px-6 space-y-4">
                    <Card variant="outlined" className={`border-l-4 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'} ${accent.bgDim}`}>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className={`w-6 h-6 ${accent.text}`} />
                            <div>
                                <h3 className={`${colors.text} font-bold text-lg mb-1`}>
                                    {publicBookings.length} Solicitação(ões) Pendente(s)
                                </h3>
                                <p className={`${colors.textSecondary} text-sm`}>
                                    {(() => {
                                        const edits = publicBookings.filter((b: any) => b.is_edit).length;
                                        const newOnes = publicBookings.length - edits;
                                        if (edits > 0 && newOnes > 0) return `${newOnes} novo(s) e ${edits} alteração(ões) aguardando aprovação.`;
                                        if (edits > 0) return `${edits} cliente(s) alteraram seu agendamento e aguardam aprovação.`;
                                        return 'Os agendamentos abaixo foram feitos online e aguardam sua aprovação:';
                                    })()}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {publicBookings.map(booking => {
                            const professional = teamMembers.find(m => m.id === booking.professional_id);
                            const bookingDate = new Date(booking.appointment_time);
                            const isToday = bookingDate.toDateString() === new Date().toDateString();

                            return (
                                <div key={booking.id} className={`${colors.card} ${colors.border} rounded-2xl p-5 transition-all duration-300`}>
                                    {/* Badge de tipo */}
                                    {(booking as any).is_edit && (
                                        <div className="mb-3">
                                            <span className={`text-xs font-mono font-bold text-blue-400 bg-blue-400/10 border border-blue-400/30 px-2 py-1 rounded`}>
                                                ALTERAÇÃO DE AGENDAMENTO
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <span className={`text-xs font-mono font-bold px-2 py-1 rounded border transition-colors ${isToday ? `${accent.bg} text-[var(--color-bg)] ${accent.border}` : `${colors.surface} ${colors.textMuted} ${colors.border}`}`}>
                                                {isToday ? 'HOJE' : bookingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAcceptBooking(booking)}
                                                className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 ${classes.buttonSuccess}`}
                                                title="Aceitar"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Aceitar
                                            </button>
                                            {!isStaff && (
                                                <button
                                                    onClick={() => handleRejectBooking(booking.id)}
                                                    className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5"
                                                    title="Recusar"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Recusar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className={`${colors.text} font-bold text-xl leading-tight`}>{booking.customer_name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <p className={`${colors.textSecondary} text-sm font-mono tracking-wider`}>
                                                {formatPhone(booking.customer_phone, currencyRegion)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`mt-4 pt-4 ${colors.divider} border-t space-y-3`}>
                                        <div className={`flex items-center gap-3 text-xs ${colors.textSecondary}`}>
                                            <div className={`p-1.5 rounded-lg ${accent.bgDim}`}>
                                                <Scissors className={`w-3.5 h-3.5 ${accent.text}`} />
                                            </div>
                                            <span className="font-medium">
                                                {booking.service_ids?.length || 0} serviço(s) • <span className={`${colors.text} font-bold`}>{formatCurrency(booking.total_price, currencyRegion)}</span>
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-3 text-xs ${colors.textSecondary}`}>
                                            <div className={`p-1.5 rounded-lg ${accent.bgDim}`}>
                                                <User className={`w-3.5 h-3.5 ${accent.text}`} />
                                            </div>
                                            <span>
                                                Profissional: <span className={`font-bold ${colors.text} uppercase tracking-tighter`}>{professional?.name || 'Qualquer um'}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className={`${colors.divider} border-b-2 my-8`}></div>
                </div>
            )}

            {/* Grid Time View */}
            {teamMembers.length === 0 ? (
                <div className="px-4 md:px-6">
                    <Card variant="outlined">
                        <EmptyState
                            icon={User}
                            message="Nenhum profissional cadastrado. Adicione profissionais à sua equipe para começar a organizar agendamentos."
                            ctaLabel="Adicionar Profissionais"
                            onCta={() => navigate('/configuracoes/equipe')}
                        />
                    </Card>
                </div>
            ) : displayedMembers.length === 0 ? (
                <div className="px-4 md:px-6">
                    <Card variant="outlined">
                        <EmptyState
                            icon={User}
                            message="Não foi possível identificar o seu perfil de profissional. Fale com o dono da barbearia para vincular a sua conta à equipe."
                        />
                    </Card>
                </div>
            ) : (
                <>
                    {/* ===== MOBILE: lista corrida do dia (sem scroll lateral) ===== */}
                    <div className="md:hidden px-4 pb-6">
                        {(() => {
                            const dayApts = [
                                ...(showUnassigned ? appointments.filter(a => !a.professional_id) : []),
                                ...displayedMembers.flatMap(m => getAppointmentsForProfessional(m.id)),
                            ].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());

                            if (dayApts.length === 0) {
                                return (
                                    <Card variant="outlined">
                                        <EmptyState icon={Calendar} message="Nenhum agendamento neste dia." ctaLabel="Novo Agendamento" onCta={() => navigate('?new=true')} />
                                    </Card>
                                );
                            }

                            return (
                                <div className="space-y-2.5">
                                    {dayApts.map(apt => {
                                        const d = new Date(apt.appointment_time);
                                        const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                                        const isUnassigned = !apt.professional_id;
                                        const professional = teamMembers.find(m => m.id === apt.professional_id);
                                        const visual = getVisualStatus(apt);
                                        const vc = VISUAL_STATUS_CLASSES[visual];
                                        const StatusIcon = VISUAL_STATUS_ICON[visual];
                                        return (
                                            <button
                                                key={apt.id}
                                                onClick={() => setShowingDetailsAppointment(apt)}
                                                className={`w-full text-left flex items-stretch gap-3 rounded-2xl border ${colors.card} ${colors.border} p-3 transition-transform active:scale-[0.99]`}
                                            >
                                                {/* Barra lateral de status */}
                                                <span className={`w-1.5 rounded-full flex-shrink-0 ${isUnassigned ? 'bg-red-500' : vc.dot}`} />
                                                {/* Horário + ícone de status */}
                                                <div className="flex flex-col items-center justify-center min-w-[48px]">
                                                    <span className={`text-sm font-bold ${colors.text}`}>{timeStr}</span>
                                                    <StatusIcon className={`w-4 h-4 mt-1 ${vc.text}`} aria-label={VISUAL_STATUS_LABEL[visual]} />
                                                </div>
                                                {/* Cliente / serviço / profissional */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-sm font-bold ${colors.text} truncate`}>{apt.clientName}</h4>
                                                        {apt.edited_at && <Edit2 className={`w-3 h-3 flex-shrink-0 ${colors.textMuted}`} aria-label="Editado" />}
                                                        {apt.notes && <MessageCircle className="w-3 h-3 flex-shrink-0 text-emerald-500/80" aria-label="Com observação" />}
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 mt-0.5 ${colors.textMuted}`}>
                                                        <Scissors className="w-3 h-3 flex-shrink-0" />
                                                        <span className="text-xs truncate">{apt.service}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 mt-0.5 ${isUnassigned ? 'text-red-400' : colors.textMuted}`}>
                                                        <User className="w-3 h-3 flex-shrink-0" />
                                                        <span className="text-xs truncate">{isUnassigned ? 'Não atribuído' : (professional?.name || '—')}</span>
                                                    </div>
                                                </div>
                                                {/* Preço + rótulo de status */}
                                                <div className="flex flex-col items-end justify-center flex-shrink-0">
                                                    <span className={`text-sm font-mono font-bold ${colors.text}`}>{formatCurrency(apt.price, currencyRegion)}</span>
                                                    <span className={`text-xs font-medium mt-0.5 ${vc.text}`}>{VISUAL_STATUS_LABEL[visual]}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* ===== DESKTOP: grade por profissional (alturas uniformes) ===== */}
                    <div className="hidden md:block px-6 overflow-x-auto scrollbar-hide pb-6">
                        <div className="min-w-[640px]">
                            {/* Cabeçalho */}
                            <div className={`flex border-b ${colors.divider} pb-2 mb-1`}>
                                <div className="w-16 flex-shrink-0 text-center">
                                    <span className={`text-xs font-bold ${colors.textMuted}`}>Horário</span>
                                </div>
                                {displayedMembers.map(member => (
                                    <div key={member.id} className="flex-1 min-w-0 text-center truncate px-2">
                                        <span className={`text-sm font-bold ${colors.text}`}>{member.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Linhas — cada slot de 30min tem a MESMA altura (sem saltos, sem sobreposição) */}
                            <div className={`relative ${colors.surface} ${colors.border} border rounded-2xl overflow-hidden`}>
                                {timeSlots.map((time) => {
                                    const isHour = time.endsWith(':00');
                                    const matchesTime = (a: Appointment) => {
                                        const d = new Date(a.appointment_time);
                                        const aptTime = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                                        return aptTime === time;
                                    };
                                    return (
                                        <div key={time} className={`flex h-[60px] border-b ${colors.divider} last:border-b-0`}>
                                            {/* Rótulo de horário */}
                                            <div className={`w-16 flex-shrink-0 flex items-start justify-center pt-1.5 border-r ${colors.divider}`}>
                                                {isHour && (
                                                    <span className={`text-xs font-bold ${colors.text}`}>{time}</span>
                                                )}
                                            </div>

                                            {displayedMembers.map((member, idx) => {
                                                const aptsAtTime = getAppointmentsForProfessional(member.id).filter(matchesTime);
                                                const unassignedApts = (showUnassigned && idx === 0)
                                                    ? appointments.filter(a => !a.professional_id).filter(matchesTime) : [];
                                                const allCellApts = [...unassignedApts, ...aptsAtTime];

                                                return (
                                                    <div
                                                        key={`${member.id}-${time}`}
                                                        className={`flex-1 min-w-0 border-r ${colors.divider} last:border-r-0 p-1 flex flex-col gap-1 hover:bg-[var(--color-card-hover)]`}
                                                    >
                                                        {allCellApts.map(apt => {
                                                            const isUnassigned = !apt.professional_id;
                                                            const visual = getVisualStatus(apt);
                                                            const vc = VISUAL_STATUS_CLASSES[visual];
                                                            const StatusIcon = VISUAL_STATUS_ICON[visual];
                                                            return (
                                                                <div
                                                                    key={apt.id}
                                                                    onClick={() => setShowingDetailsAppointment(apt)}
                                                                    className={`cursor-pointer rounded-md border ${isUnassigned ? 'border-red-500/50 bg-red-500/5' : vc.card} px-2 py-1 flex-1 min-h-0 flex flex-col justify-center gap-0.5 overflow-hidden hover:shadow-lite-glass shadow-sm`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <h4 className={`text-xs font-bold ${colors.text} truncate`}>{apt.clientName}</h4>
                                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                                            {apt.edited_at && <Edit2 className={`w-2.5 h-2.5 ${colors.textMuted}`} aria-label="Editado" />}
                                                                            {apt.notes && <MessageCircle className="w-2.5 h-2.5 text-emerald-500/80" aria-label="Com observação" />}
                                                                            <StatusIcon className={`w-3 h-3 ${vc.text}`} aria-label={VISUAL_STATUS_LABEL[visual]} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className={`text-xs truncate ${colors.textMuted}`}>{apt.service}</span>
                                                                        <span className={`text-xs font-mono font-medium flex-shrink-0 ${colors.text}`}>{formatCurrency(apt.price, currencyRegion)}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Empty state do dia (desktop) */}
                            {(() => {
                                const total = (showUnassigned ? appointments.filter(a => !a.professional_id).length : 0)
                                    + displayedMembers.reduce((s, m) => s + getAppointmentsForProfessional(m.id).length, 0);
                                if (total > 0) return null;
                                return (
                                    <p className={`text-center text-xs ${colors.textMuted} mt-3`}>Nenhum agendamento neste dia.</p>
                                );
                            })()}
                        </div>
                    </div>
                </>
            )}

            {/* Legend (Bottom) */}
            <div className={`px-4 md:px-6 mt-4 flex items-center justify-center gap-4 flex-wrap text-xs ${colors.textMuted} font-medium pb-8`}>
                {(['normal', 'overdue', 'completed', 'noshow', 'cancelled'] as VisualStatus[]).map(v => {
                    const LegendIcon = VISUAL_STATUS_ICON[v];
                    return (
                        <div key={v} className="flex items-center gap-1.5">
                            <LegendIcon className={`w-3.5 h-3.5 ${VISUAL_STATUS_CLASSES[v].text}`} />
                            <span>{VISUAL_STATUS_LABEL[v]}</span>
                        </div>
                    );
                })}
                <div className="flex items-center gap-1.5 ml-4">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500/80" />
                    <span>Com observação</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Edit2 className={`w-3 h-3 ${colors.textMuted}`} />
                    <span>Editado</span>
                </div>
            </div>

            {/* Appointment Details Modal */}
            {detailsApt && createPortal(
                <div
                    className={`fixed inset-0 z-[999] flex items-center justify-center p-4 ${colors.overlay} md:left-64`}
                    onClick={() => setShowingDetailsAppointment(null)}
                >
                    {/* onDeactivate não pode fechar o modal: sob StrictMode o cleanup do effect do
                        FocusTrap desativa o trap logo após montar, fechando o modal no mesmo clique
                        que o abriu. Esc fecha via onKeyDown abaixo; fundo escuro fecha via onClick acima. */}
                    <FocusTrap active focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, initialFocus: false, fallbackFocus: '[aria-labelledby="appointment-details-title"]' }}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="appointment-details-title"
                        tabIndex={-1}
                        onKeyDown={(e) => { if (e.key === 'Escape') setShowingDetailsAppointment(null); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full max-w-md max-h-[90vh] overflow-y-auto p-0 relative transition-all animate-in fade-in zoom-in duration-300 ${colors.card} ${colors.border} ${radius.modal} ${shadow.modal}`}>
                        {/* Header */}
                        <div className={`p-6 border-b ${colors.divider} ${colors.surface}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 id="appointment-details-title" className={`font-heading text-xl uppercase mb-1 ${colors.text}`}>
                                        Detalhes do Agendamento
                                    </h3>
                                    {(() => {
                                        const v = getVisualStatus(detailsApt);
                                        return (
                                            <span className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full inline-block border ${VISUAL_STATUS_CLASSES[v].card} ${VISUAL_STATUS_CLASSES[v].text}`}>
                                                {VISUAL_STATUS_LABEL[v]}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <button
                                    onClick={() => setShowingDetailsAppointment(null)}
                                    className={`p-1 rounded-full transition-colors ${colors.textMuted} hover:text-theme-text hover:bg-theme-surface`}
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Client Info */}
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${accent.bgDim} ${accent.text} ${accent.borderDim}`}>
                                    {detailsApt.clientName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className={`text-xs font-mono uppercase tracking-widest ${colors.textMuted} mb-0.5`}>Cliente</p>
                                    <h4 className={`text-lg font-bold ${colors.text} leading-tight`}>{detailsApt.clientName}</h4>
                                    {detailsApt.clientPhone && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Phone className={`w-3 h-3 ${colors.textMuted}`} />
                                            <span className={`text-xs ${colors.textMuted} font-mono`}>
                                                {formatPhone(detailsApt.clientPhone, currencyRegion)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`w-full h-px ${colors.divider}`}></div>

                            {/* Service & Professional */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                                        <Scissors className="w-4 h-4" />
                                        <span className={`text-xs font-mono uppercase tracking-widest font-bold`}>Serviço</span>
                                    </div>
                                    <p className={`${colors.text} font-medium text-sm`}>{detailsApt.service}</p>
                                </div>
                                <div>
                                    <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                                        <User className="w-4 h-4" />
                                        <span className={`text-xs font-mono uppercase tracking-widest font-bold`}>Profissional</span>
                                    </div>
                                    <p className={`${colors.text} font-medium text-sm`}>
                                        {teamMembers.find(m => m.id === detailsApt.professional_id)?.name || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Time & Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                                        <Clock className="w-4 h-4" />
                                        <span className={`text-xs font-mono uppercase tracking-widest font-bold`}>Data e Hora</span>
                                    </div>
                                    <p className={`${colors.text} font-medium text-sm`}>
                                        {new Date(detailsApt.appointment_time).toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className={`font-mono font-bold mt-0.5 ${accent.text}`}>
                                        {new Date(detailsApt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div>
                                    <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                                        <DollarSign className="w-4 h-4" />
                                        <span className={`text-xs font-mono uppercase tracking-widest font-bold`}>Valor</span>
                                    </div>
                                    <div className="flex flex-col">
                                        {(() => {
                                            const { hasDiscount, basePrice } = getDiscountInfo(detailsApt);
                                            return (
                                                <>
                                                    {hasDiscount && basePrice && (
                                                        <span className={`text-xs text-red-500 line-through font-mono`}>
                                                            {formatCurrency(basePrice, currencyRegion)}
                                                        </span>
                                                    )}
                                                    <span className={`text-xl font-bold font-mono ${isBeauty ? colors.text : accent.text}`}>
                                                        {formatCurrency(detailsApt.price, currencyRegion)}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Notes Section - Prominent */}
                            {detailsApt.notes && (
                                <div className={`p-4 rounded-xl border ${accent.bgDim} ${accent.borderDim}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Info className={`w-4 h-4 ${accent.text}`} />
                                        <span className={`text-xs font-mono font-bold uppercase tracking-widest ${accent.text}`}>Observações</span>
                                    </div>
                                    <p className={`${colors.textSecondary} text-sm leading-relaxed italic`}>
                                        &quot;{detailsApt.notes}&quot;
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className={`p-5 border-t ${colors.divider} ${colors.surface} flex flex-col gap-3 rounded-b-2xl`}>
                            {(detailsApt.status === 'Confirmed' || detailsApt.status === 'Pending') ? (
                                <>
                                    {/* Confirmar e cobrar — disponível para dono E colaborador (abre o checkout) */}
                                    <Button
                                        variant="primary"
                                        className="w-full flex justify-center items-center gap-2"
                                        onClick={() => {
                                            setCheckoutAppointment(detailsApt as unknown as import('../types').Appointment);
                                            setShowingDetailsAppointment(null);
                                        }}
                                    >
                                        <DollarSign className="w-4 h-4" /> Confirmar e cobrar
                                    </Button>
                                    <div className="flex gap-3">
                                        {/* Faltou — dono E colaborador */}
                                        <Button
                                            variant="secondary"
                                            className="flex-1 flex justify-center items-center gap-2"
                                            onClick={() => handleNoShowAppointment(detailsApt.id)}
                                        >
                                            <Ban className="w-4 h-4" /> Faltou
                                        </Button>
                                        {/* Editar — apenas o dono */}
                                        {!isStaff && detailsApt.status === 'Confirmed' && (
                                            <Button
                                                variant="secondary"
                                                className="flex-1 flex justify-center items-center gap-2"
                                                onClick={() => {
                                                    setEditingAppointment(detailsApt);
                                                    setShowingDetailsAppointment(null);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4" /> Editar
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            className="flex-1 flex justify-center items-center gap-2"
                                            onClick={() => setShowingDetailsAppointment(null)}
                                        >
                                            Fechar
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <Button
                                    variant="primary"
                                    className="flex-1 flex justify-center items-center gap-2"
                                    onClick={() => setShowingDetailsAppointment(null)}
                                >
                                    <Check className="w-4 h-4" /> Fechar
                                </Button>
                            )}
                        </div>
                    </div>
                    </FocusTrap>
                </div>, document.body
            )}

            {/* Confirmações (substitui os dialogs nativos) */}
            <ConfirmModal
                open={!!confirmDialog}
                title={confirmDialog?.title || 'Confirmar'}
                message={confirmDialog?.message || ''}
                confirmLabel={confirmDialog?.confirmLabel || 'Confirmar'}
                cancelLabel={confirmDialog?.cancelLabel || 'Cancelar'}
                variant={confirmDialog?.variant || 'default'}
                onConfirm={() => confirmDialog?.onConfirm()}
                onCancel={() => setConfirmDialog(null)}
            />

            {/* All Future Appointments Modal */}
            <AllAppointmentsModal
                isOpen={showAllAppointmentsModal}
                onClose={() => setShowAllAppointmentsModal(false)}
                fetchAllAppointments={fetchAllFutureAppointments}
                isBeauty={isBeauty}
            />

            {/* History Modal */}
            {showHistoryModal && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${colors.overlay}`}>
                    <div className={`w-full max-w-4xl p-6 my-8 transition-all ${colors.card} ${colors.border} ${radius.modal} ${shadow.modal}`}>
                        <div className={`flex items-center justify-between mb-6`}>
                            <h3 className={`${colors.text} font-heading text-2xl uppercase`}>Histórico de Agendamentos</h3>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className={`${colors.textMuted} hover:text-theme-text transition-colors`}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Month Navigator */}
                        <div className={`flex items-center justify-between mb-6 ${colors.surface} p-4 rounded-xl ${colors.border}`}>
                            <button
                                onClick={() => {
                                    changeHistoryMonth(-1);
                                }}
                                className={`p-2 rounded-lg transition-colors hover:bg-theme-surface`}
                            >
                                <ChevronLeft className={`w-5 h-5 ${colors.text}`} />
                            </button>
                            <div className="text-center">
                                <p className={`text-xl font-heading ${accent.text} uppercase`}>
                                    {historyMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    changeHistoryMonth(1);
                                }}
                                className={`p-2 rounded-lg transition-colors hover:bg-theme-surface`}
                            >
                                <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                            </button>
                        </div>

                        {/* History List */}
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {historyAppointments.length === 0 ? (
                                <EmptyState icon={History} message="Nenhum agendamento concluído ou cancelado neste mês" />
                            ) : (
                                historyAppointments.map(apt => {
                                    const professional = teamMembers.find(m => m.id === apt.professional_id);
                                    const { hasDiscount, discountPercentage, isCustomPriceHigher } = getDiscountInfo(apt);

                                    return (
                                        <div
                                            key={apt.id}
                                            className={`${colors.surface} rounded-xl p-5 border-2 ${apt.status === 'Completed' ? 'border-emerald-500/40' : 'border-red-500/40'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${apt.status === 'Completed' ? status.successBg + ' ' + status.success : status.dangerBg + ' ' + status.danger}`}>
                                                            {apt.status === 'Completed' ? 'CONCLUÍDO' : 'CANCELADO'}
                                                        </span>
                                                        <span className={`${colors.textMuted} text-xs`}>
                                                            {new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className={`${colors.text} font-bold text-base mb-1`}>{apt.clientName}</p>
                                                    <p className={`${colors.textSecondary} text-sm mb-1`}>{apt.service}</p>
                                                    {professional && (
                                                        <p className={`${colors.textMuted} text-xs`}>
                                                            Profissional: {professional.name}
                                                        </p>
                                                    )}
                                                    <button
                                                        onClick={() => setShowingDetailsAppointment(apt)}
                                                        className={`${colors.textMuted} hover:text-theme-text transition-colors mt-1 flex items-center gap-1 text-xs`}
                                                        title="Ver detalhes"
                                                    >
                                                        <Info className="w-3 h-3" />
                                                        Detalhes
                                                    </button>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-2">
                                                    {hasDiscount && apt.basePrice && (
                                                        <span className={`text-xs font-mono text-red-500 line-through`}>
                                                            {formatCurrency(apt.basePrice, currencyRegion)}
                                                        </span>
                                                    )}
                                                    <p className={`text-lg font-mono font-bold ${accent.text}`}>
                                                        {formatCurrency(apt.price, currencyRegion)}
                                                    </p>
                                                    {hasDiscount && (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1`}>
                                                            {discountPercentage}% OFF
                                                        </span>
                                                    )}
                                                    {isCustomPriceHigher && (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1`}>
                                                            Preço Customizado
                                                        </span>
                                                    )}
                                                    {!isStaff && (
                                                        <button
                                                            onClick={() => handleDeleteHistoryAppointment(apt.id)}
                                                            className={`p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors`}
                                                            title="Excluir agendamento"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className={`mt-6 pt-4 ${colors.divider} border-t`}>
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => setShowHistoryModal(false)}
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Appointment Wizard */}
            {showNewAppointmentModal && (
                <AppointmentWizard
                    onClose={() => {
                        setShowNewAppointmentModal(false);
                        navigate(location.pathname, { replace: true });
                    }}
                    onSuccess={(date) => {
                        const newDateStr = date.toISOString().split('T')[0];
                        setShowNewAppointmentModal(false);
                        navigate(`/agenda?date=${newDateStr}`, { replace: true });
                    }}
                    initialDate={selectedDate}
                    teamMembers={teamMembers}
                    services={services}
                    categories={categories}
                    clients={clients}
                    onRefreshClients={fetchClients}
                />
            )}

            {/* Edit Appointment Modal */}
            {editingAppointment && (
                <AppointmentEditModal
                    appointment={editingAppointment}
                    teamMembers={teamMembers}
                    services={services}
                    clients={clients}
                    onClose={() => setEditingAppointment(null)}
                    onSave={fetchData}
                    accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
                    currencySymbol={currencySymbol}
                />
            )}

            {/* CheckoutModal â Fase 3 */}
            <CheckoutModal
                appointment={checkoutAppointment}
                teamMembers={checkoutTeamMembers}
                financialSettings={financialSettings}
                onClose={() => setCheckoutAppointment(null)}
                onConfirm={() => {
                    setCheckoutAppointment(null);
                    fetchData();
                }}
            />
        </div>
    );
};
