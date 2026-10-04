import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MonthStepper } from '../../components/finance/MonthStepper';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

describe('MonthStepper (PR-F #9)', () => {
  it('mostra o mês e não deixa passar do mês atual', () => {
    const onChange = vi.fn();
    render(<MonthStepper month={9} year={2026} onChange={onChange} today={{ month: 9, year: 2026 }} />);
    const group = screen.getByRole('group', { name: 'Mês do financeiro' });
    expect(group).toHaveTextContent('Out 2026');
    expect(group).toHaveTextContent('Outubro 2026');
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onChange).toHaveBeenCalledWith(8, 2026);
  });

  it('vira o ano nas duas direções', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MonthStepper month={0} year={2026} onChange={onChange} today={{ month: 9, year: 2026 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onChange).toHaveBeenLastCalledWith(11, 2025);
    rerender(<MonthStepper month={11} year={2025} onChange={onChange} today={{ month: 9, year: 2026 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(onChange).toHaveBeenLastCalledWith(0, 2026);
  });
});
