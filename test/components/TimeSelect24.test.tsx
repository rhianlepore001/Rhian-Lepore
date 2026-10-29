import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeSelect24, buildMinuteOptions, parseTime24 } from '../../components/TimeSelect24';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ classes: { input: 'input' }, colors: { textMuted: 'muted' } }),
}));

function Harness({ initial = '09:30' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TimeSelect24 value={value} onChange={setValue} ariaLabel="Início" />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('TimeSelect24', () => {
  it('lista as 24 horas em formato 00–23, sem AM/PM', () => {
    render(<Harness />);
    const hour = screen.getByLabelText('Início (hora)') as HTMLSelectElement;
    const labels = Array.from(hour.options).map((o) => o.textContent);
    expect(labels).toHaveLength(24);
    expect(labels[0]).toBe('00');
    expect(labels[23]).toBe('23');
    expect(labels.join('')).not.toMatch(/AM|PM/i);
    expect(hour.value).toBe('09');
    expect((screen.getByLabelText('Início (minuto)') as HTMLSelectElement).value).toBe('30');
  });

  it('troca hora e minuto e devolve HH:MM', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(screen.getByLabelText('Início (hora)'), '21');
    expect(screen.getByTestId('value')).toHaveTextContent('21:30');
    await user.selectOptions(screen.getByLabelText('Início (minuto)'), '45');
    expect(screen.getByTestId('value')).toHaveTextContent('21:45');
  });

  it('preserva minutos fora do passo de 5 já salvos (ex.: 09:10)', () => {
    render(<Harness initial="09:10" />);
    const minute = screen.getByLabelText('Início (minuto)') as HTMLSelectElement;
    expect(minute.value).toBe('10');
    expect(buildMinuteOptions('07')).toContain('07');
    expect(buildMinuteOptions('30')).toHaveLength(12);
  });

  it('valor inválido cai em 09:00 sem quebrar', () => {
    expect(parseTime24('')).toEqual({ hour: '09', minute: '00' });
    expect(parseTime24('25:99')).toEqual({ hour: '09', minute: '00' });
    expect(parseTime24('8:5')).toEqual({ hour: '09', minute: '00' });
    expect(parseTime24('18:00')).toEqual({ hour: '18', minute: '00' });
  });
});
