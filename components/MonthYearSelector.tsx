import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthYearSelectorProps {
    selectedMonth: number; // 0-11
    selectedYear: number;
    onChange: (month: number, year: number) => void;
    accentColor?: string;
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
    selectedMonth,
    selectedYear,
    onChange,
    accentColor = 'accent-gold'
}) => {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;

    const goToPreviousMonth = () => {
        if (selectedMonth === 0) {
            onChange(11, selectedYear - 1);
        } else {
            onChange(selectedMonth - 1, selectedYear);
        }
    };

    const goToNextMonth = () => {
        // Don't allow going to future months
        if (selectedYear === currentYear && selectedMonth === currentMonth) {
            return;
        }

        if (selectedMonth === 11) {
            onChange(0, selectedYear + 1);
        } else {
            onChange(selectedMonth + 1, selectedYear);
        }
    };

    const goToCurrentMonth = () => {
        onChange(currentMonth, currentYear);
    };

    const canGoNext = !(selectedYear === currentYear && selectedMonth === currentMonth);

    return (
        <div className="flex items-center justify-between gap-4 p-4 bg-neutral-900 border-2 border-neutral-800 rounded-lg">
            <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-neutral-800 rounded transition-colors text-white"
                title="Mês anterior"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${isCurrentMonth ? `text-${accentColor}` : 'text-neutral-500'}`} />
                <div className="text-center">
                    <p className="text-xl font-heading text-white uppercase tracking-wide">
                        {months[selectedMonth]} {selectedYear}
                    </p>
                    {isCurrentMonth && (
                        <p className={`text-xs font-mono text-${accentColor} uppercase tracking-wider mt-1`}>
                            Mês Atual
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!isCurrentMonth && (
                    <button
                        onClick={goToCurrentMonth}
                        className={`px-3 py-1 text-xs font-mono uppercase bg-${accentColor}/10 text-${accentColor} border border-${accentColor}/30 hover:bg-${accentColor}/20 transition-colors rounded`}
                    >
                        Hoje
                    </button>
                )}
                <button
                    onClick={goToNextMonth}
                    disabled={!canGoNext}
                    className={`p-2 rounded transition-colors ${canGoNext ? 'hover:bg-neutral-800 text-white' : 'text-neutral-700 cursor-not-allowed'}`}
                    title="Próximo mês"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
