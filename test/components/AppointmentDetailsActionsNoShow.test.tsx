import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../hooks/useBrutalTheme', () => ({ useBrutalTheme: () => ({ colors: { textMuted: 'text-muted' } }) }));
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

import { AppointmentDetailsActions } from '../../components/agenda/AppointmentDetailsActions';

const base = () => ({
  canEdit: false, isStaff: true, blockedMessage: 'x',
  onCheckout: vi.fn(), onNoShow: vi.fn(), onEdit: vi.fn(), onCancel: vi.fn(), onClose: vi.fn(), onUseSlot: vi.fn(),
});
const names = () => screen.getAllByRole('button').map((b) => b.textContent?.trim());

describe('AppointmentDetailsActions — "Usar este horário" da falta', () => {
  it('falta: Usar este horário + Fechar, com explicação; liberado até para colaborador sem permissão de edição', () => {
    const h = base();
    render(<AppointmentDetailsActions status="NoShow" {...h} />);
    expect(names()).toEqual(['Usar este horário', 'Fechar']);
    expect(screen.getByTestId('noshow-use-slot-hint').textContent).toBe(
      'O horário ficou livre. Crie um novo agendamento nele para qualquer cliente — a falta continua no histórico.',
    );
    expect(screen.queryByText(/Reagendar|mesmo cliente/)).toBeNull();
    fireEvent.click(screen.getByText('Usar este horário'));
    expect(h.onUseSlot).toHaveBeenCalledTimes(1);
    expect(h.onEdit).not.toHaveBeenCalled();
    expect(h.onCancel).not.toHaveBeenCalled();
    expect(h.onNoShow).not.toHaveBeenCalled();
  });

  it.each(['Completed', 'Cancelled'])('%s: só Fechar (sem Usar este horário)', (status) => {
    render(<AppointmentDetailsActions status={status} {...base()} canEdit isStaff={false} />);
    expect(names()).toEqual(['Fechar']);
  });

  it('agendamento em aberto não mostra Usar este horário', () => {
    render(<AppointmentDetailsActions status="Confirmed" {...base()} canEdit isStaff={false} />);
    expect(names()).not.toContain('Usar este horário');
  });
});
