import { useMutation } from '@tanstack/react-query';
import { addManualQueueEntry, finishQueueEntry, joinQueue, updateQueueStatus } from '@/services/queue';

export function useJoinQueue() {
  return useMutation({
    mutationKey: ['queue', 'join'],
    mutationFn: joinQueue,
  });
}

export function useAddManualQueueEntry() {
  return useMutation({
    mutationKey: ['queue', 'manual-add'],
    mutationFn: addManualQueueEntry,
  });
}

export function useUpdateQueueStatus() {
  return useMutation({
    mutationKey: ['queue', 'status'],
    mutationFn: updateQueueStatus,
  });
}

export function useFinishQueueEntry() {
  return useMutation({
    mutationKey: ['queue', 'finish'],
    mutationFn: finishQueueEntry,
  });
}
