import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DailyTipCard, dailyTipText } from '../../components/dashboard/DailyTipCard';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

describe('dailyTipText', () => {
  it('sem estatísticas carregadas não decide a dica (evita trocar "estável" → "caiu 100%")', () => {
    expect(dailyTipText(null)).toBeNull();
  });
  it('escolhe a dica pela variação', () => {
    expect(dailyTipText(20)).toMatch(/20% acima/);
    expect(dailyTipText(-100)).toMatch(/caiu 100%/);
    expect(dailyTipText(0)).toMatch(/estável/);
  });
});

describe('DailyTipCard', () => {
  it('enquanto carrega mostra placeholder estável, sem texto provisório', () => {
    render(<DailyTipCard weeklyGrowth={null} />);
    expect(screen.getByRole('heading', { name: 'Dica para hoje' })).toBeInTheDocument();
    expect(screen.queryByText(/estável|acima|caiu/)).not.toBeInTheDocument();
    expect(screen.getByTestId('daily-tip-body')).toHaveAttribute('aria-busy', 'true');
  });
  it('com dados mostra a dica no mesmo bloco de altura reservada', () => {
    render(<DailyTipCard weeklyGrowth={-100} />);
    const body = screen.getByTestId('daily-tip-body');
    expect(body).toHaveAttribute('aria-busy', 'false');
    expect(body).toHaveTextContent('Seu movimento caiu 100%');
    expect(body.className).toMatch(/min-h-/);
  });
});
