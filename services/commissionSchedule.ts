import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const scheduleRowSchema = z.object({
  id: z.string().optional(),
  user_id: z.string().optional(),
  professional_id: z.string().nullable().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  close_days: z.array(z.number().int()),
  anchor_date: isoDate.nullable().optional(),
  pay_offset_days: z.number().int(),
  reminder_offsets: z.array(z.number().int()),
  effective_from: isoDate,
  created_at: z.string().optional(),
}).passthrough();

const schedulesPayloadSchema = z.object({
  today: isoDate,
  tz: z.string(),
  notice: z.boolean(),
  business: scheduleRowSchema.nullable(),
  exceptions: z.array(z.object({
    professional_id: z.string(),
    name: z.string(),
    schedule: scheduleRowSchema,
  })),
  current_end: isoDate.nullable(),
}).passthrough();

const previewSchema = z.object({
  today: isoDate,
  tz: z.string(),
  current_end: isoDate.nullable(),
  effective_from: isoDate.nullable(),
  closes: z.array(isoDate),
  pay_dues: z.array(isoDate),
  reminders: z.array(isoDate),
}).passthrough();

const saveSchema = z.object({
  id: z.string(),
  effective_from: isoDate,
  current_end: isoDate,
  professional_id: z.string().nullable().optional(),
}).passthrough();

export type CommissionScheduleRow = z.infer<typeof scheduleRowSchema>;
export type CommissionSchedulesPayload = z.infer<typeof schedulesPayloadSchema>;
export type CommissionSchedulePreview = z.infer<typeof previewSchema>;

function raise(error: { message?: string; code?: string } | null): never {
  throw Object.assign(new Error(error?.message || 'rpc_error'), error);
}

export async function fetchCommissionSchedules(): Promise<CommissionSchedulesPayload> {
  const { data, error } = await supabase.rpc('get_commission_schedules_v1');
  if (error) raise(error);
  return schedulesPayloadSchema.parse(data);
}

export async function previewCommissionSchedule(input: {
  professionalId?: string | null;
  frequency: string;
  closeDays: number[];
  payOffsetDays: number;
  reminderOffsets: number[];
  anchorDate?: string | null;
}): Promise<CommissionSchedulePreview> {
  const { data, error } = await supabase.rpc('preview_commission_schedule_v1', {
    p_professional_id: input.professionalId ?? null,
    p_frequency: input.frequency,
    p_close_days: input.closeDays,
    p_anchor_date: input.anchorDate ?? null,
    p_pay_offset_days: input.payOffsetDays,
    p_reminder_offsets: input.reminderOffsets,
  });
  if (error) raise(error);
  return previewSchema.parse(data);
}

export async function saveCommissionSchedule(input: {
  professionalId?: string | null;
  frequency: string;
  closeDays: number[];
  payOffsetDays: number;
  reminderOffsets: number[];
  anchorDate?: string | null;
  useBusinessDefault?: boolean;
}): Promise<z.infer<typeof saveSchema>> {
  const { data, error } = await supabase.rpc('set_commission_schedule_v1', {
    p_professional_id: input.professionalId ?? null,
    p_frequency: input.frequency,
    p_close_days: input.closeDays,
    p_anchor_date: input.anchorDate ?? null,
    p_pay_offset_days: input.payOffsetDays,
    p_reminder_offsets: input.reminderOffsets,
    p_use_business_default: input.useBusinessDefault ?? false,
  });
  if (error) raise(error);
  return saveSchema.parse(data);
}

export async function dismissCommissionScheduleNotice(): Promise<void> {
  const { error } = await supabase.rpc('dismiss_commission_schedule_notice_v1');
  if (error) raise(error);
}

export async function generateCommissionReminders(): Promise<void> {
  const { error } = await supabase.rpc('generate_commission_reminders_v1');
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === 'PGRST202' || code === '42883') return;
    raise(error);
  }
}
