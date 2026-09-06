import { z } from 'zod';
import { checkoutPaymentMethodSchema } from './scheduling';

export const queueStatusSchema = z.enum([
  'waiting',
  'calling',
  'serving',
  'completed',
  'cancelled',
  'no_show',
]);

export const queueModeSchema = z.enum(['shared', 'per_professional']);
export const queuePaymentStatusSchema = z.enum([
  'unpaid',
  'awaiting_confirmation',
  'paid',
  'membership',
]);
export const queueTicketStatusSchema = z.enum(['none', 'open', 'settled']);

export const queueSettingsSchema = z.object({
  queueMode: queueModeSchema,
  allowLeave: z.boolean(),
  lateMinutes: z.number().int().min(1).max(120),
});

export const queuePublicBoardPersonSchema = z.object({
  position: z.number().int().positive(),
  firstName: z.string().min(1),
  isYou: z.boolean(),
});

export const queuePublicBoardSchema = z.object({
  entryId: z.string().min(1),
  status: queueStatusSchema,
  paymentStatus: queuePaymentStatusSchema,
  serviceName: z.string().min(1),
  position: z.number().int().positive().nullable(),
  etaMinutes: z.number().int().nonnegative().nullable(),
  people: z.array(queuePublicBoardPersonSchema),
  settings: queueSettingsSchema.pick({ allowLeave: true, lateMinutes: true }),
  calledAt: z.string().nullable(),
});

export const queueEntrySchema = z.object({
  id: z.string().min(1),
  business_id: z.string().min(1),
  client_id: z.string().min(1).nullable().optional(),
  client_name: z.string().min(1),
  client_phone: z.string().min(1),
  service_id: z.string().min(1).nullable().optional(),
  professional_id: z.string().min(1).nullable().optional(),
  status: queueStatusSchema,
  joined_at: z.string().min(1),
  called_at: z.string().nullable().optional(),
  estimated_wait_time: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  service_price_cents: z.number().int().nonnegative().nullable().optional(),
  payment_method: checkoutPaymentMethodSchema.nullable().optional(),
  payment_status: queuePaymentStatusSchema.optional(),
  ticket_status: queueTicketStatusSchema.optional(),
  serving_at: z.string().nullable().optional(),
  closed_at: z.string().nullable().optional(),
  closed_by: z.string().nullable().optional(),
  settled_appointment_id: z.string().nullable().optional(),
});

export const joinQueueInputSchema = z.object({
  businessId: z.string().min(1),
  slug: z.string().trim().min(1).optional(),
  clientName: z.string().trim().min(1),
  clientPhone: z.string().trim().min(1),
  serviceId: z.string().min(1),
  professionalId: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().min(1).nullable().optional(),
  ),
  paymentMethod: checkoutPaymentMethodSchema.optional(),
  brCode: z.string().min(1).optional(),
  txid: z.string().min(1).optional(),
  mbwayPhone: z.string().min(1).optional(),
});

export const manualQueueInputSchema = z.object({
  businessId: z.string().min(1),
  clientName: z.string().trim().min(1),
  clientPhone: z.string().trim().min(1),
  serviceId: z.string().min(1).optional(),
  professionalId: z.string().min(1).nullable().optional(),
  paymentMethod: checkoutPaymentMethodSchema.optional(),
});

export const updateQueueStatusInputSchema = z.object({
  entryId: z.string().min(1),
  businessId: z.string().min(1),
  status: queueStatusSchema,
});

export const finishQueueEntryInputSchema = z.object({
  entryId: z.string().min(1),
  serviceName: z.string().trim().min(1),
  finalPrice: z.number().nonnegative(),
  professionalId: z.string().min(1).nullable().optional(),
});

export type QueueStatus = z.infer<typeof queueStatusSchema>;
export type QueueMode = z.infer<typeof queueModeSchema>;
export type QueuePaymentStatus = z.infer<typeof queuePaymentStatusSchema>;
export type QueueTicketStatus = z.infer<typeof queueTicketStatusSchema>;
export type QueueSettings = z.infer<typeof queueSettingsSchema>;
export type QueuePublicBoardPerson = z.infer<typeof queuePublicBoardPersonSchema>;
export type QueuePublicBoard = z.infer<typeof queuePublicBoardSchema>;
export type QueueRecord = z.infer<typeof queueEntrySchema>;
export type JoinQueueInput = z.infer<typeof joinQueueInputSchema>;
export type ManualQueueInput = z.infer<typeof manualQueueInputSchema>;
export type UpdateQueueStatusInput = z.infer<typeof updateQueueStatusInputSchema>;
export type FinishQueueEntryInput = z.infer<typeof finishQueueEntryInputSchema>;
