import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SaveFooter } from '../../components/SaveFooter';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ accent: { bg: 'bg-accent' }, classes: {} }),
}));


describe('SaveFooter', () => {
  it('mostra "Salvo!" logo após salvar, sem alterações pendentes', () => {
    render(<SaveFooter onSave={vi.fn()} saveStatus="saved" hasChanges={false} />);
    expect(screen.getByText('Salvo!')).toBeInTheDocument();
  });

  it('volta ao estado normal quando o formulário muda depois de salvar', () => {
    render(<SaveFooter onSave={vi.fn()} saveStatus="saved" hasChanges />);
    expect(screen.queryByText('Salvo!')).not.toBeInTheDocument();
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { hidden: true });
    for (const b of buttons) expect(b).not.toBeDisabled();
  });

  it('mantém "Tentar Novamente" no erro e "Salvando..." enquanto salva', () => {
    const { rerender } = render(<SaveFooter onSave={vi.fn()} saveStatus="error" hasChanges />);
    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    rerender(<SaveFooter onSave={vi.fn()} saveStatus="saving" hasChanges />);
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });
});
