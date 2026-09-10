import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addManualQueueEntry,
  cancelQueuePayment,
  closeQueueTicket,
  confirmQueuePayment,
  fetchBusinessSlug,
  fetchQueueEntries,
  fetchQueueHistory,
  fetchQueueSettings,
  fetchQueueTeamMembers,
  fetchServiceById,
  finishQueueEntry,
  joinQueue,
  setQueueMode,
  settleQueueTicket,
  updateQueueSettings,
  updateQueueStatus,
} from '@/services/queue';
import type { QueueRecord, QueueTicketItem } from '@/types/queue';

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

type UpdateQueueStatusInput = Parameters<typeof updateQueueStatus>[0];

export function applyOptimisticQueueStatus(
  entries: QueueRecord[] | undefined,
  input: UpdateQueueStatusInput,
  now = new Date().toISOString(),
): QueueRecord[] | undefined {
  if (!entries) return entries;
  return entries.map((entry) => {
    if (entry.id !== input.entryId) return entry;
    const next: QueueRecord = { ...entry, status: input.status };
    if (input.status === 'calling') next.called_at = now;
    if (input.status === 'serving') next.serving_at = now;
    if (input.status === 'waiting') next.called_at = null;
    return next;
  });
}

export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'status'],
    mutationFn: updateQueueStatus,
    // Atualização otimista: o gestor vê o card mudar no toque, sem esperar o refetch.
    onMutate: async (input) => {
      const key = ['queue', 'entries', input.businessId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<QueueRecord[]>(key);
      queryClient.setQueryData<QueueRecord[]>(key, (current) => applyOptimisticQueueStatus(current, input));
      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'entries', input.businessId] });
      queryClient.invalidateQueries({ queryKey: ['queue', 'history', input.businessId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'queueWaiting'] });
    },
  });
}

export function useFinishQueueEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'finish'],
    mutationFn: finishQueueEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'entries'] });
    },
  });
}

export function useQueueEntries(businessId: string) {
  return useQuery({
    queryKey: ['queue', 'entries', businessId],
    queryFn: () => fetchQueueEntries(businessId),
    enabled: !!businessId,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useQueueHistory(businessId: string, day: Date) {
  const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  return useQuery({
    queryKey: ['queue', 'history', businessId, dayKey],
    queryFn: () => fetchQueueHistory(businessId, day),
    enabled: !!businessId,
    staleTime: 15_000,
  });
}

export function useBusinessSlug(businessId: string) {
  return useQuery({
    queryKey: ['queue', 'business-slug', businessId],
    queryFn: () => fetchBusinessSlug(businessId),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useQueueTeamMembers(businessId: string) {
  return useQuery({
    queryKey: ['queue', 'team-members', businessId],
    queryFn: () => fetchQueueTeamMembers(businessId),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

function invalidateQueue(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['queue'] });
}

export function useConfirmQueuePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'confirm-pay'],
    mutationFn: confirmQueuePayment,
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useCancelQueuePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'cancel-pay'],
    mutationFn: cancelQueuePayment,
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useCloseQueueTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'close'],
    mutationFn: (input: { entryId: string; items?: QueueTicketItem[] }) => closeQueueTicket(input.entryId, input.items),
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useSettleQueueTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'settle'],
    mutationFn: settleQueueTicket,
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useQueueSettings() {
  return useQuery({
    queryKey: ['queue', 'settings'],
    queryFn: fetchQueueSettings,
  });
}

export function useSetQueueMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'set-mode'],
    mutationFn: setQueueMode,
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useUpdateQueueSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'update-settings'],
    mutationFn: ({ allowLeave, lateMinutes }: { allowLeave: boolean; lateMinutes: number }) =>
      updateQueueSettings(allowLeave, lateMinutes),
    onSuccess: () => invalidateQueue(queryClient),
  });
}

export function useServiceById(serviceId: string | null | undefined, businessId: string) {
  return useQuery({
    queryKey: ['queue', 'service', serviceId, businessId],
    queryFn: () => fetchServiceById(serviceId!, businessId),
    enabled: !!serviceId && !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
