import { parseAgendixPlan, type AgendixPlanId } from '@/constants/agendixPlans';

export interface PlanEntitlements {
  plan: AgendixPlanId;
  maxProfessionals: number;
  hasClub: boolean;
  hasInsights: boolean;
  hasCommissions: boolean;
  hasStaffLogin: boolean;
}

export const SOLO_ENTITLEMENTS: PlanEntitlements = {
  plan: 'solo',
  maxProfessionals: 1,
  hasClub: false,
  hasInsights: false,
  hasCommissions: false,
  hasStaffLogin: false,
};

export const EQUIPE_ENTITLEMENTS: PlanEntitlements = {
  plan: 'equipe',
  maxProfessionals: 5,
  hasClub: true,
  hasInsights: true,
  hasCommissions: true,
  hasStaffLogin: true,
};

export function resolvePlanEntitlements(input: {
  subscriptionPlan?: unknown;
  isTrial: boolean;
}): PlanEntitlements {
  if (input.isTrial) return EQUIPE_ENTITLEMENTS;
  const plan = parseAgendixPlan(input.subscriptionPlan);
  if (plan === 'solo') return SOLO_ENTITLEMENTS;
  return EQUIPE_ENTITLEMENTS;
}

export function canAddProfessional(maxProfessionals: number, currentCount: number): boolean {
  return currentCount < maxProfessionals;
}
