import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueStaffCard } from '@/components/queue/QueueStaffCard';
import type { QueueRecord } from '@/types/queue';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', region: 'BR' }),
}));

const waiting: QueueRecord = {
  id: 'q-1',
  business_id: 'b-1',
  client_name: 'Maria Silva',
  client_phone: '11999999999',
  status: 'waiting',
  joined_at: '2026-09-06T10:00:00.000Z',
  payment_status: 'awaiting_confirmation',
};

describe('QueueStaffCard', () => {
  it('mostra iniciar, chamar e confirmar Pix pendente', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onCall = vi.fn();
    const onConfirmPay = vi.fn();

    render(
      <QueueStaffCard
        entry={waiting}
        region="BR"
        onStart={onStart}
        onCall={onCall}
        onCloseTicket={vi.fn()}
        onConfirmPay={onConfirmPay}
        onCancelPay={vi.fn()}
      />,
    );

    expect(screen.getByText('Aguardando confirmação e pagamento')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));
    await user.click(screen.getByRole('button', { name: 'Chamar cliente' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));
    expect(onStart).toHaveBeenCalledWith('q-1');
    expect(onCall).toHaveBeenCalledWith('q-1');
    expect(onConfirmPay).toHaveBeenCalledWith('q-1');
  });

  it('em atendimento oferece fechar comanda', async () => {
    const user = userEvent.setup();
    const onCloseTicket = vi.fn();
    render(
      <QueueStaffCard
        entry={{ ...waiting, status: 'serving', payment_status: 'paid' }}
        region="BR"
        onStart={vi.fn()}
        onCall={vi.fn()}
        onCloseTicket={onCloseTicket}
        onConfirmPay={vi.fn()}
        onCancelPay={vi.fn()}
      />,
    );

    expect(screen.getByText('Pago')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar comanda' }));
    expect(onCloseTicket).toHaveBeenCalled();
  });
});
