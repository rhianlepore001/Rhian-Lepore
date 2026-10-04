import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MonthStepperProps {
  month: number; // 0-11
  year: number;
  onChange: (month: number, year: number) => void;
  /** Mês "hoje" do negócio; não deixa avançar além dele. */
  today?: { month: number; year: number };
  className?: string;
}

/**
 * Seletor de mês compacto (PR-F #9): ‹ Outubro 2026 › na linha do título.
 * No celular estreito usa o mês abreviado ("Out 2026") para caber ao lado do título e do "⋯".
 */
export const MonthStepper: React.FC<MonthStepperProps> = ({ month, year, onChange, today, className = '' }) => {
  const { colors, radius } = useBrutalTheme();
  const now = today ?? { month: new Date().getMonth(), year: new Date().getFullYear() };
  const canGoNext = year < now.year || (year === now.year && month < now.month);
  const full = `${MONTHS[month]} ${year}`;
  const short = `${MONTHS[month].slice(0, 3)} ${year}`;

  const prev = () => (month === 0 ? onChange(11, year - 1) : onChange(month - 1, year));
  const next = () => {
    if (!canGoNext) return;
    if (month === 11) onChange(0, year + 1);
    else onChange(month + 1, year);
  };

  const arrow = `inline-flex h-11 w-10 md:h-9 md:w-9 items-center justify-center ${radius.button} transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)]`;

  return (
    <div
      data-testid="finance-month-stepper"
      role="group"
      aria-label="Mês do financeiro"
      className={`inline-flex shrink-0 items-center ${radius.button} border ${colors.border} ${colors.card} ${className}`}
    >
      <button
        type="button"
        onClick={prev}
        aria-label="Mês anterior"
        title="Mês anterior"
        className={`${arrow} ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        className={`px-1 text-sm font-semibold tabular-nums whitespace-nowrap ${colors.text}`}
        aria-live="polite"
        aria-label={full}
      >
        <span className="min-[400px]:hidden" aria-hidden="true">{short}</span>
        <span className="hidden min-[400px]:inline" aria-hidden="true">{full}</span>
      </span>
      <button
        type="button"
        onClick={next}
        disabled={!canGoNext}
        aria-label="Próximo mês"
        title="Próximo mês"
        className={`${arrow} ${canGoNext ? `${colors.textSecondary} hover:bg-[var(--color-card-hover)]` : `${colors.textMuted} cursor-not-allowed`}`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
