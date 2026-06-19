import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

beforeEach(() => {
    // Silencia o aviso de deprecação para não poluir o log dos testes.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

const renderCard = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('BrutalCard (wrapper @deprecated)', () => {
    it('renderiza os filhos', () => {
        renderCard(
            <BrutalCard>
                <div data-testid="child-content">Content</div>
            </BrutalCard>
        );
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('aplica o tema beauty quando forçado (soft radius)', () => {
        const { container } = renderCard(<BrutalCard forceTheme="beauty">Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;
        expect(card.className).toContain('rounded-2xl');
        expect(card.className).toContain('bg-theme-card');
    });

    it('aplica o tema barber por padrão (sharp radius)', () => {
        mockUserType.current = 'barber';
        const { container } = renderCard(<BrutalCard>Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;
        expect(card.className).toContain('bg-theme-card');
        expect(card.className).toContain('rounded-lg');
    });

    it('mapeia accent/glow para variant="elevated" (sem side-stripe)', () => {
        const { container } = renderCard(<BrutalCard accent>Content</BrutalCard>);
        const card = container.firstChild as HTMLElement;
        expect(card.className).not.toContain('before:');
    });

    it('emite aviso de deprecação no dev', () => {
        const warn = vi.spyOn(console, 'warn');
        renderCard(<BrutalCard>X</BrutalCard>);
        expect(warn).toHaveBeenCalled();
        expect(warn.mock.calls.some((args) => String(args[0]).includes('deprecated'))).toBe(true);
    });
});
