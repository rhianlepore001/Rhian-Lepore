import { useAuth } from '../contexts/AuthContext';
import { parseDate } from '../utils/date';

/**
 * Custom hook for managing subscription and trial status
 * Provides access to current subscription state and helper functions
 * @returns {Object} Subscription status object
 * @returns {string} subscriptionStatus - Current subscription status (trial, active, past_due, etc)
 * @returns {string|null} trialEndsAt - Trial end date in ISO format
 * @returns {boolean} isSubscriptionActive - Whether subscription is active or valid trial
 * @returns {number} trialDaysRemaining - Number of days remaining in trial (0 if not in trial)
 * @returns {boolean} isLoading - Whether subscription data is loading
 * @returns {boolean} isTrial - Whether user is in trial period
 * @returns {boolean} isExpired - Whether subscription has expired
 * @example
 * const { isSubscriptionActive, trialDaysRemaining, isTrial } = useSubscription();
 */
export const useSubscription = () => {
    const { subscriptionStatus, trialEndsAt, isSubscriptionActive, loading } = useAuth();

    /**
     * Calculate remaining trial days
     * @returns {number} Days remaining in trial (0 if not in trial)
     */
    const getTrialDaysRemaining = () => {
        if (subscriptionStatus !== 'trial' || !trialEndsAt) return 0;

        const now = new Date();
        const end = parseDate(trialEndsAt);

        if (!end) return 0;

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
