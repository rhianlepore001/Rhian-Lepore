import React from 'react';
import { Clock } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { Card } from './ui/Card';

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
    const { colors, accent, font, classes, density } = useBrutalTheme({ override: forceTheme });
    const hoverBg = `hover:bg-[var(--color-accent-dim)]`;
    const slotPadding = density.tableRowPy;
    const selectedText = classes.buttonPrimary.split(' ').find((c) => c.startsWith('text-')) ?? colors.text;

    const lunchBreak = 'Almoço';

    const morningSlots = availableSlots.filter(slot => {
        const hour = parseInt(slot.split(':')[0], 10);
        return hour < 13;
    });

    const afternoonSlots = availableSlots.filter(slot => {
        const hour = parseInt(slot.split(':')[0], 10);
        if (morningSlots.length > 0) {
            const lastMorning = morningSlots[morningSlots.length - 1];
            const [lastMHour, lastMMin] = lastMorning.split(':').map(Number);
            const [currHour, currMin] = slot.split(':').map(Number);
            const diff = (currHour * 60 + currMin) - (lastMHour * 60 + lastMMin);
            return diff > 45;
        }
        return false;
    });

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
                className={[
                    'px-4 rounded-lg font-mono text-sm transition-all border min-h-[44px]',
                    slotPadding,
                    isSelected
                        ? `${accent.bg} ${selectedText} font-bold scale-105 shadow-lg`
                        : `${colors.text} ${colors.border} ${hoverBg} hover:scale-105`,
                ].join(' ')}
            >
                {time}
            </button>
        );
    };

    return (
        <Card variant="outlined" forceTheme={forceTheme} noPadding>
            <div className={density.cardPadding}>
                <div className="flex items-center gap-2 mb-4">
                    <Clock className={`w-5 h-5 ${accent.text}`} aria-hidden="true" />
                    <h3 className={`${colors.text} font-heading text-lg font-bold`}>Horários disponíveis</h3>
                </div>

                {displayMorning.length > 0 && (
                    <div className="mb-4">
                        <p className={`${colors.textMuted} text-xs ${font.mono} mb-2`}>Manhã</p>
                        <div className={`grid grid-cols-3 md:grid-cols-4 ${density.inlineGap}`}>
                            {displayMorning.map(renderTimeSlot)}
                        </div>
                    </div>
                )}

                {afternoonSlots.length > 0 && (
                    <div className={`flex items-center justify-center py-2 mb-4 ${density.sectionGap}`}>
                        <div className={`${colors.textMuted} text-xs ${font.mono} border-t border-b ${colors.divider} px-4 py-1`}>
                            {lunchBreak}
                        </div>
                    </div>
                )}

                {afternoonSlots.length > 0 && (
                    <div>
                        <p className={`${colors.textMuted} text-xs ${font.mono} mb-2`}>Tarde</p>
                        <div className={`grid grid-cols-3 md:grid-cols-4 ${density.inlineGap}`}>
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
        </Card>
    );
};
