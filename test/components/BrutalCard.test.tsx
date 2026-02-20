import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrutalCard } from '../../components/BrutalCard';
import React from 'react';

// Mock do AuthContext
const mockUserType = { current: 'barber' };
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: mockUserType.current })
}));

describe('BrutalCard Component', () => {
    it('renders children correctly', () => {
        render(
            <BrutalCard>
                <div data-testid="child-content">Content</div>
            </BrutalCard>
        );
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('applies correct mobile UX styles', () => {
        const { container } = render(<BrutalCard>Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        // Verifica estilos inline críticos para mobile (mais importante que classes)
        expect(card).toHaveStyle({
            outline: 'none',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent'
        });

        // Verifica classes de UX mobile
        expect(card.className).toContain('select-none');
        expect(card.className).toContain('touch-none');
    });

    it('renders with Beauty theme when forced', () => {
        const { container } = render(<BrutalCard forceTheme="beauty">Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        expect(card.className).toContain('rounded-2xl');
        expect(card.className).toContain('from-beauty-card');
    });

    it('renders with Brutal theme by default', () => {
        mockUserType.current = 'barber';
        const { container } = render(<BrutalCard>Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        expect(card.className).toContain('bg-brutal-card');
        expect(card.className).toContain('border-4');
    });
});
