import { useQuery } from '@tanstack/react-query';
import { fetchQueuePublicBoard } from '@/services/queue';
import type { QueueStatus } from '@/types/queue';

export function useQueueBoard(
  entryId: string | null | undefined,
  token: string | null | undefined,
  status?: QueueStatus | null,
) {
  const intervalMs = status === 'calling' || status === 'serving' ? 4000 : 6000;

  return useQuery({
    queryKey: ['queue', 'board', entryId, token],
    queryFn: () => fetchQueuePublicBoard(entryId!, token!),
    enabled: Boolean(entryId && token),
    refetchInterval: intervalMs,
    staleTime: 0,
  });
}
