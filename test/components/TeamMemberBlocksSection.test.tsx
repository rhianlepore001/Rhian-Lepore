import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamMemberBlocksSection } from '../../components/agenda/TeamMemberBlocksSection';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textMuted: '', textSecondary: '', border: '' },
  }),
}));

vi.mock('../../components/ui/Button', () => ({
  Button: ({
    children, onClick, ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }) => (
    <button type="button" onClick={onClick} {...rest}>{children}</button>
  ),
}));

describe('TeamMemberBlocksSection', () => {
  it('lista próximos bloqueios e dispara criar/desbloquear', async () => {
    const onCreate = vi.fn();
    const onUnlock = vi.fn();
    render(
      <TeamMemberBlocksSection
        memberName="João"
        timeZone="America/Sao_Paulo"
        onCreate={onCreate}
        onUnlock={onUnlock}
        blocks={[{
          id: 'b1',
          user_id: 'biz',
          professional_id: 'pro-1',
          starts_at: '2026-10-05T12:00:00-03:00',
          ends_at: '2026-10-05T13:00:00-03:00',
        }]}
      />,
    );
    expect(screen.getByTestId('team-member-blocks')).toHaveTextContent('Bloqueios');
    await userEvent.click(screen.getByTestId('team-member-block-create'));
    expect(onCreate).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Desbloquear' }));
    expect(onUnlock).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });

  it('vazio mostra que não há bloqueio à frente', () => {
    render(
      <TeamMemberBlocksSection
        memberName="João"
        blocks={[]}
        timeZone="America/Sao_Paulo"
        onCreate={vi.fn()}
        onUnlock={vi.fn()}
      />,
    );
    expect(screen.getByText('Nenhum bloqueio à frente.')).toBeInTheDocument();
  });
});
