import type { QueuePaymentStatus, QueueStatus, QueueTicketStatus } from '@/types/queue';

/**
 * Evento publicado pelo trigger `queue_entries_broadcast` no tópico `queue:<businessId>`.
 * Não carrega nome nem telefone — quem escuta refaz a leitura pelas RPCs protegidas.
 */
export interface QueueRealtimeEvent {
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  entryId: string;
  businessId: string;
  status: QueueStatus;
  paymentStatus?: QueuePaymentStatus | null;
  ticketStatus?: QueueTicketStatus | null;
  calledAt?: string | null;
  servingAt?: string | null;
  closedAt?: string | null;
  at?: string;
}

export const QUEUE_REALTIME_EVENT = 'queue_entry';
export const queueRealtimeTopic = (businessId: string) => `queue:${businessId}`;

export function parseQueueRealtimeEvent(payload: unknown): QueueRealtimeEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const entryId = typeof record.entryId === 'string' ? record.entryId : null;
  const businessId = typeof record.businessId === 'string' ? record.businessId : null;
  const status = typeof record.status === 'string' ? record.status as QueueStatus : null;
  const op = record.op === 'INSERT' || record.op === 'UPDATE' || record.op === 'DELETE' ? record.op : 'UPDATE';
  if (!entryId || !businessId || !status) return null;
  return {
    op,
    entryId,
    businessId,
    status,
    paymentStatus: (record.paymentStatus as QueuePaymentStatus | null | undefined) ?? null,
    ticketStatus: (record.ticketStatus as QueueTicketStatus | null | undefined) ?? null,
    calledAt: typeof record.calledAt === 'string' ? record.calledAt : null,
    servingAt: typeof record.servingAt === 'string' ? record.servingAt : null,
    closedAt: typeof record.closedAt === 'string' ? record.closedAt : null,
    at: typeof record.at === 'string' ? record.at : undefined,
  };
}
