import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { use2FA } from '../../hooks/use2FA';

// Mock supabase
const mockListFactors = vi.fn();
const mockEnroll = vi.fn();
const mockChallenge = vi.fn();
const mockVerify = vi.fn();
const mockUnenroll = vi.fn();

vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            mfa: {
                listFactors: mockListFactors,
                enroll: mockEnroll,
                challenge: mockChallenge,
                verify: mockVerify,
                unenroll: mockUnenroll
            }
        }
    }
}));

describe('use2FA Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListFactors.mockResolvedValue({
            data: {
                totp: [
                    { id: 'factor1', status: 'verified' },
                    { id: 'factor2', status: 'verified' }
                ],
                all: []
            },
            error: null
        });
    });

    it('loads factors on mount', async () => {
        const { result } = renderHook(() => use2FA());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(mockListFactors).toHaveBeenCalled();
    });

    it('returns empty factors list initially if none exist', async () => {
        mockListFactors.mockResolvedValue({
            data: {
                totp: [],
                all: []
            },
            error: null
        });

        const { result } = renderHook(() => use2FA());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.factors).toEqual([]);
        expect(result.current.isEnabled).toBe(false);
    });

    it('loads verified factors correctly', async () => {
        const { result } = renderHook(() => use2FA());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.factors.length).toBeGreaterThan(0);
        expect(result.current.isEnabled).toBe(true);
    });

    it('filters only verified factors', async () => {
        mockListFactors.mockResolvedValue({
            data: {
                totp: [
                    { id: 'verified1', status: 'verified' },
                    { id: 'unverified1', status: 'unverified' },
                    { id: 'verified2', status: 'verified' }
                ],
                all: []
            },
            error: null
        });

        const { result } = renderHook(() => use2FA());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.factors.length).toBe(2);
        expect(result.current.factors.every((f: any) => f.status === 'verified')).toBe(true);
    });

    it('enrolls new 2FA factor', async () => {
        const enrollData = {
            id: 'new-factor',
            totp: {
                qr_code: 'data:image/svg+xml...',
                secret: 'secret-key'
            }
        };

        mockEnroll.mockResolvedValue({
            data: enrollData,
            error: null
        });

        const { result } = renderHook(() => use2FA());

        const enrollResult = await result.current.enroll();

        expect(mockEnroll).toHaveBeenCalledWith({
            factorType: 'totp'
        });
        expect(enrollResult).toEqual(enrollData);
    });

    it('verifies code and enables 2FA', async () => {
        const challengeData = { id: 'challenge-123', expires_in: 300 };
        const verifyData = { verified: true };

        mockChallenge.mockResolvedValue({
            data: challengeData,
            error: null
        });

        mockVerify.mockResolvedValue({
            data: verifyData,
            error: null
        });

        const { result } = renderHook(() => use2FA());

        const verifyResult = await result.current.verifyAndEnable('factor-123', '123456');

        expect(mockChallenge).toHaveBeenCalledWith({
            factorId: 'factor-123'
        });

        expect(mockVerify).toHaveBeenCalledWith({
            factorId: 'factor-123',
            challengeId: 'challenge-123',
            code: '123456'
        });

        expect(verifyResult).toEqual(verifyData);
    });

    it('throws error when challenge creation fails', async () => {
        mockChallenge.mockResolvedValue({
            data: null,
            error: { message: 'Challenge failed' }
        });

        const { result } = renderHook(() => use2FA());

        await expect(
            result.current.verifyAndEnable('factor-123', '123456')
        ).rejects.toThrow();
    });

    it('throws error when verification fails', async () => {
        mockChallenge.mockResolvedValue({
            data: { id: 'challenge-123', expires_in: 300 },
            error: null
        });

        mockVerify.mockResolvedValue({
            data: null,
            error: { message: 'Invalid code' }
        });

        const { result } = renderHook(() => use2FA());

        await expect(
            result.current.verifyAndEnable('factor-123', '123456')
        ).rejects.toThrow();
    });

    it('unenrolls (disables) 2FA factor', async () => {
        mockUnenroll.mockResolvedValue({
            data: null,
            error: null
        });

        const { result } = renderHook(() => use2FA());

        await result.current.unenroll('factor-123');

        expect(mockUnenroll).toHaveBeenCalledWith({
            factorId: 'factor-123'
        });
    });

    it('refreshes factors after unenroll', async () => {
        mockUnenroll.mockResolvedValue({
            data: null,
            error: null
        });

        mockListFactors.mockResolvedValue({
            data: {
                totp: [],
                all: []
            },
            error: null
        });

        const { result } = renderHook(() => use2FA());

        await result.current.unenroll('factor-123');

        expect(mockListFactors).toHaveBeenCalledTimes(2); // Once on mount, once after unenroll
    });

    it('throws error when unenroll fails', async () => {
        mockUnenroll.mockResolvedValue({
            data: null,
            error: { message: 'Unenroll failed' }
        });

        const { result } = renderHook(() => use2FA());

        await expect(
            result.current.unenroll('factor-123')
        ).rejects.toThrow();
    });

    it('provides refresh user method', async () => {
        const { result } = renderHook(() => use2FA());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(typeof result.current.refreshUser).toBe('function');
    });

    it('returns all 2FA methods', async () => {
        const { result } = renderHook(() => use2FA());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current).toHaveProperty('factors');
        expect(result.current).toHaveProperty('loading');
        expect(result.current).toHaveProperty('isEnabled');
        expect(result.current).toHaveProperty('enroll');
        expect(result.current).toHaveProperty('verifyAndEnable');
        expect(result.current).toHaveProperty('unenroll');
        expect(result.current).toHaveProperty('refreshUser');
    });

    it('handles listFactors error gracefully', async () => {
        mockListFactors.mockResolvedValue({
            data: null,
            error: { message: 'Failed to load factors' }
        });

        const { result } = renderHook(() => use2FA());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should not throw, just log error
        expect(result.current.factors).toBeDefined();
    });
});
