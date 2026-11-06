import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

export interface HourMetrics {
  id?: string;
  name?: string;
  available_minutes: number | null;
  worked_minutes: number | null;
  estimated_count: number | null;
  revenue_per_worked_hour: number | null;
  revenue_per_available_hour: number | null;
  occupancy: number | null;
  cost_per_hour?: number | null;
  margin_per_hour?: number | null;
  idle_cost?: number | null;
}
export interface ChairHourData {
  month: string;
  role: string;
  professionals: HourMetrics[];
  total?: HourMetrics | null;
  services?: { name: string; status: string | null }[];
  services_pending_count?: number;
}

export function useChairHour(month: string, professionalId: string | null = null, endDate: string | null = null) {
  const { companyId, role, user, teamMemberId } = useAuth();
  const selectedProfessional = role === 'staff' ? null : professionalId;
  const enabled = !!companyId && !!user?.id && !!month && (role !== 'staff' || !!teamMemberId);
  const query = useQuery({
    queryKey: ['chair-hour', companyId, user?.id, role, month, endDate, selectedProfessional],
    enabled,
    retry: false,
    queryFn: async (): Promise<ChairHourData> => {
      const { data, error } = await supabase.rpc('get_chair_hour_v1', { p_month: month, p_professional_id: selectedProfessional, p_end_date: endDate });
      if (error) throw error;
      if (!data || typeof data !== 'object' || !Array.isArray(data.professionals)) throw new Error('invalid_chair_hour_response');
      return data as ChairHourData;
    },
  }, queryClient);
  return { data: query.data ?? null, status: !enabled ? 'ready' : query.isPending ? 'loading' : query.isError ? 'error' : 'ready', retry: () => { void query.refetch(); } };
}
