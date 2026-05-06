import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BrutalCard } from '../../components/BrutalCard';

const mockUserType = { current: 'barber' };

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: mockUserType.current }),
}));

vi.mock('../../contexts/UIContext', () => ({
    useUI: () => ({ isMobile: false }),
}));

const renderCard = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('BrutalCard Component', () => {
    it('renders children correctly', () => {
        renderCard(
            <BrutalCard>
                <div data-testid="child-content">Content</div>
            </BrutalCard>
        );

        expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('applies correct mobile UX styles', () => {
        const { container } = renderCard(<BrutalCard>Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        expect((card.style as any).webkitTapHighlightColor).toBe('transparent');
        expect(card.style.outline).toBe('none');
        expect(card.className).toContain('select-none');
    });

    it('renders with Beauty theme when forced', () => {
        const { container } = renderCard(<BrutalCard forceTheme="beauty">Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        expect(card.className).toContain('rounded-2xl');
        expect(card.className).toContain('bg-beauty-card');
    });

    it('renders with Brutal theme by default', () => {
        mockUserType.current = 'barber';
        const { container } = renderCard(<BrutalCard>Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        expect(card.className).toContain('bg-brutal-card');
        expect(card.className).toContain('rounded-2xl');
    });
});
