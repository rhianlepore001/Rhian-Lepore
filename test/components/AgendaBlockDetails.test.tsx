import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaBlockDetails } from '../../components/agenda/AgendaBlockDetails';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textMuted: '', textSecondary: '', border: '' },
    classes: { label: '' },
  }),
}));

vi.mock('../../components/ui/Modal', () => ({
  Modal: ({
    open, title, children, footer,
  }: { open: boolean; title?: string; children: React.ReactNode; footer?: React.ReactNode }) => (
    open ? <div><h2>{title}</h2>{children}{footer}</div> : null
  ),
}));

vi.mock('../../components/ui/Button', () => ({
  Button: ({
    children, onClick, ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; fullWidth?: boolean; variant?: string }) => (
    <button type="button" onClick={onClick} {...rest}>{children}</button>
  ),
}));

const block = {
  id: 'b1',
  user_id: 'biz',
  professional_id: 'pro-1',
  starts_at: '2026-10-05T12:00:00-03:00',
  ends_at: '2026-10-05T13:00:00-03:00',
};

describe('AgendaBlockDetails', () => {
  it('mostra Desbloquear quando pode gerir', async () => {
    const onUnlock = vi.fn();
    render(
      <AgendaBlockDetails
        open
        block={block}
        professionalName="João"
        timeZone="America/Sao_Paulo"
        canUnlock
        onClose={vi.fn()}
        onUnlock={onUnlock}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Bloqueado' })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('agenda-block-unlock'));
    expect(onUnlock).toHaveBeenCalled();
  });

  it('staff sem permissão só vê Agenda bloqueada, sem Desbloquear', () => {
    render(
      <AgendaBlockDetails
        open
        block={block}
        professionalName="João"
        timeZone="America/Sao_Paulo"
        canUnlock={false}
        onClose={vi.fn()}
        onUnlock={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Agenda bloqueada' })).toBeInTheDocument();
    expect(screen.queryByTestId('agenda-block-unlock')).toBeNull();
  });
});
