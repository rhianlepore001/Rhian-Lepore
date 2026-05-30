import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Helper para envolver hooks com o provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state and loading true', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.loading).toBe(true);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('should fetch profile data if session exists on init', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const mockSession = { user: mockUser };
        const mockProfile = {
            user_type: 'beauty',
            region: 'PT',
            business_name: 'Studio X',
            full_name: 'Jane Doe',
            tutorial_completed: false,
            subscription_status: 'active',
            trial_ends_at: null
        };

        // Configurar mocks do Supabase
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Esperar pelo loading sumir
        await act(async () => {
            // O useEffect roda na montagem
        });

        // Verificações
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userType).toBe('beauty');
        expect(result.current.region).toBe('PT');
        expect(result.current.businessName).toBe('Studio X');
        expect(result.current.tutorialCompleted).toBe(false);
    });

    it('uses onboarding_progress as source of truth for owner onboarding', async () => {
        const mockUser = { id: 'owner-123', email: 'owner@example.com' };
        const mockSession = { user: mockUser };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: table === 'profiles'
                    ? {
                        id: mockUser.id,
                        role: 'owner',
                        company_id: mockUser.id,
                        user_type: 'barber',
                        region: 'BR',
                        tutorial_completed: false,
                    }
                    : { is_completed: true },
                error: null,
            }),
        }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.companyId).toBe(mockUser.id);
        expect(result.current.tutorialCompleted).toBe(true);
    });

    it('keeps owner onboarding incomplete when onboarding_progress is false even if legacy profile is true', async () => {
        const mockUser = { id: 'owner-456', email: 'owner@example.com' };
        const mockSession = { user: mockUser };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: table === 'profiles'
                    ? {
                        id: mockUser.id,
                        role: 'owner',
                        company_id: mockUser.id,
                        user_type: 'barber',
                        region: 'BR',
                        tutorial_completed: true,
                    }
                    : { is_completed: false },
                error: null,
            }),
        }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.tutorialCompleted).toBe(false);
    });

    it('inherits owner subscription and business data for staff', async () => {
        const mockUser = { id: 'staff-123', email: 'staff@example.com' };
        const mockSession = { user: mockUser };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation((table: string) => {
            const query = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockImplementation(() => {
                    if (table === 'profiles' && query.eq.mock.calls.some((call: unknown[]) => call[1] === 'owner-123')) {
                        return Promise.resolve({
                            data: {
                                subscription_status: 'active',
                                trial_ends_at: '2026-06-01T00:00:00.000Z',
                                user_type: 'beauty',
                                business_name: 'Studio Owner',
                            },
                            error: null,
                        });
                    }

                    return Promise.resolve({
                        data: {
                            id: mockUser.id,
                            role: 'staff',
                            company_id: 'owner-123',
                            user_type: 'barber',
                            region: 'BR',
                            business_name: 'Staff Business',
                            tutorial_completed: false,
                        },
                        error: null,
                    });
                }),
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'team-123' }, error: null }),
            };

            return query;
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.role).toBe('staff');
        expect(result.current.companyId).toBe('owner-123');
        expect(result.current.subscriptionStatus).toBe('active');
        expect(result.current.userType).toBe('beauty');
        expect(result.current.businessName).toBe('Studio Owner');
        expect(result.current.teamMemberId).toBe('team-123');
    });

    it('should handle login successfully', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        (supabase.rpc as any).mockResolvedValue({ data: true, error: null });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: {}, error: null });

        let loginResult;
        await act(async () => {
            loginResult = await result.current.login('test@example.com', 'password123');
        });

        expect(loginResult.error).toBeNull();
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
    });

    it('should handle login rate limit', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        (supabase.rpc as any).mockResolvedValue({ data: false, error: null });

        let loginResult;
        await act(async () => {
            loginResult = await result.current.login('test@example.com', 'password123');
        });

        expect(loginResult.error.message).toContain('Muitas tentativas');
        expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should fail open when login rate limit RPC is unavailable', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        (supabase.rpc as any).mockRejectedValue(new Error('RPC unavailable'));
        (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: {}, error: null });

        let loginResult;
        await act(async () => {
            loginResult = await result.current.login('test@example.com', 'password123');
        });

        expect(loginResult.error).toBeNull();
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
    });

    it('registers owner with own company_id and initial onboarding progress', async () => {
        const mockUser = { id: 'owner-new', email: 'owner@example.com' };
        const insertedProfiles: any[] = [];

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });
        (supabase.from as any).mockImplementation((table: string) => ({
            insert: vi.fn().mockImplementation((rows) => {
                if (table === 'profiles') {
                    insertedProfiles.push(...rows);
                }

                return Promise.resolve({ data: null, error: null });
            }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));
        (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'owner@example.com',
                password: 'Password123!',
                fullName: 'Owner Test',
                businessName: 'Barbearia Teste',
                userType: 'barber',
                region: 'BR',
                phone: '11999999999',
            });
        });

        expect(registerResult.error).toBeNull();
        expect(insertedProfiles[0]).toMatchObject({
            id: mockUser.id,
            role: 'owner',
            company_id: mockUser.id,
            tutorial_completed: false,
            subscription_status: 'trial',
            aios_enabled: true,
        });
        expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', {
            p_company_id: mockUser.id,
            p_current_step: 1,
            p_completed_steps: [],
            p_step_data: {},
        });
    });

    it('registers staff inside owner company without creating owner onboarding progress', async () => {
        const mockUser = { id: 'staff-new', email: 'staff@example.com' };
        const insertedProfiles: any[] = [];
        const insertedTeamMembers: any[] = [];

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });
        (supabase.from as any).mockImplementation((table: string) => ({
            insert: vi.fn().mockImplementation((rows) => {
                if (table === 'profiles') {
                    insertedProfiles.push(...rows);
                }

                if (table === 'team_members') {
                    insertedTeamMembers.push(...rows);
                }

                return Promise.resolve({ data: null, error: null });
            }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));
        (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'staff@example.com',
                password: 'Password123!',
                fullName: 'Staff Test',
                businessName: '',
                userType: 'barber',
                region: 'BR',
                phone: '11988888888',
                companyId: 'owner-123',
            });
        });

        expect(registerResult.error).toBeNull();
        expect(insertedProfiles[0]).toMatchObject({
            id: mockUser.id,
            role: 'staff',
            company_id: 'owner-123',
            tutorial_completed: false,
        });
        expect(insertedTeamMembers[0]).toMatchObject({
            user_id: 'owner-123',
            staff_user_id: mockUser.id,
            name: 'Staff Test',
            active: true,
            is_owner: false,
        });
        expect(supabase.rpc).not.toHaveBeenCalledWith('upsert_onboarding_progress', expect.anything());
    });

    it('marks owner onboarding as completed in onboarding_progress', async () => {
        const mockUser = { id: 'owner-complete', email: 'owner@example.com' };
        const mockSession = { user: mockUser };
        const upsertOnboarding = vi.fn().mockResolvedValue({ data: null, error: null });

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            upsert: table === 'onboarding_progress'
                ? upsertOnboarding
                : vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({
                data: table === 'profiles'
                    ? {
                        id: mockUser.id,
                        role: 'owner',
                        company_id: mockUser.id,
                        user_type: 'barber',
                        region: 'BR',
                        tutorial_completed: false,
                    }
                    : { is_completed: false },
                error: null,
            }),
        }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.markTutorialCompleted();
        });

        expect(upsertOnboarding).toHaveBeenCalledWith(
            expect.objectContaining({
                company_id: mockUser.id,
                current_step: 5,
                completed_steps: [1, 2, 3, 4, 5],
                is_completed: true,
            }),
            { onConflict: 'company_id' }
        );
        expect(result.current.tutorialCompleted).toBe(true);
    });

    it('marks staff tutorial as completed in profile', async () => {
        const mockUser = { id: 'staff-complete', email: 'staff@example.com' };
        const mockSession = { user: mockUser };
        const updateProfile = vi.fn().mockReturnThis();
        const eqProfile = vi.fn().mockReturnThis();

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation((table: string) => {
            const query = {
                select: vi.fn().mockReturnThis(),
                eq: table === 'profiles' ? eqProfile : vi.fn().mockReturnThis(),
                update: table === 'profiles' ? updateProfile : vi.fn().mockReturnThis(),
                single: vi.fn().mockImplementation(() => {
                    if (table === 'profiles' && query.eq.mock.calls.some((call: unknown[]) => call[1] === 'owner-123')) {
                        return Promise.resolve({
                            data: {
                                subscription_status: 'active',
                                trial_ends_at: null,
                                user_type: 'barber',
                                business_name: 'Barbearia Owner',
                            },
                            error: null,
                        });
                    }

                    return Promise.resolve({
                        data: {
                            id: mockUser.id,
                            role: 'staff',
                            company_id: 'owner-123',
                            user_type: 'barber',
                            region: 'BR',
                            tutorial_completed: false,
                        },
                        error: null,
                    });
                }),
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'team-123' }, error: null }),
            };

            return query;
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.markTutorialCompleted();
        });

        expect(updateProfile).toHaveBeenCalledWith({ tutorial_completed: true });
        expect(eqProfile).toHaveBeenCalledWith('id', mockUser.id);
        expect(result.current.tutorialCompleted).toBe(true);
    });

    it('should handle logout and reset state', async () => {
        // 1. Simular estado logado como beauty
        const mockUser = { id: 'user-123' };
        const mockSession = { user: mockUser };
        const mockProfile = { user_type: 'beauty', region: 'PT' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => { /* wait for init */ });

        expect(result.current.userType).toBe('beauty');

        // 2. Executar logout
        await act(async () => {
            await result.current.logout();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.userType).toBe('barber'); // Reset
        expect(result.current.region).toBe('BR'); // Reset
    });
});
