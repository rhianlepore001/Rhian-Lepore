import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamMemberCard } from '../../components/TeamMemberCard';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const staff = {
  id: 'staff-1',
  name: 'João Silva',
  role: 'Barbeiro',
  photo_url: null,
  active: true,
  is_owner: false,
  commission_rate: 40,
};

const owner = {
  ...staff,
  id: 'owner-1',
  name: 'Dono da Casa',
  is_owner: true,
};

describe('TeamMemberCard', () => {
  it('dispara exclusão do colaborador pelo botão visível', async () => {
    const onDelete = vi.fn();
    render(
      <TeamMemberCard
        member={staff}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Excluir membro João Silva/i }));
    expect(onDelete).toHaveBeenCalledWith('staff-1');
  });

  it('não mostra exclusão no card do dono', () => {
    render(
      <TeamMemberCard
        member={owner}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Excluir membro/i })).not.toBeInTheDocument();
  });
});
