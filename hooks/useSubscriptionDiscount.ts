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

    if (!membership || membership.status !== 'active' || !membership.plan) {
        const subtotalCents = services.reduce((sum, s) => sum + Math.round(s.price * 100), 0);
        return {
            ...EMPTY_RESULT,
            subtotalCents,
            finalCents: subtotalCents,
            uncoveredServices: services,
        };
    }

    const plan = membership.plan;
    const planServiceIds = new Set(plan.service_ids);

    const covered: CheckoutService[] = [];
    const uncovered: CheckoutService[] = [];

    for (const s of services) {
        if (planServiceIds.has(s.id)) {
            covered.push(s);
        } else {
            uncovered.push(s);
        }
    }

    const subtotalCents = services.reduce((sum, s) => sum + Math.round(s.price * 100), 0);
    const coveredCents = covered.reduce((sum, s) => sum + Math.round(s.price * 100), 0);
    const finalCents = uncovered.reduce((sum, s) => sum + Math.round(s.price * 100), 0);
    const fullyCovered = uncovered.length === 0 && covered.length > 0;

    let message: string | null = null;
    if (fullyCovered) {
        message = `Plano ${plan.name} ativo. Atendimento incluso.`;
    } else if (covered.length > 0) {
        message = `Plano ${plan.name} cobre ${covered.length} de ${services.length} serviços.`;
    } else {
        message = `Plano ${plan.name} ativo, mas não cobre os serviços agendados.`;
    }

    // Se a função useQuery não está sendo usada (allServices só pra coerência futura)
    void allServices;

    return {
        membership,
        plan,
        subtotalCents,
        coveredCents,
        finalCents,
        coveredServices: covered,
        uncoveredServices: uncovered,
        fullyCovered,
        hasActiveSubscription: true,
        message,
    };
}
