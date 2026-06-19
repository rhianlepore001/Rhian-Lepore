import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as dashboardService from '../services/dashboard';

export function useStaffEarnings() {
    const { teamMemberId } = useAuth();

    const isEnabled = !!teamMemberId;

    const { data: earnings = 0, isLoading: loading } = useQuery({
        queryKey: ['staff', 'earnings', 'unpaidCommissions', teamMemberId],
        queryFn: async (): Promise<number> => {
            if (!teamMemberId) return 0;
            return dashboardService.fetchStaffUnpaidCommissions(teamMemberId);
        },
        enabled: isEnabled,
        staleTime: 30 * 1000, // 30s
    });

    return {
        earnings,
        loading,
    };
}
