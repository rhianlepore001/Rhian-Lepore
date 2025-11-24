import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    minDate?: Date;
    isBeauty?: boolean;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
    selectedDate,
    onDateSelect,
    minDate = new Date(),
    isBeauty = false
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const hoverBg = isBeauty ? 'hover:bg-beauty-neon/10' : 'hover:bg-accent-gold/10';

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

    const isDateDisabled = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date < minDate;
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

    const isToday = (day: number) => {
        const today = new Date();
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const handleDateClick = (day: number) => {
        if (isDateDisabled(day)) return;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
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
                type="button" // FIX: Prevent accidental form submission
                onClick={() => handleDateClick(day)}
                disabled={disabled}
                className={`
          h-12 rounded-lg font-mono text-sm transition-all
          ${disabled
                        ? 'text-neutral-600 cursor-not-allowed'
                        : `text-white ${hoverBg} cursor-pointer hover:scale-105`
                    }
          ${selected
                        ? `bg-${accentColor} text-black font-bold scale-105`
                        : ''
                    }
          ${today && !selected
                        ? `border-2 border-${accentColor}`
                        : ''
                    }
        `}
            >
                {day}
            </button>
        );
    }

    return (
        <div className={`${isBeauty ? 'bg-white/5 border border-white/10 rounded-2xl' : 'bg-black/40 border-2 border-neutral-800'} p-6`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    type="button" // FIX: Prevent accidental form submission
                    onClick={goToPreviousMonth}
                    className={`p-2 ${hoverBg} rounded-lg transition-all`}
                >
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>

                <h3 className="text-white font-heading text-lg uppercase">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                    type="button" // FIX: Prevent accidental form submission
                    onClick={goToNextMonth}
                    className={`p-2 ${hoverBg} rounded-lg transition-all`}
                >
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(name => (
                    <div key={name} className="text-center text-neutral-400 text-xs font-mono uppercase">
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