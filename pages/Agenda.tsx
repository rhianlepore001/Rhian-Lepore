import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Calendar, Clock, Plus, User, Users, Check, X, ChevronLeft, ChevronRight, History, AlertTriangle, Loader2, Trash2, Edit2, Tag, Scissors, MessageCircle, Info, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppointmentEditModal } from '../components/AppointmentEditModal';
import { SearchableSelect } from '../components/SearchableSelect'; // Importando o novo componente
import { formatCurrency, formatPhone } from '../utils/formatters';
import { formatDateForInput } from '../utils/date';
import { useAppTour } from '../hooks/useAppTour';

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
    useAppTour(); // Instancia para detectar continuação do tour
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
    const [businessName, setBusinessName] = useState(''); // NEW STATE FOR BUSINESS NAME

    // State for editing
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

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


    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const currencySymbol = region === 'PT' ? '€' : 'R$';
    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

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
            fetchBusinessProfile()
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
            .select('name, price')
            .eq('user_id', user.id);

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        // 2. Fetch appointments for the selected day (Confirmed status)
        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name, id, phone)')
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
    };

    const fetchOverdueAppointments = async () => {
        if (!user) return;
        setIsOverdueLoading(true);
        const now = new Date().toISOString();

        // 1. Fetch all services to map names to prices later
        const { data: allServices } = await supabase
            .from('services')
            .select('name, price')
            .eq('user_id', user.id);

        const servicePriceMap = new Map(allServices?.map(s => [s.name, s.price]));

        const { data } = await supabase
            .from('appointments')
            .select('*, clients(name, phone)')
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

    const fetchBusinessProfile = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', user.id)
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
            .eq('user_id', user.id);

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
            console.error('Error deleting history appointment:', error);
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
                    // In PublicBooking.tsx, we upload to `client_photos` but do we save it to `public_bookings`?
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

            const { error: aptError } = await supabase
                .from('appointments')
                .insert({
                    user_id: user.id,
                    client_id: clientId,
                    professional_id: finalProfessionalId,
                    service: serviceNames,
                    appointment_time: booking.appointment_time,
                    price: booking.total_price,
                    status: 'Confirmed',
                    duration_minutes: booking.duration_minutes || 30
                });

            if (aptError) throw aptError;

            await supabase
                .from('public_bookings')
                .update({ status: 'confirmed' })
                .eq('id', booking.id)
                .eq('business_id', user.id);

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

                const message = `Agendamento confirmado! ✨
📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
💇‍♀️ Serviço: ${serviceNames}
💰 Valor: ${currencySymbol} ${formattedPrice}

Obrigada pela confiança! Te espero no ${establishment}.`;

                const waMessage = encodeURIComponent(message);
                window.open(`https://wa.me/${waPhone}?text=${waMessage}`, '_blank');
            }

            fetchData();
        } catch (error) {
            console.error('Error accepting booking:', error);
            alert('Erro ao aceitar agendamento.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        try {
            await supabase
                .from('public_bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId)
                .eq('business_id', user.id);
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

    const handleAssignToProfessional = async (appointmentId: string, professionalId: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ professional_id: professionalId })
                .eq('id', appointmentId);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error assigning professional:', error);
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
                <div className="space-y-4">
                    <BrutalCard className="border-l-4 border-yellow-500 bg-yellow-500/5">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">
                                    📌 {publicBookings.length} Solicitação(ões) Pendente(s)
                                </h3>
                                <p className="text-neutral-400 text-sm">
                                    Os agendamentos abaixo foram feitos online e aguardam sua aprovação:
                                </p>
                            </div>
                        </div>
                    </BrutalCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {publicBookings.map(booking => {
                            const professional = teamMembers.find(m => m.id === booking.professional_id);
                            const bookingDate = new Date(booking.appointment_time);
                            const isToday = bookingDate.toDateString() === new Date().toDateString();

                            return (
                                <div key={booking.id} className={`
                                    relative p-5 transition-all duration-300 group
                                    ${isBeauty
                                        ? 'bg-beauty-card/40 backdrop-blur-md border border-beauty-neon/30 rounded-2xl hover:border-beauty-neon shadow-neon-sm hover:shadow-neon'
                                        : 'bg-neutral-900 border-2 border-yellow-500/50 rounded-xl hover:border-yellow-500 shadow-heavy-sm'
                                    }
                                `}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <span className={`
                                                text-[10px] font-mono font-bold px-2 py-1 rounded border transition-colors
                                                ${isToday
                                                    ? (isBeauty ? 'bg-beauty-neon text-black border-beauty-neon' : 'bg-yellow-500 text-black border-yellow-600')
                                                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 group-hover:text-white'
                                                }
                                            `}>
                                                {isToday ? 'HOJE' : bookingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAcceptBooking(booking)}
                                                className={`p-2 rounded-lg transition-all shadow-lg hover:scale-110 active:scale-95 ${isBeauty ? 'bg-beauty-neon text-black hover:bg-white' : 'bg-green-600 text-white hover:bg-green-500'}`}
                                                title="Aceitar"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRejectBooking(booking.id)}
                                                className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-lg hover:scale-110 active:scale-95"
                                                title="Recusar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-xl leading-tight group-hover:text-beauty-neon transition-colors">{booking.customer_name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            <p className="text-neutral-400 text-sm font-mono tracking-wider">
                                                {formatPhone(booking.customer_phone, currencyRegion)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                        <div className="flex items-center gap-3 text-xs text-neutral-300">
                                            <div className={`p-1.5 rounded-lg ${isBeauty ? 'bg-beauty-neon/10' : 'bg-yellow-500/10'}`}>
                                                <Scissors className={`w-3.5 h-3.5 ${isBeauty ? 'text-beauty-neon' : 'text-yellow-500'}`} />
                                            </div>
                                            <span className="font-medium">
                                                {booking.service_ids?.length || 0} serviço(s) • <span className="text-white font-bold">{formatCurrency(booking.total_price, currencyRegion)}</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-neutral-300">
                                            <div className={`p-1.5 rounded-lg ${isBeauty ? 'bg-beauty-neon/10' : 'bg-yellow-500/10'}`}>
                                                <User className={`w-3.5 h-3.5 ${isBeauty ? 'text-beauty-neon' : 'text-yellow-500'}`} />
                                            </div>
                                            <span>
                                                Profissional: <span className="font-bold text-white uppercase tracking-tighter">{professional?.name || 'Qualquer um'}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="border-b-2 border-neutral-800 my-8"></div>
                </div>
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
                    : `grid-cols-1 md:grid-cols-${Math.min((teamMembers.length + (appointments.some(a => !a.professional_id) ? 1 : 0)), 4)}`
                    } overflow-x-auto pb-4`}>

                    {/* Unassigned Column (if any unassigned appointments exist) */}
                    {appointments.some(apt => !apt.professional_id) && !selectedProfessionalFilter && (
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-full opacity-70 hover:opacity-100 transition-opacity min-w-[300px]">
                            <div className="p-4 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center border border-neutral-600">
                                        <Users className="w-5 h-5 text-neutral-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">A Distribuir</h3>
                                        <p className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full inline-block mt-1">
                                            Sem profissional
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[800px]">
                                {appointments.filter(apt => !apt.professional_id).map(apt => {
                                    const { hasDiscount } = getDiscountInfo(apt);
                                    return (
                                        <div
                                            key={apt.id}
                                            className="border-2 border-neutral-700 rounded-lg p-3 bg-neutral-800 hover:border-neutral-500 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-white">
                                                        {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-xs font-mono text-neutral-500">
                                                        {new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingAppointment(apt)}
                                                        className="text-neutral-400 hover:text-white transition-colors"
                                                        title="Editar / Atribuir"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-white font-bold text-sm mb-1">{apt.clientName}</p>
                                            <p className="text-neutral-400 text-xs mb-1">{apt.service}</p>
                                            <span className={`text-xs font-mono font-bold ${accentText}`}>
                                                {formatCurrency(apt.price, currencyRegion)}
                                            </span>
                                            <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Necessário atribuir profissional
                                            </div>
                                            {teamMembers.length === 1 && (
                                                <button
                                                    onClick={() => handleAssignToProfessional(apt.id, teamMembers[0].id)}
                                                    className={`mt-2 w-full font-bold text-[10px] py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${isBeauty ? 'bg-beauty-neon text-black hover:bg-white' : 'bg-green-600 text-white hover:bg-green-500'}`}
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
                            <div key={member.id} className="flex flex-col">
                                {/* Professional Header */}
                                <div
                                    onClick={() => {
                                        setSelectedProfessional(member.id);
                                        setShowNewAppointmentModal(true);
                                    }}
                                    className={`${isBeauty
                                        ? 'bg-gradient-to-r from-beauty-neon/20 to-beauty-neon/5 hover:from-beauty-neon/30'
                                        : 'bg-accent-gold hover:opacity-90'} text-white p-4 rounded-t-lg border-2 border-b-0 border-white/20 min-h-[90px] flex items-center cursor-pointer transition-all group relative`}
                                    title="Clique para agendar com este profissional">
                                    <div className="flex items-center gap-3 w-full">
                                        {member.photo_url ? (
                                            <img
                                                src={member.photo_url}
                                                alt={member.name}
                                                className="w-12 h-12 rounded-full border-2 border-white/30 object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                                                <User className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-heading font-bold text-lg truncate uppercase ${isBeauty ? 'text-white' : 'text-black'}`} title={member.name}>
                                                {member.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBeauty ? 'bg-beauty-neon/20 text-beauty-neon' : 'bg-black/10 text-black/70'}`}>
                                                    {memberAppointments.length} agendamentos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 p-1 rounded-full">
                                        <Plus className={`w-4 h-4 ${isBeauty ? 'text-white' : 'text-black'}`} />
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
                                                    disabled={isProcessing}
                                                    className={`flex-1 ${isProcessing ? 'bg-neutral-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1`}
                                                >
                                                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                    {isProcessing ? '...' : 'Aceitar'}
                                                </button>
                                                <button
                                                    onClick={() => handleRejectBooking(booking.id)}
                                                    disabled={isProcessing}
                                                    className={`flex-1 ${isProcessing ? 'bg-neutral-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1`}
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
                                        const isCompleted = apt.status === 'Completed';

                                        return (
                                            <div
                                                key={apt.id}
                                                className={`border rounded-xl p-4 transition-all hover:scale-[1.01] ${isCompleted
                                                    ? 'bg-neutral-900/50 border-neutral-800 opacity-70 hover:opacity-100'
                                                    : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600 shadow-lg'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-mono font-bold ${isCompleted ? 'text-green-500 line-through decoration-2' : accentText}`}>
                                                            {new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {/* Action Buttons Row */}
                                                    <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                                                        {apt.status === 'Confirmed' && (
                                                            <>
                                                                {/* Notes and WhatsApp buttons remain similar but smaller */}
                                                                <button onClick={() => setShowingDetailsAppointment(apt)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Ver detalhes e observações">
                                                                    <Info className={`w-3.5 h-3.5 ${apt.notes ? 'text-blue-400' : 'text-neutral-500'}`} />
                                                                </button>
                                                                {apt.clientPhone && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const waPhone = apt.clientPhone!.replace(/\D/g, '');
                                                                            window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent('Seu agendamento foi confirmado')}`, '_blank');
                                                                        }}
                                                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                                                        title="WhatsApp"
                                                                    >
                                                                        <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                                                                    </button>
                                                                )}

                                                                <div className="w-px h-3 bg-white/10 mx-1"></div>

                                                                <button onClick={() => setEditingAppointment(apt)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Editar">
                                                                    <Edit2 className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
                                                                </button>
                                                                <button onClick={() => handleCompleteAppointment(apt.id)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Concluir">
                                                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                                                </button>
                                                                <button onClick={() => handleCancelAppointment(apt.id)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Cancelar">
                                                                    <X className="w-3.5 h-3.5 text-red-500" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1 mb-3">
                                                    <p className={`font-bold text-base truncate ${isCompleted ? 'text-neutral-500' : 'text-white'}`}>
                                                        {apt.clientName}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Scissors className="w-3 h-3 text-neutral-500" />
                                                        <p className="text-neutral-400 text-xs truncate max-w-[180px]" title={apt.service}>
                                                            {apt.service}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        {hasDiscount && apt.basePrice && (
                                                            <span className="text-[10px] text-neutral-500 line-through">
                                                                {formatCurrency(apt.basePrice, currencyRegion)}
                                                            </span>
                                                        )}
                                                        <span className={`text-sm font-bold ${isCompleted ? 'text-neutral-500' : 'text-white'}`}>
                                                            {formatCurrency(apt.price, currencyRegion)}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col gap-1 items-end">
                                                        {hasDiscount && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                                                -{discountPercentage}%
                                                            </span>
                                                        )}
                                                        {isCustomPriceHigher && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                Custom
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {memberAppointments.length === 0 && memberPendingBookings.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                                <Calendar className="w-8 h-8 text-neutral-600" />
                                            </div>
                                            <p className="text-sm font-bold text-neutral-400">Livre</p>
                                            <p className="text-xs text-neutral-600 mt-1">Nenhum agendamento</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Appointment Details Modal */}
            {showingDetailsAppointment && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isBeauty ? 'bg-beauty-dark/80 backdrop-blur-sm' : 'bg-black/80'}`}>
                    <div className={`w-full max-w-md p-0 overflow-hidden relative transition-all animate-in fade-in zoom-in duration-300
                        ${isBeauty
                            ? 'bg-beauty-card border border-beauty-neon/30 rounded-2xl shadow-[0_0_30px_rgba(167,139,250,0.2)]'
                            : 'bg-neutral-900 border-2 border-white rounded-xl shadow-[8px_8px_0px_0px_#ffffff]'}
                    `}>
                        {/* Header */}
                        <div className={`p-6 ${isBeauty ? 'bg-gradient-to-r from-beauty-neon/20 to-transparent' : 'bg-white text-black'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className={`font-heading text-xl uppercase mb-1 ${isBeauty ? 'text-white' : 'text-black'}`}>
                                        Detalhes do Agendamento
                                    </h3>
                                    <span className={`text-xs font-mono font-bold px-2 py-1 rounded inline-block ${showingDetailsAppointment.status === 'Completed' ? 'bg-green-500 text-black' :
                                        (isBeauty ? 'bg-beauty-neon text-black' : 'bg-black text-white')
                                        }`}>
                                        {showingDetailsAppointment.status === 'Completed' ? '✓ CONCLUÍDO' : '● CONFIRMADO'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowingDetailsAppointment(null)}
                                    className={`p-1 rounded-full hover:bg-black/10 transition-colors ${isBeauty ? 'text-white hover:bg-white/10' : 'text-black'}`}
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Client Info */}
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                                    ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon border border-beauty-neon/30' : 'bg-neutral-800 text-white border border-neutral-700'}`}>
                                    {showingDetailsAppointment.clientName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-400 font-mono mb-0.5">Cliente</p>
                                    <h4 className="text-lg font-bold text-white">{showingDetailsAppointment.clientName}</h4>
                                    {showingDetailsAppointment.clientPhone && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-neutral-400 font-mono bg-neutral-800 px-2 py-0.5 rounded">
                                                {formatPhone(showingDetailsAppointment.clientPhone, currencyRegion)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/10"></div>

                            {/* Service & Professional */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-neutral-400">
                                        <Scissors className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider font-bold">Serviço</span>
                                    </div>
                                    <p className="text-white font-medium text-sm">{showingDetailsAppointment.service}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-neutral-400">
                                        <User className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider font-bold">Profissional</span>
                                    </div>
                                    <p className="text-white font-medium text-sm">
                                        {teamMembers.find(m => m.id === showingDetailsAppointment.professional_id)?.name || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Time & Price */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-neutral-400">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider font-bold">Data e Hora</span>
                                    </div>
                                    <p className="text-white font-medium text-sm">
                                        {new Date(showingDetailsAppointment.appointment_time).toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className={`font-mono font-bold ${accentText}`}>
                                        {new Date(showingDetailsAppointment.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-neutral-400">
                                        <DollarSign className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider font-bold">Valor</span>
                                    </div>
                                    <div className="flex flex-col">
                                        {(() => {
                                            const { hasDiscount, basePrice } = getDiscountInfo(showingDetailsAppointment);
                                            return (
                                                <>
                                                    {hasDiscount && basePrice && (
                                                        <span className="text-xs text-red-500 line-through font-mono">
                                                            {formatCurrency(basePrice, currencyRegion)}
                                                        </span>
                                                    )}
                                                    <span className="text-xl font-bold text-white font-mono">
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
                                <div className={`p-4 rounded-xl border ${isBeauty
                                    ? 'bg-beauty-neon/5 border-beauty-neon/20'
                                    : 'bg-yellow-500/5 border-yellow-500/20'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Info className={`w-4 h-4 ${isBeauty ? 'text-beauty-neon' : 'text-yellow-500'}`} />
                                        <span className={`text-xs font-bold uppercase tracking-wider ${isBeauty ? 'text-beauty-neon' : 'text-yellow-500'}`}>
                                            Observações
                                        </span>
                                    </div>
                                    <p className="text-neutral-300 text-sm leading-relaxed italic">
                                        "{showingDetailsAppointment.notes}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/10 bg-black/20 flex gap-3">
                            {showingDetailsAppointment.status === 'Confirmed' && (
                                <button
                                    onClick={() => {
                                        setEditingAppointment(showingDetailsAppointment);
                                        setShowingDetailsAppointment(null);
                                    }}
                                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-lg font-bold transition-colors border border-white/10 flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" /> Editar
                                </button>
                            )}
                            <button
                                onClick={() => setShowingDetailsAppointment(null)}
                                className={`flex-1 py-3 rounded-lg font-bold transition-colors ${isBeauty
                                    ? 'bg-beauty-neon text-black hover:bg-beauty-neon/90'
                                    : 'bg-white text-black hover:bg-neutral-200'
                                    }`}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${isBeauty ? 'bg-beauty-dark/80 backdrop-blur-sm' : 'bg-black/80'}`}>
                    <div className={`w-full max-w-4xl p-6 my-8 transition-all
                        ${isBeauty
                            ? 'bg-gradient-to-br from-beauty-card to-beauty-dark border border-beauty-neon/30 rounded-2xl shadow-[0_0_20px_rgba(167,139,250,0.15)]'
                            : 'bg-neutral-900 border-2 border-neutral-800 rounded-xl shadow-[8px_8px_0px_0px_#000000]'}
                    `}>
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
                                                    <button
                                                        onClick={() => setShowingDetailsAppointment(apt)}
                                                        className="text-neutral-500 hover:text-white transition-colors mt-1 flex items-center gap-1 text-xs"
                                                        title="Ver detalhes"
                                                    >
                                                        <Info className="w-3 h-3" />
                                                        Detalhes
                                                    </button>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-2">
                                                    {hasDiscount && apt.basePrice && (
                                                        <span className="text-xs font-mono text-red-500 line-through">
                                                            {formatCurrency(apt.basePrice, currencyRegion)}
                                                        </span>
                                                    )}
                                                    <p className={`text-lg font-mono font-bold ${accentText}`}>
                                                        {formatCurrency(apt.price, currencyRegion)}
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
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isBeauty ? 'bg-beauty-dark/95' : 'bg-black/90'}`}>
                    <div className={`w-full max-w-md p-6 overflow-y-auto max-h-[90vh] transition-all
                        ${isBeauty
                            ? 'bg-gradient-to-br from-beauty-card to-beauty-dark border border-beauty-neon/30 rounded-2xl shadow-[0_0_20px_rgba(167,139,250,0.15)]'
                            : 'bg-neutral-900 border-2 border-neutral-800 rounded-xl shadow-[8px_8px_0px_0px_#000000]'}
                    `}>
                        <div className={`flex items-center justify-between mb-6 ${isBeauty ? 'border-b border-beauty-neon/20 pb-4' : ''}`}>
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
                                <label className={`font-mono text-sm mb-2 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white'}`}>Data</label>
                                <input
                                    type="date"
                                    value={selectedAppointmentDate}
                                    onChange={(e) => setSelectedAppointmentDate(e.target.value)}
                                    className={`w-full p-3 rounded-lg text-white transition-all outline-none
                                        ${isBeauty
                                            ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                                            : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}
                                    `}
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
                                <label className={`font-mono text-sm mb-2 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white'}`}>Profissional</label>
                                <select
                                    value={selectedProfessional}
                                    onChange={(e) => setSelectedProfessional(e.target.value)}
                                    className={`w-full p-3 rounded-lg text-white transition-all outline-none
                                        ${isBeauty
                                            ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                                            : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}
                                    `}
                                >
                                    <option value="">Selecione um profissional</option>
                                    {teamMembers.map(member => (
                                        <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Searchable Service Select */}
                            <SearchableSelect
                                label="Serviços"
                                placeholder="Selecione um ou mais serviços"
                                options={serviceOptions}
                                value={selectedServices}
                                onChange={setSelectedServices}
                                accentColor={accentColor}
                                multiple={true}
                            />

                            {/* Notes / Observation */}
                            <div>
                                <label className={`font-mono text-sm mb-2 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white'}`}>Observação</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className={`w-full p-3 rounded-lg text-white transition-all outline-none min-h-[80px] resize-y
                                        ${isBeauty
                                            ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                                            : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}
                                    `}
                                    placeholder="Adicione observações sobre o agendamento..."
                                />
                            </div>

                            <div>
                                <label className={`font-mono text-sm mb-2 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white'}`}>Horário</label>
                                <select
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className={`w-full p-3 rounded-lg text-white transition-all outline-none
                                        ${isBeauty
                                            ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                                            : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}
                                    `}
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
                                    <label className={`font-mono text-sm mb-2 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white'}`}>Desconto (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={discountPercentage}
                                            onChange={(e) => setDiscountPercentage(e.target.value)}
                                            className={`w-full p-3 rounded-lg text-white text-lg pr-8 transition-all outline-none
                                                ${isBeauty
                                                    ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                                                    : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}
                                            `}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className={`font-mono text-sm mb-2 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white'}`}>Preço Final</label>
                                    <div className="relative">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`}>
                                            {currencySymbol}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={finalPriceInput}
                                            onChange={(e) => setFinalPriceInput(e.target.value)}
                                            className={`w-full p-3 pl-10 rounded-lg text-white text-lg font-bold border transition-all outline-none
                                                ${isBeauty
                                                    ? 'bg-beauty-dark/50 border-beauty-neon/30 focus:border-beauty-neon text-beauty-neon'
                                                    : 'bg-neutral-800 border-neutral-700 focus:border-accent-gold text-accent-gold'}
                                            `}
                                        />
                                    </div>
                                    <p className={`text-xs mt-1 ${isBeauty ? 'text-beauty-neon/60' : 'text-neutral-500'}`}>
                                        Preço base: {formatCurrency(basePriceNew, currencyRegion)}
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