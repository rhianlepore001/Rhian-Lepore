import { z } from 'zod';
import { moneyAmountSchema, paymentMethodSchema, uuidSchema } from './shared';

export const appointmentStatusSchema = z.enum([
  'Confirmed',
  'Pending',
  'Completed',
  'Cancelled',
]);

export const checkoutPaymentMethodSchema = z.enum([
  ...paymentMethodSchema.options,
  'mbway',
]);

export const machineFeeSettingsSchema = z.object({
  machine_fee_enabled: z.boolean(),
  debit_fee_percent: z.number().finite().nonnegative(),
  credit_fee_percent: z.number().finite().nonnegative(),
});

export const checkoutInputSchema = z.object({
  appointmentId: uuidSchema.or(z.string().min(1)),
  paymentMethod: checkoutPaymentMethodSchema,
  receivedBy: uuidSchema.nullish(),
  completedBy: uuidSchema.nullish(),
  finalPrice: moneyAmountSchema,
  machineFeePercent: z.number().finite().min(0).max(100),
  machineFeeAmount: moneyAmountSchema,
});

export const createAppointmentInputSchema = z.object({
  companyId: uuidSchema.or(z.string().min(1)),
  professionalId: uuidSchema.or(z.string().min(1)),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().nullish(),
  customerEmail: z.string().trim().email().nullish(),
  appointmentTime: z.date(),
  serviceIds: z.array(z.string().min(1)),
  totalPrice: moneyAmountSchema,
  durationMinutes: z.number().int().positive(),
  status: z.literal('Confirmed').default('Confirmed'),
  clientId: uuidSchema.or(z.string().min(1)).nullish(),
  notes: z.string().trim().nullish(),
  customServiceName: z.string().trim().nullish(),
  paymentMethod: checkoutPaymentMethodSchema.nullish(),
});

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type CheckoutPaymentMethod = z.infer<typeof checkoutPaymentMethodSchema>;
export type MachineFeeSettings = z.infer<typeof machineFeeSettingsSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentInputSchema>;
