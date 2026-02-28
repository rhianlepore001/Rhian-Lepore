import React, { useState, useEffect } from 'react';
import { User, Calendar, ChevronLeft, ChevronRight, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/Logger';

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
    accentColor,
    isBeauty,
    services,
    selectedServiceIds,
    user
}) => {
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
        setSelectedTime('');
    };

    useEffect(() => {
        if (selectedDate && user?.id && selectedProId) {
            fetchSlots();
        }
    }, [selectedDate, selectedProId]);

    const fetchSlots = async () => {
        setIsLoadingSlots(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];

            // Calculate total duration
            const duration = services
                .filter(s => selectedServiceIds.includes(s.id))
                .reduce((sum, s) => sum + (s.duration_minutes || 30), 0);

            logger.info('Buscando horários', {
                businessId: user?.id,
                dateStr,
                selectedProId,
                duration,
                selectedServiceIds
            });

            const { data, error } = await supabase.rpc('get_available_slots', {
                p_business_id: user?.id,
                p_date: dateStr,
                p_professional_id: selectedProId || null,
                p_duration_min: duration,
                p_is_professional: true
            });

            if (error) {
                logger.error('Erro ao buscar horários:', error, {
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
            } else {
                logger.info('Horários recebidos:', {
                    data,
                    slotsCount: data?.slots?.length || 0,
                    slots: data?.slots
                });
            }

            if (data?.slots) {
                setAvailableSlots(data.slots);
            }
        } catch (error) {
            logger.error('Exceção ao buscar horários:', error);
        } finally {
            setIsLoadingSlots(false);
        }
    };


    return (
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
    );
};
