import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessHoursEditor } from '../../components/BusinessHoursEditor';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    accent: {},
    colors: { inputBg: '', border: '', text: '', textMuted: '', textSecondary: '' },
    classes: { input: 'input' },
  }),
}));

const initial = {
  mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
  tue: { isOpen: false, blocks: [] },
  wed: { isOpen: false, blocks: [] },
  thu: { isOpen: false, blocks: [] },
  fri: { isOpen: false, blocks: [] },
  sat: { isOpen: false, blocks: [] },
  sun: { isOpen: false, blocks: [] },
};

function Harness() {
  const [hours, setHours] = useState<any>(initial);
  return (
    <>
      <BusinessHoursEditor hours={hours} onChange={setHours} />
      <output data-testid="json">{JSON.stringify(hours.mon)}</output>
    </>
  );
}

describe('BusinessHoursEditor — horários sempre em 24h', () => {
  it('não usa input type=time (depende do idioma do aparelho) e sim selects 24h', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('input[type="time"]')).toBeNull();
    expect(screen.getByLabelText('Segunda-feira, bloco 1, início (hora)')).toBeInTheDocument();
    expect(screen.getByLabelText('Segunda-feira, bloco 1, fim (minuto)')).toBeInTheDocument();
  });

  it('editar o fim para 21:00 grava HH:MM no estado', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(screen.getByLabelText('Segunda-feira, bloco 1, fim (hora)'), '21');
    expect(screen.getByTestId('json')).toHaveTextContent('"end":"21:00"');
    const hour = screen.getByLabelText('Segunda-feira, bloco 1, fim (hora)') as HTMLSelectElement;
    expect(within(hour).getAllByRole('option')).toHaveLength(24);
  });

  it('o par de horários cabe na linha: sem largura mínima fixa nos selects', () => {
    render(<Harness />);
    const hour = screen.getByLabelText('Segunda-feira, bloco 1, início (hora)');
    expect(hour.className).toMatch(/min-w-0/);
    expect(hour.parentElement?.className).toMatch(/min-w-0/);
  });
});
