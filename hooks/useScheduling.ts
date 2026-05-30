import { useMutation } from '@tanstack/react-query';
import { completeAppointment, createAppointment } from '@/services/scheduling';

export function useCheckout() {
  return useMutation({
    mutationKey: ['scheduling', 'checkout'],
    mutationFn: completeAppointment,
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationKey: ['scheduling', 'create-appointment'],
    mutationFn: createAppointment,
  });
}
