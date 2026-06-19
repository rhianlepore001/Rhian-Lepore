import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addManualQueueEntry, finishQueueEntry, fetchQueueEntries, fetchBusinessSlug, fetchQueueTeamMembers, fetchServiceById, joinQueue, updateQueueStatus } from '@/services/queue';

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

export function useServiceById(serviceId: string | null | undefined, businessId: string) {
  return useQuery({
    queryKey: ['queue', 'service', serviceId, businessId],
    queryFn: () => fetchServiceById(serviceId!, businessId),
    enabled: !!serviceId && !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
