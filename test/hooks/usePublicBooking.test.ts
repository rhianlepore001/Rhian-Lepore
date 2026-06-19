import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBusinessProfileBySlug,
  useCancelPublicBooking,
  useFindActivePublicBooking,
  usePublicServices,
  useSubmitPublicBooking,
} from '@/hooks/usePublicBooking';
import * as publicBookingService from '@/services/publicBooking';

vi.mock('@/services/publicBooking', () => ({
  fetchBusinessProfileBySlug: vi.fn(),
  fetchPublicServices: vi.fn(),
  getActiveBookingByPhone: vi.fn(),
  submitPublicBooking: vi.fn(),
  cancelPublicBooking: vi.fn(),
}));

const mockProfile = {
  id: 'business-001',
  business_name: 'Barbearia Teste',
  business_slug: 'barbearia-teste',
  user_type: 'barber',
};

const mockServices = [
  { id: 'service-001', name: 'Corte', price: 50, duration_minutes: 30 },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'PublicBookingTestWrapper';
  return Wrapper;
};

describe('usePublicBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useBusinessProfileBySlug', () => {
    it('não dispara query sem slug', () => {
      const { result } = renderHook(() => useBusinessProfileBySlug(''), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(publicBookingService.fetchBusinessProfileBySlug).not.toHaveBeenCalled();
    });

    it('retorna perfil do negócio após fetch', async () => {
      (publicBookingService.fetchBusinessProfileBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProfile
      );

      const { result } = renderHook(() => useBusinessProfileBySlug('barbearia-teste'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(publicBookingService.fetchBusinessProfileBySlug).toHaveBeenCalledWith('barbearia-teste');
      expect(result.current.data).toEqual(mockProfile);
    });
  });

  describe('usePublicServices', () => {
    it('não dispara query sem businessId', () => {
      const { result } = renderHook(() => usePublicServices(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(publicBookingService.fetchPublicServices).not.toHaveBeenCalled();
    });

    it('retorna serviços públicos após fetch', async () => {
      (publicBookingService.fetchPublicServices as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockServices
      );

      const { result } = renderHook(() => usePublicServices('business-001'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(publicBookingService.fetchPublicServices).toHaveBeenCalledWith('business-001');
      expect(result.current.data).toEqual(mockServices);
    });
  });

  describe('useSubmitPublicBooking', () => {
    it('chama submitPublicBooking com payload', async () => {
      (publicBookingService.submitPublicBooking as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'booking-001',
      });

      const { result } = renderHook(() => useSubmitPublicBooking(), { wrapper: createWrapper() });

      const payload = {
        businessId: 'business-001',
        customerName: 'João',
        customerPhone: '11999999999',
        serviceIds: ['service-001'],
        professionalId: null,
        appointmentTime: '2026-05-30T10:00:00-03:00',
        totalPrice: 50,
        durationMinutes: 30,
        editingBookingId: null,
        originalAppointmentTime: null,
      };

      await act(async () => {
        await result.current.mutateAsync(payload);
      });

      expect(publicBookingService.submitPublicBooking).toHaveBeenCalledOnce();
      expect(
        (publicBookingService.submitPublicBooking as ReturnType<typeof vi.fn>).mock.calls[0][0]
      ).toEqual(payload);
    });
  });

  describe('useFindActivePublicBooking', () => {
    it('chama getActiveBookingByPhone com telefone e businessId', async () => {
      (publicBookingService.getActiveBookingByPhone as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'booking-001',
        status: 'pending',
      });

      const { result } = renderHook(() => useFindActivePublicBooking(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ phone: '11999999999', businessId: 'business-001' });
      });

      expect(publicBookingService.getActiveBookingByPhone).toHaveBeenCalledWith(
        '11999999999',
        'business-001'
      );
    });
  });

  describe('useCancelPublicBooking', () => {
    it('chama cancelPublicBooking com bookingId e businessId', async () => {
      (publicBookingService.cancelPublicBooking as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useCancelPublicBooking(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ bookingId: 'booking-001', businessId: 'business-001' });
      });

      expect(publicBookingService.cancelPublicBooking).toHaveBeenCalledWith(
        'booking-001',
        'business-001'
      );
    });
  });
});
