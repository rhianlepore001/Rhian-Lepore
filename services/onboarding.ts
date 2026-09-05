import { supabase } from '@/lib/supabase';

export interface OnboardingProgressRecord {
  id: string;
  company_id: string;
  current_step: number;
  completed_steps: number[];
  is_completed: boolean;
  completed_at: string | null;
  step_data: Record<string, unknown>;
}

export interface OnboardingProgressData {
  step: number;
  completed: boolean;
}

export async function getOnboardingProgress(
  companyId: string,
): Promise<OnboardingProgressRecord | null> {
  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data as OnboardingProgressRecord;
}

export async function fetchOnboardingProgress(companyId: string): Promise<OnboardingProgressData> {
  const progress = await getOnboardingProgress(companyId);

  if (progress?.is_completed) {
    return { step: 5, completed: true };
  }

  const step = progress?.current_step
    ? Math.min(Math.max(progress.current_step, 1), 6)
    : 1;

  return { step, completed: false };
}

export async function saveOnboardingStep(
  companyId: string,
  currentStep: number,
  completedSteps: number[],
  stepData: Record<string, unknown> = {},
): Promise<OnboardingProgressRecord> {
  const { data, error } = await supabase.rpc('upsert_onboarding_progress', {
    p_company_id: companyId,
    p_current_step: currentStep,
    p_completed_steps: completedSteps,
    p_step_data: stepData,
  });

  if (error) throw error;
  return data as OnboardingProgressRecord;
}

function requireTenantId(companyId: string | null | undefined): string {
  const tenantId = (companyId || '').trim();
  if (!tenantId) {
    throw new Error('Sessão incompleta: company_id ausente. Recarregue a página ou entre novamente.');
  }
  return tenantId;
}

export async function upsertOnboardingStep(companyId: string, step: number): Promise<void> {
  const tenantId = requireTenantId(companyId);
  await saveOnboardingStep(tenantId, step, [], {});
}

export async function completeOnboardingProgress(companyId: string): Promise<void> {
  const tenantId = requireTenantId(companyId);
  const { error } = await supabase.rpc('upsert_onboarding_progress', {
    p_company_id: tenantId,
    p_current_step: 5,
    p_completed_steps: [1, 2, 3, 4, 5],
    p_step_data: {},
  });
  if (error) throw error;

  const { error: completeError } = await supabase
    .from('onboarding_progress')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      current_step: 5,
    })
    .eq('company_id', tenantId);
  if (completeError) throw completeError;
}

export const completeOnboarding = completeOnboardingProgress;

export interface SetupStatus {
  hasServices: boolean;
  hasTeam: boolean;
  hasClients: boolean;
  hasBusinessHours: boolean;
  hasBookingSlug: boolean;
  hasAppointments: boolean;
  isActivated: boolean;
}

/** Link público existe (slug) ou já foi usado (há reservas na tabela pública). */
export function isBookingLinkReady(input: {
  businessSlug?: string | null;
  publicBookingsCount?: number;
}): boolean {
  const slug = (input.businessSlug ?? '').trim();
  if (slug.length > 0) return true;
  return (input.publicBookingsCount ?? 0) > 0;
}

export function isSetupChecklistComplete(
  status: Pick<
    SetupStatus,
    | 'hasServices'
    | 'hasTeam'
    | 'hasClients'
    | 'hasBusinessHours'
    | 'hasBookingSlug'
    | 'hasAppointments'
  >,
): boolean {
  return (
    status.hasServices &&
    status.hasTeam &&
    status.hasClients &&
    status.hasBusinessHours &&
    status.hasBookingSlug &&
    status.hasAppointments
  );
}

/** O card some quando o checklist fechou ou o perfil já está ativado. */
export function shouldHideSetupCopilot(status: SetupStatus): boolean {
  return status.isActivated || isSetupChecklistComplete(status);
}

export async function getSetupStatus(userId: string): Promise<SetupStatus> {
  const [
    servicesRes,
    teamRes,
    clientsRes,
    settingsRes,
    profileRes,
    appointmentsRes,
    publicBookingsRes,
  ] = await Promise.all([
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('business_settings').select('business_hours').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('business_slug, activation_completed').eq('id', userId).maybeSingle(),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('public_bookings').select('id', { count: 'exact', head: true }).eq('business_id', userId),
  ]);

  const businessHours = settingsRes.data?.business_hours;
  const hasBusinessHours = !!businessHours && Object.keys(businessHours).length > 0;
  const hasBookingSlug = isBookingLinkReady({
    businessSlug: profileRes.data?.business_slug,
    publicBookingsCount: publicBookingsRes.count ?? 0,
  });

  return {
    hasServices: (servicesRes.count ?? 0) > 0,
    hasTeam: (teamRes.count ?? 0) > 0,
    hasClients: (clientsRes.count ?? 0) > 0,
    hasBusinessHours,
    hasBookingSlug,
    hasAppointments: (appointmentsRes.count ?? 0) > 0,
    isActivated: profileRes.data?.activation_completed === true,
  };
}
