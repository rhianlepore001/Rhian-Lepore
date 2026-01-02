import { useAuth } from '../contexts/AuthContext';

export const useSubscription = () => {
    const { subscriptionStatus, trialEndsAt, isSubscriptionActive, loading } = useAuth();

    const getTrialDaysRemaining = () => {
        if (subscriptionStatus !== 'trial' || !trialEndsAt) return 0;

        const now = new Date();
        const end = new Date(trialEndsAt);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    };

    return {
        subscriptionStatus,
        trialEndsAt,
        isSubscriptionActive,
        trialDaysRemaining: getTrialDaysRemaining(),
        isLoading: loading,
        isTrial: subscriptionStatus === 'trial',
        isExpired: !isSubscriptionActive && !loading
    };
};
