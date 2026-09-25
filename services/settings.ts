import { supabase } from '@/lib/supabase';
import {
  businessSettingsSchema,
  businessSettingsUpdateSchema,
  profileFieldsSchema,
  type BusinessSettings,
  type BusinessSettingsUpdate,
  type ProfileFields,
} from '@/types/settings';
import { isSelectableTimeZone } from '@/utils/businessTimezone';
import { isStaffAppointmentEditScope, type StaffAppointmentEditScope } from '@/utils/staffAppointmentPermission';

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
  // null = volta ao padrão da região. Fora isso, só nomes IANA da lista do
  // seletor (TIMEZONE_OPTIONS) — nada de texto livre chegando ao banco.
  if (timezone !== null && !isSelectableTimeZone(timezone)) {
    throw new Error(`invalid_timezone: ${String(timezone)}`);
  }
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

export type StaffAppointmentEditScopeSaveResult = 'saved' | 'unsupported';

/** Erro de coluna inexistente para a permissão da equipe (migration ainda não aplicada). */
function isMissingStaffScopeColumn(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') {
    return /staff_appointment_edit_scope/i.test(error.message ?? '') || !error.message;
  }
  return false;
}

/**
 * Salva a permissão da equipe para editar/cancelar agendamentos. Só o dono
 * consegue (RLS de business_settings). Antes da migration devolve
 * 'unsupported' sem quebrar a tela.
 */
export async function updateStaffAppointmentEditScope(
  companyId: string,
  scope: StaffAppointmentEditScope,
): Promise<StaffAppointmentEditScopeSaveResult> {
  if (!isStaffAppointmentEditScope(scope)) {
    throw new Error(`invalid_staff_appointment_edit_scope: ${String(scope)}`);
  }
  const { error } = await supabase
    .from('business_settings')
    .upsert({ user_id: companyId, staff_appointment_edit_scope: scope }, { onConflict: 'user_id' });

  if (error) {
    if (isMissingStaffScopeColumn(error)) return 'unsupported';
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