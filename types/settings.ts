import { z } from 'zod';
import { uuidSchema } from './shared';

export const businessHoursBlockSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const businessHoursDaySchema = z.object({
  isOpen: z.boolean(),
  blocks: z.array(businessHoursBlockSchema),
});

export type BusinessHoursBlock = z.infer<typeof businessHoursBlockSchema>;
export type BusinessHoursDay = z.infer<typeof businessHoursDaySchema>;
export type BusinessHours = Record<string, BusinessHoursDay>;

export const businessSettingsSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  business_hours: z.record(z.string(), businessHoursDaySchema).nullable().optional(),
  cancellation_policy: z.string().nullable().optional(),
  onboarding_completed: z.boolean().default(false),
  onboarding_step: z.number().int().default(1),
  commission_settlement_day_of_month: z.number().int().min(1).max(28).default(5),
  payment_day: z.number().int().min(1).max(28).default(5),
  machine_fee_enabled: z.boolean().default(false),
  debit_fee_percent: z.number().min(0).max(100).default(0),
  credit_fee_percent: z.number().min(0).max(100).default(0),
  enable_self_rescheduling: z.boolean().default(true),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const businessSettingsUpdateSchema = businessSettingsSchema.partial();

export const profileFieldsSchema = z.object({
  business_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address_street: z.string().nullable().optional(),
  instagram_handle: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  cover_photo_url: z.string().nullable().optional(),
  business_slug: z.string().nullable().optional(),
  monthly_goal: z.number().nullable().optional(),
  public_booking_enabled: z.boolean().default(true),
  booking_lead_time_hours: z.number().int().min(0).default(2),
  max_bookings_per_day: z.number().int().positive().nullable().optional(),
});

export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
export type BusinessSettingsUpdate = z.infer<typeof businessSettingsUpdateSchema>;
export type ProfileFields = z.infer<typeof profileFieldsSchema>;