import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { formatLocalDateString } from '../utils/date';
import { dateStringToLocalDate } from '../utils/businessTimezone';

interface CalendarPickerProps {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    minDate?: Date;
    forceTheme?: ThemeVariant;
    fullDates?: string[]; // Array of 'YYYY-MM-DD'
    /**
     * "Hoje" (YYYY-MM-DD) no fuso do negócio. Dias anteriores ficam desabilitados
     * e este dia recebe o destaque de hoje. Sem a prop, usa o dia do navegador.
     */
    today?: string;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
    selectedDate,
    onDateSelect,
    minDate = new Date(),
    forceTheme,
    fullDates = [],
    today,
}) => {
    const todayStr = today ?? formatLocalDateString(new Date());
    const [currentMonth, setCurrentMonth] = useState(() => dateStringToLocalDate(todayStr));
    const { colors, accent, font, shadow, isBeauty } = useBrutalTheme({ override: forceTheme });

    const hoverBg = `hover:bg-[var(--color-accent-dim)]`;
    const selectedClass = `${accent.bg} text-[var(--color-bg)]`;
    const todayClass = `border-2 ${accent.border}`;

    // Get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    // Datas comparadas como YYYY-MM-DD de calendário (sem toISOString, que em
    // fusos UTC+ como Lisboa/Londres rolava para o dia anterior e desabilitava
    // a segunda-feira no lugar do domingo fechado).
    const dayString = (day: number) =>
        formatLocalDateString(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));

    const isDateDisabled = (day: number) => {
        const dateStr = dayString(day);
        return dateStr < todayStr || fullDates.includes(dateStr);
    };

    const isDateSelected = (day: number) => {
        if (!selectedDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return (
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
        );
    };

    const isToday = (day: number) => dayString(day) === todayStr;

    const handleDateClick = (day: number) => {
        if (isDateDisabled(day)) return;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        onDateSelect(date);
    };

    // Generate calendar grid
    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const disabled = isDateDisabled(day);
        const selected = isDateSelected(day);
        const today = isToday(day);

        calendarDays.push(
            <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day)}
                disabled={disabled}
                data-date={dayString(day)}
                className={`
          h-12 rounded-lg ${font.mono} text-sm transition-all
          ${disabled
                        ? `${colors.textMuted} cursor-not-allowed opacity-40`
                        : `${colors.text} ${hoverBg} cursor-pointer hover:scale-105`
                    }
          ${selected
                        ? `${selectedClass} font-bold scale-105`
                        : ''
                    }
          ${today && !selected
                        ? `${todayClass}`
                        : ''
                    }
        `}
            >
                {day}
            </button>
        );
    }

    return (
        <div className={`${colors.card} ${colors.border} border rounded-2xl ${shadow.card} p-6`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    type="button"
                    onClick={goToPreviousMonth}
                    className={`p-2 ${hoverBg} rounded-lg transition-all`}
                    aria-label="Mês anterior"
                    title="Mês anterior"
                >
                    <ChevronLeft className={`w-5 h-5 ${colors.text}`} />
                </button>

                <h3 className={`${colors.text} font-heading text-lg uppercase`}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                    type="button"
                    onClick={goToNextMonth}
                    className={`p-2 ${hoverBg} rounded-lg transition-all`}
                    aria-label="Próximo mês"
                    title="Próximo mês"
                >
                    <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(name => (
                    <div key={name} className={`text-center ${colors.textMuted} text-xs ${font.mono} uppercase`}>
                        {name}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
                {calendarDays}
            </div>
        </div>
    );
};
