import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

let AUTH: Record<string, unknown> = {};
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('../../hooks/useStaffPerformance', () => ({
    prefetchStaffPerformanceFromLocation: vi.fn(),
}));

import { PerformanceAccessGuard } from '../../components/performance/PerformanceAccessGuard';

const mount = () =>
    render(
        <MemoryRouter initialEntries={['/financeiro/performance']}>
            <Routes>
                <Route path="/financeiro/performance" element={<PerformanceAccessGuard><div>página do dono</div></PerformanceAccessGuard>} />
                <Route path="/meus-insights" element={<div>meus resultados</div>} />
                <Route path="/login" element={<div>login</div>} />
            </Routes>
        </MemoryRouter>,
    );

describe('PerformanceAccessGuard (R7.1)', () => {
    it('colaborador que abre a URL cai em /meus-insights', () => {
        AUTH = { isAuthenticated: true, loading: false, role: 'staff' };
        mount();
        expect(screen.getByText('meus resultados')).toBeInTheDocument();
        expect(screen.queryByText('página do dono')).not.toBeInTheDocument();
    });

    it('dono vê a página', () => {
        AUTH = { isAuthenticated: true, loading: false, role: 'owner' };
        mount();
        expect(screen.getByText('página do dono')).toBeInTheDocument();
    });

    it('sem sessão vai para o login; carregando mostra o skeleton, não a página', () => {
        AUTH = { isAuthenticated: false, loading: false, role: null };
        mount();
        expect(screen.getByText('login')).toBeInTheDocument();
        AUTH = { isAuthenticated: false, loading: true, role: null };
        mount();
        expect(screen.queryByText('página do dono')).not.toBeInTheDocument();
        expect(screen.getByTestId('performance-loading')).toBeInTheDocument();
    });
});
