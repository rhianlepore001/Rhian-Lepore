import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const prefetch = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));
vi.mock('../../pages/StaffPerformance', () => ({}));
vi.mock('../../hooks/useStaffPerformance', () => ({ prefetchStaffPerformanceFromLocation: () => prefetch() }));

import { TeamPerformanceCard } from '../../components/finance/TeamPerformanceCard';

describe('TeamPerformanceCard', () => {
    it('é um link visível para a Performance da equipe com o mês em minúsculas', () => {
        render(<MemoryRouter><TeamPerformanceCard monthName="Outubro" /></MemoryRouter>);
        const link = screen.getByRole('link', { name: /Performance da equipe/ });
        expect(link).toHaveAttribute('href', '/financeiro/performance');
        expect(link).toHaveTextContent('Como cada colaborador foi em outubro');
        expect(link).toHaveAttribute('data-testid', 'finance-performance-card');
    });

    it('pré-carrega os dados ao tocar', () => {
        render(<MemoryRouter><TeamPerformanceCard monthName="Setembro" /></MemoryRouter>);
        fireEvent.pointerDown(screen.getByRole('link'));
        expect(prefetch).toHaveBeenCalled();
    });
});
