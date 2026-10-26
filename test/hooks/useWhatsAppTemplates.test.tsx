import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWhatsAppTemplates } from '../../hooks/useWhatsAppTemplates';
import * as service from '../../services/whatsappTemplates';

const auth = vi.hoisted(() => ({ companyId: 'tenant-a', role: 'owner' }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../services/whatsappTemplates', () => ({
  fetchWhatsAppTemplates: vi.fn(),
  fetchPublicWhatsAppTemplates: vi.fn(),
  saveWhatsAppTemplate: vi.fn(),
}));

function setup(slug?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(() => useWhatsAppTemplates(slug), { wrapper }),
    client,
    wrapper,
  };
}

describe('useWhatsAppTemplates', () => {
  beforeEach(() => {
    auth.companyId = 'tenant-a';
    auth.role = 'owner';
    vi.mocked(service.fetchWhatsAppTemplates).mockResolvedValue([]);
    vi.mocked(service.fetchPublicWhatsAppTemplates).mockResolvedValue([]);
    vi.mocked(service.saveWhatsAppTemplate).mockImplementation(
      async (_company, row) => row,
    );
  });
  it('carrega por sessão, mantém padrão sem linha e compartilha o cache', async () => {
    const { result, wrapper } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(service.fetchWhatsAppTemplates).toHaveBeenCalledWith('tenant-a');
    expect(result.current.isEnabled('reschedule')).toBe(true);
    const second = renderHook(() => useWhatsAppTemplates(), { wrapper });
    expect(second.result.current.isSuccess).toBe(true);
    await act(async () => {
      await result.current.save({
        message_key: 'reschedule',
        enabled: true,
        body: 'Oi {cliente}',
      });
    });
    await waitFor(() =>
      expect(
        second.result.current.render('reschedule', 'beauty', {
          cliente: 'Cliente',
        }),
      ).toBe('Oi Cliente'),
    );
    await act(async () => {
      await result.current.save({
        message_key: 'reschedule',
        enabled: false,
        body: 'Oi {cliente}',
      });
    });
    await waitFor(() =>
      expect(result.current.isEnabled('reschedule')).toBe(false),
    );
    await act(async () => {
      await result.current.restore('reschedule');
    });
    expect(service.saveWhatsAppTemplate).toHaveBeenLastCalledWith('tenant-a', {
      message_key: 'reschedule',
      enabled: false,
      body: null,
    });
    await waitFor(() =>
      expect(result.current.templates.reschedule?.body).toBeNull(),
    );
  });
  it('público consulta somente RPC por slug e não salva', async () => {
    const { result } = setup('studio');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(service.fetchPublicWhatsAppTemplates).toHaveBeenCalledWith('studio');
    expect(service.fetchWhatsAppTemplates).not.toHaveBeenCalled();
    await expect(
      result.current.save({
        message_key: 'client_change',
        enabled: true,
        body: null,
      }),
    ).rejects.toThrow('Só o gestor');
  });
  it('profissional não pode salvar', async () => {
    auth.role = 'staff';
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await expect(
      result.current.save({
        message_key: 'reschedule',
        enabled: true,
        body: 'Oi',
      }),
    ).rejects.toThrow('Só o gestor');
    expect(service.saveWhatsAppTemplate).not.toHaveBeenCalled();
  });
  it('troca de negócio não reutiliza mensagens do negócio anterior', async () => {
    vi.mocked(service.fetchWhatsAppTemplates).mockResolvedValueOnce([
      { message_key: 'reschedule', enabled: true, body: 'Somente A' },
    ]);
    const { result, rerender } = setup();
    await waitFor(() =>
      expect(result.current.templates.reschedule?.body).toBe('Somente A'),
    );
    auth.companyId = 'tenant-b';
    rerender();
    expect(result.current.templates.reschedule).toBeUndefined();
    await waitFor(() =>
      expect(service.fetchWhatsAppTemplates).toHaveBeenLastCalledWith(
        'tenant-b',
      ),
    );
  });
});
