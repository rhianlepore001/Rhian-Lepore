import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Calendar, Clock, Plus, User, Users, Check, X, ChevronLeft, ChevronRight, History, AlertTriangle, Loader2, Trash2, Edit2, Tag, Scissors, MessageCircle, Info, DollarSign, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppointmentEditModal } from '../components/AppointmentEditModal';
import { AppointmentWizard } from '../components/AppointmentWizard';
import { AllAppointmentsModal } from '../components/dashboard/modals/AllAppointmentsModal';
import { CheckoutModal } from '../components/CheckoutModal';
import { EmptyState } from '../components/EmptyState';
import { confirmPublicBooking, createAcceptedAppointmentFromBooking, rejectPublicBooking } from '../services/publicBooking';

import { formatCurrency, formatPhone } from '../utils/formatters';
import { formatDateForInput } from '../utils/date';
import { useAppTour } from '../hooks/useAppTour';
import { logger } from '../utils/Logger';
import { combineDateAndTime } from '../utils/date';


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
    const { user, region, role, companyId } = useAuth();
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
    const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState<string | null>(null);
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
    const currencySymbol = region === 'PT' ? '€' : 'R$';
    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

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
    useEffect(() => {
        if (showNewAppointmentModal) {
            setSelectedAppointmentDate(formatDateForInput(selectedDate));

            // Auto-select professional if filter is active or only one exists
            if (selectedProfessionalFilter) {
                setSelectedProfessional(selectedProfessionalFilter);
            } else if (teamMembers.length === 1) {
                setSelectedProfessional(teamMembers[0].id);
            }
        }
    }, [showNewAppointmentModal, selectedDate, selectedProfessionalFilter, teamMembers]);

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
            .in('status', ['Confirmed', 'Pending', 'Completed']) // Include Completed for badge (Fase 3)
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
                    payment_method: apt.payment_method
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

    const handleDeleteHistoryAppointment = async (appointmentId: string) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento do histórico? Esta ação é irreversível e removerá também o registro financeiro associado.')) return;

        try {
            // Delete associated finance records first (if any)
            await supabase.from('finance_records').delete().eq('appointment_id', appointmentId);

            // Then delete the appointment
            await supabase.from('appointments').delete().eq('id', appointmentId).eq('user_id', user.id);

            alert('Agendamento e registro financeiro excluídos com sucesso!');
            fetchHistoryAppointments(); // Refresh history
            fetchData(); // Also refresh main agenda data in case it affects counts/stats
        } catch (error) {
            logger.error('Error deleting history appointment', error);
            alert('Erro ao excluir agendamento do histórico.');
        }
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

            // Fetch the client to ensure we have the correct phone number if it was just created
            const phone = booking.customer_phone;
            const waPhone = phone.replace(/\D/g, '');
            const waMessage = encodeURIComponent('Seu agendamento foi confirmado');

            if (window.confirm('Agendamento aceito com sucesso! Deseja enviar uma mensagem de confirmação para o cliente via WhatsApp?')) {
                const dateObj = new Date(booking.appointment_time);
                const formattedDate = dateObj.toLocaleDateString('pt-BR');
                const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const establishment = businessName;

                const currencySymbol = currencyRegion === 'PT' ? '€' : 'R$';
                const formattedPrice = booking.total_price.toFixed(2).replace('.', ',');

                const message = isBeauty
                    ? `Olá ${booking.customer_name}! Tudo bem? ✨\n` +
                    `Sua reserva na *${establishment || 'Estética'}* está confirmada!\n` +
                    `📅 *${formattedDate}* às *${formattedTime}*\n` +
                    `💼 *Serviço*: ${serviceNames}\n` +
                    `💰 *Valor*: ${currencySymbol} ${formattedPrice}\n` +
                    `📍 Local: estamos te esperando!\n\n` +
                    `Estamos preparando tudo para te receber com a melhor experiência. Até logo! 💖`
                    : `Fala, ${booking.customer_name}! Seu horário está garantido! 🛡️\n` +
                    `Marque na sua agenda:\n` +
                    `🗓️ *${formattedDate}* às *${formattedTime}*\n` +
                    `✂️ *Serviço*: ${serviceNames}\n` +
                    `💰 *Valor*: ${currencySymbol} ${formattedPrice}\n` +
                    `📍 Onde: *${establishment || 'Barbearia'}*.\n\n` +
                    `Prepare-se para o trato! Nos vemos em breve. 👋`;

                const waMessage = encodeURIComponent(message);
                window.open(`https://wa.me/${waPhone}?text=${waMessage}`, '_blank');
            }

            fetchData();
        } catch (error) {
            logger.error('Error accepting booking', error);
            alert('Erro ao aceitar agendamento.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        try {
            await rejectPublicBooking(bookingId, user.id);
            alert('Solicita��o recusada.');
            fetchData();
        } catch (error) {
            logger.error('Error rejecting booking', error);
        }
    };

    const handleCompleteAppointment = async (appointmentId: string, isOverdue: boolean = false) => {
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
            alert(`Erro ao concluir agendamento: ${error.message || error}`);
        }
    };
    const handleCancelAppointment = async (appointmentId: string, isOverdue: boolean = false) => {
        // Guard: staff não pode cancelar agendamento já finalizado (D-07)
        const apt = appointments.find((a) => a.id === appointmentId)
            || overdueAppointments.find((a) => a.id === appointmentId);
        if (apt?.status === 'Completed' && role === 'staff') {
            alert('Este agendamento já foi finalizado. Fale com o dono.');
            return;
        }
        if (!confirm('Cancelar este agendamento? Ele será movido para o histórico.')) return;
        try {
            await supabase
                .from('appointments')
                .update({ status: 'Cancelled' })
                .eq('id', appointmentId);
            alert('Agendamento cancelado e movido para o histórico!');
            if (isOverdue) {
                fetchOverdueAppointments();
            } else {
                fetchData();
            }
        } catch (error) {
            logger.error('Error cancelling appointment', error);
            alert('Erro ao cancelar agendamento.');
        }
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
            alert('Erro ao atribuir profissional.');
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
            alert('Preencha todos os campos!');
            return;
        }

        try {
            const selectedServicesDetails = services.filter(s => selectedServices.includes(s.id));
            if (selectedServicesDetails.length === 0) {
                alert('Serviço inválido.');
                return;
            }

            const basePrice = selectedServicesDetails.reduce((sum, s) => sum + s.price, 0);

            // Use manually edited price
            const finalPrice = parseFloat(finalPriceInput);
            if (isNaN(finalPrice)) {
                alert('Preço inválido!');
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
                const waPhone = client.phone.replace(/\D/g, '');
                const waMessage = encodeURIComponent('Seu agendamento foi confirmado');

                if (window.confirm('Agendamento criado com sucesso! Deseja enviar uma mensagem de confirmação para o cliente via WhatsApp?')) {
                    const dateObj = dateTime;
                    const formattedDate = dateObj.toLocaleDateString('pt-BR');
                    const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const establishment = businessName;

                    const currencySymbol = currencyRegion === 'PT' ? '€' : 'R$';
                    const formattedPrice = finalPrice.toFixed(2).replace('.', ',');

                    const message = `Agendamento confirmado! ✨
📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
💇‍♀️ Serviço: ${serviceNames}
💰 Valor: ${currencySymbol} ${formattedPrice}

Obrigada pela confiança! Te espero no ${establishment}.`;

                    const waMessage = encodeURIComponent(message);
                    window.open(`https://wa.me/${waPhone}?text=${waMessage}`, '_blank');
                }
            } else {
                alert('Agendamento criado com sucesso!');
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
            alert('Erro ao criar agendamento.');
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

    // Filtrar profissionais exibidos
    const displayedMembers = selectedProfessionalFilter
        ? teamMembers.filter(m => m.id === selectedProfessionalFilter)
        : teamMembers;

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
                        <BrutalButton
                            variant="secondary"
                            icon={<History />}
                            onClick={() => setShowHistoryModal(true)}
                            className="flex-1 md:flex-none"
                        >
                            <span className="hidden md:inline">Histórico</span>
                        </BrutalButton>
                        <BrutalButton
                            variant="secondary"
                            icon={<Calendar />}
                            onClick={() => setShowAllAppointmentsModal(true)}
                            className="flex-1 md:flex-none"
                        >
                            <span className="hidden md:inline">Todos Agendamentos</span>
                        </BrutalButton>
                        <BrutalButton
                            id="btn-new-appointment"
                            variant="primary"
                            icon={<Plus />}
                            onClick={() => navigate('?new=true')}
                            className="hidden md:flex"
                        >
                            Novo Agendamento
                        </BrutalButton>
                    </div>
                </div>
            </div>

            {/* --- Agendamentos Atrasados (Overdue) --- */}
            {isOverdueFilter && (
                <div className="px-4 md:px-6">
                    <BrutalCard className="border-l-4 border-red-500 bg-red-500/5">
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
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </BrutalCard>
                </div>
            )}
            {/* --- FIM: Agendamentos Atrasados --- */}


            {/* Date Navigator */}
            <div className="px-4 md:px-6">
                <BrutalCard>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => changeDate(-1)}
                            className={`p-2 rounded-xl transition-colors hover:${colors.surface}`}
                        >
                            <ChevronLeft className={`w-6 h-6 ${colors.text}`} />
                        </button>
                        <div className="text-center">
                            <h2 className={`text-2xl font-heading ${accent.text} uppercase`}>
                                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                            </h2>
                            <p className={`${colors.text} text-lg font-mono`}>
                                {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <button
                            onClick={() => changeDate(1)}
                            className={`p-2 rounded-xl transition-colors hover:${colors.surface}`}
                        >
                            <ChevronRight className={`w-6 h-6 ${colors.text}`} />
                        </button>
                    </div>
                </BrutalCard>
            </div>

            {/* Professional Filter - Avatars */}
            {teamMembers.length > 0 && (
                <div className="px-4 md:px-6">
                    <div className={`flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide ${colors.surface} ${colors.border} rounded-2xl p-4`}>
                        <button
                            onClick={() => setSelectedProfessionalFilter(null)}
                            className="flex flex-col items-center gap-2 min-w-[72px] snap-start"
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${selectedProfessionalFilter === null ? `${accent.bg} ${accent.border} ${isBeauty ? 'text-white' : 'text-black'}` : `${colors.border} ${colors.card} ${colors.textSecondary}`}`}>
                                <Users className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedProfessionalFilter === null ? accent.text : colors.textMuted}`}>Todos</span>
                        </button>
                        {teamMembers.map(member => (
                            <button
                                key={member.id}
                                onClick={() => setSelectedProfessionalFilter(member.id)}
                                className="flex flex-col items-center gap-2 min-w-[72px] snap-start"
                            >
                                <div className="relative">
                                    {member.photo_url ? (
                                        <img
                                            src={member.photo_url}
                                            alt={member.name}
                                            className={`w-14 h-14 rounded-full object-cover border-2 transition-all ${selectedProfessionalFilter === member.id ? accent.border : colors.border}`}
                                        />
                                    ) : (
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-all ${selectedProfessionalFilter === member.id ? `${accent.bg} ${accent.border} ${isBeauty ? 'text-white' : 'text-black'}` : `${colors.card} ${colors.border} ${colors.text}`}`}>
                                            {getInitials(member.name)}
                                        </div>
                                    )}
                                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[72px] ${selectedProfessionalFilter === member.id ? accent.text : colors.textMuted}`}>
                                    {member.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Public Bookings Alert */}
            {publicBookings.length > 0 && (
                <div className="px-4 md:px-6 space-y-4">
                    <BrutalCard className={`border-l-4 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'} ${accent.bgDim}`}>
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
                    </BrutalCard>

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
                                            <span className={`text-[10px] font-mono font-bold text-blue-400 bg-blue-400/10 border border-blue-400/30 px-2 py-1 rounded`}>
                                                ALTERAÇÃO DE AGENDAMENTO
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border transition-colors ${isToday ? `${accent.bg} ${isBeauty ? 'text-white' : 'text-black'} ${accent.border}` : `${colors.surface} ${colors.textMuted} ${colors.border}`}`}>
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
                                            <button
                                                onClick={() => handleRejectBooking(booking.id)}
                                                className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5"
                                                title="Recusar"
                                            >
                                                <X className="w-3.5 h-3.5" /> Recusar
                                            </button>
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
                                        <div className="flex items-center gap-3 text-xs text-neutral-300">
                                            <div className={`p-1.5 rounded-lg ${accent.bgDim}`}>
                                                <Scissors className={`w-3.5 h-3.5 ${accent.text}`} />
                                            </div>
                                            <span className="font-medium">
                                                {booking.service_ids?.length || 0} serviço(s) • <span className={`${colors.text} font-bold`}>{formatCurrency(booking.total_price, currencyRegion)}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-neutral-300">
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

            {/* Team Columns */}
            {teamMembers.length === 0 ? (
                <div className="px-4 md:px-6">
                    <BrutalCard>
                        <EmptyState
                            icon={User}
                            message="Nenhum profissional cadastrado. Adicione profissionais à sua equipe para começar a organizar agendamentos."
                            ctaLabel="Adicionar Profissionais"
                            onCta={() => navigate('/configuracoes/equipe')}
                        />
                    </BrutalCard>
                </div>
            ) : (
                <div className={`flex flex-nowrap md:grid overflow-x-auto snap-x snap-mandatory gap-5 px-4 md:px-6 pb-4 scrollbar-hide ${selectedProfessionalFilter ? 'md:grid-cols-1 max-w-3xl mx-auto' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>

                    {/* Unassigned Column (if any unassigned appointments exist) */}
                    {appointments.some(apt => !apt.professional_id) && !selectedProfessionalFilter && (
                        <div className="min-w-[300px] w-full snap-start flex flex-col">
                            <div className={`${colors.surface} ${colors.border} rounded-t-2xl p-4 flex items-center justify-between`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${colors.border} ${colors.card}`}>
                                        <Users className={`w-5 h-5 ${colors.textMuted}`} />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${colors.text} uppercase tracking-wider text-sm`}>A Distribuir</h3>
                                        <span className={`text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full inline-block mt-1`}>
                                            Sem profissional
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className={`${colors.card} ${colors.border} rounded-b-2xl border-t-0 p-5 space-y-5 flex-1 overflow-y-auto max-h-[800px]`}>
                                {appointments.filter(apt => !apt.professional_id).map(apt => {
                                    const { hasDiscount } = getDiscountInfo(apt);
                                    return (
                                        <div
                                            key={apt.id}
                                            className={`${colors.surface} ${colors.border} rounded-xl p-5 transition-colors`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-mono font-bold ${colors.text}`}>
                                                        {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className={`text-xs font-mono ${colors.textMuted}`}>
                                                        {new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setEditingAppointment(apt)}
                                                    className={`${colors.textMuted} hover:${colors.text} transition-colors`}
                                                    title="Editar / Atribuir"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className={`${colors.text} font-bold text-sm mb-1`}>{apt.clientName}</p>
                                            <p className={`${colors.textSecondary} text-xs mb-1`}>{apt.service}</p>
                                            <span className={`text-xs font-mono font-bold ${accent.text}`}>
                                                {formatCurrency(apt.price, currencyRegion)}
                                            </span>
                                            <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Necessário atribuir profissional
                                            </div>
                                            {teamMembers.length === 1 && (
                                                <button
                                                    onClick={() => handleAssignToProfessional(apt.id, teamMembers[0].id)}
                                                    className={`mt-3 w-full font-bold text-[10px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 ${classes.buttonSuccess}`}
                                                >
                                                    <Check className="w-3 h-3" /> ATRIBUIR A {teamMembers[0].name.toUpperCase()}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {displayedMembers.map(member => {
                        const memberAppointments = getAppointmentsForProfessional(member.id);
                        const memberPendingBookings = getPendingBookingsForProfessional(member.id);

                        return (
                            <div key={member.id} className="min-w-[300px] w-full snap-start flex flex-col gap-4">
                                {/* Professional Header */}
                                <div
                                    onClick={() => {
                                        setSelectedProfessional(member.id);
                                        setShowNewAppointmentModal(true);
                                    }}
                                    className={`${colors.surface} ${colors.border} rounded-t-2xl p-4 flex items-center cursor-pointer transition-all group relative`}
                                    title="Clique para agendar com este profissional"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="relative flex-shrink-0">
                                            {member.photo_url ? (
                                                <img
                                                    src={member.photo_url}
                                                    alt={member.name}
                                                    className={`w-12 h-12 rounded-full border-2 object-cover ${colors.border}`}
                                                />
                                            ) : (
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 text-sm font-bold ${colors.card} ${colors.border} ${colors.text}`}>
                                                    {getInitials(member.name)}
                                                </div>
                                            )}
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-heading font-bold text-base truncate uppercase ${colors.text}`} title={member.name}>
                                                {member.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accent.bgDim} ${accent.text}`}>
                                                    {memberAppointments.length} agendamentos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className={`${colors.card} p-1.5 rounded-full`}>
                                            <Plus className={`w-4 h-4 ${colors.text}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Appointments Column */}
                                <div className={`${colors.card} ${colors.border} rounded-b-2xl border-t-0 p-5 space-y-5 max-h-[600px] overflow-y-auto`}>
                                    {/* Pending Public Bookings */}
                                    {memberPendingBookings.map(booking => (
                                        <div
                                            key={booking.id}
                                            className={`${colors.surface} rounded-xl p-5 border-2 ${
                                                (booking as any).is_edit
                                                    ? 'border-blue-400/40'
                                                    : accent.borderDim
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <span className={`text-xs font-mono font-bold ${
                                                    (booking as any).is_edit ? 'text-blue-400' : accent.text
                                                }`}>
                                                    {(booking as any).is_edit
                                                        ? `✏️ ${booking.customer_name} alterou o agendamento`
                                                        : 'SOLICITAÇÃO ONLINE'
                                                    }
                                                </span>
                                            </div>
                                            <p className={`${colors.text} font-bold text-sm mb-1`}>{booking.customer_name}</p>
                                            <p className={`${colors.textSecondary} text-xs mb-1`}>
                                                {booking.service_ids?.length} serviço(s)
                                            </p>
                                            <p className={`${colors.textMuted} text-xs mb-4`}>
                                                {new Date(booking.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAcceptBooking(booking)}
                                                    disabled={isProcessing}
                                                    className={`flex-1 ${isProcessing ? 'opacity-50 cursor-not-allowed' : classes.buttonSuccess} text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5`}
                                                >
                                                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                    {isProcessing ? 'Aguarde...' : 'Confirmar'}
                                                </button>
                                                <button
                                                    onClick={() => handleRejectBooking(booking.id)}
                                                    disabled={isProcessing}
                                                    className={`flex-1 ${isProcessing ? 'opacity-50 cursor-not-allowed' : classes.buttonDanger} text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5`}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    Recusar
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Confirmed Appointments */}
                                    {memberAppointments.map(apt => {
                                        const { hasDiscount, discountPercentage, isCustomPriceHigher } = getDiscountInfo(apt);
                                        const isCompleted = apt.status === 'Completed';

                                        return (
                                            <div
                                                key={apt.id}
                                                className={`${isCompleted ? `${colors.card} opacity-70` : colors.surface} ${colors.border} rounded-xl p-5 transition-all hover:shadow-md ${accent.borderDim}`}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-mono font-bold px-3 py-1 rounded-lg ${isCompleted ? 'bg-emerald-500/10 text-emerald-500 line-through decoration-2 border border-emerald-500/20' : `${accent.bgDim} ${accent.text} ${accent.borderDim}`}`}>
                                                            {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {/* Quick Actions Header */}
                                                    <div className="flex items-center gap-1.5">
                                                        {apt.notes && (
                                                            <button onClick={() => setShowingDetailsAppointment(apt)} className={`p-1.5 rounded-md transition-colors ${colors.surface} ${colors.border} hover:border-blue-400/50`} title="Ver detalhes e observações">
                                                                <Info className="w-3.5 h-3.5 text-blue-400" />
                                                            </button>
                                                        )}
                                                        {apt.clientPhone && apt.status === 'Confirmed' && (
                                                            <button
                                                                onClick={() => {
                                                                    const waPhone = apt.clientPhone!.replace(/\D/g, '');
                                                                    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent('Seu agendamento foi confirmado')}`, '_blank');
                                                                }}
                                                                className={`p-1.5 rounded-md transition-colors ${colors.surface} ${colors.border} hover:border-emerald-500/50`}
                                                                title="WhatsApp"
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-4 cursor-pointer group" onClick={() => setShowingDetailsAppointment(apt)} title="Ver detalhes do agendamento">
                                                    <div className="flex items-center justify-between">
                                                        <p className={`font-bold text-base truncate flex-1 ${isCompleted ? colors.textMuted : colors.text}`}>
                                                            {apt.clientName}
                                                        </p>
                                                        <ChevronRight className={`w-4 h-4 transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 ${accent.text}`} />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Scissors className={`w-3.5 h-3.5 ${colors.textMuted}`} />
                                                        <p className={`text-sm truncate max-w-[180px] ${colors.textSecondary}`} title={apt.service}>
                                                            {apt.service}
                                                        </p>
                                                    </div>
                                                    {isCompleted && apt.payment_method && (
                                                        <span className={`text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/20 inline-block mt-1`}>
                                                            Pago via {apt.payment_method.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={`pt-4 ${colors.divider} border-t flex flex-col gap-3`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            {hasDiscount && apt.basePrice && (
                                                                <span className={`text-[10px] ${colors.textMuted} line-through`}>
                                                                    {formatCurrency(apt.basePrice, currencyRegion)}
                                                                </span>
                                                            )}
                                                            <span className={`text-sm font-bold ${isCompleted ? colors.textMuted : colors.text}`}>
                                                                {formatCurrency(apt.price, currencyRegion)}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col gap-1 items-end">
                                                            {hasDiscount && (
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20`}>
                                                                    -{discountPercentage}%
                                                                </span>
                                                            )}
                                                            {isCustomPriceHigher && (
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20`}>
                                                                    Custom
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {apt.status === 'Confirmed' && (
                                                        <div className="flex items-center justify-between gap-2 mt-1">
                                                            {!isCompleted && (
                                                                <button
                                                                    onClick={() => setCheckoutAppointment({ ...apt, time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: apt.status as 'Confirmed' | 'Pending' | 'Completed' })}
                                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${classes.buttonSuccess}`}
                                                                >
                                                                    <Check className="w-3.5 h-3.5" /> Concluir
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setEditingAppointment(apt)}
                                                                className={`px-3 py-2.5 rounded-xl transition-colors ${classes.buttonSecondary}`}
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelAppointment(apt.id)}
                                                                className={`px-3 py-2.5 rounded-xl transition-colors ${classes.buttonDanger}`}
                                                                title="Cancelar"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {memberAppointments.length === 0 && memberPendingBookings.length === 0 && (
                                        <EmptyState
                                            icon={Calendar}
                                            message="Nenhum agendamento para hoje"
                                            className="py-8"
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Appointment Details Modal */}
            {showingDetailsAppointment && createPortal(
                <div className={`fixed inset-0 z-[999] flex items-center justify-center p-4 ${colors.overlay} md:left-64`}>
                    <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto p-0 relative transition-all animate-in fade-in zoom-in duration-300 ${colors.card} ${colors.border} ${radius.modal} ${shadow.modal}`}>
                        {/* Header */}
                        <div className={`p-6 border-b ${colors.divider} ${colors.surface}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className={`font-heading text-xl uppercase mb-1 ${colors.text}`}>
                                        Detalhes do Agendamento
                                    </h3>
                                    <span className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full inline-block ${showingDetailsAppointment.status === 'Completed' ? classes.badgeSuccess : showingDetailsAppointment.status === 'Cancelled' ? classes.badgeDanger : classes.badgeWarning}`}>
                                        {showingDetailsAppointment.status === 'Completed' ? 'Concluído' :
                                         showingDetailsAppointment.status === 'Cancelled' ? 'Cancelado' : 'Confirmado'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowingDetailsAppointment(null)}
                                    className={`p-1 rounded-full transition-colors ${colors.textMuted} hover:${colors.text} hover:${colors.surface}`}
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
                                    {showingDetailsAppointment.clientName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className={`text-xs font-mono uppercase tracking-widest ${colors.textMuted} mb-0.5`}>Cliente</p>
                                    <h4 className={`text-lg font-bold ${colors.text} leading-tight`}>{showingDetailsAppointment.clientName}</h4>
                                    {showingDetailsAppointment.clientPhone && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Phone className={`w-3 h-3 ${colors.textMuted}`} />
                                            <span className={`text-xs ${colors.textMuted} font-mono`}>
                                                {formatPhone(showingDetailsAppointment.clientPhone, currencyRegion)}
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
                                        <span className={`text-[10px] font-mono uppercase tracking-widest font-bold`}>Serviço</span>
                                    </div>
                                    <p className={`${colors.text} font-medium text-sm`}>{showingDetailsAppointment.service}</p>
                                </div>
                                <div>
                                    <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                                        <User className="w-4 h-4" />
                                        <span className={`text-[10px] font-mono uppercase tracking-widest font-bold`}>Profissional</span>
                                    </div>
                                    <p className={`${colors.text} font-medium text-sm`}>
                                        {teamMembers.find(m => m.id === showingDetailsAppointment.professional_id)?.name || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Time & Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                                        <Clock className="w-4 h-4" />
                                        <span className={`text-[10px] font-mono uppercase tracking-widest font-bold`}>Data e Hora</span>
                                    </div>
                                    <p className={`${colors.text} font-medium text-sm`}>
                                        {new Date(showingDetailsAppointment.appointment_time).toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className={`font-mono font-bold mt-0.5 ${accent.text}`}>
                                        {new Date(showingDetailsAppointment.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div>
                                    <div className={`flex items-center gap-2 mb-2 ${colors.textMuted}`}>
                                        <DollarSign className="w-4 h-4" />
                                        <span className={`text-[10px] font-mono uppercase tracking-widest font-bold`}>Valor</span>
                                    </div>
                                    <div className="flex flex-col">
                                        {(() => {
                                            const { hasDiscount, basePrice } = getDiscountInfo(showingDetailsAppointment);
                                            return (
                                                <>
                                                    {hasDiscount && basePrice && (
                                                        <span className={`text-xs text-red-500 line-through font-mono`}>
                                                            {formatCurrency(basePrice, currencyRegion)}
                                                        </span>
                                                    )}
                                                    <span className={`text-xl font-bold font-mono ${isBeauty ? colors.text : accent.text}`}>
                                                        {formatCurrency(showingDetailsAppointment.price, currencyRegion)}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Notes Section - Prominent */}
                            {showingDetailsAppointment.notes && (
                                <div className={`p-4 rounded-xl border ${accent.bgDim} ${accent.borderDim}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Info className={`w-4 h-4 ${accent.text}`} />
                                        <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${accent.text}`}>Observações</span>
                                    </div>
                                    <p className={`${colors.textSecondary} text-sm leading-relaxed italic`}>
                                        &quot;{showingDetailsAppointment.notes}&quot;
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className={`p-5 border-t ${colors.divider} ${colors.surface} flex gap-3 rounded-b-2xl`}>
                            {showingDetailsAppointment.status === 'Confirmed' && (
                                <BrutalButton
                                    variant="secondary"
                                    className="flex-1 flex justify-center items-center gap-2"
                                    onClick={() => {
                                        setEditingAppointment(showingDetailsAppointment);
                                        setShowingDetailsAppointment(null);
                                    }}
                                >
                                    <Edit2 className="w-4 h-4" /> Editar
                                </BrutalButton>
                            )}
                            <BrutalButton
                                variant="primary"
                                className="flex-1 flex justify-center items-center gap-2"
                                onClick={() => setShowingDetailsAppointment(null)}
                            >
                                <Check className="w-4 h-4" /> Fechar
                            </BrutalButton>
                        </div>
                    </div>
                </div>, document.body
            )}

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
                                className={`${colors.textMuted} hover:${colors.text} transition-colors`}
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
                                className={`p-2 rounded-lg transition-colors hover:${colors.surface}`}
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
                                className={`p-2 rounded-lg transition-colors hover:${colors.surface}`}
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
                                                        className={`${colors.textMuted} hover:${colors.text} transition-colors mt-1 flex items-center gap-1 text-xs`}
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
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1`}>
                                                            {discountPercentage}% OFF
                                                        </span>
                                                    )}
                                                    {isCustomPriceHigher && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1`}>
                                                            Preço Customizado
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteHistoryAppointment(apt.id)}
                                                        className={`p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors`}
                                                        title="Excluir agendamento"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className={`mt-6 pt-4 ${colors.divider} border-t`}>
                            <BrutalButton
                                variant="secondary"
                                className="w-full"
                                onClick={() => setShowHistoryModal(false)}
                            >
                                Fechar
                            </BrutalButton>
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

            {/* CheckoutModal — Fase 3 */}
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
