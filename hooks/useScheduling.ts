import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignAppointmentProfessional,
  cancelAppointment,
  completeAppointment,
  createAgendaAppointment,
  createAppointment,
  deleteAppointmentWithFinance,
  fetchAgendaServices,
  fetchAgendaClients,
  fetchAgendaTeamMembers,
  fetchAgendaCategories,
  fetchServicePriceMap,
  fetchBusinessName,
  fetchCheckoutTeamMembers,
  fetchCheckoutSettings,
  fetchDayAppointments,
  fetchFutureAppointmentsForModal,
  fetchHistoryAppointments,
  fetchOverdueAppointments,
  fetchPendingPublicBookings,
  mapToAgendaAppointment,
  markAppointmentComplete,
  type FutureAppointmentModalItem,
} from '@/services/scheduling';
import type { AgendaAppointmentView, AgendaStaffFilter } from '@/types/scheduling';

const agendaQueryKey = ['agenda'] as const;

function invalidateAgendaQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: agendaQueryKey });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['scheduling', 'checkout'],
    mutationFn: completeAppointment,
    onSuccess: () => invalidateAgendaQueries(queryClient),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['scheduling', 'create-appointment'],
    mutationFn: createAppointment,
    onSuccess: () => invalidateAgendaQueries(queryClient),
  });
}

export function useCreateAgendaAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['scheduling', 'create-agenda-appointment'],
    mutationFn: createAgendaAppointment,
    onSuccess: () => invalidateAgendaQueries(queryClient),
  });
}

export function useDeleteHistoryAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['scheduling', 'delete-appointment'],
    mutationFn: deleteAppointmentWithFinance,
    onSuccess: () => invalidateAgendaQueries(queryClient),
  });
}

export function useMarkAppointmentComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['scheduling', 'mark-complete'],
    mutationFn: markAppointmentComplete,
    onSuccess: () => invalidateAgendaQueries(queryClient),
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['scheduling', 'cancel-appointment'],
    mutationFn: cancelAppointment,
    onSuccess: () => invalidateAgendaQueries(queryClient),
  });
}

export function useAssignProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['scheduling', 'assign-professional'],
    mutationFn: assignAppointmentProfessional,
    onSuccess: () => invalidateAgendaQueries(queryClient),
  });
}

interface UseAppointmentsParams extends AgendaStaffFilter {
  date: Date;
  servicePriceMap: Map<string, number>;
  enabled?: boolean;
}

export function useAppointments({
  companyId,
  date,
  role,
  teamMemberId,
  servicePriceMap,
  enabled = true,
}: UseAppointmentsParams) {
  const dateKey = date.toISOString().split('T')[0];
  return useQuery({
    queryKey: ['agenda', 'appointments', 'day', companyId, dateKey, role, teamMemberId],
    queryFn: () => fetchDayAppointments({ companyId, date, role, teamMemberId }),
    select: (rows): AgendaAppointmentView[] => rows.map((row) => mapToAgendaAppointment(row, servicePriceMap)),
    enabled: enabled && !!companyId,
    staleTime: 0,
  });
}

interface UseOverdueAppointmentsParams extends AgendaStaffFilter {
  servicePriceMap: Map<string, number>;
  enabled?: boolean;
}

export function useOverdueAppointments({
  companyId,
  role,
  teamMemberId,
  servicePriceMap,
  enabled = true,
}: UseOverdueAppointmentsParams) {
  return useQuery({
    queryKey: ['agenda', 'appointments', 'overdue', companyId, role, teamMemberId],
    queryFn: () => fetchOverdueAppointments({ companyId, role, teamMemberId }),
    select: (rows): AgendaAppointmentView[] => rows.map((row) => mapToAgendaAppointment(row, servicePriceMap)),
    enabled: enabled && !!companyId,
    staleTime: 0,
  });
}

interface UseHistoryAppointmentsParams extends AgendaStaffFilter {
  month: Date;
  servicePriceMap: Map<string, number>;
  enabled?: boolean;
}

export function useHistoryAppointments({
  companyId,
  month,
  role,
  teamMemberId,
  servicePriceMap,
  enabled = true,
}: UseHistoryAppointmentsParams) {
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  return useQuery({
    queryKey: ['agenda', 'appointments', 'history', companyId, monthKey, role, teamMemberId],
    queryFn: () => fetchHistoryAppointments({ companyId, month, role, teamMemberId }),
    select: (rows): AgendaAppointmentView[] => rows.map((row) => mapToAgendaAppointment(row, servicePriceMap)),
    enabled: enabled && !!companyId,
    staleTime: 0,
  });
}

export function usePendingPublicBookings(businessId: string, enabled = true) {
  return useQuery({
    queryKey: ['agenda', 'public-bookings', businessId],
    queryFn: () => fetchPendingPublicBookings(businessId),
    enabled: enabled && !!businessId,
    staleTime: 0,
  });
}

export function useFutureAppointmentsForModal(filter: AgendaStaffFilter, enabled = true) {
  return useQuery({
    queryKey: ['agenda', 'appointments', 'future', filter.companyId, filter.role, filter.teamMemberId],
    queryFn: (): Promise<FutureAppointmentModalItem[]> => fetchFutureAppointmentsForModal(filter),
    enabled: enabled && !!filter.companyId,
    staleTime: 0,
  });
}

export function useAgendaServices(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'services', companyId],
    queryFn: () => fetchAgendaServices(companyId),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAgendaClients(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'clients', companyId],
    queryFn: () => fetchAgendaClients(companyId),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAgendaTeamMembers(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'team-members', companyId],
    queryFn: () => fetchAgendaTeamMembers(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgendaCategories(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'categories', companyId],
    queryFn: () => fetchAgendaCategories(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useServicePriceMap(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'service-price-map', companyId],
    queryFn: () => fetchServicePriceMap(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBusinessName(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'business-name', companyId],
    queryFn: () => fetchBusinessName(companyId),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCheckoutTeamMembers(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'checkout-team-members', companyId],
    queryFn: () => fetchCheckoutTeamMembers(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCheckoutSettings(companyId: string) {
  return useQuery({
    queryKey: ['agenda', 'checkout-settings', companyId],
    queryFn: () => fetchCheckoutSettings(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}
