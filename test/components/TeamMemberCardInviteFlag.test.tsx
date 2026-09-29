/**
 * Equipe: colaborador ativo ainda sem login aparece sinalizado ("Ainda sem
 * acesso") com a ação de reenviar o convite.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamMemberCard } from '../../components/TeamMemberCard';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

const base = { id: 'staff-1', name: 'João Silva', role: 'Barbeiro', photo_url: null, active: true, is_owner: false, commission_rate: 40 };

describe('TeamMemberCard: aviso de convite pendente', () => {
    it('sem login: mostra o aviso e "Reenviar convite"', async () => {
        const onResendInvite = vi.fn();
        render(<TeamMemberCard member={{ ...base, staff_user_id: null }} onEdit={vi.fn()} onDelete={vi.fn()} onResendInvite={onResendInvite} />);
        expect(screen.getByText('Ainda sem acesso')).toBeInTheDocument();
        // Aviso permanente e calmo: sem falar de links antigos.
        expect(screen.queryByText(/links antigos/i)).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Reenviar convite para João Silva/i }));
        expect(onResendInvite).toHaveBeenCalledWith(expect.objectContaining({ id: 'staff-1' }));
    });

    it('com login: sem aviso', () => {
        render(<TeamMemberCard member={{ ...base, staff_user_id: 'auth-1' }} onEdit={vi.fn()} onDelete={vi.fn()} onResendInvite={vi.fn()} />);
        expect(screen.queryByText('Ainda sem acesso')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Reenviar convite/i })).not.toBeInTheDocument();
    });

    it('dono e colaborador inativo: sem aviso', () => {
        const { rerender } = render(<TeamMemberCard member={{ ...base, is_owner: true, staff_user_id: null }} onEdit={vi.fn()} onDelete={vi.fn()} onResendInvite={vi.fn()} />);
        expect(screen.queryByText('Ainda sem acesso')).not.toBeInTheDocument();
        rerender(<TeamMemberCard member={{ ...base, active: false, staff_user_id: null }} onEdit={vi.fn()} onDelete={vi.fn()} onResendInvite={vi.fn()} />);
        expect(screen.queryByText('Ainda sem acesso')).not.toBeInTheDocument();
    });
});
