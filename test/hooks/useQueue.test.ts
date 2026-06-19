import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFinishQueueEntry,
  useJoinQueue,
  useQueueEntries,
  useUpdateQueueStatus,
} from '@/hooks/useQueue';
import * as queueService from '@/services/queue';

vi.mock('@/services/queue', () => ({
  fetchQueueEntries: vi.fn(),
  finishQueueEntry: vi.fn(),
  joinQueue: vi.fn(),
  updateQueueStatus: vi.fn(),
}));

const mockEntry = {
  id: 'queue-001',
  business_id: 'business-001',
  client_name: 'João',
  client_phone: '11999999999',
  service_id: 'service-001',
  professional_id: null,
  status: 'waiting' as const,
  joined_at: '2026-05-30T10:00:00.000Z',
};

const createWrapper = (queryClient?: QueryClient) => {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = 'QueueTestWrapper';
  return { Wrapper, queryClient: client };
};

describe('useQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useQueueEntries', () => {
    it('não dispara query sem businessId', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useQueueEntries(''), { wrapper: Wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(queueService.fetchQueueEntries).not.toHaveBeenCalled();
    });

    it('retorna entradas da fila após fetch', async () => {
      (queueService.fetchQueueEntries as ReturnType<typeof vi.fn>).mockResolvedValue([mockEntry]);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useQueueEntries('business-001'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(queueService.fetchQueueEntries).toHaveBeenCalledWith('business-001');
      expect(result.current.data).toEqual([mockEntry]);
    });
  });

  describe('useJoinQueue', () => {
    it('chama joinQueue com payload', async () => {
      (queueService.joinQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntry);
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => useJoinQueue(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          businessId: 'business-001',
          clientName: 'João',
          clientPhone: '11999999999',
        });
      });

      expect(queueService.joinQueue).toHaveBeenCalledOnce();
      expect((queueService.joinQueue as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        businessId: 'business-001',
        clientName: 'João',
        clientPhone: '11999999999',
      });
    });
  });

  describe('useUpdateQueueStatus', () => {
    it('chama service e invalida cache de entradas', async () => {
      (queueService.updateQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntry);
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { Wrapper } = createWrapper(queryClient);

      const { result } = renderHook(() => useUpdateQueueStatus(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          entryId: 'queue-001',
          businessId: 'business-001',
          status: 'calling',
        });
      });

      expect(queueService.updateQueueStatus).toHaveBeenCalledOnce();
      expect((queueService.updateQueueStatus as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        entryId: 'queue-001',
        businessId: 'business-001',
        status: 'calling',
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['queue', 'entries'] });
    });
  });

  describe('useFinishQueueEntry', () => {
    it('chama finishQueueEntry e invalida cache de entradas', async () => {
      (queueService.finishQueueEntry as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { Wrapper } = createWrapper(queryClient);

      const { result } = renderHook(() => useFinishQueueEntry(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          entryId: 'queue-001',
          serviceName: 'Corte',
          finalPrice: 50,
        });
      });

      expect(queueService.finishQueueEntry).toHaveBeenCalledOnce();
      expect((queueService.finishQueueEntry as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        entryId: 'queue-001',
        serviceName: 'Corte',
        finalPrice: 50,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['queue', 'entries'] });
    });
  });
});
