import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TodayKpiStrip } from './TodayKpiStrip';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', role: 'owner', isAuthenticated: true }),
}));

describe('TodayKpiStrip', () => {
  it('renderiza valores até R$ 99.999,99 sem quebra e rótulos sem truncamento ou padding duplo', () => {
    const { container } = render(
      <TodayKpiStrip
        items={[
          { id: 'revenue', label: 'Receita', value: 'R$ 99.999,99', hint: 'Hoje' },
          { id: 'agenda', label: 'Agenda', value: '13', hint: '13 agendamentos' },
          { id: 'queue', label: 'Fila', value: '2', hint: '2 aguardando' },
          { id: 'free', label: 'Livres', value: '7', hint: 'horas livres hoje' },
        ]}
      />,
    );

    const valueEl = screen.getByText('R$ 99.999,99');
    expect(valueEl.className).toContain('whitespace-nowrap');

    const hintEl = screen.getByText('13 agendamentos');
    expect(hintEl.className).not.toContain('truncate');

    // Garante que cada card usa p-3 sm:p-4 direto (sem padding duplo interno do Card)
    const cards = container.querySelectorAll('section > div');
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.className).toContain('p-3');
      expect(card.firstElementChild?.className ?? '').not.toMatch(/\bp-[345]\b/);
    }
  });
});
