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

export async function fetchProfileFields(
  userId: string,
): Promise<ProfileFields | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('business_name, phone, address_street, instagram_handle, logo_url, cover_photo_url, business_slug, monthly_goal, public_booking_enabled, booking_lead_time_hours, max_bookings_per_day')
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
    .select('business_name, phone, address_street, instagram_handle, logo_url, cover_photo_url, business_slug, monthly_goal, public_booking_enabled, booking_lead_time_hours, max_bookings_per_day')
    .single();

  if (error) throw error;
  return profileFieldsSchema.parse(data);
}