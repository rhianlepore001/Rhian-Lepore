import { useAuth } from '../contexts/AuthContext';
import { parseDate } from '../utils/date';
import { resolvePlanEntitlements } from '../utils/planEntitlements';

export const useSubscription = () => {
    const { subscriptionStatus, subscriptionPlan, trialEndsAt, isSubscriptionActive, loading } = useAuth();

    const getTrialDaysRemaining = () => {
        if (subscriptionStatus !== 'trial' || !trialEndsAt) return 0;

        const now = new Date();
        const end = parseDate(trialEndsAt);

        if (!end) return 0;

        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    };

    const isTrial = subscriptionStatus === 'trial';

    return {
        subscriptionStatus,
        subscriptionPlan,
        trialEndsAt,
        isSubscriptionActive,
        trialDaysRemaining: getTrialDaysRemaining(),
        isLoading: loading,
        isTrial,
        isExpired: !isSubscriptionActive && !loading,
        entitlements: resolvePlanEntitlements({
            subscriptionPlan,
            isTrial: isTrial && isSubscriptionActive,
        }),
    };
};
