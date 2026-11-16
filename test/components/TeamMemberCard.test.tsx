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
  staff_user_id: 'auth-1',
};

const pending = {
  ...staff,
  id: 'staff-pending',
  name: 'Ana Souza',
  staff_user_id: null,
};

const owner = {
  ...staff,
  id: 'owner-1',
  name: 'Dono da Casa',
  is_owner: true,
};

// PR-E: card compacto (linha ~64px). Comissão, bloqueios e exclusão ficam no drawer "Editar".
describe('TeamMemberCard (linha compacta)', () => {
  it('mostra nome, cargo e "% de comissão" como texto, sem editor inline', () => {
    render(<TeamMemberCard member={staff} onEdit={vi.fn()} />);
    const row = screen.getByTestId('team-member-row');
    expect(row).toHaveTextContent('João Silva');
    expect(row).toHaveTextContent('Barbeiro');
    expect(row).toHaveTextContent('40% de comissão');
    expect(screen.queryByRole('button', { name: /Comissão/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('colaborador com acesso tem só o botão "Editar" e abre o drawer', async () => {
    const onEdit = vi.fn();
    const onResendInvite = vi.fn();
    render(<TeamMemberCard member={staff} onEdit={onEdit} onResendInvite={onResendInvite} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Reenviar convite/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar João Silva' }));
    expect(onEdit).toHaveBeenCalledWith(staff);
    expect(onResendInvite).not.toHaveBeenCalled();
  });

  it('colaborador pendente mostra "Editar" e "Reenviar convite"', async () => {
    const onEdit = vi.fn();
    const onResendInvite = vi.fn();
    render(<TeamMemberCard member={pending} onEdit={onEdit} onResendInvite={onResendInvite} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('Ainda sem acesso')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Ana Souza' }));
    expect(onEdit).toHaveBeenCalledWith(pending);
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar convite para Ana Souza' }));
    expect(onResendInvite).toHaveBeenCalledWith(pending);
  });

  it('dono aparece como "Dono", sem % de comissão', () => {
    render(<TeamMemberCard member={owner} onEdit={vi.fn()} />);
    const row = screen.getByTestId('team-member-row');
    expect(row).toHaveTextContent('Dono');
    expect(row).not.toHaveTextContent('% de comissão');
  });

  it('marca colaborador inativo', () => {
    render(<TeamMemberCard member={{ ...staff, active: false }} onEdit={vi.fn()} />);
    expect(screen.getByTestId('team-member-row')).toHaveTextContent('Inativo');
  });
});
