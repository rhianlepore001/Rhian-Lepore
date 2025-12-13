import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Calendar, Clock, Plus, User, Check, X, ChevronLeft, ChevronRight, History, AlertTriangle, Loader2, Trash2, Edit2, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppointmentEditModal } from '../components/AppointmentEditModal';
import { SearchableSelect } from '../components/SearchableSelect'; // Importando o novo componente

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
    const { user, userType, region } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [publicBookings, setPublicBookings] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getInitialDate(searchParams));
    const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyAppointments, setHistoryAppointments] = useState<Appointment[]>([]);
    const [historyMonth, setHistoryMonth] = useState(new Date());
    const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState<string | null>(null);
    const [overdueAppointments, setOverdueAppointments] = useState<Appointment[]>([]);
    const [isOverdueLoading, setIsOverdueLoading] = useState(false);

    // State for editing
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

    // Form state (for new appointment modal)
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [selectedProfessional, setSelectedProfessional] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [customTime, setCustomTime] = useState('');
    const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(selectedDate.toISOString().split('T')[0]);
    const [discountPercentage, setDiscountPercentage] = useState('0'); // NEW STATE FOR DISCOUNT

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const currencySymbol = region === 'PT' ? '€' : 'R$';

    const isOverdueFilter = searchParams.get('filter') === 'overdue';

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

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, selectedDate]);

    useEffect(() => {
        if (isOverdueFilter) {
            fetchOverdueAppointments();
        }
    }, [user, isOverdueFilter]);

    // Effect to fetch history appointments when historyMonth changes and modal is open
    useEffect(() => {
        if (showHistoryModal && user) {
            fetchHistoryAppointments();
        }
    }, [historyMonth, showHistoryModal, user]); // Added user to dependencies

    // Update selectedAppointmentDate when modal opens or selectedDate changes
    useEffect(() => {
        if (showNewAppointmentModal) {
            setSelectedAppointmentDate(selectedDate.toISOString().split('T')[0]);

            // Auto-select professional if filter is active or only one exists
            if (selectedProfessionalFilter) {
                setSelectedProfessional(selectedProfessionalFilter);
            } else if (teamMembers.length === 1) {
                setSelectedProfessional(teamMembers[0].id);
            }
        }
    }, [showNewAppointmentModal, selectedDate, selectedProfessionalFilter, teamMembers]);

    // Handle clientId from URL (coming from ClientCRM "Novo Serviço" button)
    useEffect(() => {
        const clientIdParam = searchParams.get('clientId');
        if (clientIdParam && clients.length > 0) {
            // Pre-select the client
            setSelectedClient(clientIdParam);
            // Open the new appointment modal
            setShowNewAppointmentModal(true);
        }
    }, [searchParams, clients]);

    const fetchData = async () => {
        await Promise.all([
            fetchTeamMembers(),
            fetchAppointments(),
            fetchPublicBookings(),
            fetchClients(),
            fetchServices()
        ]);
        setLoading(false);
    };

    const fetchTeamMembers = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('team_members')
            .select('id, name, photo_url')
            .eq('user_id', user.id)
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
            .select('name, price');

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        // 2. Fetch appointments for the selected day (Confirmed status)
        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name, id)')
            .eq('user_id', user.id)
            .gte('appointment_time', startOfDay.toISOString())
            .lte('appointment_time', endOfDay.toISOString())
            .in('status', ['Confirmed', 'Pending']) // Include pending for the day view
            .order('appointment_time');

        if (data) {
            setAppointments(data.map((apt: any) => {
                // Use the price from the service table as the base price
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
                    basePrice: basePrice
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
            .select('name, price');

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name)')
            .eq('user_id', user.id)
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
                    service: apt.service,
                    appointment_time: apt.appointment_time,
                    price: apt.price,
                    status: apt.status,
                    professional_id: apt.professional_id,
                    basePrice: basePrice
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
            .eq('user_id', user.id)
            .order('name');
        if (data) setClients(data as Client[]);
    };

    const fetchServices = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('services')
            .select('id, name, price, duration_minutes') // Adicionando duration_minutes para subtext
            .eq('user_id', user.id)
            .eq('active', true)
            .order('name');
        if (data) setServices(data as Service[]);
    };

    const fetchHistoryAppointments = async () => {
        if (!user) return;
        const startOfMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth(), 1);
        const endOfMonth = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 0, 23, 59, 59);

        // 1. Fetch all services to map names to prices later
        const { data: allServices } = await supabase
            .from('services')
            .select('name, price');

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name)')
            .eq('user_id', user.id)
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
                    basePrice: basePrice
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
            await supabase.from('appointments').delete().eq('id', appointmentId);

            alert('Agendamento e registro financeiro excluídos com sucesso!');
            fetchHistoryAppointments(); // Refresh history
            fetchData(); // Also refresh main agenda data in case it affects counts/stats
        } catch (error) {
            console.error('Error deleting history appointment:', error);
            alert('Erro ao excluir agendamento do histórico.');
        }
    };

    const handleAcceptBooking = async (booking: any) => {
        if (!user) return;

        try {
            let clientId = null;
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', user.id)
                .eq('phone', booking.customer_phone)
                .single();

            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert({
                        user_id: user.id,
                        name: booking.customer_name,
                        phone: booking.customer_phone,
                        email: booking.customer_email
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
                .in('id', booking.service_ids);

            const serviceNames = (serviceDetails || []).map(s => s.name).join(', ');

            const { error: aptError } = await supabase
                .from('appointments')
                .insert({
                    user_id: user.id,
                    client_id: clientId,
                    professional_id: booking.professional_id,
                    service: serviceNames,
                    appointment_time: booking.appointment_time,
                    price: booking.total_price,
                    status: 'Confirmed'
                });

            if (aptError) throw aptError;

            await supabase
                .from('public_bookings')
                .update({ status: 'confirmed' })
                .eq('id', booking.id);

            alert('Agendamento aceito com sucesso!');
            fetchData();
        } catch (error) {
            console.error('Error accepting booking:', error);
            alert('Erro ao aceitar agendamento.');
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        try {
            await supabase
                .from('public_bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);
            alert('Solicitação recusada.');
            fetchData();
        } catch (error) {
            console.error('Error rejecting booking:', error);
        }
    };

    const handleCompleteAppointment = async (appointmentId: string, isOverdue: boolean = false) => {
        try {
            // Use RPC to handle finance record creation
            const { error } = await supabase.rpc('complete_appointment', { p_appointment_id: appointmentId });

            if (error) throw error;

            if (isOverdue) {
                fetchOverdueAppointments();
            } else {
                fetchData();
            }
        } catch (error: any) {
            console.error('Error completing appointment:', error);

            // Fallback for missing updated_at column or other RPC errors
            if (error.message?.includes('updated_at') || error.message?.includes('does not exist')) {
                try {
                    console.log('Attempting client-side fallback for completion...');

                    // 1. Get appointment details
                    const { data: appointment, error: fetchError } = await supabase
                        .from('appointments')
                        .select('*')
                        .eq('id', appointmentId)
                        .single();

                    if (fetchError) throw fetchError;

                    // 2. Update appointment status (without updated_at)
                    const { error: updateError } = await supabase
                        .from('appointments')
                        .update({ status: 'Completed' })
                        .eq('id', appointmentId);

                    if (updateError) throw updateError;

                    // 3. Get professional details
                    let commissionRate = 0;
                    let professionalName = 'Profissional';

                    if (appointment.professional_id) {
                        const { data: professional } = await supabase
                            .from('team_members')
                            .select('name, commission_rate')
                            .eq('id', appointment.professional_id)
                            .single();

                        if (professional) {
                            professionalName = professional.name;
                            commissionRate = professional.commission_rate || 0;
                        }
                    }

                    // 4. Calculate commission
                    const commissionValue = (appointment.price * commissionRate) / 100;

                    // 5. Create finance record
                    const { error: financeError } = await supabase
                        .from('finance_records')
                        .insert({
                            user_id: appointment.user_id,
                            barber_name: professionalName,
                            professional_id: appointment.professional_id,
                            appointment_id: appointmentId,
                            revenue: appointment.price,
                            commission_rate: commissionRate,
                            commission_value: commissionValue,
                            created_at: new Date().toISOString()
                        });

                    if (financeError) throw financeError;

                    // Success! Refresh data
                    if (isOverdue) {
                        fetchOverdueAppointments();
                    } else {
                        fetchData();
                    }
                    return; // Exit successfully

                } catch (fallbackError: any) {
                    console.error('Fallback failed:', fallbackError);
                    alert(`Erro ao concluir agendamento (Fallback falhou): ${fallbackError.message || fallbackError}`);
                }
            } else {
                alert(`Erro ao concluir agendamento: ${error.message || error}`);
            }
        }
    };

    const handleCancelAppointment = async (appointmentId: string, isOverdue: boolean = false) => {
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
            console.error('Error cancelling appointment:', error);
            alert('Erro ao cancelar agendamento.');
        }
    };

    const resetForm = () => {
        setSelectedClient('');
        setSelectedService('');
        setSelectedProfessional('');
        setSelectedTime('');
        setCustomTime('');
        setSelectedAppointmentDate(selectedDate.toISOString().split('T')[0]);
        setDiscountPercentage('0'); // Reset discount
    };

    const handleCreateAppointment = async () => {
        if (!user || !selectedClient || !selectedService || !selectedProfessional || !selectedTime || !selectedAppointmentDate) {
            alert('Preencha todos os campos!');
            return;
        }

        try {
            const service = services.find(s => s.id === selectedService);
            if (!service) {
                alert('Serviço inválido.');
                return;
            }

            const basePrice = service.price;
            const discountRate = parseFloat(discountPercentage) / 100;
            const finalPrice = basePrice * (1 - (isNaN(discountRate) ? 0 : discountRate));

            const dateTime = new Date(selectedAppointmentDate);
            const timeToUse = selectedTime === 'custom' ? customTime : selectedTime;
            const [hours, minutes] = timeToUse.split(':');
            dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const { error } = await supabase
                .from('appointments')
                .insert({
                    user_id: user.id,
                    client_id: selectedClient,
                    professional_id: selectedProfessional,
                    service: service.name,
                    appointment_time: dateTime.toISOString(),
                    price: finalPrice, // Use final price after discount
                    status: 'Confirmed'
                });

            if (error) throw error;

            alert('Agendamento criado com sucesso!');
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
            console.error('Error creating appointment:', error);
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
        subtext: `${currencySymbol} ${s.price.toFixed(2)} | ${s.duration_minutes} min` // Assuming duration_minutes is available
    }));

    // Calculate price preview for the modal
    const selectedServiceDetails = services.find(s => s.id === selectedService);
    const basePriceNew = selectedServiceDetails?.price || 0;
    const discountRateNew = parseFloat(discountPercentage) / 100;
    const finalPriceNew = basePriceNew * (1 - (isNaN(discountRateNew) ? 0 : discountRateNew));

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
                discountAmount: discountAmount,
                discountPercentage: discountPercentage,
                isCustomPriceHigher: false
            };
        } else if (isCustomPriceHigher) {
            // If price is higher, treat it as a custom price without discount
            return {
                hasDiscount: false,
                discountAmount: 0,
                discountPercentage: 0,
                isCustomPriceHigher: true
            };
        }

        return { hasDiscount: false, discountAmount: 0, discountPercentage: 0, isCustomPriceHigher: false };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-white text-xl">Carregando agenda...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-heading text-white uppercase">Agenda</h1>
                    <p className="text-neutral-400 mt-1">Gerencie os agendamentos por profissional</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <BrutalButton
                        variant="secondary"
                        icon={<History />}
                        onClick={() => {
                            setShowHistoryModal(true);
                            // No need to call fetchHistoryAppointments here, useEffect will handle it
                        }}
                        className="flex-1 md:flex-none"
                    >
                        Histórico
                    </BrutalButton>
                    <BrutalButton
                        variant="primary"
                        icon={<Plus />}
                        onClick={() => setShowNewAppointmentModal(true)}
                        className="flex-1 md:flex-none"
                    >
                        Novo Agendamento
                    </BrutalButton>
                </div>
            </div>

            {/* --- NOVO: Agendamentos Atrasados (Overdue) --- */}
            {isOverdueFilter && (
                <BrutalCard className="border-l-4 border-red-600 bg-red-900/20">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="text-white font-heading text-lg uppercase mb-2">
                                🚨 Agendamentos Atrasados ({overdueAppointments.length})
                            </h3>
                            <p className="text-neutral-300 text-sm mb-4">
                                Estes agendamentos estão no passado e precisam ser marcados como Concluídos (para faturamento) ou Cancelados.
                            </p>

                            {isOverdueLoading ? (
                                <div className="flex items-center gap-2 text-neutral-400">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                                </div>
                            ) : overdueAppointments.length === 0 ? (
                                <p className="text-green-400 text-sm">Nenhum agendamento atrasado encontrado. ✅</p>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {overdueAppointments.map(apt => {
                                        const professional = teamMembers.find(m => m.id === apt.professional_id);
                                        return (
                                            <div key={apt.id} className="bg-neutral-900 p-3 rounded-lg border border-red-800 flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-bold text-sm">{apt.clientName}</p>
                                                    <p className="text-neutral-400 text-xs">{apt.service}</p>
                                                    <p className="text-neutral-500 text-xs">
                                                        {new Date(apt.appointment_time).toLocaleDateString('pt-BR')} às {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        {professional && ` | Profissional: ${professional.name}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleCompleteAppointment(apt.id, true)}
                                                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                                        title="Concluir e Faturar"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelAppointment(apt.id, true)}
                                                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                                        title="Cancelar"
                                                    >
                                                        <X className="w-4 h-4" />
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
            )}
            {/* --- FIM: Agendamentos Atrasados --- */}


            {/* Date Navigator */}
            <BrutalCard>
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <div className="text-center">
                        <h2 className={`text-2xl font-heading ${accentText} uppercase`}>
                            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                        </h2>
                        <p className="text-white text-lg font-mono">
                            {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={() => changeDate(1)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </div>
            </BrutalCard>

            {/* Professional Filter */}
            {teamMembers.length > 0 && (
                <BrutalCard>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedProfessionalFilter(null)}
                            className={`px-4 py-2 rounded-lg font-bold transition-all border-2 ${selectedProfessionalFilter === null
                                ? `${accentBg} text-black border-black`
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-600'
                                }`}
                        >
                            Todos os Profissionais
                        </button>
                        {teamMembers.map(member => (
                            <button
                                key={member.id}
                                onClick={() => setSelectedProfessionalFilter(member.id)}
                                className={`px-4 py-2 rounded-lg font-bold transition-all border-2 flex items-center gap-2 ${selectedProfessionalFilter === member.id
                                    ? `${accentBg} text-black border-black`
                                    : 'bg-neutral-800 text-white border-neutral-700 hover:border-neutral-600'
                                    }`}
                            >
                                {member.photo_url && (
                                    <img
                                        src={member.photo_url}
                                        alt={member.name}
                                        className="w-6 h-6 rounded-full border border-black object-cover"
                                    />
                                )}
                                {member.name}
                            </button>
                        ))}
                    </div>
                </BrutalCard>
            )}

            {/* Pending Public Bookings Alert */}
            {publicBookings.length > 0 && (
                <BrutalCard className="border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-bold text-lg mb-1">
                                📌 {publicBookings.length} Solicitação(ões) Pendente(s)
                            </h3>
                            <p className="text-neutral-400 text-sm">
                                Você tem solicitações de agendamento online aguardando aprovação
                            </p>
                        </div>
                    </div>
                </BrutalCard>
            )}

            {/* Team Columns */}
            {teamMembers.length === 0 ? (
                <BrutalCard>
                    <div className="text-center py-12">
                        <User className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                        <h3 className="text-white font-bold text-xl mb-2">Nenhum profissional cadastrado</h3>
                        <p className="text-neutral-400 mb-6">
                            Adicione profissionais à sua equipe para começar a organizar agendamentos
                        </p>
                        <BrutalButton variant="secondary" onClick={() => navigate('/configuracoes/equipe')}>
                            Adicionar Profissionais
                        </BrutalButton>
                    </div>
                </BrutalCard>
            ) : (
                <div className={`grid gap-4 ${selectedProfessionalFilter
                    ? 'grid-cols-1 max-w-2xl mx-auto'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    }`}>
                    {displayedMembers.map(member => {
                        const memberAppointments = getAppointmentsForProfessional(member.id);
                        const memberPendingBookings = getPendingBookingsForProfessional(member.id);

                        return (
                            <div key={member.id} className="flex flex-col">
                                {/* Professional Header */}
                                <div className={`${accentBg} text-black p-4 rounded-t-lg border-2 border-black`}>
                                    <div className="flex items-center gap-3">
                                        {member.photo_url ? (
                                            <img
                                                src={member.photo_url}
                                                alt={member.name}
                                                className="w-12 h-12 rounded-full border-2 border-black object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-black/20 border-2 border-black flex items-center justify-center">
                                                <User className="w-6 h-6" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-heading font-bold text-lg truncate uppercase">
                                                {member.name}
                                            </h3>
                                            <p className="text-sm font-mono opacity-80">
                                                {memberAppointments.length} agendamento(s)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Appointments Column - Limited Height with Scroll */}
                                <div className="bg-neutral-900 border-2 border-t-0 border-black rounded-b-lg p-3 h-[400px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
                                    {/* Pending Public Bookings */}
                                    {memberPendingBookings.map(booking => (
                                        <div
                                            key={booking.id}
                                            className="bg-yellow-500/10 border-2 border-yellow-500 rounded-lg p-3"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-xs font-mono text-yellow-500 font-bold">
                                                    📌 SOLICITAÇÃO ONLINE
                                                </span>
                                            </div>
                                            <p className="text-white font-bold text-sm mb-1">{booking.customer_name}</p>
                                            <p className="text-neutral-400 text-xs mb-1">
                                                {/* Note: booking.services is an array of IDs here, not objects. We need to map them if possible, but for now, we'll show the service IDs array length */}
                                                {booking.service_ids?.length} serviço(s)
                                            </p>
                                            <p className="text-neutral-500 text-xs mb-3">
                                                {new Date(booking.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAcceptBooking(booking)}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Aceitar
                                                </button>
                                                <button
                                                    onClick={() => handleRejectBooking(booking.id)}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Recusar
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Confirmed Appointments */}

                                    {memberAppointments.map(apt => {
                                        const { hasDiscount, discountPercentage, isCustomPriceHigher } = getDiscountInfo(apt);

                                        return (
                                            <div
                                                key={apt.id}
                                                className={`border-2 rounded-lg p-3 ${apt.status === 'Completed'
                                                    ? 'bg-green-500/10 border-green-500'
                                                    : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                                                    } transition-colors`}
                                            >
                                                <div className="flex items-start justify-between mb-2">

                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-mono font-bold ${apt.status === 'Completed' ? 'text-green-500' : accentText}`}>
                                                            {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-xs font-mono text-neutral-500">
                                                            {new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {apt.status === 'Confirmed' && (
                                                            <>
                                                                <button
                                                                    onClick={() => setEditingAppointment(apt)}
                                                                    className="text-neutral-400 hover:text-white transition-colors"
                                                                    title="Editar agendamento"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCompleteAppointment(apt.id)}
                                                                    className="text-green-500 hover:text-green-400 transition-colors"
                                                                    title="Marcar como concluído"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelAppointment(apt.id)}
                                                                    className="text-red-500 hover:text-red-400 transition-colors"
                                                                    title="Cancelar agendamento"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-white font-bold text-sm mb-1">{apt.clientName}</p>
                                                <p className="text-neutral-400 text-xs mb-1">{apt.service}</p>

                                                {/* Price Display */}
                                                <div className="flex items-center gap-2">
                                                    {hasDiscount && apt.basePrice && (
                                                        <span className="text-xs font-mono text-red-500 line-through">
                                                            {currencySymbol} {apt.basePrice.toFixed(2)}
                                                        </span>
                                                    )}
                                                    <span className={`text-xs font-mono font-bold ${accentText}`}>
                                                        {currencySymbol} {apt.price.toFixed(2)}
                                                    </span>

                                                    {/* Discount Badge */}
                                                    {hasDiscount && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1">
                                                            <Tag className="w-3 h-3" /> {discountPercentage}% OFF
                                                        </span>
                                                    )}

                                                    {/* Custom Price Badge (Higher) */}
                                                    {isCustomPriceHigher && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                                            <Tag className="w-3 h-3" /> Preço Customizado
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {memberAppointments.length === 0 && memberPendingBookings.length === 0 && (
                                        <div className="text-center py-8 text-neutral-600">
                                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Nenhum agendamento</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl w-full max-w-4xl p-6 my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-heading text-2xl uppercase">Histórico de Agendamentos</h3>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Month Navigator */}
                        <div className="flex items-center justify-between mb-6 bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                            <button
                                onClick={() => {
                                    changeHistoryMonth(-1);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                            <div className="text-center">
                                <p className={`text-xl font-heading ${accentText} uppercase`}>
                                    {historyMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    changeHistoryMonth(1);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* History List */}
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {historyAppointments.length === 0 ? (
                                <div className="text-center py-12 text-neutral-500">
                                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Nenhum agendamento concluído ou cancelado neste mês</p>
                                </div>
                            ) : (
                                historyAppointments.map(apt => {
                                    const professional = teamMembers.find(m => m.id === apt.professional_id);
                                    const { hasDiscount, discountPercentage, isCustomPriceHigher } = getDiscountInfo(apt);

                                    return (
                                        <div
                                            key={apt.id}
                                            className={`border-2 rounded-lg p-4 ${apt.status === 'Completed'
                                                ? 'bg-green-500/10 border-green-500'
                                                : 'bg-red-500/10 border-red-500'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${apt.status === 'Completed'
                                                            ? 'bg-green-500 text-black'
                                                            : 'bg-red-500 text-white'
                                                            }`}>
                                                            {apt.status === 'Completed' ? '✓ CONCLUÍDO' : '✗ CANCELADO'}
                                                        </span>
                                                        <span className="text-neutral-400 text-xs">
                                                            {new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-white font-bold text-base mb-1">{apt.clientName}</p>
                                                    <p className="text-neutral-400 text-sm mb-1">{apt.service}</p>
                                                    {professional && (
                                                        <p className="text-neutral-500 text-xs">
                                                            Profissional: {professional.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-2">
                                                    {hasDiscount && apt.basePrice && (
                                                        <span className="text-xs font-mono text-red-500 line-through">
                                                            {currencySymbol} {apt.basePrice.toFixed(2)}
                                                        </span>
                                                    )}
                                                    <p className={`text-lg font-mono font-bold ${accentText}`}>
                                                        {currencySymbol} {apt.price.toFixed(2)}
                                                    </p>
                                                    {hasDiscount && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1">
                                                            {discountPercentage}% OFF
                                                        </span>
                                                    )}
                                                    {isCustomPriceHigher && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                                            Preço Customizado
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteHistoryAppointment(apt.id)}
                                                        className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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

                        <div className="mt-6 pt-4 border-t border-neutral-800">
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

            {/* New Appointment Modal */}
            {showNewAppointmentModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-heading text-xl uppercase">Novo Agendamento</h3>
                            <button
                                onClick={() => {
                                    setShowNewAppointmentModal(false);
                                    resetForm();
                                }}
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-white font-mono text-sm mb-2 block">Data</label>
                                <input
                                    type="date"
                                    value={selectedAppointmentDate}
                                    onChange={(e) => setSelectedAppointmentDate(e.target.value)}
                                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                                />
                            </div>

                            {/* Searchable Client Select */}
                            <SearchableSelect
                                label="Cliente"
                                placeholder="Buscar cliente por nome ou telefone"
                                options={clientOptions}
                                value={selectedClient}
                                onChange={setSelectedClient}
                                accentColor={accentColor}
                            />

                            <div>
                                <label className="text-white font-mono text-sm mb-2 block">Profissional</label>
                                <select
                                    value={selectedProfessional}
                                    onChange={(e) => setSelectedProfessional(e.target.value)}
                                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                                >
                                    <option value="">Selecione um profissional</option>
                                    {teamMembers.map(member => (
                                        <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Searchable Service Select */}
                            <SearchableSelect
                                label="Serviço"
                                placeholder="Buscar serviço por nome"
                                options={serviceOptions}
                                value={selectedService}
                                onChange={setSelectedService}
                                accentColor={accentColor}
                            />

                            <div>
                                <label className="text-white font-mono text-sm mb-2 block">Horário</label>
                                <select
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                                >
                                    <option value="">Selecione um horário</option>
                                    {timeSlots.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Discount Field */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white font-mono text-sm mb-2 block">Desconto (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={discountPercentage}
                                            onChange={(e) => setDiscountPercentage(e.target.value)}
                                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold text-lg pr-8"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-white font-mono text-sm mb-2 block">Preço Final</label>
                                    <div className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-lg font-bold ${accentText}`}>
                                        {currencySymbol} {finalPriceNew.toFixed(2)}
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Preço base: {currencySymbol} {basePriceNew.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <BrutalButton
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowNewAppointmentModal(false);
                                        resetForm();
                                    }}
                                >
                                    Cancelar
                                </BrutalButton>
                                <BrutalButton
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleCreateAppointment}
                                >
                                    Criar Agendamento
                                </BrutalButton>
                            </div>
                        </div>
                    </div>
                </div>
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
                    accentColor={accentColor}
                    currencySymbol={currencySymbol}
                />
            )}
        </div>
    );
};