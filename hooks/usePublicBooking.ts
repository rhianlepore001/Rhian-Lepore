import { useMutation, useQuery } from '@tanstack/react-query';
import {
  cancelPublicBooking,
  fetchAvailableSlots,
  fetchBusinessProfileBySlug,
  fetchBusinessSettings,
  fetchEditBooking,
  fetchFullDates,
  fetchPublicBookingById,
  fetchPublicCategories,
  fetchPublicClientByPhone,
  fetchPublicGallery,
  fetchPublicProfessionals,
  fetchPublicServices,
  fetchClientByPhone,
  getActiveBookingByPhone,
  getFirstAvailableProfessional,
  submitPublicBooking,
  uploadClientPhoto,
} from '@/services/publicBooking';

export function useSubmitPublicBooking() {
  return useMutation({
    mutationKey: ['public-booking', 'submit'],
    mutationFn: submitPublicBooking,
  });
}

export function useFindActivePublicBooking() {
  return useMutation({
    mutationKey: ['public-booking', 'active-by-phone'],
    mutationFn: ({ phone, businessId }: { phone: string; businessId: string }) =>
      getActiveBookingByPhone(phone, businessId),
  });
}

export function useCancelPublicBooking() {
  return useMutation({
    mutationKey: ['public-booking', 'cancel'],
    mutationFn: ({ bookingId, businessId }: { bookingId: string; businessId: string }) =>
      cancelPublicBooking(bookingId, businessId),
  });
}

export function useBusinessProfileBySlug(slug: string) {
  return useQuery({
    queryKey: ['public-booking', 'profile', slug],
    queryFn: () => fetchBusinessProfileBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBusinessSettings(businessId: string | null) {
  return useQuery({
    queryKey: ['public-booking', 'settings', businessId],
    queryFn: () => fetchBusinessSettings(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicServices(businessId: string | null) {
  return useQuery({
    queryKey: ['public-booking', 'services', businessId],
    queryFn: () => fetchPublicServices(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicCategories(businessId: string | null) {
  return useQuery({
    queryKey: ['public-booking', 'categories', businessId],
    queryFn: () => fetchPublicCategories(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicProfessionals(businessId: string | null) {
  return useQuery({
    queryKey: ['public-booking', 'professionals', businessId],
    queryFn: () => fetchPublicProfessionals(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGallery(businessId: string | null) {
  return useQuery({
    queryKey: ['public-booking', 'gallery', businessId],
    queryFn: () => fetchPublicGallery(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
