import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addManualQueueEntry,
  cancelQueuePayment,
  closeQueueTicket,
  confirmQueuePayment,
  fetchBusinessSlug,
  fetchQueueEntries,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['queue', 'status'],
    mutationFn: updateQueueStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'entries'] });
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
    mutationFn: closeQueueTicket,
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
