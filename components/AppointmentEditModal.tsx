import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalButton } from './BrutalButton';

interface Appointment {
    id: string;
    client_id: string;
    clientName: string;
    service: string;
    appointment_time: string;
    price: number;
    status: string;
    professional_id: string | null;
}

interface TeamMember {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
    price: number;
}

interface Client {
    id: string;
    name: string;
}

interface AppointmentEditModalProps {
    appointment: Appointment;
    teamMembers: TeamMember[];
    services: Service[];
    clients: Client[];
    onClose: () => void;
    onSave: () => void;
    accentColor: string;
    currencySymbol: string;
}

// Generate time slots with half-hour intervals
const timeSlots = [];
for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
}

export const AppointmentEditModal: React.FC<AppointmentEditModalProps> = ({
    appointment,
    teamMembers,
    services,
    clients,
    onClose,
    onSave,
    accentColor,
    currencySymbol
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Initial state setup
    const initialDate = new Date(appointment.appointment_time).toISOString().split('T')[0];
    const initialTime = new Date(appointment.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const initialService = services.find(s => s.name === appointment.service)?.id || '';
    const initialClient = appointment.client_id || '';
    const initialProfessional = appointment.professional_id || '';

    const [selectedClient, setSelectedClient] = useState(initialClient);
    const [selectedService, setSelectedService] = useState(initialService);
    const [selectedProfessional, setSelectedProfessional] = useState(initialProfessional);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [selectedTime, setSelectedTime] = useState(initialTime);
    const [price, setPrice] = useState(appointment.price.toFixed(2));

    useEffect(() => {
        // Update price when service changes
        const service = services.find(s => s.id === selectedService);
        if (service) {
            setPrice(service.price.toFixed(2));
        }
    }, [selectedService, services]);

    const handleSave = async () => {
        if (!user || !selectedClient || !selectedService || !selectedProfessional || !selectedDate || !selectedTime || isNaN(parseFloat(price))) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);

        try {
            const serviceDetails = services.find(s => s.id === selectedService);
            if (!serviceDetails) throw new Error('Serviço inválido.');

            const dateTime = new Date(selectedDate);
            const [hours, minutes] = selectedTime.split(':');
            dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const { error } = await supabase
                .from('appointments')
                .update({
                    client_id: selectedClient,
                    professional_id: selectedProfessional,
                    service: serviceDetails.name,
                    appointment_time: dateTime.toISOString(),
                    price: parseFloat(price),
                })
                .eq('id', appointment.id);

            if (error) throw error;

            alert('Agendamento atualizado com sucesso!');
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error updating appointment:', error);
            alert(`Erro ao atualizar agendamento: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-heading text-xl uppercase">Editar Agendamento</h3>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Client */}
                    <div>
                        <label className="text-white font-mono text-sm mb-2 block">Cliente</label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                            disabled={loading}
                        >
                            <option value="">Selecione um cliente</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Professional */}
                    <div>
                        <label className="text-white font-mono text-sm mb-2 block">Profissional</label>
                        <select
                            value={selectedProfessional}
                            onChange={(e) => setSelectedProfessional(e.target.value)}
                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                            disabled={loading}
                        >
                            <option value="">Selecione um profissional</option>
                            {teamMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Service */}
                    <div>
                        <label className="text-white font-mono text-sm mb-2 block">Serviço</label>
                        <select
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                            disabled={loading}
                        >
                            <option value="">Selecione um serviço</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Price */}
                    <div>
                        <label className="text-white font-mono text-sm mb-2 block">Preço ({currencySymbol})</label>
                        <input
                            type="number"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                            disabled={loading}
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-white font-mono text-sm mb-2 block">Data</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="text-white font-mono text-sm mb-2 block">Horário</label>
                            <select
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold"
                                disabled={loading}
                            >
                                <option value="">Selecione</option>
                                {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <BrutalButton
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </BrutalButton>
                        <BrutalButton
                            variant="primary"
                            className="flex-1"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                        </BrutalButton>
                    </div>
                </div>
            </div>
        </div>
    );
};