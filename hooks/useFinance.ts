import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFinanceRecord,
  deleteFinanceTransaction,
  fetchDropdownOptions,
  fetchFinanceStats,
  fetchMonthlyHistory,
  mapFinanceTransaction,
  markExpenseAsPaid,
} from '@/services/finance';
import { fetchQueueCompletedCount } from '@/services/queue';
import type { FinanceStatsInput } from '@/types/finance';

const FINANCE_STALE_MS = 60 * 1000;

export function useFinanceStats(input: FinanceStatsInput) {
  return useQuery({
    queryKey: ['finance', 'stats', input.companyId, input.startDate, input.endDate, input.professionalId],
    queryFn: () => fetchFinanceStats(input),
    enabled: !!input.companyId && !!input.startDate && !!input.endDate,
    staleTime: FINANCE_STALE_MS,
  });
}

export function useMonthlyHistory(companyId: string, monthsCount: number = 12, enabled = true) {
  return useQuery({
    queryKey: ['finance', 'monthly-history', companyId, monthsCount],
    queryFn: () => fetchMonthlyHistory(companyId, monthsCount),
    enabled: !!companyId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export interface FinanceOverviewInput {
  companyId: string;
  startIso: string;
  endIso: string;
  prevStartIso: string;
  prevEndIso: string;
  professionalId?: string | null;
  enabled?: boolean;
}

export function useFinanceOverview(input: FinanceOverviewInput) {
  return useQuery({
    queryKey: [
      'finance',
      'overview',
      input.companyId,
      input.startIso,
      input.endIso,
      input.prevStartIso,
      input.prevEndIso,
      input.professionalId ?? null,
    ],
    queryFn: async () => {
      const [current, previous, queueServed] = await Promise.all([
        fetchFinanceStats({
          companyId: input.companyId,
          startDate: input.startIso,
          endDate: input.endIso,
          professionalId: input.professionalId,
        }),
        fetchFinanceStats({
          companyId: input.companyId,
          startDate: input.prevStartIso,
          endDate: input.prevEndIso,
          professionalId: input.professionalId,
        }),
        fetchQueueCompletedCount({
          businessId: input.companyId,
          startDate: input.startIso,
          endDate: input.endIso,
          professionalId: input.professionalId,
        }).catch(() => 0),
      ]);
      return { current, previous, queueServed };
    },
    enabled:
      !!input.companyId
      && !!input.startIso
      && !!input.endIso
      && input.enabled !== false,
    staleTime: FINANCE_STALE_MS,
  });
}

function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>, companyId: string) {
  queryClient.invalidateQueries({ queryKey: ['finance'] });
  void companyId;
}

export function useFinanceDropdowns(companyId: string) {
  return useQuery({
    queryKey: ['finance', 'dropdowns', companyId],
    queryFn: () => fetchDropdownOptions(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, companyId }: { transactionId: string; companyId: string }) =>
      deleteFinanceTransaction(transactionId, companyId),
    onSuccess: (_data, variables) => {
      invalidateFinance(queryClient, variables.companyId);
    },
  });
}

export function useMarkExpenseAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, companyId }: { recordId: string; companyId: string }) =>
      markExpenseAsPaid(recordId, companyId),
    onSuccess: (_data, variables) => {
      invalidateFinance(queryClient, variables.companyId);
    },
  });
}

export function useCreateFinanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFinanceRecord,
    onSuccess: (_data, variables) => {
      invalidateFinance(queryClient, variables.companyId);
    },
  });
}

export { mapFinanceTransaction };
