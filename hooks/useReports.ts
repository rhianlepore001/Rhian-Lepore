import { useQuery } from '@tanstack/react-query';

import { fetchClientInsights, fetchDashboardStats } from '@/services/dashboard';
import { fetchBusinessPerformance } from '@/services/insights';

export function useReportsData(
  effectiveUserId: string | null | undefined,
  selectedMonth?: number,
  selectedYear?: number,
) {
  const now = new Date();
  const month = selectedMonth ?? now.getMonth();
  const year = selectedYear ?? now.getFullYear();

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

  const performanceQuery = useQuery({
    queryKey: ['reports', 'performance', effectiveUserId, month, year],
    queryFn: () => fetchBusinessPerformance(effectiveUserId!, month, year),
    enabled: !!effectiveUserId,
  });

  return {
    stats: statsQuery.data ?? null,
    clientInsights: insightsQuery.data ?? {
      client_growth_by_month: [],
      top_clients: [],
      retention_rate: 0,
    },
    performance: performanceQuery.data ?? {
      services: [],
      products: [],
      professionals: [],
      summary: {
        servicesRevenue: 0,
        productsRevenue: 0,
        servicesCount: 0,
        productsUnits: 0,
        appointmentsCount: 0,
      },
    },
    loading: statsQuery.isLoading || insightsQuery.isLoading || performanceQuery.isLoading,
    performanceLoading: performanceQuery.isLoading,
    refetch: () =>
      Promise.all([statsQuery.refetch(), insightsQuery.refetch(), performanceQuery.refetch()]),
  };
}
