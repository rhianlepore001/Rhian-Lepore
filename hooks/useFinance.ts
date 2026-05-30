import { useMutation } from '@tanstack/react-query';
import { fetchFinanceStats } from '@/services/finance';

export function useFinanceStats() {
  return useMutation({
    mutationKey: ['finance', 'stats'],
    mutationFn: fetchFinanceStats,
  });
}
