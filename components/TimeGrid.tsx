import React from 'react';
import { Clock } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';

interface TimeGridProps {
    selectedTime: string | null;
    onTimeSelect: (time: string) => void;
    availableSlots?: string[];
    forceTheme?: ThemeVariant;
}

export const TimeGrid: React.FC<TimeGridProps> = ({
    selectedTime,
    onTimeSelect,
    availableSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ],
    forceTheme
}) => {
    const { colors, accent, font, isBeauty } = useBrutalTheme({ override: forceTheme });
    const hoverBg = `hover:${accent.bgDim}`;

    // Lunch break placeholder
    const lunchBreak = 'ALMOÇO';

    // Group slots by period
    // Morning slots: earlier than the first interval after 12:00
    const morningSlots = availableSlots.filter(slot => {
        const hour = parseInt(slot.split(':')[0]);
        return hour < 13;
    });

    // Afternoon slots: everything after the first morning period
    const afternoonSlots = availableSlots.filter(slot => {
        const hour = parseInt(slot.split(':')[0]);
        if (morningSlots.length > 0) {
            const lastMorning = morningSlots[morningSlots.length - 1];
            const [lastMHour, lastMMin] = lastMorning.split(':').map(Number);
            const [currHour, currMin] = slot.split(':').map(Number);
            const diff = (currHour * 60 + currMin) - (lastMHour * 60 + lastMMin);
            return diff > 45; // Only treat as afternoon if there's a gap
        }
        return false;
    });

    // Re-calculating actual display slots to avoid duplicates
    const displayMorning = availableSlots.filter(slot => {
        if (afternoonSlots.length > 0) {
            const firstAfternoon = afternoonSlots[0];
            return slot < firstAfternoon;
        }
        return true;
    });

    const renderTimeSlot = (time: string) => {
        const isSelected = selectedTime === time;

        return (
            <button
                key={time}
                type="button"
                onClick={() => onTimeSelect(time)}
                className={`
          px-4 py-3 rounded-lg ${font.mono} text-sm transition-all border
          ${isSelected
                        ? `${accent.bg} ${isBeauty ? 'text-white' : 'text-black'} font-bold scale-105 shadow-lg`
                        : `${colors.text} ${colors.border} ${hoverBg} hover:scale-105`
                    }
        `}
            >
                {time}
            </button>
        );
    };

    return (
        <div className={`${colors.card} ${colors.border} border rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-4">
                <Clock className={`w-5 h-5 ${accent.text}`} />
                <h3 className={`${colors.text} font-heading text-lg uppercase`}>Horários Disponíveis</h3>
            </div>

            {/* Morning slots */}
            {displayMorning.length > 0 && (
                <div className="mb-4">
                    <p className={`${colors.textMuted} text-xs ${font.mono} uppercase mb-2`}>Manhã</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {displayMorning.map(renderTimeSlot)}
                    </div>
                </div>
            )}

            {afternoonSlots.length > 0 && (
                <div className="flex items-center justify-center py-2 mb-4">
                    <div className={`${colors.textMuted} text-xs ${font.mono} uppercase border-t border-b ${colors.divider} px-4 py-1`}>
                        {lunchBreak}
                    </div>
                </div>
            )}

            {/* Afternoon slots */}
            {afternoonSlots.length > 0 && (
                <div>
                    <p className={`${colors.textMuted} text-xs ${font.mono} uppercase mb-2`}>Tarde</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {afternoonSlots.map(renderTimeSlot)}
                    </div>
                </div>
            )}

            {availableSlots.length === 0 && (
                <div className="text-center py-8">
                    <p className={`${colors.textMuted} text-sm`}>Nenhum horário disponível para esta data.</p>
                    <p className={`${colors.textMuted} text-xs mt-2 opacity-70`}>Tente selecionar outro dia.</p>
                </div>
            )}
        </div>
    );
};
