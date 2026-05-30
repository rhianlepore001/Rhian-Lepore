import { useMutation } from '@tanstack/react-query';
import { getActiveBookingByPhone, submitPublicBooking } from '@/services/publicBooking';

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
