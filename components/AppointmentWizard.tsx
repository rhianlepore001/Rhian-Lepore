import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalButton } from './BrutalButton';
import { SearchableSelect } from './SearchableSelect';
import { formatCurrency, formatPhone } from '../utils/formatters';
import {
    User, Scissors, Calendar, Clock, Check, X,
    ChevronLeft, ChevronRight, Search, Plus, Sparkles,
    AlertTriangle, Loader2, DollarSign, MessageCircle
} from 'lucide-react';

interface WizardProps {
    onClose: () => void;
    onSuccess: (date: Date) => void;
    initialDate?: Date;
    teamMembers: any[];
    services: any[];
    clients: any[];
    onRefreshClients: () => void; // Callback to reload clients if a new one is added
}

export const AppointmentWizard: React.FC<WizardProps> = ({
    onClose,
    onSuccess,
    initialDate = new Date(),
    teamMembers,
    services,
    clients,
    onRefreshClients
}) => {
    const { user, userType, region } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [loading, setLoading] = useState(false);

    // Data State
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedProId, setSelectedProId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [selectedTime, setSelectedTime] = useState<string>('');

    // Admin Overrides
    const [customPrice, setCustomPrice] = useState<string>('');
    const [discount, setDiscount] = useState<string>('0');
    const [notes, setNotes] = useState<string>('');
    const [sendWhatsapp, setSendWhatsapp] = useState(true);

    // New Client State
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    // Fetching availability state
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const currencySymbol = region === 'PT' ? '€' : 'R$';
    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

    // Styles
    const modalBg = isBeauty
        ? 'bg-gradient-to-br from-beauty-card via-neutral-900 to-beauty-dark border border-beauty-neon/30'
        : 'bg-neutral-900 border-2 border-neutral-800';

    const cardBg = isBeauty ? 'bg-white/5 border-white/10' : 'bg-neutral-800 border-neutral-700';
    const activeCardBg = isBeauty ? 'bg-beauty-neon/20 border-beauty-neon' : 'bg-accent-gold text-black border-accent-gold';

    // --- STEP 1: CLIENT SELECTION ---
    const handleCreateClient = async () => {
        if (!newClientName || !newClientPhone) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .insert({
                    user_id: user?.id,
                    name: newClientName,
                    phone: newClientPhone
                })
                .select()
                .single();

            if (error) throw error;
            if (data) {
                onRefreshClients();
                setSelectedClientId(data.id);
                setIsCreatingClient(false);
                setStep(2); // Auto advance
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao criar cliente');
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 2: SERVICES --- 
    const toggleService = (id: string) => {
        if (selectedServiceIds.includes(id)) {
            setSelectedServiceIds(prev => prev.filter(s => s !== id));
        } else {
            setSelectedServiceIds(prev => [...prev, id]);
        }
    };

    // --- STEP 3: TIME & PROFESSIONAL ---
    useEffect(() => {
        if (selectedDate && user?.id && step === 3) {
            fetchSlots();
        }
    }, [selectedDate, selectedProId, step]);

    const fetchSlots = async () => {
        setIsLoadingSlots(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];

            // Calculate total duration
            const duration = services
                .filter(s => selectedServiceIds.includes(s.id))
                .reduce((sum, s) => sum + (s.duration_minutes || 30), 0);

            const { data, error } = await supabase.rpc('get_available_slots', {
                p_business_id: user?.id,
                p_date: dateStr,
                p_professional_id: selectedProId || null,
                p_duration_min: duration
            });

            if (data?.slots) {
                setAvailableSlots(data.slots);
            }
        } catch (error) {
            console.error('Error fetching slots:', error);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    // --- STEP 4: REVIEW & CONFIRM ---
    // Calculate prices
    const selectedServicesDetails = services.filter(s => selectedServiceIds.includes(s.id));
    const basePrice = selectedServicesDetails.reduce((sum, s) => sum + s.price, 0);

    // Initialize custom price with base price when entering step 4
    useEffect(() => {
        if (step === 4 && !customPrice) {
            setCustomPrice(basePrice.toFixed(2));
        }
    }, [step, basePrice]);

    const finalPrice = parseFloat(customPrice || '0') * (1 - (parseFloat(discount || '0') / 100));

    const handleSubmit = async () => {
        if (!selectedClientId || !selectedDate || !selectedTime || !selectedProId) return;
        setLoading(true);

        try {
            const dateTime = new Date(selectedDate);
            const [hours, minutes] = selectedTime.split(':');
            dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const serviceNames = selectedServicesDetails.map(s => s.name).join(', ');

            // Auto-assign professional if "Any" (though in wizard we force selection usually, 
            // but let's handle if proId is empty strings)
            let finalPro = selectedProId;
            if (!finalPro && teamMembers.length > 0) finalPro = teamMembers[0].id;

            const { error } = await supabase
                .from('appointments')
                .insert({
                    user_id: user?.id,
                    client_id: selectedClientId,
                    professional_id: finalPro,
                    service: serviceNames,
                    appointment_time: dateTime.toISOString(),
                    price: finalPrice,
                    status: 'Confirmed',
                    notes: notes
                });

            if (error) throw error;

            // WhatsApp Notification
            if (sendWhatsapp) {
                const client = clients.find(c => c.id === selectedClientId);
                if (client?.phone) {
                    const waPhone = client.phone.replace(/\\D/g, '');
                    const formattedDate = dateTime.toLocaleDateString('pt-BR');
                    const formattedTime = dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    const message = `Olá ${client.name}! Seu agendamento foi confirmado. ✨\\n` +
                        `📅 ${formattedDate} às ${formattedTime}\\n` +
                        `💇‍♀️ ${serviceNames}\\n` +
                        `📍 Estamos te esperando!`;

                    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
                }
            }

            onSuccess(dateTime);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao criar agendamento');
        } finally {
            setLoading(false);
        }
    };

    // Helper to change dates in step 3
    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
        setSelectedTime(''); // Reset time when date changes
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isBeauty ? 'bg-beauty-dark/95' : 'bg-black/90'} backdrop-blur-sm`}>
            <div className={`w-full max-w-4xl h-[85vh] flex flex-col relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ${modalBg} animate-in zoom-in-95`}>

                {/* HEADER */}
                <div className={`p-6 flex items-center justify-between border-b ${isBeauty ? 'border-beauty-neon/20 bg-beauty-neon/5' : 'border-neutral-800 bg-neutral-900'}`}>
                    <div>
                        <h2 className="text-2xl font-heading text-white uppercase tracking-wider">
                            Novo Agendamento
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-neutral-400 mt-1">
                            <span className={step >= 1 ? accentColor : ''}>Cliente</span>
                            <span>→</span>
                            <span className={step >= 2 ? accentColor : ''}>Serviços</span>
                            <span>→</span>
                            <span className={step >= 3 ? accentColor : ''}>Horário</span>
                            <span>→</span>
                            <span className={step >= 4 ? accentColor : ''}>Confirmar</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">

                    {/* STEP 1: CLIENT */}
                    {step === 1 && (
                        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white mb-2">Quem será atendido hoje?</h3>
                                <p className="text-neutral-400">Selecione um cliente existente ou cadastre um novo.</p>
                            </div>

                            {!isCreatingClient ? (
                                <div className="space-y-4">
                                    <SearchableSelect
                                        label=""
                                        placeholder="🔍 Buscar cliente por nome ou telefone..."
                                        options={clients.map(c => ({
                                            id: c.id,
                                            name: c.name,
                                            subtext: formatPhone(c.phone || '', currencyRegion)
                                        }))}
                                        value={selectedClientId}
                                        onChange={(val) => setSelectedClientId(val)}
                                        accentColor={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}
                                    />

                                    <div className="flex items-center gap-4 my-6">
                                        <div className="h-px bg-white/10 flex-1"></div>
                                        <span className="text-neutral-500 text-sm">OU</span>
                                        <div className="h-px bg-white/10 flex-1"></div>
                                    </div>

                                    <BrutalButton
                                        onClick={() => setIsCreatingClient(true)}
                                        variant="outline"
                                        className="w-full py-4 border-dashed"
                                        icon={<Plus />}
                                    >
                                        Cadastrar Novo Cliente
                                    </BrutalButton>
                                </div>
                            ) : (
                                <div className={`p-6 rounded-xl border ${cardBg} space-y-4`}>
                                    <h4 className="text-white font-bold flex items-center gap-2">
                                        <User className="w-5 h-5" /> Novo Cadastro
                                    </h4>
                                    <div>
                                        <label className="text-sm text-neutral-400 block mb-1">Nome Completo</label>
                                        <input
                                            value={newClientName}
                                            onChange={e => setNewClientName(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30"
                                            placeholder="Ex: Maria Silva"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-neutral-400 block mb-1">Telefone / WhatsApp</label>
                                        <input
                                            value={newClientPhone}
                                            onChange={e => setNewClientPhone(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <BrutalButton variant="secondary" onClick={() => setIsCreatingClient(false)} className="flex-1">Cancelar</BrutalButton>
                                        <BrutalButton
                                            variant="primary"
                                            onClick={handleCreateClient}
                                            className="flex-1"
                                            disabled={loading || !newClientName || !newClientPhone}
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : 'Cadastrar e Continuar'}
                                        </BrutalButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: SERVICES */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-bold text-white mb-2">O que vamos fazer?</h3>
                                <p className="text-neutral-400">Selecione um ou mais serviços.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {services.map(service => {
                                    const isSelected = selectedServiceIds.includes(service.id);
                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() => toggleService(service.id)}
                                            className={`
                                                cursor-pointer p-4 rounded-xl border-2 transition-all relative overflow-hidden group
                                                ${isSelected ? activeCardBg : `${cardBg} hover:border-white/30`}
                                            `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className={`font-bold ${isSelected ? (isBeauty ? 'text-black' : 'text-black') : 'text-white'}`}>
                                                        {service.name}
                                                    </h4>
                                                    <p className={`text-sm ${isSelected ? 'text-black/70' : 'text-neutral-400'}`}>
                                                        {service.duration_minutes} min
                                                    </p>
                                                </div>
                                                <span className={`font-mono font-bold ${isSelected ? 'text-black' : (isBeauty ? 'text-beauty-neon' : 'text-accent-gold')}`}>
                                                    {formatCurrency(service.price, currencyRegion)}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="bg-black text-white rounded-full p-1">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SCHEDULE */}
                    {step === 3 && (
                        <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Left: Professionals & Date */}
                            <div className="md:w-1/3 space-y-6">
                                <div>
                                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Profissional
                                    </h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                        {teamMembers.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => setSelectedProId(member.id)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                                                    ${selectedProId === member.id ? activeCardBg : `${cardBg} hover:border-white/30`}
                                                `}
                                            >
                                                {member.photo_url ? (
                                                    <img src={member.photo_url} className="w-10 h-10 rounded-full object-cover border border-black/20" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className={`font-bold leading-tight ${selectedProId === member.id ? (isBeauty ? 'text-beauty-dark' : 'text-black') : 'text-white'}`}>{member.name}</p>
                                                    <p className="text-[10px] opacity-70">Disponível</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Data
                                    </h4>
                                    <div className={`p-4 rounded-xl border ${cardBg}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white/10 rounded"><ChevronLeft className="w-5 h-5 text-white" /></button>
                                            <span className="text-white font-bold uppercase">{selectedDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                                            <button onClick={() => changeDate(1)} className="p-1 hover:bg-white/10 rounded"><ChevronRight className="w-5 h-5 text-white" /></button>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-4xl font-heading ${accentColor}`}>{selectedDate.getDate()}</p>
                                            <p className="text-white uppercase text-sm mb-2">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                                            <button
                                                onClick={() => setSelectedDate(new Date())}
                                                className="text-xs underline text-neutral-500 hover:text-white"
                                            >
                                                Ir para Hoje
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Time Slots */}
                            <div className="flex-1 flex flex-col">
                                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Horários Disponíveis
                                </h4>

                                <div className={`flex-1 rounded-xl border ${cardBg} p-4 overflow-y-auto min-h-[300px]`}>
                                    {!selectedProId ? (
                                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-2">
                                            <User className="w-10 h-10 opacity-20" />
                                            <p>Selecione um profissional primeiro</p>
                                        </div>
                                    ) : isLoadingSlots ? (
                                        <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                            <p>Buscando horários...</p>
                                        </div>
                                    ) : availableSlots.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-2">
                                            <AlertTriangle className="w-10 h-10 opacity-20" />
                                            <p>Nenhum horário disponível para esta data.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {availableSlots.map(time => (
                                                <button
                                                    key={time}
                                                    onClick={() => setSelectedTime(time)}
                                                    className={`
                                                        py-3 px-2 rounded-lg font-mono font-bold text-sm transition-all border
                                                        ${selectedTime === time
                                                            ? activeCardBg
                                                            : 'bg-black/20 border-white/5 text-white hover:border-white/30 hover:bg-white/5'
                                                        }
                                                    `}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: REVIEW */}
                    {step === 4 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-6">
                                <div className={`p-6 rounded-xl border space-y-4 ${cardBg}`}>
                                    <h3 className="text-white font-heading text-lg border-b border-white/10 pb-2">Resumo</h3>

                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Cliente</span>
                                        <span className="text-white font-bold">{clients.find(c => c.id === selectedClientId)?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Profissional</span>
                                        <span className="text-white font-bold">{teamMembers.find(t => t.id === selectedProId)?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Data e Hora</span>
                                        <span className="text-white font-bold text-right">
                                            {selectedDate.toLocaleDateString('pt-BR')} às {selectedTime}
                                        </span>
                                    </div>
                                    <div className="border-t border-white/10 pt-2">
                                        <span className="text-neutral-400 block mb-2">Serviços</span>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedServicesDetails.map(s => (
                                                <span key={s.id} className="text-xs bg-white/10 px-2 py-1 rounded text-white border border-white/10">
                                                    {s.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${sendWhatsapp ? 'bg-green-500/10 border-green-500/50' : cardBg}`}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${sendWhatsapp ? 'bg-green-500 border-green-500 text-black' : 'border-neutral-500'}`}>
                                        {sendWhatsapp && <Check className="w-3 h-3" />}
                                    </div>
                                    <input type="checkbox" checked={sendWhatsapp} onChange={e => setSendWhatsapp(e.target.checked)} className="hidden" />
                                    <div className="flex-1">
                                        <span className={`font-bold block ${sendWhatsapp ? 'text-green-400' : 'text-neutral-400'}`}>Enviar confirmação no WhatsApp</span>
                                        <span className="text-xs text-neutral-500">Abre o WhatsApp Web após salvar</span>
                                    </div>
                                    <MessageCircle className={`w-5 h-5 ${sendWhatsapp ? 'text-green-500' : 'text-neutral-600'}`} />
                                </label>
                            </div>

                            <div className="space-y-6">
                                <div className={`p-6 rounded-xl border space-y-4 ${cardBg}`}>
                                    <h3 className="text-white font-heading text-lg border-b border-white/10 pb-2">Financeiro & Notas</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-neutral-400 uppercase font-bold mb-1 block">Preço Final</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    value={customPrice}
                                                    onChange={e => setCustomPrice(e.target.value)}
                                                    className="w-full bg-black/20 text-white pl-8 p-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 font-mono font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-400 uppercase font-bold mb-1 block">Desconto (%)</label>
                                            <input
                                                type="number"
                                                value={discount}
                                                onChange={e => setDiscount(e.target.value)}
                                                className="w-full bg-black/20 text-white p-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-t border-white/5">
                                        <span className="text-neutral-400">Total a Receber</span>
                                        <span className={`text-2xl font-bold font-mono ${accentColor}`}>
                                            {formatCurrency(finalPrice, currencyRegion)}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="text-xs text-neutral-400 uppercase font-bold mb-1 block">Observações Internas</label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="w-full bg-black/20 text-white p-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 min-h-[80px]"
                                            placeholder="Ex: Cliente prefere água gelada..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className={`p-4 border-t ${isBeauty ? 'border-beauty-neon/20 bg-beauty-neon/5' : 'border-neutral-800 bg-neutral-900'} flex justify-between items-center`}>
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(prev => (prev - 1) as any)}
                            className="text-white hover:opacity-70 px-4 py-2 flex items-center gap-2 transition-opacity"
                        >
                            <ChevronLeft className="w-4 h-4" /> Voltar
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        {step < 4 ? (
                            <BrutalButton
                                variant="primary"
                                onClick={() => setStep(prev => (prev + 1) as any)}
                                disabled={
                                    (step === 1 && !selectedClientId) ||
                                    (step === 2 && selectedServiceIds.length === 0) ||
                                    (step === 3 && (!selectedProId || !selectedTime))
                                }
                                className="px-8"
                            >
                                Continuar
                            </BrutalButton>
                        ) : (
                            <BrutalButton
                                variant="primary"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-8"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
                            </BrutalButton>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
