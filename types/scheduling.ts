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
  'membership',
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

export const agendaStaffFilterSchema = z.object({
  companyId: z.string().min(1),
  role: z.enum(['owner', 'staff']).optional(),
  teamMemberId: z.string().nullish(),
});

export const agendaAppointmentViewSchema = z.object({
  id: z.string().min(1),
  client_id: z.string(),
  clientName: z.string(),
  clientPhone: z.string().optional(),
  service: z.string(),
  appointment_time: z.string(),
  price: z.number(),
  status: z.string(),
  professional_id: z.string().nullable(),
  basePrice: z.number().optional(),
  notes: z.string().optional(),
  payment_method: z.string().nullable().optional(),
});

export interface AgendaAppointmentView {
  id: string;
  client_id: string;
  clientName: string;
  clientPhone?: string;
  service: string;
  appointment_time: string;
  price: number;
  status: string;
  professional_id: string | null;
  basePrice?: number;
  notes?: string;
  payment_method?: string | null;
}

export const createAgendaAppointmentInputSchema = z.object({
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  professionalId: z.string().min(1),
  serviceNames: z.string().min(1),
  appointmentTime: z.date(),
  price: moneyAmountSchema,
  notes: z.string().trim().nullish(),
});

export const assignProfessionalInputSchema = z.object({
  appointmentId: uuidSchema.or(z.string().min(1)),
  professionalId: uuidSchema.or(z.string().min(1)),
});

export const cancelAppointmentInputSchema = z.object({
  appointmentId: uuidSchema.or(z.string().min(1)),
});

export const deleteAppointmentInputSchema = z.object({
  appointmentId: uuidSchema.or(z.string().min(1)),
});

export const markAppointmentCompleteInputSchema = z.object({
  appointmentId: uuidSchema.or(z.string().min(1)),
});

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type CheckoutPaymentMethod = z.infer<typeof checkoutPaymentMethodSchema>;
export type MachineFeeSettings = z.infer<typeof machineFeeSettingsSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentInputSchema>;
export type AgendaStaffFilter = z.infer<typeof agendaStaffFilterSchema>;
export type CreateAgendaAppointmentInput = z.infer<typeof createAgendaAppointmentInputSchema>;
export type AssignProfessionalInput = z.infer<typeof assignProfessionalInputSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentInputSchema>;
export type DeleteAppointmentInput = z.infer<typeof deleteAppointmentInputSchema>;
export type MarkAppointmentCompleteInput = z.infer<typeof markAppointmentCompleteInputSchema>;
