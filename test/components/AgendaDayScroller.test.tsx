import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgendaDayScroller } from '../../components/agenda/AgendaDayScroller';

const theme = {
  colors: {
    card: 'bg-white',
    border: 'border-gray',
    text: 'text-black',
    textMuted: 'text-muted',
    textSecondary: 'text-secondary',
    surface: 'bg-surface',
  },
  accent: {
    bg: 'bg-accent',
    text: 'text-accent',
  },
};

describe('AgendaDayScroller', () => {
  it('renderiza faixa de dias sem setas de semana', () => {
    const onSelectDate = vi.fn();
    render(
      <AgendaDayScroller
        selectedDate={new Date('2026-08-05T12:00:00')}
        onSelectDate={onSelectDate}
        {...theme}
      />,
    );

    expect(screen.getByTestId('agenda-day-scroller')).toBeTruthy();
    expect(screen.queryByLabelText('Semana anterior')).toBeNull();
    expect(screen.queryByLabelText('Próxima semana')).toBeNull();
    expect(screen.getByTestId('agenda-day-selected')).toBeTruthy();
  });

  it('seleciona dia ao clicar', () => {
    const onSelectDate = vi.fn();
    render(
      <AgendaDayScroller
        selectedDate={new Date('2026-08-05T12:00:00')}
        onSelectDate={onSelectDate}
        {...theme}
      />,
    );

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);
    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it('chip selecionado usa tamanho compacto w-11 h-14', () => {
    render(
      <AgendaDayScroller
        selectedDate={new Date('2026-08-05T12:00:00')}
        onSelectDate={vi.fn()}
        {...theme}
      />,
    );

    const selected = screen.getByTestId('agenda-day-selected');
    expect(selected.className).toContain('w-11');
    expect(selected.className).toContain('h-14');
    expect(selected.className).toContain('snap-start');
    expect(selected.className).not.toContain('h-[68px]');
  });

  it('não usa padding de 50% que cria vazio no início/fim', () => {
    render(
      <AgendaDayScroller
        selectedDate={new Date('2026-08-05T12:00:00')}
        onSelectDate={vi.fn()}
        {...theme}
      />,
    );
    const listbox = screen.getByRole('listbox', { name: 'Calendário de dias' });
    expect(listbox.className).not.toMatch(/50%-28px/);
    expect(listbox.className).toMatch(/snap-x/);
  });

  it('mês é botão; abre painel e ao escolher mês chama onSelectDate', () => {
    const onSelectDate = vi.fn();
    render(
      <AgendaDayScroller
        selectedDate={new Date('2026-10-05T12:00:00')}
        onSelectDate={onSelectDate}
        {...theme}
      />,
    );

    const trigger = screen.getByTestId('agenda-month-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('agenda-month-picker')).toBeTruthy();

    fireEvent.click(screen.getByTestId('agenda-month-0')); // Janeiro
    expect(onSelectDate).toHaveBeenCalled();
    const d: Date = onSelectDate.mock.calls[0][0];
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('chip Hoje aparece quando a data não é hoje', () => {
    const onSelectDate = vi.fn();
    render(
      <AgendaDayScroller
        selectedDate={new Date('2026-01-15T12:00:00')}
        onSelectDate={onSelectDate}
        {...theme}
      />,
    );
    fireEvent.click(screen.getByTestId('agenda-hoje-chip'));
    expect(onSelectDate).toHaveBeenCalled();
    const d: Date = onSelectDate.mock.calls[0][0];
    const now = new Date();
    expect(d.getFullYear()).toBe(now.getFullYear());
    expect(d.getMonth()).toBe(now.getMonth());
    expect(d.getDate()).toBe(now.getDate());
  });
});
