import { useQuery } from '@tanstack/react-query';

import { fetchClientInsights, fetchDashboardStats } from '@/services/dashboard';

export function useReportsData(effectiveUserId: string | null | undefined) {
  const statsQuery = useQuery({
    queryKey: ['reports', 'stats', effectiveUserId],
    queryFn: () => fetchDashboardStats(effectiveUserId!),
    enabled: !!effectiveUserId,
  });

  const insightsQuery = useQuery({
    queryKey: ['reports', 'clientInsights', effectiveUserId],
    queryFn: () => fetchClientInsights(effectiveUserId!, 6),
    enabled: !!effectiveUserId,
  });

  return {
    stats: statsQuery.data ?? null,
    clientInsights: insightsQuery.data ?? {
      client_growth_by_month: [],
      top_clients: [],
      retention_rate: 0,
    },
    loading: statsQuery.isLoading || insightsQuery.isLoading,
    refetch: () => Promise.all([statsQuery.refetch(), insightsQuery.refetch()]),
  };
}
