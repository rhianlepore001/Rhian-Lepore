import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatLocalDateString } from '../../utils/date';
import { AgendaMonthPicker } from './AgendaMonthPicker';

export interface AgendaDayScrollerTheme {
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

export interface AgendaDayScrollerProps extends AgendaDayScrollerTheme {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** Dias antes/depois do início da semana selecionada (default 21 ≈ 3 semanas). */
  rangeDays?: number;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function buildDayRange(anchor: Date, rangeDays: number): Date[] {
  const start = mondayOf(anchor);
  start.setDate(start.getDate() - rangeDays);
  const total = rangeDays * 2 + 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Dia alvo ao escolher um mês: hoje se for o mês atual, senão o dia 1. */
export function resolveMonthJump(month: number, year: number, today = new Date()): Date {
  const now = startOfDay(today);
  if (month === now.getMonth() && year === now.getFullYear()) {
    return now;
  }
  return new Date(year, month, 1, 12, 0, 0, 0);
}

/**
 * Seletor de dias da Agenda: faixa horizontal com snap + arraste (touch e mouse).
 * O rótulo do mês abre o painel de mês/ano (AgendaMonthPicker).
 */
export const AgendaDayScroller: React.FC<AgendaDayScrollerProps> = ({
  selectedDate,
  onSelectDate,
  colors,
  accent,
  rangeDays = 21,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const monthBtnRef = useRef<HTMLButtonElement>(null);
  const pickerId = useId();
  const [monthOpen, setMonthOpen] = useState(false);

  const selectedKey = formatLocalDateString(selectedDate);
  // Âncora no próprio dia selecionado: ao pular de mês, a faixa é reconstruída
  // em torno da nova data (não fica presa à semana antiga).
  const rangeAnchorKey = formatLocalDateString(startOfDay(selectedDate));
  const days = useMemo(() => {
    const anchor = new Date(`${rangeAnchorKey}T12:00:00`);
    return buildDayRange(anchor, rangeDays);
  }, [rangeAnchorKey, rangeDays]);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    scrollLeft: number;
    pointerId: number | null;
  }>({ active: false, moved: false, startX: 0, scrollLeft: 0, pointerId: null });

  const scrollSelectedIntoView = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const root = scrollerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-day="${selectedKey}"]`);
    if (!el) return;
    const maxScroll = Math.max(0, root.scrollWidth - root.clientWidth);
    const centered = el.offsetLeft - (root.clientWidth / 2) + (el.offsetWidth / 2);
    const target = Math.min(maxScroll, Math.max(0, centered));
    if (typeof root.scrollTo === 'function') {
      root.scrollTo({ left: target, behavior });
    } else {
      root.scrollLeft = target;
    }
  }, [selectedKey]);

  useEffect(() => {
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) scrollSelectedIntoView('auto');
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [scrollSelectedIntoView]);

  const monthLabel = useMemo(() => {
    const raw = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [selectedDate]);

  const isSelectedToday = isSameCalendarDay(selectedDate, new Date());

  const closeMonthPicker = useCallback(() => {
    setMonthOpen(false);
    window.requestAnimationFrame(() => monthBtnRef.current?.focus());
  }, []);

  const jumpToMonth = useCallback((month: number, year: number) => {
    setMonthOpen(false);
    onSelectDate(resolveMonthJump(month, year));
  }, [onSelectDate]);

  const jumpToToday = useCallback(() => {
    setMonthOpen(false);
    onSelectDate(startOfDay(new Date()));
  }, [onSelectDate]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const root = scrollerRef.current;
    if (!root) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: root.scrollLeft,
      pointerId: e.pointerId,
    };
    setIsDragging(true);
    root.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const root = scrollerRef.current;
    if (!drag.active || !root || e.pointerType !== 'mouse') return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 4) drag.moved = true;
    root.scrollLeft = drag.scrollLeft - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const root = scrollerRef.current;
    if (!drag.active) return;
    if (root && drag.pointerId != null) {
      try {
        root.releasePointerCapture(drag.pointerId);
      } catch {
        /* already released */
      }
    }
    dragRef.current = { ...drag, active: false, pointerId: null };
    setIsDragging(false);
    if (drag.moved) {
      e.preventDefault();
    }
  };

  const handleDayClick = (d: Date) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    onSelectDate(d);
  };

  const handleKeyNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = startOfDay(selectedDate);
    next.setDate(next.getDate() + (e.key === 'ArrowRight' ? 1 : -1));
    onSelectDate(next);
  };

  return (
    <div data-testid="agenda-day-scroller" className="relative">
      <div className="mb-1 flex items-center gap-2 min-w-0">
        <button
          ref={monthBtnRef}
          type="button"
          data-testid="agenda-month-trigger"
          aria-haspopup="dialog"
          aria-expanded={monthOpen}
          aria-controls={monthOpen ? pickerId : undefined}
          onClick={() => setMonthOpen((v) => !v)}
          className={[
            'inline-flex max-w-full items-center gap-1.5 rounded-xl px-1.5 py-1 -ml-1.5',
            'text-sm font-heading tracking-wide transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
            colors.textSecondary,
            'hover:text-theme-text hover:bg-[var(--color-card-hover)]',
          ].join(' ')}
        >
          <span className="truncate">{monthLabel}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${monthOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {!isSelectedToday && (
          <button
            type="button"
            data-testid="agenda-hoje-chip"
            onClick={jumpToToday}
            className={[
              'inline-flex shrink-0 items-center min-h-[32px] px-2.5 text-xs font-semibold rounded-full border',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
              colors.border,
              accent.text,
              'hover:bg-[var(--color-accent-dim)]',
            ].join(' ')}
          >
            Hoje
          </button>
        )}
      </div>

      <div id={pickerId}>
        <AgendaMonthPicker
          open={monthOpen}
          selectedMonth={selectedDate.getMonth()}
          selectedYear={selectedDate.getFullYear()}
          onClose={closeMonthPicker}
          onSelectMonth={jumpToMonth}
          onToday={jumpToToday}
          colors={colors}
          accent={accent}
        />
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          role="listbox"
          aria-label="Calendário de dias"
          aria-orientation="horizontal"
          tabIndex={0}
          onKeyDown={handleKeyNav}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`flex gap-2 overflow-x-auto overscroll-x-contain py-1 snap-x snap-mandatory scrollbar-hide touch-pan-x select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {days.map((d) => {
            const key = formatLocalDateString(d);
            const isSelected = key === selectedKey;
            const isToday = d.toDateString() === new Date().toDateString();
            const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
            const dayNum = d.getDate();
            const isMonthStart = dayNum === 1;

            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-day={key}
                data-testid={isSelected ? 'agenda-day-selected' : undefined}
                onClick={() => handleDayClick(d)}
                className={[
                  'snap-start shrink-0 flex flex-col items-center justify-center',
                  'w-11 h-14 rounded-2xl border transition-[transform,background-color,color,box-shadow,border-color] duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
                  isSelected
                    ? `${accent.bg} text-[var(--color-on-accent)] border-transparent shadow-[var(--shadow-card-accent)] scale-[1.02]`
                    : `${colors.card} ${colors.border} ${colors.textMuted} hover:text-theme-text hover:border-[var(--color-border-strong)]`,
                  !isSelected && isToday ? `ring-1 ring-current ${accent.text}` : '',
                ].join(' ')}
              >
                <span className="text-xs font-medium capitalize leading-none mb-1.5 opacity-90">
                  {dayName}
                </span>
                <span
                  className={`text-lg font-heading font-bold leading-none tabular-nums ${
                    isSelected ? 'text-[var(--color-on-accent)]' : colors.text
                  }`}
                >
                  {dayNum}
                </span>
                {isMonthStart && !isSelected && (
                  <span className={`mt-1 text-xs uppercase tracking-wider ${colors.textMuted}`}>
                    {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
