import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ colors: { textMuted: 'text-muted' } }),
}));
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void } & Record<string, unknown>) => (
    <button type="button" onClick={onClick} {...rest}>{children}</button>
  ),
}));

import { AppointmentDetailsActions } from '../../components/agenda/AppointmentDetailsActions';

const handlers = () => ({
  onCheckout: vi.fn(), onNoShow: vi.fn(), onEdit: vi.fn(), onCancel: vi.fn(), onClose: vi.fn(), onReschedule: vi.fn(),
});
const names = () => screen.getAllByRole('button').map((b) => b.textContent?.trim());

describe('AppointmentDetailsActions — ações por permissão', () => {
  it('dono: cobrar, faltou, editar, cancelar e fechar', () => {
    const h = handlers();
    render(<AppointmentDetailsActions status="Confirmed" canEdit isStaff={false} blockedMessage="x" {...h} />);
    expect(names()).toEqual(['Confirmar e cobrar', 'Faltou', 'Remarcar', 'Editar', 'Cancelar', 'Fechar']);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(h.onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('staff-edit-blocked-note')).toBeNull();
  });

  it('colaborador bloqueado: mantém cobrar/faltou, sem editar/cancelar, com explicação curta', () => {
    const h = handlers();
    render(<AppointmentDetailsActions status="Confirmed" canEdit={false} isStaff blockedMessage="Edição reservada ao dono." {...h} />);
    expect(names()).toEqual(['Confirmar e cobrar', 'Faltou', 'Fechar']);
    expect(screen.getByTestId('staff-edit-blocked-note').textContent).toContain('Edição reservada ao dono.');
    fireEvent.click(screen.getByText('Faltou'));
    fireEvent.click(screen.getByText('Confirmar e cobrar'));
    expect(h.onNoShow).toHaveBeenCalled();
    expect(h.onCheckout).toHaveBeenCalled();
  });

  it('colaborador com permissão: vê editar e cancelar', () => {
    render(<AppointmentDetailsActions status="Confirmed" canEdit isStaff blockedMessage="x" {...handlers()} />);
    expect(names()).toEqual(['Confirmar e cobrar', 'Faltou', 'Remarcar', 'Editar', 'Cancelar', 'Fechar']);
  });

  it('pendente: sem "Editar" (como antes), mas cancelar se permitido', () => {
    render(<AppointmentDetailsActions status="Pending" canEdit isStaff={false} blockedMessage="x" {...handlers()} />);
    expect(names()).toEqual(['Confirmar e cobrar', 'Faltou', 'Remarcar', 'Cancelar', 'Fechar']);
  });

  it('concluído/cancelado: só fechar', () => {
    render(<AppointmentDetailsActions status="Completed" canEdit isStaff={false} blockedMessage="x" {...handlers()} />);
    expect(names()).toEqual(['Fechar']);
  });
});

describe('AppointmentDetailsActions — T-V11 Remarcar por status × canEdit', () => {
  it('Confirmed + canEdit mostra Remarcar', () => {
    const h = handlers();
    render(<AppointmentDetailsActions status="Confirmed" canEdit isStaff={false} blockedMessage="x" {...h} />);
    expect(names()).toContain('Remarcar');
    fireEvent.click(screen.getByTestId('appointment-reschedule'));
    expect(h.onReschedule).toHaveBeenCalledTimes(1);
  });

  it('Pending + canEdit mostra Remarcar (Pending não tem Editar)', () => {
    render(<AppointmentDetailsActions status="Pending" canEdit isStaff={false} blockedMessage="x" {...handlers()} />);
    expect(names()).toContain('Remarcar');
    expect(names()).not.toContain('Editar');
  });

  it.each(['Completed', 'Cancelled', 'NoShow'])('%s não mostra Remarcar mesmo com canEdit', (status) => {
    render(
      <AppointmentDetailsActions
        status={status}
        canEdit
        isStaff={false}
        blockedMessage="x"
        {...handlers()}
        onUseSlot={status === 'NoShow' ? vi.fn() : undefined}
      />,
    );
    expect(names()).not.toContain('Remarcar');
  });

  it('staff canEdit=false (escopo none) esconde Remarcar', () => {
    render(<AppointmentDetailsActions status="Confirmed" canEdit={false} isStaff blockedMessage="Edição reservada ao dono." {...handlers()} />);
    expect(names()).not.toContain('Remarcar');
    expect(names()).not.toContain('Editar');
  });
});
