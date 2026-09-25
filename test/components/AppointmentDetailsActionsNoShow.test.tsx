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
  onCheckout: vi.fn(), onNoShow: vi.fn(), onEdit: vi.fn(), onCancel: vi.fn(), onClose: vi.fn(), onReschedule: vi.fn(),
});
const names = () => screen.getAllByRole('button').map((b) => b.textContent?.trim());

describe('AppointmentDetailsActions — Reagendar falta', () => {
  it('falta: Reagendar + Fechar, com explicação; liberado até para colaborador sem permissão de edição', () => {
    const h = base();
    render(<AppointmentDetailsActions status="NoShow" {...h} />);
    expect(names()).toEqual(['Reagendar', 'Fechar']);
    expect(screen.getByTestId('noshow-reschedule-hint').textContent).toMatch(/A falta continua no histórico/);
    fireEvent.click(screen.getByText('Reagendar'));
    expect(h.onReschedule).toHaveBeenCalledTimes(1);
    expect(h.onEdit).not.toHaveBeenCalled();
    expect(h.onCancel).not.toHaveBeenCalled();
    expect(h.onNoShow).not.toHaveBeenCalled();
  });

  it.each(['Completed', 'Cancelled'])('%s: só Fechar (sem Reagendar)', (status) => {
    render(<AppointmentDetailsActions status={status} {...base()} canEdit isStaff={false} />);
    expect(names()).toEqual(['Fechar']);
  });

  it('agendamento em aberto não mostra Reagendar', () => {
    render(<AppointmentDetailsActions status="Confirmed" {...base()} canEdit isStaff={false} />);
    expect(names()).not.toContain('Reagendar');
  });
});
