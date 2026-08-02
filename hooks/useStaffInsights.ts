import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchStaffInsights, staffPeriodLabel } from '@/services/staffInsights';
import type { StaffInsights, StaffPeriod } from '@/types/insights';

const EMPTY_INSIGHTS: StaffInsights = {
  summary: {
    appointmentsCount: 0,
    uniqueClients: 0,
    commissionsTotal: 0,
    productsUnits: 0,
    productsRevenue: 0,
    servicesRevenue: 0,
    avgTicket: 0,
  },
  services: [],
  products: [],
  recentServices: [],
  recentProducts: [],
  todayUpcoming: [],
};

export function useStaffInsights(
  period: StaffPeriod,
  selectedMonth: number,
  selectedYear: number,
) {
  const { companyId, teamMemberId } = useAuth();
  const enabled = Boolean(companyId && teamMemberId);

  const query = useQuery({
    queryKey: ['staff', 'insights', companyId, teamMemberId, period, selectedMonth, selectedYear],
    queryFn: () =>
      fetchStaffInsights({
        companyId: companyId!,
        professionalId: teamMemberId!,
        period,
        selectedMonth,
        selectedYear,
      }),
    enabled,
    staleTime: 30 * 1000,
    placeholderData: (previous) => previous,
  });

  return {
    data: query.data ?? EMPTY_INSIGHTS,
    loading: enabled ? query.isLoading : false,
    refreshing: enabled ? query.isFetching && !query.isLoading : false,
    error: query.error,
    periodLabel: staffPeriodLabel(period, selectedMonth, selectedYear),
    refetch: query.refetch,
  };
}
