import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrutalCard } from '../../components/BrutalCard';
import React from 'react';

// Mock do AuthContext
const mockUserType = { current: 'barber' };
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: mockUserType.current })
}));

vi.mock('../../contexts/UIContext', () => ({
    useUI: () => ({ isMobile: false })
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

        // Verifica estilos inline críticos para mobile
        expect((card.style as any).webkitTapHighlightColor).toBe('transparent');
        expect(card.style.outline).toBe('none');

        // Verifica classes de UX mobile e tokens de design (select-none)
        expect(card.className).toContain('select-none');
    });

    it('renders with Beauty theme when forced', () => {
        const { container } = render(<BrutalCard forceTheme="beauty">Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        // Na implementação atual Pro Max usamos rounded-[28px]
        expect(card.className).toContain('rounded-[28px]');
        expect(card.className).toContain('bg-gradient-beauty');
    });

    it('renders with Brutal theme by default', () => {
        mockUserType.current = 'barber';
        const { container } = render(<BrutalCard>Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;

        // Na implementação atual Pro Max usamos bg-gradient-brutal
        expect(card.className).toContain('bg-gradient-brutal');
        expect(card.className).toContain('rounded-[28px]');
    });
});
