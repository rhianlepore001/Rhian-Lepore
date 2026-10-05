import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export interface AgendaMonthPickerTheme {
  colors: {
    card: string;
    border: string;
    text: string;
    textMuted: string;
    textSecondary: string;
    surface: string;
  };
  accent: {
    bg: string;
    text: string;
  };
}

export const AGENDA_MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export interface AgendaMonthPickerProps extends AgendaMonthPickerTheme {
  open: boolean;
  /** Mês selecionado na Agenda (0–11). */
  selectedMonth: number;
  /** Ano selecionado na Agenda. */
  selectedYear: number;
  onClose: () => void;
  /** Escolheu um mês no grid. */
  onSelectMonth: (month: number, year: number) => void;
  /** Atalho "Hoje" — pai decide a data e fecha. */
  onToday: () => void;
  className?: string;
}

/**
 * Painel de mês/ano da Agenda: ‹ ano › + grade 12 meses + "Hoje".
 * Sem minDate — gestor precisa de histórico e futuro. Não reutiliza CalendarPicker
 * (que desabilita dias passados no agendamento público).
 * Células do mês: transparentes no card (não usam surface — evita grade lilás no salão claro).
 */
export const AgendaMonthPicker: React.FC<AgendaMonthPickerProps> = ({
  open,
  selectedMonth,
  selectedYear,
  onClose,
  onSelectMonth,
  onToday,
  colors,
  accent,
  className = '',
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState(selectedYear);

  useEffect(() => {
    if (open) setViewYear(selectedYear);
  }, [open, selectedYear]);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        close();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    // Próximo tick: evita fechar no mesmo clique que abriu.
    const t = window.setTimeout(() => {
      document.addEventListener('pointerdown', onDown);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  if (!open) return null;

  const now = new Date();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  const onYearKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setViewYear((y) => y - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setViewYear((y) => y + 1);
    }
  };

  const arrowBtn =
    `inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ` +
    `focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ` +
    `${colors.textSecondary} hover:bg-[var(--color-card-hover)]`;

  return (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="agenda-month-picker"
        className={[
          'absolute left-0 right-0 top-full z-40 mt-2 p-3 sm:p-4',
          'max-w-sm sm:max-w-md',
          colors.card,
          colors.border,
          'border rounded-2xl shadow-[var(--shadow-card)]',
          className,
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            aria-label="Ano anterior"
            title="Ano anterior"
            data-testid="agenda-month-year-prev"
            onClick={() => setViewYear((y) => y - 1)}
            className={arrowBtn}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <p
            id={titleId}
            tabIndex={0}
            onKeyDown={onYearKey}
            aria-live="polite"
            data-testid="agenda-month-year"
            className={`text-base font-heading font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-lg px-2 ${colors.text}`}
          >
            {viewYear}
          </p>
          <button
            type="button"
            aria-label="Próximo ano"
            title="Próximo ano"
            data-testid="agenda-month-year-next"
            onClick={() => setViewYear((y) => y + 1)}
            className={arrowBtn}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div
          role="listbox"
          aria-label="Meses"
          className="grid grid-cols-3 gap-2"
        >
          {AGENDA_MONTHS_PT.map((label, month) => {
            const isSelected = month === selectedMonth && viewYear === selectedYear;
            const isCurrent = month === todayMonth && viewYear === todayYear;
            return (
              <button
                key={label}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={`${label} ${viewYear}`}
                data-testid={`agenda-month-${month}`}
                onClick={() => onSelectMonth(month, viewYear)}
                className={[
                  'min-h-[44px] px-2 py-2 text-sm font-medium rounded-xl border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
                  // Sem colors.surface: no salão claro a surface (#DDD4EF) deixa a grade
                  // toda lilás e "estoura" o painel. Células vazadas no card, como o menu do Financeiro.
                  isSelected
                    ? `${accent.bg} text-[var(--color-on-accent)] border-transparent`
                    : `${colors.border} ${colors.text} bg-transparent hover:bg-[var(--color-card-hover)] hover:border-[var(--color-border-strong)]`,
                  !isSelected && isCurrent ? `ring-1 ring-[var(--color-accent-border)] ${accent.text}` : '',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            data-testid="agenda-month-hoje"
            onClick={onToday}
            className={[
              'inline-flex min-h-[44px] items-center px-4 text-sm font-semibold rounded-xl border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
              colors.border,
              colors.card,
              accent.text,
              'hover:bg-[var(--color-accent-dim)]',
            ].join(' ')}
          >
            Hoje
          </button>
        </div>
      </div>
  );
};
