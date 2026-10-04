import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FinanceMoreMenu } from '../../components/finance/FinanceMoreMenu';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

const setup = () => {
  const filter = vi.fn();
  const exp = vi.fn();
  render(
    <FinanceMoreMenu
      label="Mais ações do financeiro"
      items={[
        { id: 'f', label: 'Filtrar', onSelect: filter },
        { id: 'e', label: 'Exportar', onSelect: exp },
        { id: 'a', label: 'Assistente', onSelect: vi.fn() },
      ]}
    />,
  );
  return { filter, exp, button: screen.getByRole('button', { name: 'Mais ações do financeiro' }) };
};

describe('FinanceMoreMenu "⋯" (PR-F #9)', () => {
  it('abre um menu acessível com foco no primeiro item e setas', () => {
    const { button } = setup();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Filtrar', 'Exportar', 'Assistente']);
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1], { key: 'End' });
    expect(items[2]).toHaveFocus();
    fireEvent.keyDown(items[2], { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
  });

  it('ESC fecha e devolve o foco ao botão; escolher um item fecha e executa', () => {
    const { button, exp } = setup();
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Exportar' }));
    expect(exp).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('toque fora fecha', () => {
    const { button } = setup();
    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
