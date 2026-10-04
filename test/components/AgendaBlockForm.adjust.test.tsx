import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaBlockForm } from '../../components/agenda/AgendaBlockForm';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textMuted: '', textSecondary: '', border: '' },
    classes: { label: '' },
  }),
}));

vi.mock('../../components/ui/Modal', () => ({
  Modal: ({
    open, children, footer,
  }: { open: boolean; children: React.ReactNode; footer?: React.ReactNode }) => (
    open ? <div>{children}{footer}</div> : null
  ),
}));

vi.mock('../../components/ui/Button', () => ({
  Button: ({
    children, onClick, loading: _loading, fullWidth: _full, variant: _variant, ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; fullWidth?: boolean; variant?: string }) => (
    <button type="button" onClick={onClick} {...rest}>{children}</button>
  ),
}));

// Fixa o relógio: o formulário recusa datas passadas, e initialDate é fixo.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-03T15:00:00.000Z'));
});
afterAll(() => {
  vi.useRealTimers();
});

const serverStart = '2026-10-03T18:08:00.000Z';
const serverEnd = '2026-10-04T03:00:00.000Z';

function renderForm(overrides: Partial<React.ComponentProps<typeof AgendaBlockForm>> = {}) {
  const onSubmit = vi.fn();
  render(
    <AgendaBlockForm
      open
      onClose={() => {}}
      members={[{ id: 'pro-1', name: 'Diego' }]}
      showProfessionalSelect={false}
      professionalId="pro-1"
      initialDate="2026-10-03"
      timeZone="America/Sao_Paulo"
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit };
}

describe('AgendaBlockForm ajuste', () => {
  it('usa o starts_at do servidor em vez do relógio local', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      serverAdjustment: {
        startsAt: serverStart,
        endsAt: serverEnd,
        message: 'O início do bloqueio já passou. Ajustamos para agora — confira e confirme de novo.',
      },
    });
    expect(screen.getByTestId('agenda-block-adjust-note')).toHaveTextContent('Começa às');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      startsAt: serverStart,
      endsAt: serverEnd,
    }));
  });

  it('trocar o tipo limpa o ajuste', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByTestId('agenda-block-kind-full_day'));
    await user.click(screen.getByRole('button', { name: 'Bloquear' }));
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    await user.click(screen.getByTestId('agenda-block-kind-hours'));
    expect(screen.queryByTestId('agenda-block-adjust-note')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bloquear' })).toBeInTheDocument();
  });
});
