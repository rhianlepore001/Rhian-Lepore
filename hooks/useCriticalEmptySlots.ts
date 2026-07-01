import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchCriticalEmptySlots, type CriticalEmptySlotsResult } from '../services/emptySlots';

export function useCriticalEmptySlots(daysAhead = 7) {
  const { user, companyId } = useAuth();
  const effectiveUserId = companyId ?? user?.id;

  return useQuery<CriticalEmptySlotsResult>({
    queryKey: ['critical-empty-slots', daysAhead, effectiveUserId],
    queryFn: () => fetchCriticalEmptySlots(effectiveUserId!, daysAhead),
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000,
  });
}
