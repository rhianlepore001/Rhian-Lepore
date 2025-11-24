import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Calendar, Clock, Plus, X, User, Scissors, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TimeGrid } from '../components/TimeGrid';
import { CalendarPicker } from '../components/CalendarPicker';

export const Agenda: React.FC = () => {
    const { user, userType, region } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [publicBookings, setPublicBookings] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
    const [date, setDate] = useState<Date | null>(null);
    const [time, setTime] = useState('');
    const [price, setPrice] = useState('');

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const currencySymbol = region === 'PT' ? '€' : 'R$';

    const fetchAppointments = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*, clients(name)')
                .eq('user_id', user.id)
                .order('appointment_time', { ascending: true });

            if (error) throw error;

            if (data) {
                setAppointments(data.map((apt: any) => ({
                    id: apt.id,
                    clientName: apt.clients?.name || 'Cliente Desconhecido',
                    service: apt.service,
                    time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: new Date(apt.appointment_time).toLocaleDateString(),
                    status: apt.status,
                    price: apt.price
                })));
            }

            // Fetch Public Bookings
            const { data: pubData, error: pubError } = await supabase
                .from('public_bookings')
                .select('*')
                .eq('business_id', user.id)
                .eq('status', 'pending')
                .order('appointment_time', { ascending: true });

            if (pubError) throw pubError;

            if (pubData) {
                setPublicBookings(pubData);
            }

        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        if (!user) return;
        const { data } = await supabase.from('clients').select('id, name').eq('user_id', user.id);
        if (data) setClients(data);
    };

    const fetchServices = async () => {
        if (!user) return;
        const { data } = await supabase.from('services').select('id, name, price').eq('user_id', user.id).eq('active', true);
        if (data) setServices(data);
    };

    const fetchTeamMembers = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('team_members')
            .select('id, name')
            .eq('user_id', user.id)
            .eq('active', true);
        if (data) setTeamMembers(data);
    };

    useEffect(() => {
        if (user) {
            fetchAppointments();
            fetchClients();
            fetchServices();
            fetchTeamMembers();

            // Realtime Subscription
            const subscription = supabase
                .channel('public_bookings_channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'public_bookings',
                        filter: `business_id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log('New booking received!', payload);
                        alert(`🔔 Novo agendamento de ${payload.new.customer_name}!`);
                        fetchAppointments(); // Refresh list
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user]);

    const handleServiceChange = (serviceId: string) => {
        setSelectedServiceId(serviceId);
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setPrice(service.price.toString());
        }
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!selectedClient || !selectedServiceId || !date || !time || !price) {
            alert('Por favor, preencha todos os campos obrigatórios (Cliente, Serviço, Data, Hora e Preço).');
            return;
        }

        try {
            const serviceName = services.find(s => s.id === selectedServiceId)?.name || 'Serviço Personalizado';

            // Combine date and time, ensuring we use the local context to avoid timezone shifts
            const [hour, minute] = time.split(':').map(Number);
            const appointmentTime = new Date(date);
            appointmentTime.setHours(hour, minute, 0, 0);

            // Convert to ISO string for Supabase, which handles the timezone correctly
            const appointmentTimeISO = appointmentTime.toISOString();

            const { error } = await supabase.from('appointments').insert({
                client_id: selectedClient,
                service: serviceName,
                appointment_time: appointmentTimeISO,
                price: Number(price),
                status: 'Confirmed', // Changed from 'Pending' to 'Confirmed' for manual booking
                user_id: user.id,
                professional_id: selectedProfessionalId || null
            });

            if (error) throw error;

            setShowModal(false);
            fetchAppointments();
            // Reset form
            setSelectedClient('');
            setSelectedServiceId('');
            setSelectedProfessionalId('');
            setDate(null);
            setTime('');
            setPrice('');

        } catch (error: any) {
            console.error('Error creating appointment:', error);
            alert(`Erro ao criar agendamento: ${error.message || JSON.stringify(error)}`);
        }
    };

    const handleCompleteAppointment = async (appointment: any) => {
        try {
            const { error } = await supabase.rpc('complete_appointment', {
                p_appointment_id: appointment.id
            });

            if (error) throw error;

            alert('Agendamento concluído e financeiro atualizado!');
            fetchAppointments();

        } catch (error) {
            console.error('Error completing appointment:', error);
            alert('Erro ao concluir agendamento.');
        }
    };

    const handleAcceptBooking = async (booking: any) => {
        if (!user) return;
        try {
            // 1. Find or Create Client
            let clientId;
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('phone', booking.customer_phone)
                .eq('user_id', user.id)
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
                        email: booking.customer_email || '' // Handle potential null email
                    })
                    .select()
                    .single();

                if (clientError) throw clientError;
                clientId = newClient.id;
            }

            // 2. Create Appointment
            // Fetch service names
            const { data: serviceData } = await supabase
                .from('services')
                .select('name')
                .in('id', booking.service_ids || []);

            const serviceNames = serviceData?.map(s => s.name).join(', ') || 'Serviço Online';

            const { error: aptError } = await supabase
                .from('appointments')
                .insert({
                    user_id: user.id,
                    client_id: clientId,
                    service: serviceNames,
                    appointment_time: booking.appointment_time,
                    price: booking.total_price,
                    status: 'Confirmed',
                    professional_id: booking.professional_id
                });

            if (aptError) throw aptError;

            // 3. Update Public Booking Status
            await supabase
                .from('public_bookings')
                .update({ status: 'confirmed' })
                .eq('id', booking.id);

            alert('Agendamento aceito com sucesso!');
            fetchAppointments();

        } catch (error) {
            console.error('Error accepting booking:', error);
            alert('Erro ao aceitar agendamento.');
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        if (!confirm('Tem certeza que deseja recusar este agendamento?')) return;
        try {
            await supabase
                .from('public_bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            fetchAppointments();
        } catch (error) {
            console.error('Error rejecting booking:', error);
        }
    };

    return (
        <div className="space-y-6 relative pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-white/10 pb-4 gap-4">
                <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Agenda</h2>
                <BrutalButton variant="primary" icon={<Plus />} onClick={() => setShowModal(true)} className="w-full md:w-auto">Novo Agendamento</BrutalButton>
            </div>

            {/* Public Booking Requests */}
            {publicBookings.length > 0 && (
                <BrutalCard title="Solicitações Online" className="border-yellow-500/50">
                    <div className="space-y-4">
                        {publicBookings.map(booking => (
                            <div key={booking.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg gap-4">
                                <div>
                                    <h4 className="font-heading text-white text-lg">{booking.customer_name}</h4>
                                    <p className="text-sm text-neutral-400 font-mono">
                                        {new Date(booking.appointment_time).toLocaleDateString()} às {new Date(booking.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-xs text-yellow-500 mt-1">R$ {booking.total_price}</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <BrutalButton size="sm" variant="primary" onClick={() => handleAcceptBooking(booking)}>Aceitar</BrutalButton>
                                    <BrutalButton size="sm" variant="ghost" onClick={() => handleRejectBooking(booking.id)} className="text-red-500 hover:text-red-400">Recusar</BrutalButton>
                                </div>
                            </div>
                        ))}
                    </div>
                </BrutalCard>
            )}

            <BrutalCard className="min-h-[500px]">
                {loading ? (
                    <div className="text-center text-text-secondary p-10">Carregando agenda...</div>
                ) : (
                    <div className="space-y-4">
                        {appointments.length === 0 ? (
                            <div className="text-center text-text-secondary p-10">Nenhum agendamento encontrado.</div>
                        ) : (
                            appointments.map((apt) => (
                                <div key={apt.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex flex-col items-center justify-center w-16 h-16 border-2 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'} bg-black`}>
                                            <span className={`text-lg font-bold ${accentText}`}>{apt.time}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-heading text-white">{apt.clientName}</h3>
                                            <p className="text-sm text-text-secondary font-mono">{apt.service} • {apt.date}</p>
                                            <p className="text-xs text-neutral-500 font-mono mt-1">{currencySymbol} {apt.price}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${apt.status === 'Confirmed' ? 'border-green-500 text-green-500' :
                                            apt.status === 'Pending' ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500'
                                            }`}>
                                            {apt.status === 'Confirmed' ? 'Confirmado' : apt.status === 'Pending' ? 'Pendente' : 'Cancelado'}
                                        </div>

                                        {apt.status === 'Pending' && (
                                            <BrutalButton
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleCompleteAppointment(apt)}
                                            >
                                                Concluir
                                            </BrutalButton>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </BrutalCard>

            {/* Modern Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
                    <div className={`bg-neutral-900 border-2 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'} w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>

                        {/* Header */}
                        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-black/50">
                            <h3 className={`text-xl md:text-2xl font-heading uppercase ${accentText}`}>
                                Novo Agendamento
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <form id="appointment-form" onSubmit={handleCreateAppointment} className="space-y-6">

                                {/* Client Selection */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase tracking-wider">
                                        <User className="w-4 h-4" /> Cliente
                                    </label>
                                    <select
                                        value={selectedClient}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                        className={`w-full bg-neutral-800 border-2 border-neutral-700 rounded-lg p-4 text-white focus:outline-none focus:border-${isBeauty ? 'beauty-neon' : 'accent-gold'} transition-colors appearance-none`}
                                        required
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Service Selection */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase tracking-wider">
                                        <Scissors className="w-4 h-4" /> Serviço
                                    </label>
                                    <select
                                        value={selectedServiceId}
                                        onChange={(e) => handleServiceChange(e.target.value)}
                                        className={`w-full bg-neutral-800 border-2 border-neutral-700 rounded-lg p-4 text-white focus:outline-none focus:border-${isBeauty ? 'beauty-neon' : 'accent-gold'} transition-colors appearance-none`}
                                        required
                                    >
                                        <option value="">Selecione um serviço...</option>
                                        {services.map(srv => (
                                            <option key={srv.id} value={srv.id}>
                                                {srv.name} - {currencySymbol} {srv.price}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Professional Selection (Optional) */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase tracking-wider">
                                        <User className="w-4 h-4" /> Profissional (Opcional)
                                    </label>
                                    <select
                                        value={selectedProfessionalId}
                                        onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                        className={`w-full bg-neutral-800 border-2 border-neutral-700 rounded-lg p-4 text-white focus:outline-none focus:border-${isBeauty ? 'beauty-neon' : 'accent-gold'} transition-colors appearance-none`}
                                    >
                                        <option value="">Selecione um profissional...</option>
                                        {teamMembers.map(member => (
                                            <option key={member.id} value={member.id}>{member.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date & Time */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase tracking-wider">
                                            <Calendar className="w-4 h-4" /> Data
                                        </label>
                                        <CalendarPicker
                                            selectedDate={date}
                                            onDateSelect={setDate}
                                            isBeauty={isBeauty}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase tracking-wider">
                                            <Clock className="w-4 h-4" /> Horário
                                        </label>
                                        <TimeGrid
                                            selectedTime={time}
                                            onTimeSelect={setTime}
                                            isBeauty={isBeauty}
                                        />
                                        {/* Hidden input to enforce required validation on time selection */}
                                        <input type="hidden" value={time} required />
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase tracking-wider">
                                        <DollarSign className="w-4 h-4" /> Preço ({currencySymbol})
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className={`w-full bg-neutral-800 border-2 border-neutral-700 rounded-lg p-4 text-white focus:outline-none focus:border-${isBeauty ? 'beauty-neon' : 'accent-gold'} transition-colors font-mono text-lg`}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-neutral-800 bg-black/50">
                            <button
                                type="submit"
                                form="appointment-form"
                                className={`w-full py-4 font-bold uppercase tracking-wider text-lg rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] ${accentBg} text-black`}
                            >
                                Confirmar Agendamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};