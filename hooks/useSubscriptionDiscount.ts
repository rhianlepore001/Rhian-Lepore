/**
 * useSubscriptionDiscount — Hook de bypass no Checkout quando cliente é assinante ativo.
 *
 * Regras de cálculo (Sprint D+1):
 * 1. Se cliente tem membership ativa E plano inclui TODOS os serviços do agendamento:
 *    → total = 0 (ou só adicionais/produtos fora do plano)
 * 2. Se plano cobre APENAS alguns serviços: desconta o que está dentro, cobra o resto
 * 3. Se plano tem usage_limit_per_month, respeita (futuro: integrar com contador de uso)
 *
 * O cálculo de uso mensal fica out-of-scope do D+1 — limites rígidos chegam no D+2.
 * No D+1, se o plano cobre o serviço, é 100% desconto (uso ilimitado ou contador conservador).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useClientActiveMembership } from './useMemberships';
import { fetchServices } from '../services/serviceSettings';
import { MembershipPlan } from '../services/memberships';
import { computeSubscriptionDiscount } from '../utils/subscriptionDiscount';

export interface CheckoutService {
    id: string;
    name?: string;
    price: number;
}

export interface SubscriptionDiscountResult {
    /** Membership ativa do cliente (ou null se não tem). */
    membership: ReturnType<typeof useClientActiveMembership>['data'];
    /** Plano vinculado à membership (ou null). */
    plan: MembershipPlan | null;
    /** Total original (sem desconto). */
    subtotalCents: number;
    /** Valor coberto pelo plano (desconto). */
    coveredCents: number;
    /** Total que o cliente paga de fato. */
    finalCents: number;
    /** Lista de serviços que estão dentro do plano (gratuitos). */
    coveredServices: CheckoutService[];
    /** Lista de serviços fora do plano (cobrados). */
    uncoveredServices: CheckoutService[];
    /** Plano cobre TODOS os serviços do agendamento? */
    fullyCovered: boolean;
    /** Tem assinatura ativa válida? */
    hasActiveSubscription: boolean;
    /** Mensagem amigável pra UI. */
    message: string | null;
    /** Plano cobre o serviço e o teto ainda cabe. */
    canUseMembership: boolean;
}

const EMPTY_RESULT: SubscriptionDiscountResult = {
    membership: null,
    plan: null,
    subtotalCents: 0,
    coveredCents: 0,
    finalCents: 0,
    coveredServices: [],
    uncoveredServices: [],
    fullyCovered: false,
    hasActiveSubscription: false,
    canUseMembership: false,
    message: null,
};

interface UseSubscriptionDiscountInput {
    clientId: string | null;
    services: CheckoutService[];
}

export function useSubscriptionDiscount({ clientId, services }: UseSubscriptionDiscountInput): SubscriptionDiscountResult {
    const { companyId } = useAuth();
    const { data: membership } = useClientActiveMembership(clientId);

    // Buscar todos os serviços pra mapear preço quando o checkout dá só service_id
    const { data: allServices = [] } = useQuery({
        queryKey: ['services-for-discount', companyId],
        queryFn: () => fetchServices(companyId!),
        enabled: !!companyId,
    });

    const computed = computeSubscriptionDiscount({
        isActive: Boolean(membership && membership.status === 'active' && membership.plan),
        planName: membership?.plan?.name ?? null,
        planServiceIds: membership?.plan?.service_ids ?? [],
        services,
        usageLimit: membership?.plan?.usage_limit_per_month,
        usageThisPeriod: membership && 'usage_this_period' in membership
            ? Number((membership as { usage_this_period?: number }).usage_this_period ?? 0)
            : undefined,
    });

    // Se a função useQuery não está sendo usada (allServices só pra coerência futura)
    void allServices;

    if (!computed.hasActiveSubscription || !membership?.plan) {
        return {
            ...EMPTY_RESULT,
            subtotalCents: computed.subtotalCents,
            finalCents: computed.finalCents,
            uncoveredServices: computed.uncoveredServices,
        };
    }

    return {
        membership,
        plan: membership.plan,
        subtotalCents: computed.subtotalCents,
        coveredCents: computed.coveredCents,
        finalCents: computed.finalCents,
        coveredServices: computed.coveredServices,
        uncoveredServices: computed.uncoveredServices,
        fullyCovered: computed.fullyCovered,
        hasActiveSubscription: true,
        canUseMembership: computed.canUseMembership,
        message: computed.message,
    };
}
