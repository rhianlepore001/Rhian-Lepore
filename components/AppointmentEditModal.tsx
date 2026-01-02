import React, { useState, useEffect } from 'react';
import { X, Loader2, Tag } from 'lucide-react';
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
    const { user, userType } = useAuth();
    const [loading, setLoading] = useState(false);

    const isBeauty = userType === 'beauty';

    // Theme Styles
    const modalStyles = isBeauty
        ? 'bg-gradient-to-br from-beauty-card to-beauty-dark border border-beauty-neon/30 rounded-2xl shadow-[0_0_20px_rgba(167,139,250,0.15)]'
        : 'bg-neutral-900 border-2 border-neutral-800 rounded-xl shadow-[8px_8px_0px_0px_#000000]';

    const headerStyles = isBeauty
        ? 'border-b border-beauty-neon/20 bg-gradient-to-r from-beauty-neon/10 to-transparent'
        : 'border-b-2 border-dashed border-neutral-800 bg-neutral-900/50';

    const inputStyles = isBeauty
        ? 'w-full p-3 bg-beauty-dark/50 border border-beauty-neon/20 rounded-xl text-white focus:outline-none focus:border-beauty-neon focus:bg-beauty-dark transition-all placeholder-beauty-neon/30'
        : 'w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold';

    const labelStyles = isBeauty
        ? 'text-beauty-neon/80 font-sans font-medium text-xs mb-1 block'
        : 'text-white font-mono text-sm mb-2 block';

    const closeButtonStyles = isBeauty
        ? 'text-beauty-neon/60 hover:text-beauty-neon hover:bg-beauty-neon/10 rounded-full p-1.5 transition-all'
        : 'text-neutral-400 hover:text-white transition-colors';

    // Initial state setup
    const initialDate = new Date(appointment.appointment_time).toISOString().split('T')[0];
    const initialTime = new Date(appointment.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    const initialService = services.find(s => s.name === appointment.service)?.id || '';
    const initialBasePrice = services.find(s => s.name === appointment.service)?.price || appointment.price;

    // Calculate initial discount percentage based on stored price vs base price
    const initialDiscountRate = initialBasePrice > 0 ? ((initialBasePrice - appointment.price) / initialBasePrice) * 100 : 0;
    const initialDiscountPercentage = Math.max(0, Math.round(initialDiscountRate)).toString();

    // Determine initial priceBeforeDiscount
    const initialPriceBeforeDiscount = appointment.price > initialBasePrice ? appointment.price : initialBasePrice;

    // State for form fields
    const [selectedClient, setSelectedClient] = useState(appointment.client_id || '');
    const [selectedService, setSelectedService] = useState(initialService);
    const [selectedProfessional, setSelectedProfessional] = useState(appointment.professional_id || '');
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [selectedTime, setSelectedTime] = useState(initialTime);

    // Price states
    const [basePrice, setBasePrice] = useState(initialBasePrice);
    const [priceBeforeDiscount, setPriceBeforeDiscount] = useState(initialPriceBeforeDiscount);
    const [finalPriceInput, setFinalPriceInput] = useState(appointment.price.toFixed(2));
    const [discountPercentage, setDiscountPercentage] = useState(initialDiscountPercentage);

    // 1. Update Base Price and Reference Price when service changes
    useEffect(() => {
        const service = services.find(s => s.id === selectedService);
        const currentServiceBasePrice = service?.price || 0;
        setBasePrice(currentServiceBasePrice);

        setPriceBeforeDiscount(currentServiceBasePrice);

        const discountRate = parseFloat(discountPercentage) / 100;
        const calculatedFinalPrice = currentServiceBasePrice * (1 - (isNaN(discountRate) ? 0 : discountRate));
        setFinalPriceInput(calculatedFinalPrice.toFixed(2));

    }, [selectedService, services]);

    // 2. Recalculate Price when Discount changes
    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDiscount = e.target.value;
        setDiscountPercentage(newDiscount);

        const discountRate = parseFloat(newDiscount) / 100;
        const calculatedFinalPrice = priceBeforeDiscount * (1 - (isNaN(discountRate) ? 0 : discountRate));
        setFinalPriceInput(calculatedFinalPrice.toFixed(2));
    };

    // 3. Recalculate Discount and update Reference Price when Final Price changes
    const handleFinalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPriceStr = e.target.value;
        setFinalPriceInput(newPriceStr);
        const newPrice = parseFloat(newPriceStr) || 0;

        if (newPrice > basePrice) {
            setPriceBeforeDiscount(newPrice);
            setDiscountPercentage('0');
        } else {
            setPriceBeforeDiscount(basePrice);

            if (basePrice > 0) {
                const discountAmount = basePrice - newPrice;
                const calculatedDiscount = (discountAmount / basePrice) * 100;
                setDiscountPercentage(Math.max(0, Math.round(calculatedDiscount)).toString());
            } else {
                setDiscountPercentage('0');
            }
        }
    };

    const handleSave = async () => {
        const finalPriceValue = parseFloat(finalPriceInput);

        if (!user || !selectedClient || !selectedService || !selectedProfessional || !selectedDate || !selectedTime || isNaN(finalPriceValue)) {
            alert('Por favor, preencha todos os campos obrigatórios e verifique o preço final.');
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
                    price: finalPriceValue,
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

    const currentDiscount = parseFloat(discountPercentage) || 0;
    const discountAmount = priceBeforeDiscount - (parseFloat(finalPriceInput) || 0);

    return (
        <div className={`fixed inset-0 ${isBeauty ? 'bg-beauty-dark/80 backdrop-blur-sm' : 'bg-black/80'} flex items-center justify-center z-50 p-4`}>
            <div className={`${modalStyles} w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col`}>
                <div className={`flex items-center justify-between p-6 ${headerStyles}`}>
                    <h3 className={`font-heading text-xl uppercase ${isBeauty ? 'text-white' : 'text-white'}`}>Editar Agendamento</h3>
                    <button
                        onClick={onClose}
                        className={closeButtonStyles}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Client */}
                    <div>
                        <label className={labelStyles}>Cliente</label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className={inputStyles}
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
                        <label className={labelStyles}>Profissional</label>
                        <select
                            value={selectedProfessional}
                            onChange={(e) => setSelectedProfessional(e.target.value)}
                            className={inputStyles}
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
                        <label className={labelStyles}>Serviço</label>
                        <select
                            value={selectedService}
                            onChange={(e) => {
                                setSelectedService(e.target.value);
                            }}
                            className={inputStyles}
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

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyles}>Data</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={inputStyles}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className={labelStyles}>Horário</label>
                            <select
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className={inputStyles}
                                disabled={loading}
                            >
                                <option value="">Selecione</option>
                                {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Price and Discount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyles}>Preço Final ({currencySymbol})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={finalPriceInput}
                                    onChange={handleFinalPriceChange}
                                    className={`${inputStyles} pr-8`}
                                    placeholder="0.00"
                                    disabled={loading}
                                />
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${isBeauty ? 'text-beauty-neon/50' : 'text-neutral-500'}`}>{currencySymbol}</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                Preço base: {currencySymbol} {basePrice.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <label className={labelStyles}>Desconto (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={discountPercentage}
                                    onChange={handleDiscountChange}
                                    className={`${inputStyles} pr-8`}
                                    placeholder="0"
                                    disabled={loading}
                                />
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${isBeauty ? 'text-beauty-neon/50' : 'text-neutral-500'}`}>%</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                {discountAmount > 0 ? `-${currencySymbol} ${discountAmount.toFixed(2)}` : ''}
                            </p>
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
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
                        </BrutalButton>
                    </div>
                </div>
            </div>
        </div>
    );
};