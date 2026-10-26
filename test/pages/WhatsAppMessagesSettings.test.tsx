import { ToastProvider } from '../../components/ui/Toast';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppMessagesSettings } from '../../pages/settings/WhatsAppMessagesSettings';
import * as service from '../../services/whatsappTemplates';

const auth = vi.hoisted(() => ({
  companyId: 'tenant-a',
  role: 'owner',
  businessName: 'Negócio Exemplo',
  region: 'BR',
  userType: 'beauty',
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useSettings', () => ({
  useProfileFields: () => ({ data: { phone: '00000000000' } }),
}));
vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock('../../components/ui/Modal', () => ({
  Modal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
        {footer}
      </div>
    ) : null,
}));
vi.mock('../../services/whatsappTemplates', () => ({
  fetchWhatsAppTemplates: vi.fn(),
  fetchPublicWhatsAppTemplates: vi.fn(),
  saveWhatsAppTemplate: vi.fn(),
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <WhatsAppMessagesSettings />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Mensagens do WhatsApp', () => {
  beforeEach(() => {
    auth.role = 'owner';
    vi.mocked(service.fetchWhatsAppTemplates).mockResolvedValue([]);
    vi.mocked(service.saveWhatsAppTemplate).mockImplementation(
      async (_company, row) => row,
    );
  });
  it('edita, visualiza como texto, insere variável e salva', async () => {
    setup();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar Horário remarcado' }),
    );
    const input = screen.getByLabelText('Texto da mensagem');
    fireEvent.change(input, {
      target: {
        value:
          'Oi {cliente}, seu horário em {estabelecimento}! <img src=x onerror=alert(1)>',
      },
    });
    expect(screen.getByTestId('whatsapp-preview')).toHaveTextContent(
      'Oi Cliente Exemplo, seu horário em Negócio Exemplo! <img',
    );
    expect(
      screen.getByTestId('whatsapp-preview').querySelector('img'),
    ).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '{data}' }));
    expect((input as HTMLTextAreaElement).value).toContain('{data}');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(service.saveWhatsAppTemplate).toHaveBeenCalledWith(
        'tenant-a',
        expect.objectContaining({
          message_key: 'reschedule',
          enabled: true,
          body: expect.stringContaining('Oi {cliente}'),
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
  it('bloqueia variável indisponível e excesso de texto, e testa WhatsApp com dados de exemplo', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    setup();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar Horário remarcado' }),
    );
    const input = screen.getByLabelText('Texto da mensagem');
    fireEvent.change(input, { target: { value: 'Oi {senha}' } });
    expect(screen.getByRole('alert')).toHaveTextContent('não está disponível');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'x'.repeat(1001) } });
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    fireEvent.change(input, {
      target: { value: 'Oi {cliente} de {estabelecimento}' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Testar no meu WhatsApp' }),
    );
    expect(open).toHaveBeenCalledWith(
      'https://wa.me/5500000000000?text=Oi%20Cliente%20Exemplo%20de%20Neg%C3%B3cio%20Exemplo',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });
  it('desliga e restaura com confirmação mantendo a mensagem desligada', async () => {
    vi.mocked(service.fetchWhatsAppTemplates).mockResolvedValue([
      { message_key: 'reschedule', enabled: true, body: 'Meu texto' },
    ]);
    setup();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Ativa: Horário remarcado' }),
    );
    await waitFor(() =>
      expect(service.saveWhatsAppTemplate).toHaveBeenCalledWith('tenant-a', {
        message_key: 'reschedule',
        enabled: false,
        body: 'Meu texto',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Horário remarcado' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Restaurar padrão' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Restaurar mensagem padrão?' }),
    ).toBeInTheDocument();
    expect(service.saveWhatsAppTemplate).toHaveBeenCalledTimes(1);
    const buttons = screen.getAllByRole('button', { name: 'Restaurar padrão' });
    await userEvent.click(buttons[buttons.length - 1]);
    await waitFor(() =>
      expect(service.saveWhatsAppTemplate).toHaveBeenLastCalledWith(
        'tenant-a',
        { message_key: 'reschedule', enabled: false, body: null },
      ),
    );
    expect(
      (screen.getByLabelText('Texto da mensagem') as HTMLTextAreaElement).value,
    ).toContain('Seu horário em *{estabelecimento}* foi remarcado.');
  });
  it('profissional não vê a tela', () => {
    auth.role = 'staff';
    setup();
    expect(screen.queryByText('Mensagens do WhatsApp')).not.toBeInTheDocument();
  });
  it('falha ao carregar impede sobrescrever mensagens desconhecidas', async () => {
    vi.mocked(service.fetchWhatsAppTemplates).mockRejectedValue(
      new Error('offline'),
    );
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar',
    );
    expect(
      screen.queryByRole('button', { name: /Editar/ }),
    ).not.toBeInTheDocument();
  });
});
