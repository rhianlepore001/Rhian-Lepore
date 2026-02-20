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
        weeklyGrowth: 10
    };

    it('renders all metric labels', () => {
        render(
            <ProfitMetrics
                metrics={mockMetrics}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        // Verifica labels principais
        expect(screen.getByText('Lucro')).toBeInTheDocument();
        expect(screen.getByText('Recup.')).toBeInTheDocument();
        expect(screen.getByText('Economia')).toBeInTheDocument();
        expect(screen.getByText('Vagas')).toBeInTheDocument();
    });

    it('renders formatted currency values', () => {
        render(
            <ProfitMetrics
                metrics={mockMetrics}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={false}
            />
        );

        // Verifica formatação de moeda brasileira
        expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
        expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    });

    it('renders 4 metric cards', () => {
        const { container } = render(
            <ProfitMetrics
                metrics={mockMetrics}
                currencySymbol="R$"
                currencyRegion="BR"
                isBeauty={true}
            />
        );

        // Verifica quantidade de cards
        const cards = container.querySelectorAll('.brutal-card-enhanced');
        expect(cards).toHaveLength(4);
    });
});
