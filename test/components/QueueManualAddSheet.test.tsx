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
import type { WhatsAppTemplateOverride } from '@/utils/whatsappTemplates';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', region: 'BR', companyId: 'biz-001', role: 'owner' }),
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

function renderSheet(template?: WhatsAppTemplateOverride) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (template) client.setQueryData(['whatsapp-templates', 'tenant', 'biz-001'], [template]);
  const onAdded = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <QueueManualAddSheet
          open
          companyId="biz-001"
          slug="negocio-exemplo"
          businessName="Negócio Exemplo"
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
      value: { origin: 'https://example.test' },
      writable: true,
    });
    (listActiveClientsForPicker as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'c-1', name: 'Cliente Exemplo', phone: '00000000000' },
      { id: 'c-2', name: 'Sem Telefone', phone: null },
    ]);
    (addManualQueueEntry as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'q-1',
      business_id: 'biz-001',
      client_name: 'Cliente Exemplo',
      client_phone: '00000000000',
      status: 'waiting',
      joined_at: '2026-09-11T10:00:00.000Z',
    });
    (ensureClientFromQueue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it.each([true, false])('fila usa texto salvo e mantém botão sem texto se desativada: ativa=%s', async enabled => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderSheet({ message_key: 'queue_joined', enabled, body: 'Oi {primeiro_nome}, entre na fila de *{estabelecimento}*.' });
    await userEvent.click(await screen.findByText('Buscar por nome ou telefone'));
    await userEvent.click(screen.getByText('Cliente Exemplo'));
    await userEvent.selectOptions(screen.getByLabelText('Serviço'), 'svc-corte');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à fila' }));
    await userEvent.click(await screen.findByTestId('queue-tracking-whatsapp'));
    const url = new URL(String(open.mock.calls[0][0]));
    expect(url.searchParams.get('text')).toBe(enabled ? 'Oi Cliente, entre na fila de *Negócio Exemplo*.' : null);
    open.mockRestore();
  });

  it('adiciona cliente da lista e mostra o link da senha', async () => {
    const user = userEvent.setup();
    const { onAdded } = renderSheet();

    await waitFor(() => expect(listActiveClientsForPicker).toHaveBeenCalledWith('biz-001'));
    await waitFor(() => expect(screen.getByText('Buscar por nome ou telefone')).toBeInTheDocument());
    await user.click(screen.getByText('Buscar por nome ou telefone'));
    await user.click(screen.getByText('Cliente Exemplo'));
    await user.selectOptions(screen.getByLabelText('Serviço'), 'svc-corte');
    expect(screen.queryByLabelText('Forma de pagamento')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar à fila' }));

    await waitFor(() => expect(addManualQueueEntry).toHaveBeenCalledWith(expect.objectContaining({
      clientName: 'Cliente Exemplo',
      clientPhone: '00000000000',
      serviceId: 'svc-corte',
    })));
    expect((addManualQueueEntry as ReturnType<typeof vi.fn>).mock.calls[0][0]).not.toHaveProperty('paymentMethod');
    expect(ensureClientFromQueue).not.toHaveBeenCalled();
    expect(onAdded).toHaveBeenCalled();
    const success = await screen.findByTestId('queue-manual-success');
    expect(within(success).getByText('Cliente Exemplo entrou na fila.')).toBeInTheDocument();
    expect(screen.getByTestId('queue-tracking-url')).toHaveValue(
      'https://example.test/#/minha-area/negocio-exemplo?tab=fila',
    );
    expect(screen.getByRole('button', { name: 'Enviar no WhatsApp' })).toBeInTheDocument();
    expect(screen.getByText(/informa o mesmo WhatsApp e vê a posição na fila/)).toBeInTheDocument();
  });

  it('walk-in cadastra no CRM e também gera o link', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByTestId('queue-source-walkin'));
    await user.type(screen.getByLabelText('Nome'), 'Maria Nova');
    await user.type(screen.getByPlaceholderText('(99) 99999-9999'), '00000000001');
    await user.selectOptions(screen.getByLabelText('Serviço'), 'svc-corte');
    await user.click(screen.getByRole('button', { name: 'Adicionar à fila' }));

    await waitFor(() => expect(addManualQueueEntry).toHaveBeenCalled());
    expect(ensureClientFromQueue).toHaveBeenCalledWith('biz-001', 'Maria Nova', expect.any(String));
    expect(await screen.findByText('Maria Nova entrou na fila.')).toBeInTheDocument();
  });

  it('bloqueia cliente da lista sem telefone', async () => {
    const user = userEvent.setup();
    renderSheet();

    await waitFor(() => expect(listActiveClientsForPicker).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Buscar por nome ou telefone')).toBeInTheDocument());
    await user.click(screen.getByText('Buscar por nome ou telefone'));
    await user.click(screen.getByText('Sem Telefone'));
    await user.selectOptions(screen.getByLabelText('Serviço'), 'svc-corte');
    await user.click(screen.getByRole('button', { name: 'Adicionar à fila' }));

    expect(addManualQueueEntry).not.toHaveBeenCalled();
    expect(await screen.findByText(/não tem telefone cadastrado/i)).toBeInTheDocument();
  });
});
