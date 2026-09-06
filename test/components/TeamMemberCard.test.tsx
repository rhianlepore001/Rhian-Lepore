import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TeamMemberCard } from '../../components/TeamMemberCard';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const member = {
  id: 'member-1',
  name: 'Ana',
  role: 'Profissional',
  photo_url: null,
  active: true,
  is_owner: false,
  commission_rate: 30,
  commission_payment_frequency: 'monthly' as const,
  commission_payment_day: 5,
};

describe('TeamMemberCard', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'barber');
    document.documentElement.setAttribute('data-mode', 'dark');
  });

  it('mostra frequencia individual quando o lembrete universal esta desligado', () => {
    render(
      <TeamMemberCard
        member={member}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSaveCommission={vi.fn()}
      />,
    );
    expect(screen.getByText(/Mensal/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /comissão/i }));
    expect(screen.getByRole('option', { name: 'Quinzenal' })).toBeInTheDocument();
  });

  it('trava frequencia e dia quando o lembrete universal esta ativo', () => {
    render(
      <TeamMemberCard
        member={member}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSaveCommission={vi.fn()}
        scheduleLocked
        universalSettlementDay={12}
      />,
    );
    expect(screen.getByText('Unificado · Dia 12')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /comissão/i }));
    expect(screen.queryByRole('option', { name: 'Quinzenal' })).not.toBeInTheDocument();
    expect(screen.getByText(/Lembrete universal ativo/)).toBeInTheDocument();
  });
});
