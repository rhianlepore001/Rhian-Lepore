/**
 * useSubscriptionDiscount — Bypass no Checkout quando cliente é assinante ativo.
 * Respeita usage_limit_per_month: 1 atendimento = 1 uso no período.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useClientActiveMembership } from './useMemberships';
import { applyMembershipCoverage } from '../utils/membershipCoverage';
import { countMembershipUsesThisPeriod, type MembershipPlan } from '../services/memberships';

export interface CheckoutService {
    id: string;
    name?: string;
    price: number;
}

export interface SubscriptionDiscountResult {
    membership: ReturnType<typeof useClientActiveMembership>['data'];
    plan: MembershipPlan | null;
    subtotalCents: number;
    coveredCents: number;
    finalCents: number;
    coveredServices: CheckoutService[];
    uncoveredServices: CheckoutService[];
    fullyCovered: boolean;
    hasActiveSubscription: boolean;
    remainingUses: number | null;
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
    remainingUses: null,
    message: null,
};

interface UseSubscriptionDiscountInput {
    clientId: string | null;
    services: CheckoutService[];
}

export function useSubscriptionDiscount({ clientId, services }: UseSubscriptionDiscountInput): SubscriptionDiscountResult {
    const { companyId } = useAuth();
    const { data: membership } = useClientActiveMembership(clientId);
    const { data: usageThisPeriod = 0 } = useQuery({
        queryKey: ['membership-usage', companyId, membership?.id, membership?.current_period_start],
        queryFn: () => countMembershipUsesThisPeriod(companyId!, membership!),
        enabled: !!companyId && !!membership && membership.status === 'active',
    });

    const subtotalCents = services.reduce((sum, s) => sum + Math.round(s.price * 100), 0);

    if (!membership || membership.status !== 'active' || !membership.plan) {
        return {
            ...EMPTY_RESULT,
            subtotalCents,
            finalCents: subtotalCents,
            uncoveredServices: services,
        };
    }

    const plan = membership.plan;
    const coverage = applyMembershipCoverage({
        services,
        planServiceIds: plan.service_ids,
        planName: plan.name,
        usageLimitPerMonth: plan.usage_limit_per_month,
        usageThisPeriod,
    });

    return {
        membership,
        plan,
        subtotalCents: coverage.subtotalCents,
        coveredCents: coverage.coveredCents,
        finalCents: coverage.finalCents,
        coveredServices: coverage.coveredServices,
        uncoveredServices: coverage.uncoveredServices,
        fullyCovered: coverage.fullyCovered,
        hasActiveSubscription: true,
        remainingUses: coverage.remainingUses,
        message: coverage.message,
    };
}
