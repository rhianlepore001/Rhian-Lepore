import { supabase } from '@/lib/supabase';
import {
  businessSettingsSchema,
  businessSettingsUpdateSchema,
  profileFieldsSchema,
  type BusinessSettings,
  type BusinessSettingsUpdate,
  type ProfileFields,
} from '@/types/settings';

export async function fetchBusinessSettings(
  companyId: string,
): Promise<BusinessSettings | null> {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('user_id', companyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return businessSettingsSchema.parse(data);
}

export async function updateBusinessSettings(
  companyId: string,
  updates: BusinessSettingsUpdate,
): Promise<BusinessSettings> {
  const parsed = businessSettingsUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from('business_settings')
    .upsert(
      { user_id: companyId, ...parsed },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return businessSettingsSchema.parse(data);
}

export type BusinessTimezoneSaveResult = 'saved' | 'unsupported';

/** Erro de coluna inexistente (migration do fuso ainda não aplicada). */
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  return /column .*timezone|timezone.* column/i.test(error.message ?? '');
}

/**
 * Salva o fuso do negócio em separado dos demais campos: se a coluna ainda não
 * existir (deploy do front antes da migration), devolve 'unsupported' em vez de
 * quebrar o salvamento do resto das configurações.
 */
export async function updateBusinessTimezone(
  companyId: string,
  timezone: string | null,
): Promise<BusinessTimezoneSaveResult> {
  const { error } = await supabase
    .from('business_settings')
    .update({ timezone })
    .eq('user_id', companyId);

  if (error) {
    if (isMissingColumnError(error)) return 'unsupported';
    throw error;
  }
  return 'saved';
}

export async function fetchProfileFields(
  userId: string,
): Promise<ProfileFields | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('business_name, phone, address_street, instagram_handle, logo_url, cover_photo_url, business_slug, monthly_goal, daily_goal, public_booking_enabled, booking_lead_time_hours, max_bookings_per_day, region')
    .eq('id', userId)
    .single();

  if (error) throw error;
  if (!data) return null;
  return profileFieldsSchema.parse(data);
}

export async function updateProfileFields(
  userId: string,
  updates: ProfileFields,
): Promise<ProfileFields> {
  const parsed = profileFieldsSchema.parse(updates);

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed)
    .eq('id', userId)
    .select('business_name, phone, address_street, instagram_handle, logo_url, cover_photo_url, business_slug, monthly_goal, daily_goal, public_booking_enabled, booking_lead_time_hours, max_bookings_per_day, region')
    .single();

  if (error) throw error;
  return profileFieldsSchema.parse(data);
}