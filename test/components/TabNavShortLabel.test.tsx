import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabNav } from '../../components/TabNav';

describe('TabNav — rótulo curto no mobile', () => {
    it('mantém o nome completo acessível e renderiza as duas versões', () => {
        render(<TabNav tabs={[{ id: 'c', label: 'Pagamento de comissão', shortLabel: 'Pagamentos' }, { id: 'h', label: 'Histórico' }]} activeTab="c" onChange={() => undefined} accentBg="bg-x" />);
        expect(screen.getByRole('tab', { name: 'Pagamento de comissão' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Pagamentos')).toHaveClass('sm:hidden');
        expect(screen.getByRole('tab', { name: 'Histórico' })).not.toHaveAttribute('aria-label');
    });
});
