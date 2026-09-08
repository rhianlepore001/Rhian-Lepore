import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

import { applyOptimisticQueueStatus } from '@/hooks/useQueue';
import type { QueueRecord } from '@/types/queue';

const base: QueueRecord = {
  id: 'q-1',
  business_id: 'b-1',
  client_name: 'Maria',
  client_phone: '11999999999',
  status: 'waiting',
  joined_at: '2026-09-08T10:00:00.000Z',
};

describe('applyOptimisticQueueStatus', () => {
  const now = '2026-09-08T10:05:00.000Z';

  it('marca chamado com called_at e mantém as outras entradas', () => {
    const other: QueueRecord = { ...base, id: 'q-2' };
    const result = applyOptimisticQueueStatus([base, other], { entryId: 'q-1', businessId: 'b-1', status: 'calling' }, now);
    expect(result?.[0]).toMatchObject({ id: 'q-1', status: 'calling', called_at: now });
    expect(result?.[1]).toBe(other);
  });

  it('voltar para a fila limpa called_at; iniciar registra serving_at', () => {
    const calling: QueueRecord = { ...base, status: 'calling', called_at: '2026-09-08T10:01:00.000Z' };
    const back = applyOptimisticQueueStatus([calling], { entryId: 'q-1', businessId: 'b-1', status: 'waiting' }, now);
    expect(back?.[0]).toMatchObject({ status: 'waiting', called_at: null });
    const serving = applyOptimisticQueueStatus([calling], { entryId: 'q-1', businessId: 'b-1', status: 'serving' }, now);
    expect(serving?.[0]).toMatchObject({ status: 'serving', serving_at: now });
  });

  it('cache vazio permanece indefinido', () => {
    expect(applyOptimisticQueueStatus(undefined, { entryId: 'q-1', businessId: 'b-1', status: 'calling' }, now)).toBeUndefined();
  });
});
