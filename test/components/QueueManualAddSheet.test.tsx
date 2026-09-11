import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueManualAddSheet } from '@/components/queue/QueueManualAddSheet';
import { ToastProvider } from '@/components/ui';
import { ensureClientFromQueue, listActiveClientsForPicker } from '@/services/crm';
import { addManualQueueEntry } from '@/services/queue';
import type { ServiceItem } from '@/types/serviceSettings';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', region: 'BR' }),
}));

vi.mock('@/services/crm', () => ({
  listActiveClientsForPicker: vi.fn(),
  ensureClientFromQueue: vi.fn(),
}));

vi.mock('@/services/queue', () => ({
  addManualQueueEntry: vi.fn(),
  queueJoinUserMessage: (_error: unknown, fallback: string) => fallback,
}));

const services: ServiceItem[] = [
  {
    id: 'svc-corte',
    name: 'Corte',
    description: '',
    price: 35,
    duration_minutes: 30,
    category_id: 'cat-1',
    image_url: null,
    active: true,
    user_id: 'biz-001',
  },
];

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onAdded = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <QueueManualAddSheet
          open
          companyId="biz-001"
          slug="barbearia-qa"
          businessName="Barbearia QA"
          region="BR"
          mode="shared"
          services={services}
          teamMembers={[]}
          onClose={onClose}
          onAdded={onAdded}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onAdded, onClose };
}

describe('QueueManualAddSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://agendixstudio.com' },
      writable: true,
    });
    (listActiveClientsForPicker as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'c-1', name: 'Tales Furtado', phone: '11939064172' },
      { id: 'c-2', name: 'Sem Telefone', phone: null },
    ]);
    (addManualQueueEntry as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'q-1',
      business_id: 'biz-001',
      client_name: 'Tales Furtado',
      client_phone: '11939064172',
      status: 'waiting',
      joined_at: '2026-09-11T10:00:00.000Z',
    });
    (ensureClientFromQueue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('adiciona cliente da lista e mostra o link da senha', async () => {
    const user = userEvent.setup();
    const { onAdded } = renderSheet();

    await waitFor(() => expect(listActiveClientsForPicker).toHaveBeenCalledWith('biz-001'));
    await user.click(screen.getByText('Buscar por nome ou telefone'));
    await user.click(screen.getByText('Tales Furtado'));
    await user.selectOptions(screen.getByLabelText('Serviço'), 'svc-corte');
    await user.selectOptions(screen.getByLabelText('Forma de pagamento'), 'pix');
    await user.click(screen.getByRole('button', { name: 'Adicionar à fila' }));

    await waitFor(() => expect(addManualQueueEntry).toHaveBeenCalledWith(expect.objectContaining({
      clientName: 'Tales Furtado',
      clientPhone: '11939064172',
      serviceId: 'svc-corte',
      paymentMethod: 'pix',
    })));
    expect(ensureClientFromQueue).not.toHaveBeenCalled();
    expect(onAdded).toHaveBeenCalled();
    const success = await screen.findByTestId('queue-manual-success');
    expect(within(success).getByText('Tales Furtado entrou na fila.')).toBeInTheDocument();
    expect(screen.getByTestId('queue-tracking-url')).toHaveValue(
      'https://agendixstudio.com/#/minha-area/barbearia-qa?tab=fila',
    );
    expect(screen.getByRole('button', { name: 'Enviar no WhatsApp' })).toBeInTheDocument();
    expect(screen.getByText(/libera a senha automaticamente/)).toBeInTheDocument();
  });

  it('walk-in cadastra no CRM e também gera o link', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByTestId('queue-source-walkin'));
    await user.type(screen.getByLabelText('Nome'), 'Maria Nova');
    await user.type(screen.getByPlaceholderText('(99) 99999-9999'), '11988887777');
    await user.selectOptions(screen.getByLabelText('Serviço'), 'svc-corte');
    await user.selectOptions(screen.getByLabelText('Forma de pagamento'), 'cash');
    await user.click(screen.getByRole('button', { name: 'Adicionar à fila' }));

    await waitFor(() => expect(addManualQueueEntry).toHaveBeenCalled());
    expect(ensureClientFromQueue).toHaveBeenCalledWith('biz-001', 'Maria Nova', expect.any(String));
    expect(await screen.findByText('Maria Nova entrou na fila.')).toBeInTheDocument();
  });

  it('bloqueia cliente da lista sem telefone', async () => {
    const user = userEvent.setup();
    renderSheet();

    await waitFor(() => expect(listActiveClientsForPicker).toHaveBeenCalled());
    await user.click(screen.getByText('Buscar por nome ou telefone'));
    await user.click(screen.getByText('Sem Telefone'));
    await user.selectOptions(screen.getByLabelText('Serviço'), 'svc-corte');
    await user.selectOptions(screen.getByLabelText('Forma de pagamento'), 'pix');
    await user.click(screen.getByRole('button', { name: 'Adicionar à fila' }));

    expect(addManualQueueEntry).not.toHaveBeenCalled();
    expect(await screen.findByText(/não tem telefone cadastrado/i)).toBeInTheDocument();
  });
});
