import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getPeriodDates } from '../services/occupancy';
import {
  fetchCancellationRateComparison,
  type CancellationRateResult,
} from '../services/cancellationRate';

export type CancellationPeriod = 'week' | 'month' | 'quarter';

export function useCancellationRate(period: CancellationPeriod = 'month') {
  const { user, companyId } = useAuth();
  const effectiveUserId = companyId ?? user?.id;

  return useQuery<{ current: CancellationRateResult; previous: CancellationRateResult }>({
    queryKey: ['cancellation-rate', period, effectiveUserId],
    queryFn: () => {
      const mode = period === 'week' ? 'week' : 'month';
      const { start, end } = getPeriodDates(mode);
      return fetchCancellationRateComparison(effectiveUserId!, start, end);
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000,
  });
}
