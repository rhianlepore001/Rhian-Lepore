import type { AgendixPlanId } from './planPricing';

const PLAN_NAMES: Record<AgendixPlanId, string> = { solo: 'Solo', team: 'Equipe' };

export interface PlanCardState {
  isCurrent: boolean;
  label: string;
  canCheckout: boolean;
}

/**
 * Estado do cartão de um plano na tela "Plano AgendiX".
 * Só com assinatura ativa e plano conhecido o cartão atual é marcado e o outro
 * oferece a troca; trial e demais status mantêm o comportamento anterior.
 */
export function planCardState(
  planId: AgendixPlanId,
  { status, currentPlan }: { status: string | null | undefined; currentPlan: AgendixPlanId | null | undefined },
): PlanCardState {
  if (status === 'trial') return { isCurrent: false, label: 'Começar Assinatura', canCheckout: true };
  if (status === 'active' && currentPlan) {
    return currentPlan === planId
      ? { isCurrent: true, label: 'Seu plano atual', canCheckout: false }
      : { isCurrent: false, label: `Mudar para ${PLAN_NAMES[planId]}`, canCheckout: true };
  }
  return { isCurrent: false, label: 'Alterar Plano', canCheckout: true };
}
