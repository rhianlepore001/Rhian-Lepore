import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchStaffInsights, staffPeriodLabel } from '@/services/staffInsights';
import { isRpcUnavailable } from '@/services/staffPerformance';
import type { StaffPeriod } from '@/types/insights';
import type { StaffOwnPerformance } from '@/types/staffPerformance';

export type StaffInsightsStatus = 'loading' | 'ready' | 'error' | 'unavailable';

export function useStaffInsights(
  period: StaffPeriod,
  selectedMonth: number,
  selectedYear: number,
) {
  const { companyId, teamMemberId } = useAuth();
  const enabled = Boolean(companyId && teamMemberId);
  const [status, setStatus] = useState<StaffInsightsStatus>(enabled ? 'loading' : 'ready');
  const [data, setData] = useState<StaffOwnPerformance | null>(null);
  const [attempt, setAttempt] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStatus('ready');
      setData(null);
      return;
    }
    const id = ++seq.current;
    setStatus('loading');
    fetchStaffInsights({
      companyId: companyId!,
      professionalId: teamMemberId!,
      period,
      selectedMonth,
      selectedYear,
    })
      .then((result) => {
        if (id !== seq.current) return;
        setData(result);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (id !== seq.current) return;
        console.error('staff_insights falhou');
        setData(null);
        setStatus(isRpcUnavailable(error) ? 'unavailable' : 'error');
      });
  }, [enabled, companyId, teamMemberId, period, selectedMonth, selectedYear, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return {
    data,
    status,
    loading: status === 'loading',
    periodLabel: staffPeriodLabel(period, selectedMonth, selectedYear),
    retry,
  };
}
