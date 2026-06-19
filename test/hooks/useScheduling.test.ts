import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAppointments,
  useCheckout,
  useDeleteHistoryAppointment,
  usePendingPublicBookings,
} from '@/hooks/useScheduling';
import * as schedulingService from '@/services/scheduling';

vi.mock('@/services/scheduling', () => ({
  fetchDayAppointments: vi.fn(),
  fetchPendingPublicBookings: vi.fn(),
  mapToAgendaAppointment: vi.fn((row, priceMap) => ({
    id: row.id,
    client_id: row.client_id,
    clientName: row.clients?.name || 'Cliente Desconhecido',
    clientPhone: row.clients?.phone || '',
    service: row.service,
    appointment_time: row.appointment_time,
    price: row.price,
    status: row.status,
    professional_id: row.professional_id ?? null,
    basePrice: priceMap.get(row.service) || row.price,
    notes: row.notes ?? undefined,
    payment_method: row.payment_method,
  })),
  completeAppointment: vi.fn(),
  deleteAppointmentWithFinance: vi.fn(),
}));

const mockAppointmentRow = {
  id: 'apt-001',
  client_id: 'client-001',
  service: 'Corte',
  appointment_time: '2026-05-30T10:00:00.000Z',
  price: 50,
  status: 'Confirmed',
  professional_id: null,
  clients: { name: 'João', id: 'client-001', phone: '11999999999' },
};

const servicePriceMap = new Map([['Corte', 50]]);

const createWrapper = (queryClient?: QueryClient) => {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = 'SchedulingTestWrapper';
  return { Wrapper, queryClient: client };
};

describe('useScheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAppointments', () => {
    it('não dispara query sem companyId', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useAppointments({
            companyId: '',
            date: new Date('2026-05-30'),
            role: 'owner',
            teamMemberId: null,
            servicePriceMap,
          }),
        { wrapper: Wrapper }
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(schedulingService.fetchDayAppointments).not.toHaveBeenCalled();
    });

    it('retorna agendamentos mapeados após fetch', async () => {
      (schedulingService.fetchDayAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockAppointmentRow,
      ]);
      const { Wrapper } = createWrapper();
      const date = new Date('2026-05-30');

      const { result } = renderHook(
        () =>
          useAppointments({
            companyId: 'company-001',
            date,
            role: 'owner',
            teamMemberId: null,
            servicePriceMap,
          }),
        { wrapper: Wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(schedulingService.fetchDayAppointments).toHaveBeenCalledWith({
        companyId: 'company-001',
        date,
        role: 'owner',
        teamMemberId: null,
      });
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].clientName).toBe('João');
      expect(result.current.data?.[0].basePrice).toBe(50);
    });
  });

  describe('usePendingPublicBookings', () => {
    it('retorna bookings pendentes após fetch', async () => {
      const pending = [{ id: 'pb-001', status: 'pending' }];
      (schedulingService.fetchPendingPublicBookings as ReturnType<typeof vi.fn>).mockResolvedValue(
        pending
      );
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => usePendingPublicBookings('company-001'), {
        wrapper: Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(schedulingService.fetchPendingPublicBookings).toHaveBeenCalledWith('company-001');
      expect(result.current.data).toEqual(pending);
    });
  });

  describe('useDeleteHistoryAppointment', () => {
    it('chama deleteAppointmentWithFinance e invalida cache da agenda', async () => {
      (schedulingService.deleteAppointmentWithFinance as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { Wrapper } = createWrapper(queryClient);

      const { result } = renderHook(() => useDeleteHistoryAppointment(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ appointmentId: 'apt-001' });
      });

      expect(schedulingService.deleteAppointmentWithFinance).toHaveBeenCalledOnce();
      expect(
        (schedulingService.deleteAppointmentWithFinance as ReturnType<typeof vi.fn>).mock.calls[0][0]
      ).toEqual({ appointmentId: 'apt-001' });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['agenda'] });
    });
  });

  describe('useCheckout', () => {
    it('chama completeAppointment e invalida cache da agenda', async () => {
      (schedulingService.completeAppointment as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { Wrapper } = createWrapper(queryClient);

      const { result } = renderHook(() => useCheckout(), { wrapper: Wrapper });

      const payload = {
        appointmentId: 'apt-001',
        paymentMethod: 'pix' as const,
        receivedBy: null,
        completedBy: null,
        finalPrice: 50,
        machineFeePercent: 0,
        machineFeeAmount: 0,
      };

      await act(async () => {
        await result.current.mutateAsync(payload);
      });

      expect(schedulingService.completeAppointment).toHaveBeenCalledOnce();
      expect(
        (schedulingService.completeAppointment as ReturnType<typeof vi.fn>).mock.calls[0][0]
      ).toEqual(payload);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['agenda'] });
    });
  });
});
