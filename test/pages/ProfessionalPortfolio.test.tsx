import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalPortfolio } from '../../pages/ProfessionalPortfolio';

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));

vi.mock('../../lib/supabase', () => ({ supabase: { rpc, from } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: null }) }));

function renderPortfolio() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={['/pro/joana']}>
                <Routes>
                    <Route path="/pro/:slug" element={<ProfessionalPortfolio />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('Portfólio público', () => {
    beforeEach(() => vi.clearAllMocks());

    it('abre o perfil e preserva o link de agendamento usando apenas a RPC pública', async () => {
        rpc.mockResolvedValue({
            data: {
                id: 'pro-1',
                name: 'Joana',
                business_name: 'Salão A',
                business_slug: 'salao-a',
                user_type: 'beauty',
            },
            error: null,
        });

        renderPortfolio();

        expect(await screen.findByRole('heading', { name: 'Joana' })).toBeVisible();
        expect(screen.getByRole('link', { name: 'Ver serviços e horários' })).toHaveAttribute(
            'href',
            '/book/salao-a?pro=pro-1',
        );
        expect(rpc).toHaveBeenCalledWith('get_public_professional_portfolio', { p_slug: 'joana' });
        expect(from).not.toHaveBeenCalled();
    });

    it('mostra estado de perfil não encontrado para um slug indisponível', async () => {
        rpc.mockResolvedValue({ data: null, error: null });

        renderPortfolio();

        expect(await screen.findByRole('heading', { name: 'Profissional não encontrado' })).toBeVisible();
        expect(screen.queryByRole('link', { name: 'Ver serviços e horários' })).not.toBeInTheDocument();
    });
});
