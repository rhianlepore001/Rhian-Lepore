import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanCard } from '../../components/membership/PlanCard';
import type { MembershipPlan } from '../../services/memberships';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'beauty' }),
}));

const plan: MembershipPlan = {
  id: 'plan-1',
  user_id: 'biz-1',
  name: 'Pacote pedicure e manicure',
  description: 'Ahargsganzi',
  price_cents: 5000,
  service_ids: ['s1'],
  usage_limit_per_month: 5,
  badge_color: 'gold',
  active: true,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

describe('PlanCard', () => {
  it('mostra ações de editar e excluir sem depender de hover', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<PlanCard plan={plan} compact onEdit={onEdit} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: /Editar plano/i }));
    expect(onEdit).toHaveBeenCalledWith(plan);
    await userEvent.click(screen.getByRole('button', { name: /Excluir plano/i }));
    expect(onDelete).toHaveBeenCalledWith(plan);
    expect(screen.getByTestId('plan-card-plan-1').className).not.toMatch(/bg-gradient/);
  });
});
