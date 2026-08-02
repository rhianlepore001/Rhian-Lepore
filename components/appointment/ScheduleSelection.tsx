import React, { useMemo } from 'react';
import { User, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { buildManualBookingTimeSlots } from '../../utils/agendaTimeSlots';

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
}

/**
 * Seleção de horário para agendamento INTERNO (gestor/colaborador).
 * Não usa get_available_slots / horário de funcionamento — controle total.
 * Booking online continua limitado via PublicBooking + RPC.
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
}) => {
    const timeSlots = useMemo(() => buildManualBookingTimeSlots(), []);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
        setSelectedTime('');
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Left: Professionals & Date */}
            <div className="md:w-1/3 space-y-6">
                <div>
                    <h4 className="text-theme-text font-bold mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" /> Profissional
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {teamMembers.map(member => (
                            <button
                                key={member.id}
                                onClick={() => setSelectedProId(member.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                                    ${selectedProId === member.id ? activeCardBg : `${cardBg} hover:border-[var(--color-input-border)]`}
                                `}
                            >
                                {member.photo_url ? (
                                    <img src={member.photo_url} className="w-10 h-10 rounded-full object-cover border border-[var(--color-divider)]" alt="" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[var(--color-card-hover)] flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                )}
                                <div>
                                    <p className={`font-bold leading-tight ${selectedProId === member.id ? 'text-[var(--color-on-accent)]' : 'text-theme-text'}`}>{member.name}</p>
                                    <p className="text-xs opacity-70">Disponível</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-theme-text font-bold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Data
                    </h4>
                    <div className={`p-4 rounded-xl border ${cardBg}`}>
                        <div className="flex items-center justify-between mb-4">
                            <button type="button" onClick={() => changeDate(-1)} className="p-1 hover:bg-[var(--color-card-hover)] rounded"><ChevronLeft className="w-5 h-5 text-theme-text" /></button>
                            <span className="text-theme-text font-bold uppercase">{selectedDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                            <button type="button" onClick={() => changeDate(1)} className="p-1 hover:bg-[var(--color-card-hover)] rounded"><ChevronRight className="w-5 h-5 text-theme-text" /></button>
                        </div>
                        <div className="text-center">
                            <p className="text-4xl font-heading text-theme-accent">{selectedDate.getDate()}</p>
                            <p className="text-theme-text uppercase text-sm mb-2">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(new Date())}
                                className="text-xs underline text-[var(--color-text-muted)] hover:text-theme-text"
                            >
                                Ir para Hoje
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Time Slots */}
            <div className="flex-1 flex flex-col">
                <h4 className="text-theme-text font-bold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Horário
                </h4>

                <div className={`flex-1 rounded-xl border ${cardBg} p-4 overflow-y-auto min-h-[300px]`}>
                    {!selectedProId ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-2">
                            <User className="w-10 h-10 opacity-20" />
                            <p>Selecione um profissional primeiro</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                            {timeSlots.map(time => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => setSelectedTime(time)}
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
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
