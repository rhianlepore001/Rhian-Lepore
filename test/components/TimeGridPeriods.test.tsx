import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeGrid, slotPeriodLabel } from '../../components/TimeGrid';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: 'text-main', textMuted: 'text-muted', border: 'border-x', divider: 'divide-x' },
    accent: { bg: 'bg-accent', text: 'text-accent' },
    font: { mono: 'font-mono' },
    classes: { buttonPrimary: 'btn text-on-accent' },
    density: { tableRowPy: 'py-2', cardPadding: 'p-4', inlineGap: 'gap-2', sectionGap: 'my-2' },
  }),
}));
vi.mock('../../components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const slotsFrom = (start: string, end: string) => {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const out: string[] = [];
  for (let m = toMin(start); m <= toMin(end); m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
};

const headings = () =>
  screen.queryAllByText(/^(Manhã|Tarde|Noite|Almoço)$/).map((el) => el.textContent);

describe('TimeGrid — rótulo do grupo segue a hora real dos slots', () => {
  it('slotPeriodLabel: <12 Manhã, 12–17:59 Tarde, ≥18 Noite', () => {
    expect(slotPeriodLabel('11:30')).toBe('Manhã');
    expect(slotPeriodLabel('12:00')).toBe('Tarde');
    expect(slotPeriodLabel('17:59')).toBe('Tarde');
    expect(slotPeriodLabel('18:00')).toBe('Noite');
    expect(slotPeriodLabel('23:30')).toBe('Noite');
  });

  it('só horários da tarde (hoje às 16:00, passados filtrados) não aparecem como "Manhã"', () => {
    render(<TimeGrid selectedTime={null} onTimeSelect={() => undefined} availableSlots={slotsFrom('16:30', '18:30')} />);
    expect(headings()).toEqual(['Tarde']);
  });

  it('negócio que abre às 14:00 (também acontecia na main) mostra "Tarde"', () => {
    render(<TimeGrid selectedTime={null} onTimeSelect={() => undefined} availableSlots={slotsFrom('14:00', '17:30')} />);
    expect(headings()).toEqual(['Tarde']);
  });

  it('só horários da noite mostram "Noite"', () => {
    render(<TimeGrid selectedTime={null} onTimeSelect={() => undefined} availableSlots={slotsFrom('19:00', '21:30')} />);
    expect(headings()).toEqual(['Noite']);
  });

  it('dia com pausa de almoço mantém Manhã / Almoço / Tarde', () => {
    const slots = [...slotsFrom('09:00', '11:30'), ...slotsFrom('14:00', '17:30')];
    render(<TimeGrid selectedTime={null} onTimeSelect={() => undefined} availableSlots={slots} />);
    expect(headings()).toEqual(['Manhã', 'Almoço', 'Tarde']);
  });

  it('pausa e segundo bloco começando às 18:00 vira Manhã / Almoço / Noite', () => {
    const slots = [...slotsFrom('09:00', '12:00'), ...slotsFrom('18:00', '20:30')];
    render(<TimeGrid selectedTime={null} onTimeSelect={() => undefined} availableSlots={slots} />);
    expect(headings()).toEqual(['Manhã', 'Almoço', 'Noite']);
  });
});
