import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { prefetchStaffPerformanceFromLocation } from '../../hooks/useStaffPerformance';

interface TeamPerformanceCardProps {
    /** Nome do mês do filtro atual (ex.: "Outubro"). */
    monthName: string;
    className?: string;
}

const warm = () => {
    prefetchStaffPerformanceFromLocation();
    void import('../../pages/StaffPerformance');
};

/** Entrada visível para Performance da equipe (PR-E, D-E2): cartão, não link de texto. */
export const TeamPerformanceCard: React.FC<TeamPerformanceCardProps> = ({ monthName, className = '' }) => {
    const { colors, accent, radius } = useBrutalTheme();
    return (
        <Link
            to="/financeiro/performance"
            data-testid="finance-performance-card"
            onPointerDown={warm}
            onMouseEnter={warm}
            className={`group flex items-center gap-3 p-4 md:p-5 min-h-[72px] border ${colors.border} ${colors.card} ${radius.card} transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${className}`}
        >
            <span className={`w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg ${accent.bgDim} ${accent.text}`} aria-hidden="true">
                <BarChart3 className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className={`block text-base font-semibold leading-tight ${colors.text}`}>Performance da equipe</span>
                <span className={`mt-1 block text-[13px] leading-snug ${colors.textSecondary}`}>
                    Como cada colaborador foi em {monthName.toLocaleLowerCase('pt-BR')}
                </span>
            </span>
            <ChevronRight className={`w-5 h-5 shrink-0 ${colors.textSecondary} transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none`} aria-hidden="true" />
        </Link>
    );
};
