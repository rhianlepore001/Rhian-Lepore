import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, type TabItem } from '../Tabs';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const TABS: TabItem[] = [
  { id: 'tab1', label: 'Aba 1' },
  { id: 'tab2', label: 'Aba 2' },
  { id: 'tab3', label: 'Aba 3', disabled: true },
  { id: 'tab4', label: 'Aba 4' },
];

describe('Tabs Component', () => {
  it('renderiza os botões das abas com o estado aria correto', () => {
    render(
      <Tabs
        tabs={TABS}
        activeTab="tab1"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();

    const tab1 = screen.getByRole('tab', { name: 'Aba 1' });
    const tab2 = screen.getByRole('tab', { name: 'Aba 2' });
    const tab3 = screen.getByRole('tab', { name: 'Aba 3' });

    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab1).toHaveAttribute('tabIndex', '0');

    expect(tab2).toHaveAttribute('aria-selected', 'false');
    expect(tab2).toHaveAttribute('tabIndex', '-1');

    expect(tab3).toBeDisabled();
    expect(tab3).toHaveAttribute('aria-selected', 'false');
  });

  it('chama onTabChange ao clicar em uma aba ativa e habilitada', async () => {
    const onTabChange = vi.fn();
    render(
      <Tabs
        tabs={TABS}
        activeTab="tab1"
        onTabChange={onTabChange}
      />
    );

    const tab2 = screen.getByRole('tab', { name: 'Aba 2' });
    await userEvent.click(tab2);

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  it('não chama onTabChange ao clicar em uma aba desabilitada', async () => {
    const onTabChange = vi.fn();
    render(
      <Tabs
        tabs={TABS}
        activeTab="tab1"
        onTabChange={onTabChange}
      />
    );

    const tab3 = screen.getByRole('tab', { name: 'Aba 3' });
    await userEvent.click(tab3);

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('navega pelas abas habilitadas usando teclado (ArrowRight, ArrowLeft, Home, End)', async () => {
    const onTabChange = vi.fn();
    const { rerender } = render(
      <Tabs
        tabs={TABS}
        activeTab="tab1"
        onTabChange={onTabChange}
      />
    );

    const tab1 = screen.getByRole('tab', { name: 'Aba 1' });
    tab1.focus();

    // Pressiona seta para a direita -> deve ir para tab2 (pois tab3 está desabilitada)
    await userEvent.keyboard('{ArrowRight}');
    expect(onTabChange).toHaveBeenCalledWith('tab2');

    // Simula a troca de aba atualizada pelo pai
    rerender(
      <Tabs
        tabs={TABS}
        activeTab="tab2"
        onTabChange={onTabChange}
      />
    );

    // Foca na tab2
    const tab2 = screen.getByRole('tab', { name: 'Aba 2' });
    tab2.focus();

    // Pressiona seta para a direita -> pula a tab3 (disabled) e vai para tab4
    await userEvent.keyboard('{ArrowRight}');
    expect(onTabChange).toHaveBeenCalledWith('tab4');

    rerender(
      <Tabs
        tabs={TABS}
        activeTab="tab4"
        onTabChange={onTabChange}
      />
    );

    const tab4 = screen.getByRole('tab', { name: 'Aba 4' });
    tab4.focus();

    // Pressiona Home -> vai para a primeira aba habilitada (tab1)
    await userEvent.keyboard('{Home}');
    expect(onTabChange).toHaveBeenCalledWith('tab1');

    // Pressiona End -> vai para a última aba habilitada (tab4)
    await userEvent.keyboard('{End}');
    expect(onTabChange).toHaveBeenCalledWith('tab4');
  });
});
