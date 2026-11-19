import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JoinClub } from '../../pages/JoinClub';

const { profileQuery, refetch, hydrateFromStorage } = vi.hoisted(() => ({
    profileQuery: vi.fn(),
    refetch: vi.fn(),
    hydrateFromStorage: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber' }),
}));
vi.mock('../../hooks/usePublicBooking', () => ({
    useBusinessProfileBySlug: profileQuery,
}));
vi.mock('../../contexts/PublicClientContext', () => ({
    usePublicClient: () => ({ client: null, hydrateFromStorage }),
}));
vi.mock('../../components/membership/PublicClubFlow', () => ({
    PublicClubFlow: ({ businessId }: { businessId: string }) => <p>Planos de {businessId}</p>,
}));

function renderClub() {
    return render(
        <MemoryRouter initialEntries={['/clube/barbearia']}>
            <Routes>
                <Route path="/clube/:slug" element={<JoinClub />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('Clube público', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mostra carregamento enquanto consulta o estabelecimento', () => {
        profileQuery.mockReturnValue({ isLoading: true });
        renderClub();
        expect(screen.getByRole('status')).toHaveTextContent('Carregando o clube');
    });

    it('permite tentar novamente quando a consulta do estabelecimento falha', () => {
        profileQuery.mockReturnValue({ isError: true, refetch });
        renderClub();
        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível abrir o clube');
        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(refetch).toHaveBeenCalledOnce();
        expect(hydrateFromStorage).not.toHaveBeenCalled();
    });

    it('abre a seleção de planos quando o estabelecimento existe', () => {
        profileQuery.mockReturnValue({ data: { id: 'negocio-1' } });
        renderClub();
        expect(screen.getByText('Planos de negocio-1')).toBeInTheDocument();
        expect(hydrateFromStorage).toHaveBeenCalledWith('negocio-1');
    });
});
