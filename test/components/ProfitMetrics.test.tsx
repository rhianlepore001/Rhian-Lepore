import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfitMetrics } from '../../components/dashboard/ProfitMetrics';
import React from 'react';

describe('ProfitMetrics Component', () => {
    const mockMetrics = {
        totalProfit: 1000,
        recoveredRevenue: 500,
        avoidedNoShows: 200,
        filledSlots: 300,
        weeklyGrowth: 10,
        campaignsSent: 5
    };

    const mockMaturity = {
        appointmentsTotal: 20,
        appointmentsThisMonth: 10,
        completedThisMonth: 8,
        hasPublicBookings: true,
        accountDaysOld: 30,
        score: 80
    };

    it('renders all metric labels', () => {
        render(
            <ProfitMetrics
                metrics={mockMetrics}
                dataMaturity={mockMaturity}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        // Verifica labels principais (conforme refatorado)
        expect(screen.getByText('Lucro')).toBeInTheDocument();
        expect(screen.getByText('Recuperado')).toBeInTheDocument();
        expect(screen.getByText('Economia')).toBeInTheDocument();
        expect(screen.getByText('Vagas')).toBeInTheDocument();
    });

    it('renders formatted currency values when data is mature', () => {
        render(
            <ProfitMetrics
                metrics={mockMetrics}
                dataMaturity={mockMaturity}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        // Verifica formatação de moeda brasileira
        expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
        expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    });

    it('renders learning state when data is immature', () => {
        const immatureMaturity = {
            ...mockMaturity,
            appointmentsTotal: 2,
            score: 10
        };

        render(
            <ProfitMetrics
                metrics={{ ...mockMetrics, campaignsSent: 0 }}
                dataMaturity={immatureMaturity}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        // Deve mostrar "Em Aprendizado"
        const learningStates = screen.getAllByText('Em Aprendizado');
        expect(learningStates.length).toBeGreaterThan(0);
    });
});
