import { z } from 'zod';
import { moneyAmountSchema } from './shared';

export const publicBookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
]);

export const publicBookingSchema = z.object({
  id: z.string().min(1),
  business_id: z.string().min(1),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_email: z.string().nullish(),
  service_ids: z.array(z.string().min(1)),
  professional_id: z.string().nullish(),
  appointment_time: z.string().min(1),
  original_appointment_time: z.string().nullish(),
  total_price: moneyAmountSchema,
  status: publicBookingStatusSchema,
  duration_minutes: z.number().int().positive().nullish(),
  is_edit: z.boolean().nullish(),
});

export const submitPublicBookingInputSchema = z.object({
  businessId: z.string().min(1),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
  professionalId: z.string().nullable(),
  appointmentTime: z.string().min(1),
  totalPrice: moneyAmountSchema,
  durationMinutes: z.number().int().positive(),
  editingBookingId: z.string().min(1).nullish(),
  originalAppointmentTime: z.string().nullish(),
});

export const createAcceptedAppointmentInputSchema = z.object({
  businessId: z.string().min(1),
  clientId: z.string().min(1),
  professionalId: z.string().nullish(),
  serviceNames: z.string().min(1),
  bookingId: z.string().min(1),
  appointmentTime: z.string().min(1),
  totalPrice: moneyAmountSchema,
  durationMinutes: z.number().int().positive(),
  preservePublicBookingLink: z.boolean().default(false),
});

export type PublicBookingStatus = z.infer<typeof publicBookingStatusSchema>;
export type PublicBookingRecord = z.infer<typeof publicBookingSchema>;
export type SubmitPublicBookingInput = z.infer<typeof submitPublicBookingInputSchema>;
export type CreateAcceptedAppointmentInput = z.infer<typeof createAcceptedAppointmentInputSchema>;
