import { useQuery } from '@tanstack/react-query';
import { fetchQueuePublicBoard } from '@/services/queue';
import type { QueueStatus } from '@/types/queue';

export function useQueueBoard(
  entryId: string | null | undefined,
  phone: string | null | undefined,
  status?: QueueStatus | null,
) {
  const intervalMs = status === 'calling' || status === 'serving' ? 5000 : 10000;

  return useQuery({
    queryKey: ['queue', 'board', entryId, phone],
    queryFn: () => fetchQueuePublicBoard(entryId!, phone!),
    enabled: Boolean(entryId && phone),
    refetchInterval: intervalMs,
    staleTime: 0,
  });
}
