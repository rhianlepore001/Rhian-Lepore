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
    expect(selected.className).not.toContain('h-[68px]');
  });
});
