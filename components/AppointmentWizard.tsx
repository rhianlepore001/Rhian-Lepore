import { discardFormDraft } from '../hooks/useFormDraft';
import { useDraftFields } from '../hooks/useDraftFields';
import React, { useState, useEffect, useRef } from 'react';
import { useWhatsAppTemplates } from '../hooks/useWhatsAppTemplates';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useBusinessCopy } from '../hooks/useBusinessCopy';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { mapError, formatUserFacingError } from '../utils/mapError';
import {
    X, ChevronLeft, Loader2, Check
} from 'lucide-react';
import { AttendeePicker } from './appointment/AttendeePicker';
import { buildAttendeeSequence, type AttendeeSelection } from '@/utils/appointmentAttendees';
import { WizardProps } from './appointment/types';
import { formatCurrency } from '../utils/formatters';
import { buildWhatsAppLink } from '../utils/whatsappTemplates';
import type { Region } from '../utils/formatters';
import { ServiceSearchBar } from './appointment/ServiceSearchBar';
import { CategoryFilter } from './appointment/CategoryFilter';
import { ServiceList } from './appointment/ServiceList';
import { ClientSelection } from './appointment/ClientSelection';
import { ScheduleSelection } from './appointment/ScheduleSelection';
import { AppointmentReview } from './appointment/AppointmentReview';
import { StepHeading } from './appointment/StepHeading';
import { logger } from '../utils/Logger';
import { combineDateAndTime, formatLocalDateString } from '../utils/date';
import { capBookingDuration } from '../utils/serviceDuration';
import { useCreateAppointment } from '../hooks/useScheduling';
import { getFirstAvailableProfessional } from '../services/publicBooking';
import { useToast } from '@/components/ui';
import { useProducts } from '@/hooks/useCatalog';
import { slotConflictMessage } from '../utils/noShowSlotReuse';
import { useAgendaBlocks } from '../hooks/useAgendaBlocks';
import { agendaBlockedMessage, isAgendaBlockedError } from '../utils/agendaBlockPermission';
import { setAppointmentProductLines } from '@/services/catalog';
import {
    ProductLinesPicker,
    type ProductLineSelection,
} from './appointment/ProductLinesPicker';


export const AppointmentWizard: React.FC<WizardProps> = ({
    onClose: closeForm,
    onSuccess,
    initialDate = new Date(),
    initialProfessionalId = '',
    initialTime = '',
    slotContext,
    teamMembers,
    services,
    categories = [],
    clients,
    onRefreshClients,
    businessHours = null,
    shopTimeZone,
}) => {
    const { user, region, businessName, companyId } = useAuth();
    const whatsapp = useWhatsAppTemplates();
    const { isBeauty, accent, colors } = useBrutalTheme();
    const { establishmentFallback } = useBusinessCopy();
    const createAppointment = useCreateAppointment();
    const { showToast } = useToast();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [loading, setLoading] = useState(false);

    // Step 2 State
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCustomService, setIsCustomService] = useState(false);
    const [customServiceName, setCustomServiceName] = useState('');
    const [customServicePrice, setCustomServicePrice] = useState('');

    // Data State — profissional/horário podem vir pré-preenchidos da grade
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [dependentId, setDependentId] = useState('');
    const [attendeeName, setAttendeeName] = useState('');
    const [extraAttendees, setExtraAttendees] = useState<(AttendeeSelection & { key: string })[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedProId, setSelectedProId] = useState<string>(initialProfessionalId);
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [selectedTime, setSelectedTime] = useState<string>(initialTime);

    // Admin Overrides & Review State
    const [customPrice, setCustomPrice] = useState<string>('');
    const [discount, setDiscount] = useState<string>('0');
    const [notes, setNotes] = useState<string>('');
    const [sendWhatsapp, setSendWhatsapp] = useState(true);
    const [autoAssigningPro, setAutoAssigningPro] = useState(false);
    const [selectedProductLines, setSelectedProductLines] = useState<ProductLineSelection[]>([]);

    const onClose = () => { formDraft.clear(); discardFormDraft(companyId, user?.id, 'appointment:new-client'); closeForm(); };
    // Cada passo começa do topo (antes herdava a rolagem do passo anterior)
    const contentRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
    }, [step]);

    const { data: catalogProducts = [], isLoading: productsLoading } = useProducts({
        companyId: companyId ?? user?.id ?? '',
        includeInactive: false,
    });

    // Horário liberado por falta: profissional + horário já vêm prontos, então
    // Serviços -> Confirmar direto (Voltar no Confirmar leva ao Horário para trocar).
    const skipSchedule = !!slotContext && !!selectedProId && !!selectedTime;

    const currencySymbol = region === 'PT' ? '€' : 'R$';
    const currencyRegion: Region = region === 'PT' ? 'PT' : 'BR';

    // Styles
    const cardBg = 'bg-theme-surface border-[var(--color-divider)]';
    const activeCardBg = 'bg-theme-accent text-[var(--color-on-accent)] border-theme-accent';

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

    const formDraft = useDraftFields('appointment:wizard', {
        step: [step, setStep],
        selectedClientId: [selectedClientId, setSelectedClientId],
        selectedServiceIds: [selectedServiceIds, setSelectedServiceIds],
        dependentId: [dependentId, setDependentId],
        attendeeName: [attendeeName, setAttendeeName],
        extraAttendees: [extraAttendees, setExtraAttendees],
        selectedProId: [selectedProId, setSelectedProId],
        selectedTime: [selectedTime, setSelectedTime],
        selectedDate: [formatLocalDateString(selectedDate), value => { const d = new Date(`${value}T12:00:00`); if (!Number.isNaN(d.getTime())) setSelectedDate(d); }],
        customPrice: [customPrice, setCustomPrice],
        discount: [discount, setDiscount],
        notes: [notes, setNotes],
        sendWhatsapp: [sendWhatsapp, setSendWhatsapp],
        activeCategory: [activeCategory, setActiveCategory],
        searchQuery: [searchQuery, setSearchQuery],
        isCustomService: [isCustomService, setIsCustomService],
        customServiceName: [customServiceName, setCustomServiceName],
        customServicePrice: [customServicePrice, setCustomServicePrice],
        selectedProductLines: [selectedProductLines, setSelectedProductLines]
    }, { onDiscard: onClose, ready: !productsLoading, restore: data => ({ ...data,
        step: [1, 2, 3, 4].includes(data.step) ? data.step : 1,
        selectedClientId: clients.some(c => c.id === data.selectedClientId) ? data.selectedClientId : '',
        selectedServiceIds: data.selectedServiceIds?.filter(id => services.some(s => s.id === id)) ?? [],
        selectedProId: teamMembers.some(m => m.id === data.selectedProId) ? data.selectedProId : '',
        selectedProductLines: data.selectedProductLines?.filter(line => line && catalogProducts.some(p => p.id === line.productId)) ?? [],
    }) });

    const pricingInitialized = useRef(false);
    useEffect(() => {
        if (!formDraft.hydrated) return;
        if (!pricingInitialized.current) {
            pricingInitialized.current = true;
            if (formDraft.restored) return;
        }
        const extraPrice = isCustomService ? parseFloat(customServicePrice || '0') : 0;
        setCustomPrice((basePrice + extraPrice).toFixed(2));
    }, [formDraft.hydrated, basePrice, customServicePrice, isCustomService]);

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
                const duration = capBookingDuration(services
                    .filter(s => selectedServiceIds.includes(s.id))
                    .reduce((sum, s) => sum + (s.duration_minutes || 30), 0) || 30) + extraAttendees.reduce((total, person) => total + services.filter(service => person.serviceIds.includes(service.id)).reduce((sum, service) => sum + (service.duration_minutes || 30), 0), 0);
                // Mesmo instante que o handleSubmit grava (data/hora locais do
                // dispositivo da equipe). Antes: data em UTC + offset fixo por
                // região, que em PT no verão checava 1h depois do horário real.
                const appointmentTimeISO = combineDateAndTime(formatLocalDateString(selectedDate), selectedTime).toISOString();
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
        extraAttendees,
        services,
    ]);

    const extraDuration = extraAttendees.reduce((total, person) => total + services.filter(service => person.serviceIds.includes(service.id)).reduce((sum, service) => sum + (service.duration_minutes || 30), 0), 0);
    const extraPrice = extraAttendees.reduce((total, person) => total + services.filter(service => person.serviceIds.includes(service.id)).reduce((sum, service) => sum + service.price, 0), 0);
    const finalPrice = parseFloat(customPrice || '0') * (1 - (parseFloat(discount || '0') / 100));
    const firstDuration = capBookingDuration(selectedServicesDetails.reduce((sum, s) => sum + (s.duration_minutes || 30), 0) || 30);
    const durationMinutes = firstDuration + extraDuration;
    const { data: agendaBlocks = [] } = useAgendaBlocks(formatLocalDateString(selectedDate));

    const handleSubmit = async () => {
        if (!selectedClientId || !selectedDate || !selectedTime || !selectedProId) return;
        const personIds = [dependentId || 'self', ...extraAttendees.map(person => person.dependentId || 'self')];
        if (new Set(personIds).size !== personIds.length || extraAttendees.some(person => !person.serviceIds.length) || (extraAttendees.length > 0 && isCustomService) || durationMinutes > 1440) {
            showToast('Escolha uma pessoa diferente e os serviços de cada atendimento. Serviços personalizados devem ser agendados separadamente.', 'warning');
            return;
        }
        setLoading(true);

        try {
            // Usar data LOCAL — toISOString().split('T')[0] rola o dia em fusos ≠ UTC
            const dateTime = combineDateAndTime(formatLocalDateString(selectedDate), selectedTime);


            const serviceNames = selectedServicesDetails.map(s => s.name).join(', ');

            const duration = durationMinutes;

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
                durationMinutes: firstDuration || 30,
                ...(dependentId ? { dependentId, attendeeName } : {}),
                ...(extraAttendees.length ? { attendees: [
                    { dependentId: dependentId || null, serviceIds: selectedServiceIds, totalPrice: finalPrice || 0 },
                    ...buildAttendeeSequence(dateTime, extraAttendees, services).map(person => ({ dependentId: person.dependentId, serviceIds: person.serviceIds, totalPrice: person.totalPrice })),
                ] } : {}),
                status: 'Confirmed',
                clientId: selectedClientId,
                notes: notes || null,
                customServiceName: isCustomService ? (customServiceName || 'Servico Personalizado') : null,
                // Forma de pagamento é escolhida em "Confirmar e cobrar": nasce "definir depois"
                paymentMethod: null
            }) as { success?: boolean; message?: string; booking_id?: string; code?: string };

            if (!result.success) {
                const blocked = result.code === 'agenda_blocked' || result.code === 'professional_blocked' || isAgendaBlockedError(result);
                const proName = teamMembers.find(m => m.id === selectedProId)?.name;
                showToast(
                    blocked
                        ? agendaBlockedMessage(proName || 'profissional')
                        : slotConflictMessage(duration || 30, proName, result.message),
                    'warning',
                );
                setLoading(false);
                return;
            }

            const appointmentId = result.booking_id;
            const tenantId = companyId ?? user?.id ?? '';
            if (appointmentId && tenantId && selectedProductLines.length > 0) {
                await setAppointmentProductLines({
                    companyId: tenantId,
                    appointmentId,
                    lines: selectedProductLines,
                });
            }

            // WhatsApp Notification
            if (sendWhatsapp && whatsapp.isEnabled('wizard_confirm')) {
                const client = clients.find(c => c.id === selectedClientId);
                if (client?.phone) {
                    const formattedDate = dateTime.toLocaleDateString('pt-BR');
                    const formattedTime = dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const message = whatsapp.render('wizard_confirm', isBeauty ? 'beauty' : 'barber', {
                        cliente: client.name,
                        atendido: attendeeName || client.name,
                        para_quem: dependentId || extraAttendees.length ? ` para ${[attendeeName || client.name, ...extraAttendees.map(person => person.name || client.name)].join(', ')}` : '',
                        estabelecimento: businessName || establishmentFallback,
                        data: formattedDate,
                        hora: formattedTime,
                    });

                    const attendedNames = [attendeeName || client.name, ...extraAttendees.map(person => person.name || client.name)].join(', ');
                    const contactMessage = (dependentId || extraAttendees.length) && !message.includes(attendedNames) ? `${message}\nAtendimento para: ${attendedNames}.` : message;
                    window.open(buildWhatsAppLink(client.phone, currencyRegion, contactMessage), '_blank');
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

            // onSuccess do pai fecha o modal e refetcha a grade — NÃO chamar onClose
            // em seguida (ele fazia navigate(pathname) e apagava ?date= / estado).
            // id + profissional: a agenda vai até o card criado e o destaca
            formDraft.clear();
            discardFormDraft(companyId, user?.id, 'appointment:new-client');
            onSuccess(dateTime, { id: appointmentId, professionalId: selectedProId });
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

    return (
        <Modal
            open
            onClose={onClose}
            preventClose={loading}
            showCloseButton={false}
            size="xl"
            labelledById="appointment-wizard-title"
            bodyClassName="flex flex-col flex-1 min-h-0 overflow-hidden p-0"
            className="max-w-4xl h-[100dvh] md:h-[85vh] overflow-hidden shadow-promax-depth"
        >
                {/* HEADER */}
                <div className={`relative px-4 py-4 sm:p-6 flex items-center justify-between border-b border-[var(--color-divider)] shrink-0`}>
                    <div>
                        <h2 id="appointment-wizard-title" className={`text-2xl font-heading ${colors.text} uppercase tracking-wider`}>
                            Novo Atendimento
                        </h2>
                        {slotContext && (
                            <div className="mt-1 max-w-md" data-testid="wizard-slot-context">
                                <p className={`text-xs ${colors.textMuted}`}>{slotContext}</p>
                                {selectedProId && selectedTime && (
                                    <p className={`text-xs font-bold mt-0.5 ${accent.text}`} data-testid="wizard-slot-summary">
                                        {[
                                            teamMembers.find(m => m.id === selectedProId)?.name,
                                            selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
                                            selectedTime,
                                        ].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                        )}
                        {(() => {
const STEPS = ['Cliente', 'Serviços', 'Horário', 'Confirmar'];
                             const accentRing = 'ring-[var(--color-input-focus)] ring-offset-[var(--color-modal-bg)]';
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
                                                                : 'border border-[var(--color-input-border)] bg-transparent'
                                                    }`}>
                                                        {isDone && <Check size={12} className="text-[var(--color-on-accent)]" />}
                                                        {isCurrent && <div className={`w-2 h-2 rounded-full ${accent.bg}`} />}
                                                    </div>
                                                    <span className={`hidden md:block text-xs font-mono uppercase tracking-wider mt-1 ${
                                                        isCurrent ? accent.text
                                                        : isDone ? colors.textSecondary : colors.textMuted
                                                    }`}>{label}</span>
                                                </div>
                                                {idx < STEPS.length - 1 && (
                                                    <div className={`flex-1 h-px mx-1 mb-3 md:mb-5 ${step > n ? 'bg-[var(--color-accent-border)]' : 'bg-[var(--color-divider)]'}`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                    <button aria-label="Fechar" onClick={onClose} className={`p-2 hover:bg-[var(--color-card-hover)] rounded-full transition-colors ${colors.text}`}>
                        <X className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent-border)]" aria-hidden="true" />
                </div>

                {/* CONTENT AREA */}
                <div ref={contentRef} data-testid="wizard-content" className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:p-6 scrollbar-thin scrollbar-thumb-neutral-700">

                    {/* STEP 1: CLIENT */}
                    {step === 1 && (
                        <ClientSelection
                            clients={clients}
                            selectedClientId={selectedClientId}
                            setSelectedClientId={id => { setSelectedClientId(id); setDependentId(''); setAttendeeName(''); setExtraAttendees([]); }}
                            onRefreshClients={onRefreshClients}
                            onClientCreated={(id) => {
                                setSelectedClientId(id); setDependentId(''); setAttendeeName(''); setExtraAttendees([]);
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
                            <AttendeePicker companyId={companyId ?? user?.id ?? ''} clientId={selectedClientId} clientName={clients.find(client => client.id === selectedClientId)?.name || 'Titular'} value={dependentId} snapshot={attendeeName} onChange={(id, name) => { setDependentId(id); setAttendeeName(name); }} />
                            <StepHeading
                                title="Selecione os serviços"
                                aside={
                                    <span className={`${colors.textMuted} text-xs font-mono`}>
                                        {(() => {
                                            const n = services.filter(s => activeCategory === 'all' || s.category_id === activeCategory).length;
                                            return `${n} ${n === 1 ? 'opção' : 'opções'}`;
                                        })()}
                                    </span>
                                }
                            />

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

                            <div className="mt-6">
                                <ProductLinesPicker
                                    products={catalogProducts}
                                    value={selectedProductLines}
                                    onChange={setSelectedProductLines}
                                    currencyRegion={currencyRegion}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && <div className="space-y-4 mt-4">
                        {extraAttendees.map((person, index) => <div key={person.key} className="p-3 border border-[var(--color-divider)] rounded-lg">
                            <AttendeePicker companyId={companyId ?? user?.id ?? ''} clientId={selectedClientId} clientName={clients.find(client => client.id === selectedClientId)?.name || 'Titular'} value={person.dependentId || ''} snapshot={person.name} label={`Para quem? Pessoa ${index + 2}`} onChange={(id, name) => setExtraAttendees(rows => rows.map(row => row.key === person.key ? { ...row, dependentId: id || null, name } : row))} />
                            <fieldset className="space-y-2 text-theme-text"><legend className="text-sm font-bold">Serviços desta pessoa</legend>{services.map(service => <label key={service.id} className="flex items-center gap-2 min-h-[44px] text-sm"><input type="checkbox" checked={person.serviceIds.includes(service.id)} onChange={event => setExtraAttendees(rows => rows.map(row => row.key === person.key ? { ...row, serviceIds: event.target.checked ? [...row.serviceIds, service.id] : row.serviceIds.filter(id => id !== service.id) } : row))} />{service.name} · {formatCurrency(service.price, currencyRegion)}</label>)}</fieldset>
                            <Button size="sm" variant="ghost" onClick={() => setExtraAttendees(rows => rows.filter(row => row.key !== person.key))}>Remover pessoa</Button>
                        </div>)}
                        {!isCustomService && extraAttendees.length < 9 && <Button variant="ghost" onClick={() => setExtraAttendees(rows => [...rows, { key: crypto.randomUUID(), dependentId: null, name: clients.find(client => client.id === selectedClientId)?.name || 'Titular', serviceIds: [] }])}>Adicionar pessoa em sequência</Button>}
                    </div>}

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
                            businessHours={businessHours}
                            shopTimeZone={shopTimeZone}
                            blocks={agendaBlocks}
                            durationMinutes={durationMinutes}
                        />
                    )}

                    {step === 4 && <div className="mb-4 text-theme-text text-sm space-y-2">
                        <p className="font-bold">Responsável: {clients.find(client => client.id === selectedClientId)?.name}</p>
                        <p>Atendido(a): {attendeeName || clients.find(client => client.id === selectedClientId)?.name} · {selectedServicesDetails.map(service => service.name).join(', ') || customServiceName} · {selectedTime}</p>
                        {extraAttendees.length > 0 && buildAttendeeSequence(new Date(combineDateAndTime(formatLocalDateString(selectedDate), selectedTime).getTime() + firstDuration * 60_000), extraAttendees.filter(person => person.serviceIds.length), services).map(person => <p key={person.dependentId || 'self'}>{person.name} · {services.filter(service => person.serviceIds.includes(service.id)).map(service => service.name).join(', ')} · {person.appointmentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {formatCurrency(person.totalPrice, currencyRegion)}</p>)}
                    </div>}
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
                            whatsappEnabled={whatsapp.isEnabled('wizard_confirm')}
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
                        />
                    )}

                </div>

                {/* FOOTER */}
                <div
                    data-testid="wizard-footer"
                    className={`px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 border-t shrink-0 ${isBeauty ? 'border-[var(--color-accent-border)] bg-[var(--color-accent-dim)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]/50'}`}
                >
                    {/* Confirmar: total sempre visível junto do botão principal */}
                    {step === 4 && (
                        <div data-testid="wizard-footer-total" className="flex items-baseline justify-between gap-3 pb-3 mb-3 border-b border-[var(--color-divider)]">
                            <span className={`text-sm ${colors.textSecondary}`}>Total a receber</span>
                            <span className="text-xl font-bold font-mono text-theme-accent tabular-nums whitespace-nowrap">
                                {formatCurrency((finalPrice || 0) + extraPrice, currencyRegion)}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(prev => (prev - 1) as any)}
                            className={`${colors.text} hover:opacity-70 px-4 py-2 flex items-center gap-2 transition-opacity`}
                        >
                            <ChevronLeft className="w-4 h-4" /> Voltar
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        {step < 4 ? (
                            <Button
                                variant="primary"
                                onClick={() => setStep(prev => (prev === 2 && skipSchedule ? 4 : prev + 1) as any)}
                                disabled={
                                    (step === 1 && !selectedClientId) ||
                                    (step === 2 && (selectedServiceIds.length === 0 && !(isCustomService && customServiceName.trim()) || extraAttendees.some(person => !person.serviceIds.length) || new Set([dependentId || 'self', ...extraAttendees.map(person => person.dependentId || 'self')]).size !== 1 + extraAttendees.length || (isCustomService && extraAttendees.length > 0))) ||
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
        </Modal>
    );
};
