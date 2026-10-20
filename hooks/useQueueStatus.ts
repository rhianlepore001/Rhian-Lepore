import { useQuery } from '@tanstack/react-query';

import { fetchQueueStatusSnapshot, readQueueToken } from '@/services/queue';

export function useQueueStatusSnapshot(entryId: string | undefined) {
  return useQuery({
    queryKey: ['queueStatus', entryId],
    queryFn: () => {
      const token = readQueueToken(entryId!);
      if (!token) {
        throw new Error('Abra o link privado da fila.');
      }
      return fetchQueueStatusSnapshot(entryId!, token);
    },
    enabled: !!entryId && !!readQueueToken(entryId),
    refetchInterval: 10_000,
  });
}
