import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSubscription } from '../../hooks/useSubscription';

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn()
}));

import { useAuth } from '../../contexts/AuthContext';

describe('useSubscription Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns subscription data from auth context', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'active',
            trialEndsAt: null,
            isSubscriptionActive: true,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.subscriptionStatus).toBe('active');
        expect(result.current.isSubscriptionActive).toBe(true);
        expect(result.current.isLoading).toBe(false);
    });

    it('returns correct trial days remaining for active trial', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'trial',
            trialEndsAt: futureDate.toISOString(),
            isSubscriptionActive: true,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.isTrial).toBe(true);
        expect(result.current.trialDaysRemaining).toBeGreaterThan(0);
        expect(result.current.trialDaysRemaining).toBeLessThanOrEqual(5);
    });

    it('returns 0 trial days when trial has expired', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);

        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'trial',
            trialEndsAt: pastDate.toISOString(),
            isSubscriptionActive: false,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.trialDaysRemaining).toBe(0);
    });

    it('returns 0 trial days when not in trial', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'active',
            trialEndsAt: null,
            isSubscriptionActive: true,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.isTrial).toBe(false);
        expect(result.current.trialDaysRemaining).toBe(0);
    });

    it('correctly identifies expired subscription', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'canceled',
            trialEndsAt: new Date(Date.now() - 86400000).toISOString(),
            isSubscriptionActive: false,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.isExpired).toBe(true);
        expect(result.current.isSubscriptionActive).toBe(false);
    });

    it('correctly identifies active subscription', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'active',
            trialEndsAt: null,
            isSubscriptionActive: true,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.isSubscriptionActive).toBe(true);
        expect(result.current.isExpired).toBe(false);
    });

    it('handles loading state', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'trial',
            trialEndsAt: null,
            isSubscriptionActive: true,
            loading: true
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.isLoading).toBe(true);
    });

    it('handles past_due subscription status', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'past_due',
            trialEndsAt: null,
            isSubscriptionActive: false,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.subscriptionStatus).toBe('past_due');
        expect(result.current.isExpired).toBe(true);
    });

    it('handles subscriber status as active subscription', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'subscriber',
            trialEndsAt: null,
            isSubscriptionActive: true,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current.subscriptionStatus).toBe('subscriber');
        expect(result.current.isSubscriptionActive).toBe(true);
        expect(result.current.isExpired).toBe(false);
    });

    it('returns all subscription data properties', () => {
        vi.mocked(useAuth).mockReturnValue({
            subscriptionStatus: 'active',
            trialEndsAt: null,
            isSubscriptionActive: true,
            loading: false
        } as any);

        const { result } = renderHook(() => useSubscription());

        expect(result.current).toHaveProperty('subscriptionStatus');
        expect(result.current).toHaveProperty('trialEndsAt');
        expect(result.current).toHaveProperty('isSubscriptionActive');
        expect(result.current).toHaveProperty('trialDaysRemaining');
        expect(result.current).toHaveProperty('isLoading');
        expect(result.current).toHaveProperty('isTrial');
        expect(result.current).toHaveProperty('isExpired');
    });
});
