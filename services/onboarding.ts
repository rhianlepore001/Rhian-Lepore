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

export async function ensureCallerProfile(): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_caller_profile');
  if (error) throw error;
  const companyId = typeof data === 'string' ? data.trim() : '';
  if (!companyId) {
    throw new Error('Não foi possível garantir o perfil da conta. Recarregue e tente de novo.');
  }
  return companyId;
}

export async function completeOnboardingProgress(companyId?: string | null): Promise<void> {
  // companyId opcional: a RPC deriva o tenant do auth.uid() (evita RLS/órfãos).
  if (companyId != null && companyId !== '') {
    requireTenantId(companyId);
  }
  const { error } = await supabase.rpc('complete_onboarding_for_caller');
  if (error) throw error;
}

export const completeOnboarding = completeOnboardingProgress;

export async function getSetupStatus(userId: string) {
  const [
    servicesRes,
    teamRes,
    clientsRes,
    settingsRes,
    profileRes,
    appointmentsRes,
  ] = await Promise.all([
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('business_settings').select('business_hours, public_booking_enabled').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('business_slug, activation_completed').eq('id', userId).single(),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const businessHours = settingsRes.data?.business_hours;
  const hasBusinessHours = !!businessHours && Object.keys(businessHours).length > 0;
  const hasBookingSlug = !!profileRes.data?.business_slug;

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
