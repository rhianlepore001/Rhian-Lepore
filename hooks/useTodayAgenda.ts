import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as dashboardService from '../services/dashboard';
import type { DashboardAppointment } from '../types/dashboard';
import {
  pickNextAppointment,
  pickUpcomingAfter,
} from '../utils/dashboardCockpit';

export function useTodayAgenda() {
  const { user, companyId, teamMemberId, role } = useAuth();
  const ownerId = companyId ?? user?.id;
  const isStaff = role === 'staff';
  const professionalId = teamMemberId ?? (isStaff ? user?.id : null);

  const enabled = Boolean(ownerId) && (!isStaff || Boolean(professionalId));

  const query = useQuery({
    queryKey: ['dashboard', 'todayAgenda', ownerId, isStaff ? professionalId : 'all'],
    queryFn: async (): Promise<DashboardAppointment[]> => {
      if (isStaff && professionalId) {
        return dashboardService.fetchTodayAppointmentsForProfessional(ownerId!, professionalId);
      }
      return dashboardService.fetchTodayAppointments(ownerId!);
    },
    enabled,
    staleTime: 30 * 1000,
  });

  const appointments = query.data ?? [];
  const next = pickNextAppointment(appointments);
  const upcoming = pickUpcomingAfter(appointments, next?.id ?? null, 2);

  return {
    appointments,
    next,
    upcoming,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useQueueWaitingCount() {
  const { user, companyId, role } = useAuth();
  const businessId = companyId ?? user?.id;
  const enabled = Boolean(businessId) && role !== 'staff';

  return useQuery({
    queryKey: ['dashboard', 'queueWaiting', businessId],
    queryFn: () => dashboardService.fetchQueueWaitingCount(businessId!),
    enabled,
    staleTime: 30 * 1000,
  });
}
