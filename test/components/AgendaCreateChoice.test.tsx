import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaCreateChoice } from '../../components/agenda/AgendaCreateChoice';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textMuted: '', textSecondary: '', border: '', card: '', divider: '' },
    accent: { text: '', border: '', bgDim: '' },
    classes: { label: '' },
  }),
}));

vi.mock('../../components/ui/Modal', () => ({
  Modal: ({
    open, title, children,
  }: { open: boolean; title?: string; children: React.ReactNode }) => (
    open ? <div><h2>{title}</h2>{children}</div> : null
  ),
}));

describe('AgendaCreateChoice', () => {
  it('oferece Novo atendimento e Bloquear agenda quando pode bloquear', async () => {
    const onNew = vi.fn();
    const onBlock = vi.fn();
    render(
      <AgendaCreateChoice
        open
        onClose={vi.fn()}
        onNewAppointment={onNew}
        onBlockAgenda={onBlock}
        canBlock
      />,
    );
    expect(screen.getByTestId('agenda-choice-new-appointment')).toHaveTextContent('Novo atendimento');
    expect(screen.getByTestId('agenda-choice-block')).toHaveTextContent('Bloquear agenda');
    await userEvent.click(screen.getByTestId('agenda-choice-block'));
    expect(onBlock).toHaveBeenCalled();
  });

  it('no slot vazio o rótulo é Bloquear a partir daqui', () => {
    render(
      <AgendaCreateChoice
        open
        onClose={vi.fn()}
        onNewAppointment={vi.fn()}
        onBlockAgenda={vi.fn()}
        canBlock
        source="slot"
      />,
    );
    expect(screen.getByTestId('agenda-choice-block')).toHaveTextContent('Bloquear a partir daqui');
  });

  it('esconde Bloquear quando canBlock é false', () => {
    render(
      <AgendaCreateChoice
        open
        onClose={vi.fn()}
        onNewAppointment={vi.fn()}
        onBlockAgenda={vi.fn()}
        canBlock={false}
      />,
    );
    expect(screen.getByTestId('agenda-choice-new-appointment')).toBeInTheDocument();
    expect(screen.queryByTestId('agenda-choice-block')).toBeNull();
  });
});
