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
import { isStaffAgendaBlockScope, type StaffAgendaBlockScope } from '@/utils/agendaBlockPermission';

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

export type StaffAgendaBlockScopeSaveResult = 'saved' | 'unsupported';

function isMissingStaffBlockScopeColumn(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') {
    return /staff_agenda_block_scope/i.test(error.message ?? '') || !error.message;
  }
  return false;
}

/**
 * Salva o que a equipe pode bloquear na agenda (none/own/all). Só o dono
 * consegue (RLS de business_settings). O banco mantém o booleano antigo
 * staff_can_block_agenda em sincronia (trigger). Antes da migration devolve
 * 'unsupported' sem quebrar a tela.
 */
export async function updateStaffAgendaBlockScope(
  companyId: string,
  scope: StaffAgendaBlockScope,
): Promise<StaffAgendaBlockScopeSaveResult> {
  if (!isStaffAgendaBlockScope(scope)) {
    throw new Error(`invalid_staff_agenda_block_scope: ${String(scope)}`);
  }
  const { error } = await supabase
    .from('business_settings')
    .upsert({ user_id: companyId, staff_agenda_block_scope: scope }, { onConflict: 'user_id' });

  if (error) {
    if (isMissingStaffBlockScopeColumn(error)) return 'unsupported';
    throw error;
  }
  return 'saved';
}

const PROFILE_FIELDS_SELECT = 'business_name, phone, address_street, instagram_handle, logo_url, cover_photo_url, business_slug, monthly_goal, daily_goal, public_booking_enabled, booking_lead_time_hours, max_bookings_per_day, region';

function isMissingNamedColumn(error: { code?: string; message?: string } | null | undefined, column: string): boolean {
  if (!error) return false;
  if (error.code !== '42703' && error.code !== 'PGRST204') return false;
  return !error.message || error.message.includes(column);
}

export async function fetchProfileFields(
  userId: string,
): Promise<ProfileFields | null> {
  // booking_lead_time_minutes só existe depois de 20261013200100; antes disso
  // cai no select antigo (horas) sem quebrar a tela.
  const withMinutes = await supabase
    .from('profiles')
    .select(`${PROFILE_FIELDS_SELECT}, booking_lead_time_minutes`)
    .eq('id', userId)
    .single();
  let data: unknown = withMinutes.data;
  let error = withMinutes.error;
  if (error && isMissingNamedColumn(error, 'booking_lead_time_minutes')) {
    const legacy = await supabase.from('profiles').select(PROFILE_FIELDS_SELECT).eq('id', userId).single();
    data = legacy.data;
    error = legacy.error;
  }

  if (error) throw error;
  if (!data) return null;
  return profileFieldsSchema.parse(data);
}

export async function updateProfileFields(
  userId: string,
  updates: ProfileFields,
): Promise<ProfileFields> {
  // Minutos vão em separado (updateBookingLeadTimeMinutes) para não quebrar antes da migration.
  const { booking_lead_time_minutes: _ignored, ...parsed } = profileFieldsSchema.parse(updates);

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed)
    .eq('id', userId)
    .select(PROFILE_FIELDS_SELECT)
    .single();

  if (error) throw error;
  return profileFieldsSchema.parse(data);
}

export type ColumnSaveResult = 'saved' | 'unsupported';

/** Antecedência em minutos. Antes da migration devolve 'unsupported' (ficam as horas). */
export async function updateBookingLeadTimeMinutes(
  userId: string,
  minutes: number,
): Promise<ColumnSaveResult> {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 43200) {
    throw new Error(`invalid_booking_lead_time_minutes: ${String(minutes)}`);
  }
  const { error } = await supabase
    .from('profiles')
    .update({ booking_lead_time_minutes: minutes })
    .eq('id', userId);
  if (error) {
    if (isMissingNamedColumn(error, 'booking_lead_time_minutes')) return 'unsupported';
    throw error;
  }
  return 'saved';
}

/** Texto da política (null = usar o gerado). Antes da migration devolve 'unsupported'. */
export async function updateClientCancelPolicyText(
  companyId: string,
  text: string | null,
): Promise<ColumnSaveResult> {
  if (text != null && text.length > 300) throw new Error('client_cancel_policy_text_too_long');
  const { error } = await supabase
    .from('business_settings')
    .update({ client_cancel_policy_text: text })
    .eq('user_id', companyId);
  if (error) {
    if (isMissingNamedColumn(error, 'client_cancel_policy_text')) return 'unsupported';
    throw error;
  }
  return 'saved';
}

export type OnlineBookingApprovalSaveResult = 'saved' | 'unsupported';

function isMissingOnlineBookingApprovalColumn(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') {
    return /online_booking_requires_approval/i.test(error.message ?? '') || !error.message;
  }
  return false;
}

/**
 * Salva "Aprovar agendamentos online" em separado do resto: antes da migration
 * devolve 'unsupported' sem quebrar o salvamento das outras configurações.
 * Só o dono consegue (RLS de business_settings).
 */
export async function updateOnlineBookingRequiresApproval(
  companyId: string,
  requiresApproval: boolean,
): Promise<OnlineBookingApprovalSaveResult> {
  if (typeof requiresApproval !== 'boolean') {
    throw new Error(`invalid_online_booking_requires_approval: ${String(requiresApproval)}`);
  }
  const { error } = await supabase
    .from('business_settings')
    .upsert({ user_id: companyId, online_booking_requires_approval: requiresApproval }, { onConflict: 'user_id' });

  if (error) {
    if (isMissingOnlineBookingApprovalColumn(error)) return 'unsupported';
    throw error;
  }
  return 'saved';
}
