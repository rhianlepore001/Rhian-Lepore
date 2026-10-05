import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgendaMonthPicker } from '../../components/agenda/AgendaMonthPicker';
import { resolveMonthJump } from '../../components/agenda/AgendaDayScroller';

const theme = {
  colors: {
    card: 'bg-white',
    border: 'border-gray',
    text: 'text-black',
    textMuted: 'text-muted',
    textSecondary: 'text-secondary',
    surface: 'bg-surface',
  },
  accent: { bg: 'bg-accent', text: 'text-accent' },
};

describe('resolveMonthJump', () => {
  it('mês atual → hoje; outro mês → dia 1', () => {
    const today = new Date(2026, 9, 5, 15, 0, 0); // 5 Out 2026
    const cur = resolveMonthJump(9, 2026, today);
    expect(cur.getFullYear()).toBe(2026);
    expect(cur.getMonth()).toBe(9);
    expect(cur.getDate()).toBe(5);

    const jan = resolveMonthJump(0, 2026, today);
    expect(jan.getFullYear()).toBe(2026);
    expect(jan.getMonth()).toBe(0);
    expect(jan.getDate()).toBe(1);
  });
});

describe('AgendaMonthPicker', () => {
  it('não renderiza quando fechado', () => {
    render(
      <AgendaMonthPicker
        open={false}
        selectedMonth={9}
        selectedYear={2026}
        onClose={vi.fn()}
        onSelectMonth={vi.fn()}
        onToday={vi.fn()}
        {...theme}
      />,
    );
    expect(screen.queryByTestId('agenda-month-picker')).toBeNull();
  });

  it('escolhe mês, troca ano e Hoje; Esc fecha', () => {
    const onSelectMonth = vi.fn();
    const onToday = vi.fn();
    const onClose = vi.fn();
    render(
      <AgendaMonthPicker
        open
        selectedMonth={9}
        selectedYear={2026}
        onClose={onClose}
        onSelectMonth={onSelectMonth}
        onToday={onToday}
        {...theme}
      />,
    );

    expect(screen.getByTestId('agenda-month-year')).toHaveTextContent('2026');
    fireEvent.click(screen.getByTestId('agenda-month-year-prev'));
    expect(screen.getByTestId('agenda-month-year')).toHaveTextContent('2025');

    fireEvent.click(screen.getByTestId('agenda-month-0')); // Janeiro
    expect(onSelectMonth).toHaveBeenCalledWith(0, 2025);

    fireEvent.click(screen.getByTestId('agenda-month-hoje'));
    expect(onToday).toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('setas no ano via teclado no rótulo', () => {
    render(
      <AgendaMonthPicker
        open
        selectedMonth={0}
        selectedYear={2026}
        onClose={vi.fn()}
        onSelectMonth={vi.fn()}
        onToday={vi.fn()}
        {...theme}
      />,
    );
    const year = screen.getByTestId('agenda-month-year');
    fireEvent.keyDown(year, { key: 'ArrowLeft' });
    expect(year).toHaveTextContent('2025');
    fireEvent.keyDown(year, { key: 'ArrowRight' });
    expect(year).toHaveTextContent('2026');
  });
});
