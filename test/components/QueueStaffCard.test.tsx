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
  duration_minutes: 30,
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

    expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));
    await user.click(screen.getByRole('button', { name: 'Chamar cliente' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar pagamento recebido' }));
    expect(onStart).toHaveBeenCalledWith('q-1');
    expect(onCall).toHaveBeenCalledWith('q-1');
    expect(onConfirmPay).toHaveBeenCalledWith('q-1');
  });

  it('mostra serviço e profissional e permite marcar não compareceu', async () => {
    const user = userEvent.setup();
    const onNoShow = vi.fn();
    render(
      <QueueStaffCard
        entry={{ ...waiting, payment_status: 'unpaid' }}
        region="BR"
        serviceName="Corte masculino"
        professionalName="João"
        position={2}
        onStart={vi.fn()}
        onCall={vi.fn()}
        onCloseTicket={vi.fn()}
        onConfirmPay={vi.fn()}
        onCancelPay={vi.fn()}
        onNoShow={onNoShow}
      />,
    );

    expect(screen.getByText('Corte masculino · 30 min · com João')).toBeInTheDocument();
    expect(screen.getByText('Pagamento no balcão')).toBeInTheDocument();
    expect(screen.getByLabelText('Posição 2')).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: 'Não compareceu' }));
    expect(onNoShow).toHaveBeenCalledWith(expect.objectContaining({ id: 'q-1' }));
  });

  it('cliente chamado pode voltar para a fila', async () => {
    const user = userEvent.setup();
    const onRequeue = vi.fn();
    render(
      <QueueStaffCard
        entry={{ ...waiting, status: 'calling', called_at: new Date().toISOString(), payment_status: 'unpaid' }}
        region="BR"
        lateMinutes={10}
        onStart={vi.fn()}
        onCall={vi.fn()}
        onCloseTicket={vi.fn()}
        onConfirmPay={vi.fn()}
        onCancelPay={vi.fn()}
        onNoShow={vi.fn()}
        onRequeue={onRequeue}
      />,
    );

    expect(screen.getByText('Chamado · 10 min para chegar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chamar cliente' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para a fila' }));
    expect(onRequeue).toHaveBeenCalledWith('q-1');
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
        onNoShow={vi.fn()}
      />,
    );

    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Não compareceu' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar comanda' }));
    expect(onCloseTicket).toHaveBeenCalled();
  });
});
