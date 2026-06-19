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
import type { FinanceStatsInput } from '@/types/finance';

export function useFinanceStats(input: FinanceStatsInput) {
  return useQuery({
    queryKey: ['finance', 'stats', input.companyId, input.startDate, input.endDate, input.professionalId],
    queryFn: () => fetchFinanceStats(input),
    enabled: !!input.companyId && !!input.startDate && !!input.endDate,
  });
}

export function useMonthlyHistory(companyId: string, monthsCount: number = 12) {
  return useQuery({
    queryKey: ['finance', 'monthly-history', companyId, monthsCount],
    queryFn: () => fetchMonthlyHistory(companyId, monthsCount),
    enabled: !!companyId,
  });
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
      queryClient.invalidateQueries({ queryKey: ['finance', 'stats', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'monthly-history', variables.companyId] });
    },
  });
}

export function useMarkExpenseAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, companyId }: { recordId: string; companyId: string }) =>
      markExpenseAsPaid(recordId, companyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'stats', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'monthly-history', variables.companyId] });
    },
  });
}

export function useCreateFinanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFinanceRecord,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'stats', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'monthly-history', variables.companyId] });
    },
  });
}

export { mapFinanceTransaction };