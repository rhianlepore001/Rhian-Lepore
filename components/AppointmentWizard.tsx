import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { Button } from './ui/Button';
import { mapError, formatUserFacingError } from '../utils/mapError';
import {
    X, ChevronLeft, Loader2, Plus, Check
} from 'lucide-react';
import { WizardProps } from './appointment/types';
import { formatCurrency } from '../utils/formatters';
import type { Region } from '../utils/formatters';
import { ServiceSearchBar } from './appointment/ServiceSearchBar';
import { CategoryFilter } from './appointment/CategoryFilter';
import { ServiceList } from './appointment/ServiceList';
import { ClientSelection } from './appointment/ClientSelection';
import { ScheduleSelection } from './appointment/ScheduleSelection';
import { AppointmentReview } from './appointment/AppointmentReview';
import { logger } from '../utils/Logger';
import { combineDateAndTime } from '../utils/date';
import { useCreateAppointment } from '../hooks/useScheduling';
import type { CheckoutPaymentMethod } from '../types/scheduling';
import { getFirstAvailableProfessional } from '../services/publicBooking';
import { useToast } from '@/components/ui';


export const AppointmentWizard: React.FC<WizardProps> = ({
    onClose,
    onSuccess,
    initialDate = new Date(),
    teamMembers,
    services,
    categories = [],
    clients,
    onRefreshClients
}) => {
    const { user, region, businessName, companyId } = useAuth();
    const { setModalOpen } = useUI();
    const { isBeauty, accent } = useBrutalTheme();
    const createAppointment = useCreateAppointment();
    const { showToast } = useToast();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setModalOpen(true);
        return () => setModalOpen(false);
    }, [setModalOpen]);

    // Step 2 State
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCustomService, setIsCustomService] = useState(false);
    const [customServiceName, setCustomServiceName] = useState('');
    const [customServicePrice, setCustomServicePrice] = useState('');

    // Data State
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedProId, setSelectedProId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [selectedTime, setSelectedTime] = useState<string>('');

    // Admin Overrides & Review State
    const [customPrice, setCustomPrice] = useState<string>('');
    const [discount, setDiscount] = useState<string>('0');
    const [notes, setNotes] = useState<string>('');
    const [sendWhatsapp, setSendWhatsapp] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [autoAssigningPro, setAutoAssigningPro] = useState(false);

    const currencySymbol = region === 'PT' ? '€' : 'R$';
    const currencyRegion: Region = region === 'PT' ? 'PT' : 'BR';

    // Styles
    const modalBg = isBeauty
        ? 'bg-gradient-to-br from-beauty-card via-neutral-900 to-beauty-dark border border-beauty-neon/30'
        : 'bg-brutal-card border border-white/5';

    const cardBg = isBeauty ? 'bg-white/5 border-white/10' : 'bg-brutal-surface border-white/5';
    const activeCardBg = isBeauty ? 'bg-beauty-neon/20 border-beauty-neon' : 'bg-accent-gold text-black border-accent-gold';

    // --- STEP 2: SERVICES --- 
    const toggleService = (id: string) => {
        if (selectedServiceIds.includes(id)) {
            setSelectedServiceIds(prev => prev.filter(s => s !== id));
        } else {
            setSelectedServiceIds(prev => [...prev, id]);
        }
    };

    // --- STEP 4: REVIEW & CONFIRM ---
    // Calculate prices
    const selectedServicesDetails = services.filter(s => selectedServiceIds.includes(s.id));
    const basePrice = selectedServicesDetails.reduce((sum, s) => sum + s.price, 0);

    // Initialize custom price with base price when entering step 4
    useEffect(() => {
        // Recalculate price whenever entering step 4 or underlying values change
        if (step === 4) {
            // Assuming customServicePrice is only relevant if selected?
            // The original logic just added it. If isCustomService is true?
            // Re-checking original logic: it parses customServicePrice regardless? 
            // Logic was: const extraPrice = parseFloat(customServicePrice || '0');
            // But usually only if enabled. I'll stick to original behavior but adding a check might be better.
            // Let's assume if customServicePrice has value, it's added.
            const extraPrice = isCustomService ? parseFloat(customServicePrice || '0') : 0;
            setCustomPrice((basePrice + extraPrice).toFixed(2));
        }
    }, [step, basePrice, customServicePrice, isCustomService]);

    // Auto-select professional when entering schedule step (parity: 1 pro or RPC)
    useEffect(() => {
        if (step !== 3 || selectedProId) return;
        if (teamMembers.length === 1) {
            setSelectedProId(teamMembers[0].id);
        }
    }, [step, teamMembers, selectedProId]);

    useEffect(() => {
        if (step !== 3 || !selectedTime || selectedProId || teamMembers.length <= 1) return;
        const businessId = companyId ?? user?.id;
        if (!businessId) return;

        let cancelled = false;
        setAutoAssigningPro(true);

        (async () => {
            try {
                const duration = services
                    .filter(s => selectedServiceIds.includes(s.id))
                    .reduce((sum, s) => sum + (s.duration_minutes || 30), 0);
                const dateStr = selectedDate.toISOString().split('T')[0];
                const offset = region === 'PT' ? '+00:00' : '-03:00';
                const appointmentTimeISO = `${dateStr}T${selectedTime}:00${offset}`;
                const proId = await getFirstAvailableProfessional(
                    businessId,
                    appointmentTimeISO,
                    duration || 30
                );
                if (!cancelled && proId) setSelectedProId(proId);
            } finally {
                if (!cancelled) setAutoAssigningPro(false);
            }
        })();

        return () => {
            cancelled = true;
            setAutoAssigningPro(false);
        };
    }, [
        step,
        selectedTime,
        selectedProId,
        teamMembers.length,
        companyId,
        user?.id,
        selectedDate,
        selectedServiceIds,
        services,
        region,
    ]);

    const finalPrice = parseFloat(customPrice || '0') * (1 - (parseFloat(discount || '0') / 100));

    const handleSubmit = async () => {
        if (!selectedClientId || !selectedDate || !selectedTime || !selectedProId) return;
        setLoading(true);

        try {
            const dateTime = combineDateAndTime(selectedDate.toISOString().split('T')[0], selectedTime);


            const serviceNames = selectedServicesDetails.map(s => s.name).join(', ');

            // Calculate total duration for availability check
            const duration = selectedServicesDetails.reduce((sum, s) => sum + (s.duration_minutes || 30), 0);

            const client = clients.find(c => c.id === selectedClientId);

            // Use the secure RPC to ensure no collisions
            const result = await createAppointment.mutateAsync({
                companyId: companyId ?? user?.id ?? '',
                professionalId: selectedProId,
                customerName: client?.name || 'Cliente',
                customerPhone: client?.phone || null,
                customerEmail: client?.email || null,
                appointmentTime: dateTime,
                serviceIds: selectedServiceIds,
                totalPrice: finalPrice || 0,
                durationMinutes: duration || 30,
                status: 'Confirmed',
                clientId: selectedClientId,
                notes: notes || null,
                customServiceName: isCustomService ? (customServiceName || 'Servico Personalizado') : null,
                paymentMethod: paymentMethod ? paymentMethod as CheckoutPaymentMethod : null
            }) as { success?: boolean; message?: string };

            if (!result.success) {
                showToast(result.message || 'Horário indisponível', 'warning');
                setLoading(false);
                // In original, it called fetchSlots(). But here fetchSlots is in child component.
                // We might need to trigger reload in child? Or just alert.
                // If collision, user stays on step 4? Or goes back to 3? 
                // Going back to 3 seems appropriate to pick another time.
                return;
            }

            // WhatsApp Notification
            if (sendWhatsapp) {
                const client = clients.find(c => c.id === selectedClientId);
                if (client?.phone) {
                    const waPhone = client.phone.replace(/\D/g, '');
                    const formattedDate = dateTime.toLocaleDateString('pt-BR');
                    const formattedTime = dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    const message = isBeauty
                        ? `Olá ${client.name}! ✨\n` +
                        `Passando para confirmar seu horário no *${businessName || 'nossa Estética'}*. Tudo certo para **${formattedDate} às ${formattedTime}**?\n\n` +
                        `Te aguardamos com muito carinho! 💖`
                        : `Fala, ${client.name}! ✂️\n` +
                        `Seu horário está garantido aqui na *${businessName || 'Barbearia'}*.\n` +
                        `Nos vemos dia **${formattedDate} às ${formattedTime}**.\n\n` +
                        `Te aguardamos para dar aquele talento! 🚀`;

                    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
                }
            }

            // US-0409: Verificação se é o primeiro agendamento
            if (user?.id) {
                const { count } = await supabase
                    .from('appointments')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                
                if (count === 1) {
                    window.dispatchEvent(new CustomEvent('system-activated'));
                }
            }

            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'appointment' } }));

            onSuccess(dateTime);
            onClose();
        } catch (error) {
            logger.error('Erro ao criar agendamento:', error);
            const ui = mapError(error, 'Não foi possível criar o agendamento. Verifique sua conexão e tente de novo.');
            showToast(formatUserFacingError(ui), {
                type: 'error',
                action: {
                    label: 'Tentar novamente',
                    onClick: () => { void handleSubmit(); },
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className={`fixed inset-0 md:left-64 flex items-center justify-center p-0 md:p-4 ${isBeauty ? 'bg-beauty-dark/95' : 'bg-black/90'} backdrop-blur-sm`} style={{ zIndex: 'var(--z-modal)' }}>
            <div className={`w-full max-w-4xl h-[100dvh] md:h-[85vh] flex flex-col relative overflow-hidden md:rounded-2xl shadow-promax-depth transition-all duration-300 ${modalBg} animate-in zoom-in-95`}>

                {/* HEADER */}
                <div className={`relative p-6 flex items-center justify-between border-b ${isBeauty ? 'border-beauty-neon/20 bg-beauty-neon/5' : 'border-white/5 bg-brutal-main/50'}`}>
                    <div>
                        <h2 className="text-2xl font-heading text-white uppercase tracking-wider">
                            Novo Atendimento
                        </h2>
                        {(() => {
const STEPS = ['Cliente', 'Serviços', 'Horário', 'Confirmar'];
                             const accentRing = isBeauty ? 'ring-beauty-neon ring-offset-beauty-dark' : 'ring-accent-gold ring-offset-brutal-main';
                             return (
                                <div className="flex items-center gap-0 mt-2 w-full max-w-xs">
                                    {STEPS.map((label, idx) => {
                                        const n = idx + 1;
                                        const isDone = step > n;
                                        const isCurrent = step === n;
                                        return (
                                            <React.Fragment key={n}>
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                                        isDone
                                                            ? `${accent.bg} border-0`
                                                            : isCurrent
                                                                ? `ring-2 ring-offset-2 ${accentRing} bg-transparent`
                                                                : 'border border-white/20 bg-transparent'
                                                    }`}>
                                                        {isDone && <Check size={12} className="text-black" />}
                                                        {isCurrent && <div className={`w-2 h-2 rounded-full ${accent.bg}`} />}
                                                    </div>
                                                    <span className={`hidden md:block text-xs font-mono uppercase tracking-wider mt-1 ${
                                                        isCurrent ? accent.text
                                                        : isDone ? 'text-neutral-400' : 'text-neutral-600'
                                                    }`}>{label}</span>
                                                </div>
                                                {idx < STEPS.length - 1 && (
                                                    <div className={`flex-1 h-px mx-1 mb-3 md:mb-5 ${step > n ? (isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40') : 'bg-white/10'}`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X className="w-6 h-6" />
                    </button>
                    <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40'}`} aria-hidden="true" />
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">

                    {/* STEP 1: CLIENT */}
                    {step === 1 && (
                        <ClientSelection
                            clients={clients}
                            selectedClientId={selectedClientId}
                            setSelectedClientId={setSelectedClientId}
                            onRefreshClients={onRefreshClients}
                            onClientCreated={(id) => {
                                setSelectedClientId(id);
                                setStep(2);
                            }}
                            isBeauty={isBeauty}
                            currencyRegion={currencyRegion}
                            cardBg={cardBg}
                        />
                    )}

                    {/* STEP 2: SERVICES */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-heading text-white uppercase tracking-tight">Menu de Serviços</h3>
                                <p className="text-neutral-500 text-xs font-mono">
                                    {services.filter(s => activeCategory === 'all' || s.category_id === activeCategory).length} Opções
                                </p>
                            </div>

                            <ServiceSearchBar
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                isBeauty={isBeauty}
                            />

                            <CategoryFilter
                                categories={categories}
                                activeCategory={activeCategory}
                                setActiveCategory={setActiveCategory}
                                accentColor={accent.text}
                                isBeauty={isBeauty}
                            />

                            <ServiceList
                                services={services}
                                selectedServiceIds={selectedServiceIds}
                                toggleService={toggleService}
                                isBeauty={isBeauty}
                                currencyRegion={currencyRegion}
                                searchQuery={searchQuery}
                                activeCategory={activeCategory}
                                categories={categories}
                                setSearchQuery={setSearchQuery}
                                isCustomService={isCustomService}
                                setIsCustomService={setIsCustomService}
                                customServiceName={customServiceName}
                                setCustomServiceName={setCustomServiceName}
                                customServicePrice={customServicePrice}
                                setCustomServicePrice={setCustomServicePrice}
                                currencySymbol={currencySymbol}
                            />
                        </div>
                    )}

                    {/* STEP 3: SCHEDULE */}
                    {step === 3 && (
                        <ScheduleSelection
                            teamMembers={teamMembers}
                            selectedProId={selectedProId}
                            setSelectedProId={setSelectedProId}
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            selectedTime={selectedTime}
                            setSelectedTime={setSelectedTime}
                            activeCardBg={activeCardBg}
                            cardBg={cardBg}
                            accentColor={accent.text}
                            isBeauty={isBeauty}
                            services={services}
                            selectedServiceIds={selectedServiceIds}
                            user={user}
                        />
                    )}

                    {/* STEP 4: REVIEW */}
                    {step === 4 && (
                        <AppointmentReview
                            clients={clients}
                            selectedClientId={selectedClientId}
                            teamMembers={teamMembers}
                            selectedProId={selectedProId}
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                            cardBg={cardBg}
                            activeCardBg={activeCardBg}
                            selectedServicesDetails={selectedServicesDetails}
                            isCustomService={isCustomService}
                            customServiceName={customServiceName}
                            customServicePrice={customServicePrice}
                            currencyRegion={currencyRegion}
                            isBeauty={isBeauty}
                            accentColor={accent.text}
                            sendWhatsapp={sendWhatsapp}
                            setSendWhatsapp={setSendWhatsapp}
                            customPrice={customPrice}
                            setCustomPrice={setCustomPrice}
                            discount={discount}
                            setDiscount={setDiscount}
                            finalPrice={finalPrice}
                            notes={notes}
                            setNotes={setNotes}
                            currencySymbol={currencySymbol}
                            paymentMethod={paymentMethod}
                            setPaymentMethod={setPaymentMethod}
                            region={currencyRegion}
                        />
                    )}

                </div>

                {/* FOOTER */}
                <div className={`p-4 border-t ${isBeauty ? 'border-beauty-neon/20 bg-beauty-neon/5' : 'border-white/5 bg-brutal-main/50'} flex justify-between items-center`}>
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
                            <Button
                                variant="primary"
                                onClick={() => setStep(prev => (prev + 1) as any)}
                                disabled={
                                    (step === 1 && !selectedClientId) ||
                                    (step === 2 && selectedServiceIds.length === 0 && !(isCustomService && customServiceName.trim())) ||
                                    (step === 3 && (!selectedTime || (!selectedProId && autoAssigningPro) || (!selectedProId && teamMembers.length === 0)))
                                }
                                className="px-8"
                            >
                                Continuar
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-8"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Atendimento'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
