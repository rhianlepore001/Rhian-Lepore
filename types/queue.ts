import { z } from 'zod';

export const queueStatusSchema = z.enum([
  'waiting',
  'calling',
  'serving',
  'completed',
  'cancelled',
  'no_show',
]);

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
});

export const joinQueueInputSchema = z.object({
  businessId: z.string().min(1),
  clientName: z.string().trim().min(1),
  clientPhone: z.string().trim().min(1),
  serviceId: z.string().min(1).nullable().optional(),
  professionalId: z.string().min(1).nullable().optional(),
});

export const manualQueueInputSchema = z.object({
  businessId: z.string().min(1),
  clientName: z.string().trim().min(1),
  clientPhone: z.string().trim().min(1),
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
export type QueueRecord = z.infer<typeof queueEntrySchema>;
export type JoinQueueInput = z.infer<typeof joinQueueInputSchema>;
export type ManualQueueInput = z.infer<typeof manualQueueInputSchema>;
export type UpdateQueueStatusInput = z.infer<typeof updateQueueStatusInputSchema>;
export type FinishQueueEntryInput = z.infer<typeof finishQueueEntryInputSchema>;
