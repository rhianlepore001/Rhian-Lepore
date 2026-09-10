import { describe, expect, it } from 'vitest';
import { parseQueueRealtimeEvent } from '@/hooks/useQueueRealtime';
import { summarizeQueueHistory } from '@/services/queue';
import { formatQueueClock, queueHistoryStatusLabel } from '@/utils/queueHistoryCopy';
import type { QueueRecord } from '@/types/queue';

function entry(partial: Partial<QueueRecord> & Pick<QueueRecord, 'id' | 'status'>): QueueRecord {
  return {
    business_id: 'b',
    client_name: 'Ana',
    client_phone: '11999999999',
    joined_at: '2026-09-10T10:00:00.000Z',
    ...partial,
  };
}

describe('parseQueueRealtimeEvent', () => {
  it('aceita o payload do trigger e ignora lixo', () => {
    expect(parseQueueRealtimeEvent({
      op: 'UPDATE',
      entryId: 'qe-1',
      businessId: 'biz-1',
      status: 'calling',
      calledAt: '2026-09-10T12:00:00.000Z',
    })).toMatchObject({ entryId: 'qe-1', status: 'calling' });
    expect(parseQueueRealtimeEvent({ status: 'calling' })).toBeNull();
  });
});

describe('summarizeQueueHistory', () => {
  it('conta entradas, atendidos, no-show e saídas', () => {
    const summary = summarizeQueueHistory([
      entry({ id: '1', status: 'completed' }),
      entry({ id: '2', status: 'completed' }),
      entry({ id: '3', status: 'no_show' }),
      entry({ id: '4', status: 'cancelled' }),
      entry({ id: '5', status: 'waiting' }),
      entry({ id: '6', status: 'serving' }),
    ]);
    expect(summary).toEqual({
      entered: 6,
      completed: 2,
      serving: 1,
      waiting: 1,
      noShow: 1,
      cancelled: 1,
    });
  });
});

describe('queueHistoryCopy', () => {
  it('rotula o desfecho para o gestor', () => {
    expect(queueHistoryStatusLabel('completed')).toBe('Atendido');
    expect(queueHistoryStatusLabel('no_show')).toBe('Não compareceu');
    expect(formatQueueClock(null)).toBe('—');
  });
});
