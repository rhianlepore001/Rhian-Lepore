import { useQuery } from '@tanstack/react-query';

import { fetchQueueStatusSnapshot, readQueuePhoneProof } from '@/services/queue';

export function useQueueStatusSnapshot(entryId: string | undefined) {
  return useQuery({
    queryKey: ['queueStatus', entryId],
    queryFn: () => {
      const phone = readQueuePhoneProof(entryId!);
      if (!phone) {
        throw new Error('Queue phone proof missing');
      }
      return fetchQueueStatusSnapshot(entryId!, phone);
    },
    enabled: !!entryId && !!readQueuePhoneProof(entryId),
    refetchInterval: 10_000,
  });
}