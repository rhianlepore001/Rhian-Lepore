import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaBlockForm } from '../../components/agenda/AgendaBlockForm';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textMuted: '', textSecondary: '', border: '', card: '' },
    accent: { text: '', border: '', bgDim: '' },
    classes: { label: '' },
    radius: { card: '', modal: '' },
    font: { sans: '' },
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
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button type="button" onClick={onClick} {...rest}>{children}</button>
  ),
}));

describe('AgendaBlockForm', () => {
  const members = [{ id: 'pro-1', name: 'João' }, { id: 'pro-2', name: 'Maria' }];

  it('não pede motivo e tem os três tipos', () => {
    render(
      <AgendaBlockForm
        open
        onClose={vi.fn()}
        members={members}
        showProfessionalSelect
        professionalId="pro-1"
        initialDate="2026-10-05"
        initialTime="12:00"
        timeZone="America/Sao_Paulo"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId('agenda-block-form')).toBeInTheDocument();
    expect(screen.getByText('Período no dia')).toBeInTheDocument();
    expect(screen.getByText('Dia inteiro')).toBeInTheDocument();
    expect(screen.getByText('Vários dias')).toBeInTheDocument();
    expect(screen.queryByLabelText(/motivo/i)).toBeNull();
    expect(screen.getByTestId('agenda-block-start-time')).toHaveValue('12:00');
  });

  it('lista conflitos e pede confirmação sem cancelar', () => {
    render(
      <AgendaBlockForm
        open
        onClose={vi.fn()}
        members={members}
        showProfessionalSelect={false}
        professionalId="pro-1"
        initialDate="2026-10-05"
        timeZone="America/Sao_Paulo"
        conflicts={[{
          id: 'a1',
          kind: 'appointment',
          client_name: 'Ana Souza',
          service: 'Corte',
          appointment_time: '2026-10-05T12:00:00-03:00',
          status: 'Confirmed',
        }]}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId('agenda-block-conflicts')).toHaveTextContent('Ana Souza');
    expect(screen.getByTestId('agenda-block-conflicts')).toHaveTextContent('Nada será cancelado');
    expect(screen.getByTestId('agenda-block-confirm-conflicts')).toBeInTheDocument();
  });

  it('envia intervalo do horário pré-preenchido', async () => {
    const onSubmit = vi.fn();
    render(
      <AgendaBlockForm
        open
        onClose={vi.fn()}
        members={members}
        showProfessionalSelect={false}
        professionalId="pro-1"
        initialDate="2026-10-05"
        initialTime="12:00"
        timeZone="America/Sao_Paulo"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByTestId('agenda-block-submit'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      professionalId: 'pro-1',
      acknowledgeConflicts: false,
    }));
    const arg = onSubmit.mock.calls[0][0];
    expect(new Date(arg.startsAt).toISOString()).toBe(new Date('2026-10-05T12:00:00-03:00').toISOString());
    expect(new Date(arg.endsAt).toISOString()).toBe(new Date('2026-10-05T13:00:00-03:00').toISOString());
  });
});
