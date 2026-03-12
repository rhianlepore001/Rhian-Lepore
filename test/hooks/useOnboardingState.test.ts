import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/contexts/AuthContext';

const mockUser = { id: 'user-abc', email: 'owner@test.com' };
const mockSession = { user: mockUser };

const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthProvider, null, children);

const setupAuthMock = (profileData?: object) => {
    (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
    });
    (supabase.auth.onAuthStateChange as any).mockImplementation(
        (callback: Function) => {
            callback('SIGNED_IN', mockSession);
            return { data: { subscription: { unsubscribe: vi.fn() } } };
        }
    );
    (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
            data: table === 'profiles'
                ? { user_type: 'barber', region: 'BR', tutorial_completed: false, role: 'owner', ...profileData }
                : null,
            error: null,
        }),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
    }));
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
};

describe('useOnboardingState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('começa com loading true e step 1', () => {
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: null },
            error: null,
        });

        const { result } = renderHook(() => useOnboardingState(), { wrapper });

        expect(result.current.loading).toBe(true);
        expect(result.current.step).toBe(1);
        expect(result.current.completed).toBe(false);
    });

    it('retoma a etapa salva no Supabase', async () => {
        setupAuthMock();
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: table === 'business_settings'
                    ? { onboarding_step: 3, onboarding_completed: false }
                    : { user_type: 'barber', region: 'BR', tutorial_completed: false, role: 'owner' },
                error: null,
            }),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
        }));

        const { result } = renderHook(() => useOnboardingState(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.step).toBe(3);
    });

    it('marca completed=true se onboarding_completed=true no banco', async () => {
        setupAuthMock({ tutorial_completed: false });
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: table === 'business_settings'
                    ? { onboarding_step: 5, onboarding_completed: true }
                    : { user_type: 'barber', region: 'BR', tutorial_completed: false, role: 'owner' },
                error: null,
            }),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
        }));

        const { result } = renderHook(() => useOnboardingState(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.completed).toBe(true);
    });

    it('goToStep salva no Supabase e atualiza o step local', async () => {
        setupAuthMock();
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: table === 'business_settings'
                    ? { onboarding_step: 1, onboarding_completed: false }
                    : { user_type: 'barber', region: 'BR', tutorial_completed: false, role: 'owner' },
                error: null,
            }),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
        }));

        const { result } = renderHook(() => useOnboardingState(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.goToStep(2);
        });

        expect(supabase.rpc).toHaveBeenCalledWith('update_onboarding_step', {
            p_user_id: mockUser.id,
            p_step: 2,
        });
        expect(result.current.step).toBe(2);
    });

    it('step não sai do intervalo [1,5] ao retomar progresso corrompido', async () => {
        setupAuthMock();
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: table === 'business_settings'
                    ? { onboarding_step: 99, onboarding_completed: false }
                    : { user_type: 'barber', region: 'BR', tutorial_completed: false, role: 'owner' },
                error: null,
            }),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
        }));

        const { result } = renderHook(() => useOnboardingState(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.step).toBe(5);
    });

    it('completeOnboarding chama rpc com p_completed=true e markTutorialCompleted', async () => {
        setupAuthMock();
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: table === 'business_settings'
                    ? { onboarding_step: 4, onboarding_completed: false }
                    : { user_type: 'barber', region: 'BR', tutorial_completed: false, role: 'owner' },
                error: null,
            }),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
        }));

        const { result } = renderHook(() => useOnboardingState(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.completeOnboarding();
        });

        expect(supabase.rpc).toHaveBeenCalledWith('update_onboarding_step', {
            p_user_id: mockUser.id,
            p_step: 5,
            p_completed: true,
        });
        expect(result.current.completed).toBe(true);
    });
});
