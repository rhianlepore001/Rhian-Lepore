import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TabNav } from '../../components/TabNav';

const TABS = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'commissions', label: 'Pagamentos' },
    { id: 'history', label: 'Histórico' },
];

const Harness: React.FC<{ onChange?: (id: string) => void }> = ({ onChange }) => {
    const [active, setActive] = useState('overview');
    return (
        <TabNav
            tabs={TABS}
            activeTab={active}
            ariaLabel="Seções do financeiro"
            panelId="finance-panel"
            onChange={(id) => { setActive(id); onChange?.(id); }}
        />
    );
};

describe('TabNav — controle segmentado', () => {
    it('é um tablist em grade de colunas iguais, sem caixa alta nem mono, uma linha só', () => {
        render(<Harness />);
        const list = screen.getByRole('tablist', { name: 'Seções do financeiro' });
        expect(list.className).toContain('grid');
        expect(list.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
        expect(list.className).not.toMatch(/flex-wrap|overflow-x-auto/);
        for (const tab of screen.getAllByRole('tab')) {
            expect(tab.className).not.toMatch(/uppercase|font-mono/);
            expect(tab).toHaveAttribute('aria-controls', 'finance-panel');
            const label = tab.querySelector('[data-tab-label]')!;
            expect(label.className).toMatch(/truncate|text-ellipsis/);
            expect(label.className).toContain('whitespace-nowrap');
        }
    });

    it('marca a aba ativa e usa tabindex itinerante', () => {
        render(<Harness />);
        const [a, b, c] = screen.getAllByRole('tab');
        expect(a).toHaveAttribute('aria-selected', 'true');
        expect(a).toHaveAttribute('tabindex', '0');
        expect(b).toHaveAttribute('tabindex', '-1');
        expect(c).toHaveAttribute('aria-selected', 'false');
    });

    it('setas, Home e End trocam de aba e movem o foco', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);
        const [a, b, c] = screen.getAllByRole('tab');
        a.focus();
        fireEvent.keyDown(a, { key: 'ArrowRight' });
        expect(onChange).toHaveBeenLastCalledWith('commissions');
        expect(b).toHaveFocus();
        fireEvent.keyDown(b, { key: 'End' });
        expect(onChange).toHaveBeenLastCalledWith('history');
        expect(c).toHaveFocus();
        fireEvent.keyDown(c, { key: 'ArrowRight' });
        expect(onChange).toHaveBeenLastCalledWith('overview');
        fireEvent.keyDown(a, { key: 'ArrowLeft' });
        expect(onChange).toHaveBeenLastCalledWith('history');
        fireEvent.keyDown(c, { key: 'Home' });
        expect(onChange).toHaveBeenLastCalledWith('overview');
        expect(a).toHaveFocus();
    });

    it('com uma aba só não mostra o controle', () => {
        const { container } = render(<TabNav tabs={[TABS[0]]} activeTab="overview" onChange={() => undefined} ariaLabel="x" />);
        expect(container.querySelector('[role="tablist"]')).toBeNull();
    });
});
