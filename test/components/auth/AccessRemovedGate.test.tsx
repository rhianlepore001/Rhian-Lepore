import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const authState: any = { accessRemoved: null, dismissAccessRemoved: vi.fn() };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));

import { AccessRemovedGate } from '@/components/auth/AccessRemovedGate';

describe('AccessRemovedGate', () => {
    beforeEach(() => {
        authState.accessRemoved = null;
        authState.dismissAccessRemoved = vi.fn();
    });

    it('com acesso normal renderiza o app', () => {
        render(<MemoryRouter><AccessRemovedGate><p>app</p></AccessRemovedGate></MemoryRouter>);
        expect(screen.getByText('app')).toBeInTheDocument();
    });

    it('órfão vê só a tela "acesso removido" (nada do app por trás)', () => {
        authState.accessRemoved = { companyName: 'Barbearia Silva' };
        render(<MemoryRouter><AccessRemovedGate><p>app</p></AccessRemovedGate></MemoryRouter>);
        expect(screen.queryByText('app')).not.toBeInTheDocument();
        expect(screen.getByText('Seu acesso a Barbearia Silva foi removido. Fale com o dono.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Voltar para o login' }));
        expect(authState.dismissAccessRemoved).toHaveBeenCalled();
    });
});
