import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfitMetrics } from '../../components/dashboard/ProfitMetrics';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber' }),
}));

vi.mock('../../contexts/UIContext', () => ({
    useUI: () => ({ isMobile: false }),
}));

const renderProfitMetrics = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('ProfitMetrics Component', () => {
    const mockMetrics = {
        totalProfit: 1000,
        currentMonthRevenue: 1000,
        recoveredRevenue: 500,
        avoidedNoShows: 200,
        filledSlots: 300,
        weeklyGrowth: 10,
        campaignsSent: 5,
        todayRevenue: 1000,
    };

    const mockMaturity = {
        appointmentsTotal: 20,
        appointmentsThisMonth: 10,
        completedThisMonth: 8,
        hasPublicBookings: true,
        accountDaysOld: 30,
        score: 80,
    };

    it('renders current card labels', () => {
        renderProfitMetrics(
            <ProfitMetrics
                metrics={mockMetrics}
                dataMaturity={mockMaturity}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        expect(screen.getByText('Receita do Dia')).toBeInTheDocument();
        expect(screen.getByText('HOJE')).toBeInTheDocument();
    });

    it('renders formatted revenue when there is revenue today', () => {
        renderProfitMetrics(
            <ProfitMetrics
                metrics={mockMetrics}
                dataMaturity={mockMaturity}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    });

    it('renders empty state when there is no revenue today', () => {
        renderProfitMetrics(
            <ProfitMetrics
                metrics={{ ...mockMetrics, todayRevenue: 0 }}
                dataMaturity={mockMaturity}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        expect(screen.getByText(/Nenhum atendimento concluído hoje ainda\./i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /registrar atendimento/i })).toBeInTheDocument();
    });
});
