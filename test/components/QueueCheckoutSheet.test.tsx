import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueueCheckoutSheet } from '@/components/queue/QueueCheckoutSheet';
import type { QueueRecord } from '@/types/queue';

const showToast = vi.fn();
const settleQueueTicket = vi.fn();
const closeQueueTicket = vi.fn();
const sellProduct = vi.fn();

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', region: 'BR' }),
}));
vi.mock('@/hooks/useCatalog', () => ({
  useProducts: () => ({
    data: [{ id: 'p-1', name: 'Pomada', sale_price: 15, is_active: true, stock_quantity: 3 }],
  }),
}));
vi.mock('@/services/catalog', () => ({
  sellProduct: (...args: unknown[]) => sellProduct(...args),
}));
vi.mock('@/services/queue', () => ({
  settleQueueTicket: (...args: unknown[]) => settleQueueTicket(...args),
  closeQueueTicket: (...args: unknown[]) => closeQueueTicket(...args),
}));

const entry: QueueRecord = {
  id: 'q-1',
  business_id: 'b-1',
  client_name: 'Joao',
  client_phone: '11999999999',
  service_id: 's-1',
  professional_id: 'pro-1',
  status: 'serving',
  joined_at: '2026-09-08T10:00:00.000Z',
  service_price_cents: 5000,
  payment_method: 'cash',
  payment_status: 'unpaid',
  ticket_status: 'none',
};

const baseProps = {
  open: true,
  companyId: 'b-1',
  region: 'BR' as const,
  services: [{ id: 's-2', name: 'Barba', price: 20, active: true, duration_minutes: 20 } as any],
  baseServiceName: 'Corte',
  loggedProfessionalId: 'pro-1',
  onClose: vi.fn(),
  onDone: vi.fn(),
};

describe('QueueCheckoutSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settleQueueTicket.mockResolvedValue(undefined);
    closeQueueTicket.mockResolvedValue(undefined);
    sellProduct.mockResolvedValue({});
  });

  it('cobra o total ao gestor, mas lança o produto só na venda própria', async () => {
    render(<QueueCheckoutSheet {...baseProps} entry={entry} />);

    fireEvent.change(screen.getByLabelText('Adicionar produto'), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText('Forma de pagamento'), { target: { value: 'pix' } });
    fireEvent.click(screen.getByRole('button', { name: /Receber R\$\s?65,00 e finalizar/ }));

    await waitFor(() => expect(settleQueueTicket).toHaveBeenCalledTimes(1));
    expect(settleQueueTicket).toHaveBeenCalledWith(expect.objectContaining({
      entryId: 'q-1',
      serviceName: 'Corte',
      finalPrice: 50,
      paymentMethod: 'pix',
    }));
    await waitFor(() => expect(sellProduct).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'p-1',
      quantity: 1,
      professionalId: 'pro-1',
      paymentMethod: 'pix',
    })));
    expect(baseProps.onDone).toHaveBeenCalled();
  });

  it('bloqueia o fechamento enquanto o Pix do cliente não foi confirmado', () => {
    render(
      <QueueCheckoutSheet
        {...baseProps}
        entry={{ ...entry, payment_method: 'pix', payment_status: 'awaiting_confirmation' }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/Pix/);
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeDisabled();
    expect(settleQueueTicket).not.toHaveBeenCalled();
  });

  it('comanda em aberto volta com os itens salvos e finaliza cobrando extras', async () => {
    render(
      <QueueCheckoutSheet
        {...baseProps}
        entry={{
          ...entry,
          ticket_status: 'open',
          ticket_items: [{ kind: 'service', id: 's-2', name: 'Barba', price: 20 }],
        }}
      />,
    );

    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('R$ 70,00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deixar em aberto/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Forma de pagamento'), { target: { value: 'cash' } });
    fireEvent.click(screen.getByRole('button', { name: /Receber R\$\s?70,00 e finalizar/ }));

    await waitFor(() => expect(settleQueueTicket).toHaveBeenCalledWith(expect.objectContaining({
      serviceName: 'Corte + Barba',
      finalPrice: 70,
      paymentMethod: 'cash',
    })));
    expect(sellProduct).not.toHaveBeenCalled();
  });

  it('exige quem atendeu quando a senha não tem profissional', async () => {
    render(
      <QueueCheckoutSheet
        {...baseProps}
        loggedProfessionalId={null}
        teamMembers={[{ id: 'pro-2', name: 'Ana' }, { id: 'pro-3', name: 'Bruno' }]}
        entry={{ ...entry, professional_id: null, payment_status: 'paid' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar atendimento' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(
      'Informe quem atendeu para o histórico e a comissão ficarem certos.',
      'error',
    ));
    expect(settleQueueTicket).not.toHaveBeenCalled();
  });

  it('deixar em aberto persiste os itens adicionados', async () => {
    render(<QueueCheckoutSheet {...baseProps} entry={entry} />);

    fireEvent.change(screen.getByLabelText('Adicionar serviço extra'), { target: { value: 's-2' } });
    fireEvent.click(screen.getByRole('button', { name: /Deixar em aberto/ }));

    await waitFor(() => expect(closeQueueTicket).toHaveBeenCalledWith('q-1', [
      { kind: 'service', id: 's-2', name: 'Barba', price: 20 },
    ]));
  });
});
