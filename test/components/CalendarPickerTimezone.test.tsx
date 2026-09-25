import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarPicker } from '../../components/CalendarPicker';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    accent: { bg: 'bg-accent', border: 'border-accent' },
    colors: { text: 'text-main', textMuted: 'text-muted', card: 'card', border: 'border-x' },
    font: { mono: 'font-mono' },
    shadow: { card: 'shadow' },
    isBeauty: false,
  }),
}));

const dayButton = (day: number) =>
  screen.getAllByRole('button').find((b) => b.textContent?.trim() === String(day)) as HTMLButtonElement;

describe('CalendarPicker — dias fechados e "hoje" independem do fuso do navegador', () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 25/09/2026 12:00Z — sexta-feira em qualquer um dos fusos testados
    vi.setSystemTime(new Date('2026-09-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTz;
  });

  it.each(['Europe/Lisbon', 'Europe/London', 'America/Sao_Paulo', 'America/Manaus', 'UTC'])(
    'domingo 27/09 fechado desabilita o domingo (não a segunda) com navegador em %s',
    (tz) => {
      process.env.TZ = tz;
      render(<CalendarPicker selectedDate={null} onDateSelect={() => undefined} fullDates={['2026-09-27']} today="2026-09-25" />);
      expect(dayButton(27).disabled).toBe(true);
      expect(dayButton(28).disabled).toBe(false);
      expect(dayButton(28).getAttribute('data-date')).toBe('2026-09-28');
    },
  );

  it('usa o "hoje" do negócio: dias anteriores ficam desabilitados', () => {
    process.env.TZ = 'America/Sao_Paulo';
    // Navegador ainda em 25/09, mas o negócio (Lisboa) já está em 26/09
    render(<CalendarPicker selectedDate={null} onDateSelect={() => undefined} today="2026-09-26" />);
    expect(dayButton(25).disabled).toBe(true);
    expect(dayButton(26).disabled).toBe(false);
  });
});
