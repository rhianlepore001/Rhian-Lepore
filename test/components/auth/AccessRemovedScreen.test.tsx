import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
// A tela sempre roda dentro do AuthProvider (App.tsx); o Button lê o tema de lá.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

import { AccessRemovedScreen } from '@/components/auth/AccessRemovedScreen';

describe('AccessRemovedScreen (S-06)', () => {
    it('mostra a mensagem exata com o nome da empresa', () => {
        render(<AccessRemovedScreen companyName="Moderna Barbearia" onExit={vi.fn()} />);
        expect(screen.getByRole('heading', { name: 'Acesso removido' })).toBeInTheDocument();
        expect(screen.getByText('Seu acesso a Moderna Barbearia foi removido. Fale com o dono.')).toBeInTheDocument();
    });

    it('"Voltar para o login" chama onExit', () => {
        const onExit = vi.fn();
        render(<AccessRemovedScreen companyName={null} onExit={onExit} />);
        expect(screen.getByText('Seu acesso foi removido. Fale com o dono.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Voltar para o login' }));
        expect(onExit).toHaveBeenCalledTimes(1);
    });
});
