import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { createAgendaBlock, deleteAgendaBlock, fetchAgendaBlocks } from '@/services/agendaBlocks';

function localDayWindow(dateStr: string, extraDays: number): { fromIso: string; toIso: string } {
  const from = new Date(`${dateStr}T00:00:00`);
  from.setDate(from.getDate() - 1);
  const to = new Date(`${dateStr}T00:00:00`);
  to.setDate(to.getDate() + extraDays);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

export function useAgendaBlocks(dateStr: string | null, extraDays = 2) {
  const { companyId } = useAuth();
  const range = dateStr ? localDayWindow(dateStr, extraDays) : null;

  return useQuery({
    queryKey: ['agenda-blocks', companyId, dateStr, extraDays],
    queryFn: () => fetchAgendaBlocks(companyId!, range!.fromIso, range!.toIso),
    enabled: !!companyId && !!range,
    staleTime: 30 * 1000,
  });
}

export function useUpcomingAgendaBlocks() {
  const { companyId } = useAuth();
  const fromIso = new Date().toISOString();
  const toIso = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  return useQuery({
    queryKey: ['agenda-blocks', companyId, 'upcoming'],
    queryFn: () => fetchAgendaBlocks(companyId!, fromIso, toIso),
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });
}

export function useCreateAgendaBlock() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgendaBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-blocks', companyId] });
    },
  });
}

export function useDeleteAgendaBlock() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgendaBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-blocks', companyId] });
    },
  });
}
