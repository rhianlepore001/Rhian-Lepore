import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchOccupancyRate, getPeriodDates, type OccupancyResult } from '../services/occupancy';

export type OccupancyPeriod = 'today' | 'week' | 'month';

export function useOccupancyRate(period: OccupancyPeriod = 'today') {
  const { user, companyId } = useAuth();
  const effectiveUserId = companyId ?? user?.id;

  return useQuery<OccupancyResult>({
    queryKey: ['occupancy', period, effectiveUserId],
    queryFn: () => {
      const { start, end } = getPeriodDates(period);
      return fetchOccupancyRate(effectiveUserId!, start, end);
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000,
  });
}

export function useOccupancyComparison(period: OccupancyPeriod = 'today') {
  const { user, companyId } = useAuth();
  const effectiveUserId = companyId ?? user?.id;

  return useQuery<{ current: OccupancyResult; previous: OccupancyResult }>({
    queryKey: ['occupancy-comparison', period, effectiveUserId],
    queryFn: async () => {
      const { start, end } = getPeriodDates(period);
      const current = await fetchOccupancyRate(effectiveUserId!, start, end);

      const previousStart = new Date(start);
      const previousEnd = new Date(end);
      const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      previousStart.setDate(previousStart.getDate() - daysDiff);
      previousEnd.setDate(previousEnd.getDate() - daysDiff);

      const previous = await fetchOccupancyRate(effectiveUserId!, previousStart, previousEnd);

      return { current, previous };
    },
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000,
  });
}
