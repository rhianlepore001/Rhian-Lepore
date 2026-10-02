import React, { useMemo, useState } from 'react';
import { User, ChevronLeft, ChevronRight, ChevronDown, MoonStar } from 'lucide-react';
import { StepHeading } from './StepHeading';
import { splitWizardTimeSlots } from '../../utils/agendaDayWindow';
import { formatLocalDateString } from '../../utils/date';
import type { BusinessHours } from '../../types/settings';
import { slotOverlapsBlocks } from '../../utils/agendaBlockRange';

interface ScheduleSelectionProps {
    teamMembers: any[];
    selectedProId: string;
    setSelectedProId: (id: string) => void;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    selectedTime: string;
    setSelectedTime: (time: string) => void;
    activeCardBg: string;
    cardBg: string;
    accentColor: string;
    isBeauty: boolean;
    services: any[];
    selectedServiceIds: string[];
    user: any;
    /** Horário de funcionamento: horários do expediente primeiro; fora dele sob demanda (encaixe). */
    businessHours?: BusinessHours | null;
    shopTimeZone?: string;
    /** Bloqueios do profissional: esses horários somem da lista (trava rígida). */
    blocks?: Array<{ professional_id: string; starts_at: string; ends_at: string }>;
    durationMinutes?: number;
}

interface ScheduleSelectionProps {
    teamMembers: any[];
    selectedProId: string;
    setSelectedProId: (id: string) => void;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    selectedTime: string;
    setSelectedTime: (time: string) => void;
    activeCardBg: string;
    cardBg: string;
    accentColor: string;
    isBeauty: boolean;
    services: any[];
    selectedServiceIds: string[];
    user: any;
    /** Horário de funcionamento: horários do expediente primeiro; fora dele sob demanda (encaixe). */
    businessHours?: BusinessHours | null;
    shopTimeZone?: string;
}

/**
 * Seleção de horário para agendamento INTERNO (gestor/colaborador).
 * Não usa get_available_slots — controle total: qualquer horário do dia,
 * inclusive passado (encaixe lançado depois) e fora do expediente (seção
 * "Fora do expediente"). Booking online continua limitado via PublicBooking + RPC.
 */
export const ScheduleSelection: React.FC<ScheduleSelectionProps> = ({
    teamMembers,
    selectedProId,
    setSelectedProId,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    activeCardBg,
    cardBg,
    businessHours = null,
    shopTimeZone,
    blocks = [],
    durationMinutes = 30,
}) => {
    // Horário pré-preenchido fora da grade de 30 min (ex.: falta às 14:15)
    // entra na lista para aparecer selecionado.
    const [prefilledTime] = useState(selectedTime);
    const dateStr = formatLocalDateString(selectedDate);
    const { inHours, outOfHours, closed } = useMemo(
        () => splitWizardTimeSlots({
            dateStr,
            businessHours,
            shopTimeZone,
            extraTimes: prefilledTime ? [prefilledTime] : [],
        }),
        [dateStr, businessHours, shopTimeZone, prefilledTime],
    );
    const tz = shopTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isBlockedTime = (time: string) => {
        if (!selectedProId || blocks.length === 0) return false;
        return slotOverlapsBlocks(dateStr, time, durationMinutes || 30, blocks, selectedProId, tz);
    };
    const inHoursOpen = inHours.filter((t) => !isBlockedTime(t));
    const outOfHoursOpen = outOfHours.filter((t) => !isBlockedTime(t));
    // Horário escolhido (ex.: "+" da grade às 22:30) fora do expediente: seção já aberta.
    const [showOffHours, setShowOffHours] = useState(() => !!selectedTime && outOfHours.includes(selectedTime));
    const offHoursVisible = closed || showOffHours;

    const renderTime = (time: string) => (
        <button
            key={time}
            type="button"
            onClick={() => setSelectedTime(time)}
            aria-pressed={selectedTime === time}
            className={`
                py-3 px-2 rounded-lg font-mono font-bold text-sm transition-all border
                ${selectedTime === time
                    ? activeCardBg
                    : 'bg-theme-surface border-[var(--color-divider)] text-theme-text hover:border-[var(--color-input-border)] hover:bg-[var(--color-card-hover)]'
                }
            `}
        >
            {time}
        </button>
    );
    const timeGridClass = 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3';
    // Fora do expediente em ordem, separado em antes da abertura / intervalo / depois do fechamento.
    const offHoursGroups = useMemo(() => {
        if (closed || inHours.length === 0) return [{ label: '', times: outOfHoursOpen }];
        const first = inHours[0];
        const last = inHours[inHours.length - 1];
        const groups = [
            { label: 'Antes da abertura', times: outOfHoursOpen.filter((t) => t < first) },
            { label: 'Intervalo', times: outOfHoursOpen.filter((t) => t > first && t < last) },
            { label: 'Depois do fechamento', times: outOfHoursOpen.filter((t) => t > last) },
        ];
        return groups.filter((g) => g.times.length > 0);
    }, [closed, inHours, outOfHoursOpen]);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
        setSelectedTime('');
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const initials = (name: string) =>
        (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

    return (
        <div className="flex flex-col md:flex-row md:items-start gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Esquerda: profissional + data (fixa no desktop enquanto os horários rolam) */}
            <div className="md:w-[22rem] md:shrink-0 space-y-6 md:sticky md:top-0">
                <section>
                    <StepHeading level="section" title="Escolha o profissional" />
                    {/* Sem caixa de rolagem interna: todos os profissionais visíveis */}
                    <div data-testid="wizard-pro-list" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
                        {teamMembers.map(member => {
                            const active = selectedProId === member.id;
                            return (
                                <button
                                    key={member.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setSelectedProId(member.id)}
                                    className={`w-full min-h-[52px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-colors text-left
                                        ${active ? activeCardBg : `${cardBg} hover:border-[var(--color-input-border)]`}
                                    `}
                                >
                                    {member.photo_url ? (
                                        <img src={member.photo_url} className="w-8 h-8 shrink-0 rounded-full object-cover border border-[var(--color-divider)]" alt="" />
                                    ) : (
                                        <span
                                            aria-hidden="true"
                                            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-black/15' : 'bg-[var(--color-card-hover)] text-theme-textSecondary'}`}
                                        >
                                            {initials(member.name)}
                                        </span>
                                    )}
                                    <span className={`min-w-0 text-sm font-semibold leading-tight line-clamp-2 break-words ${active ? 'text-[var(--color-on-accent)]' : 'text-theme-text'}`}>
                                        {member.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <StepHeading level="section" title="Selecione a data" />
                    <div data-testid="wizard-date-picker" className={`flex items-center gap-1 p-1.5 rounded-xl border ${cardBg}`}>
                        <button
                            type="button"
                            aria-label="Dia anterior"
                            onClick={() => changeDate(-1)}
                            className="p-2 rounded-lg hover:bg-[var(--color-card-hover)] text-theme-text"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
                            <span className="text-3xl leading-none font-heading text-theme-accent tabular-nums">{selectedDate.getDate()}</span>
                            <span className="min-w-0 text-left leading-tight">
                                <span className="block text-sm font-semibold text-theme-text truncate">
                                    {(() => {
                                        const w = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' });
                                        return w.charAt(0).toUpperCase() + w.slice(1);
                                    })()}
                                </span>
                                <span className="block text-xs text-theme-textSecondary truncate">
                                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    {isToday && ' · hoje'}
                                </span>
                            </span>
                        </div>
                        <button
                            type="button"
                            aria-label="Próximo dia"
                            onClick={() => changeDate(1)}
                            className="p-2 rounded-lg hover:bg-[var(--color-card-hover)] text-theme-text"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    {!isToday && (
                        <button
                            type="button"
                            onClick={() => { setSelectedDate(new Date()); setSelectedTime(''); }}
                            className="mt-2 text-xs font-semibold text-theme-accent hover:underline"
                        >
                            Ir para hoje
                        </button>
                    )}
                </section>
            </div>

            {/* Right: Time Slots */}
            <section className="flex-1 min-w-0">
                <StepHeading level="section" title="Escolha o horário" />

                <div className={`rounded-xl border ${cardBg} p-3 sm:p-4`}>
                    {!selectedProId ? (
                        <div className="py-10 flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] gap-2">
                            <User className="w-10 h-10 opacity-20" />
                            <p className="text-sm">Escolha um profissional para ver os horários.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {closed && (
                                <p
                                    data-testid="wizard-closed-day"
                                    className="flex items-start gap-2 text-sm text-theme-textSecondary"
                                >
                                    <MoonStar className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                                    <span><span className="font-semibold text-theme-text">Fechado neste dia.</span> Escolha qualquer horário para um encaixe.</span>
                                </p>
                            )}
                            {inHoursOpen.length > 0 && <div className={timeGridClass}>{inHoursOpen.map(renderTime)}</div>}
                            {!closed && outOfHoursOpen.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowOffHours((v) => !v)}
                                    aria-expanded={showOffHours}
                                    aria-controls="wizard-off-hours"
                                    className="w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg border border-dashed border-[var(--color-divider)] text-sm text-theme-textSecondary hover:text-theme-text hover:border-[var(--color-input-border)] transition-colors"
                                >
                                    <span>Horários fora do expediente <span className="text-[var(--color-text-muted)]">· encaixe</span></span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showOffHours ? 'rotate-180' : ''}`} aria-hidden="true" />
                                </button>
                            )}
                            {offHoursVisible && outOfHoursOpen.length > 0 && (
                                <div id="wizard-off-hours" className="space-y-3">
                                    {offHoursGroups.map((g) => (
                                        <div key={g.label}>
                                            {g.label && (
                                                <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-2">{g.label}</p>
                                            )}
                                            <div className={timeGridClass}>{g.times.map(renderTime)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
