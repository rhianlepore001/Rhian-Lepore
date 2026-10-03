import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber', role: 'staff' }),
}));
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber', role: 'staff' }),
}));

import { BottomMobileNav } from '@/components/BottomMobileNav';

describe('BottomMobileNav — staff (375)', () => {
    it('Meus resultados cabe numa linha: nowrap, sem text-[10px]/[11px]', () => {
        render(
            <MemoryRouter initialEntries={['/meus-insights']}>
                <BottomMobileNav />
            </MemoryRouter>,
        );
        const item = screen.getByRole('button', { name: 'Meus resultados' });
        expect(item).toHaveTextContent('Meus resultados');
        const label = item.querySelector('span');
        expect(label?.className).toMatch(/whitespace-nowrap/);
        expect(label?.className).toMatch(/text-xs/);
        expect(label?.className).not.toMatch(/text-\[(?:9|10|11)px\]/);
        expect(item.className).toMatch(/flex-\[1\.[3-9]/);
    });
});
