import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TRIAL_DAYS } from '@/constants';

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

        await act(async () => {
            result.current.updateRegion('BR');
        });
        expect(result.current.region).toBe('BR');

        await act(async () => {
            result.current.updateRegion('PT');
        });
        expect(result.current.region).toBe('PT');
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
                                region: 'PT',
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
        expect(result.current.region).toBe('PT');
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
            upsert: vi.fn().mockImplementation((row) => {
                if (table === 'profiles') {
                    insertedProfiles.push(row);
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
            tutorial_completed: false,
            subscription_status: 'trial',
            aios_enabled: true,
        });
        expect(insertedProfiles[0]).not.toHaveProperty('role');
        expect(insertedProfiles[0]).not.toHaveProperty('company_id');
        const trialMs = new Date(insertedProfiles[0].trial_ends_at).getTime() - Date.now();
        const expectedMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
        expect(Math.abs(trialMs - expectedMs)).toBeLessThan(5_000);
        expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', {
            p_company_id: mockUser.id,
            p_current_step: 1,
            p_completed_steps: [],
            p_step_data: {},
        });
    });

    it('recusa cadastro staff sem member_id do convite', async () => {
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: { id: 'staff-new' } },
            error: null,
        });

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

        expect(registerResult.error).toBeTruthy();
        expect(registerResult.error.message).toMatch(/Convite inválido/);
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('vincula staff_user_id em team_member pré-cadastrado (sem duplicar)', async () => {
        const mockUser = { id: 'staff-existing', email: 'existing@example.com' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        (supabase.rpc as any).mockResolvedValue({ data: 'pre-cadastrado-uuid', error: null });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'existing@example.com',
                password: 'Password123!',
                fullName: 'Lucas Oliveira',
                businessName: '',
                userType: 'barber',
                region: 'BR',
                phone: '11988888888',
                companyId: 'owner-123',
                teamMemberId: 'pre-cadastrado-uuid',
            });
        });

        expect(registerResult.error).toBeNull();
        expect(supabase.rpc).toHaveBeenCalledWith('complete_staff_invite', {
            p_company_id: 'owner-123',
            p_member_id: 'pre-cadastrado-uuid',
            p_birth_date: null,
        });
        expect(result.current.role).toBe('staff');
        expect(result.current.teamMemberId).toBe('pre-cadastrado-uuid');
    });

    it('marks owner onboarding as completed in onboarding_progress', async () => {
        const mockUser = { id: 'owner-complete', email: 'owner@example.com' };
        const mockSession = { user: mockUser };
        const upsertOnboarding = vi.fn().mockResolvedValue({ data: null, error: null });
        const updateProfile = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: table === 'profiles'
                ? updateProfile
                : vi.fn().mockReturnThis(),
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
        expect(updateProfile).toHaveBeenCalledWith({ tutorial_completed: true });
        expect(result.current.tutorialCompleted).toBe(true);
    });

    it('hydrates companyId immediately after owner register', async () => {
        const mockUser = { id: 'owner-hydrate', email: 'owner-hydrate@example.com' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });
        (supabase.from as any).mockImplementation(() => ({
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));
        (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.register({
                email: 'owner-hydrate@example.com',
                password: 'Password123!',
                fullName: 'Owner Hydrate',
                businessName: 'Barbearia Hydrate',
                userType: 'barber',
                region: 'BR',
                phone: '11999999999',
            });
        });

        expect(result.current.companyId).toBe(mockUser.id);
        expect(result.current.role).toBe('owner');
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
        document.documentElement.setAttribute('data-theme', 'beauty');
        document.documentElement.setAttribute('data-mode', 'light');
        localStorage.setItem('agendix_color_mode', 'light');

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
        expect(document.documentElement.getAttribute('data-theme')).toBe('barber');
        expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
        expect(localStorage.getItem('agendix_color_mode')).toBe('light');
    });

    it('não purga e-mail órfão sem sessão — retorna erro ao usuário quando signIn falha', async () => {
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValueOnce({
            data: { user: null },
            error: { code: 'user_already_exists', message: 'User already registered' },
        });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult: any;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'recepcao@example.com',
                password: 'Password123!',
                fullName: 'Recepção Moderna',
                businessName: 'Barbearia Moderna',
                userType: 'barber',
                region: 'BR',
                phone: '',
                companyId: 'owner-123',
                teamMemberId: 'member-new-reinvite',
            });
        });

        expect(supabase.rpc).not.toHaveBeenCalledWith(
            'release_staff_email_for_reinvite',
            expect.anything(),
        );
        expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
        expect(registerResult.error).toBeTruthy();
        expect(registerResult.error.message).toMatch(/já está em uso/);
    });

    it('purga e-mail órfão via release quando signIn OK mas claim falha (sessão ativa)', async () => {
        const mockUser = { id: 'staff-retry', email: 'recepcao@example.com' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any)
            .mockResolvedValueOnce({
                data: { user: null },
                error: { code: 'user_already_exists', message: 'User already registered' },
            })
            .mockResolvedValueOnce({
                data: { user: mockUser, session: { user: mockUser } },
                error: null,
            });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        (supabase.auth.signOut as any).mockResolvedValue({ error: null });
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'release_staff_email_for_reinvite') {
                return Promise.resolve({ data: true, error: null });
            }
            if (name === 'complete_staff_invite') {
                return Promise.resolve({ data: 'member-new-reinvite', error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });
        let claimCall = 0;
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'complete_staff_invite') {
                claimCall++;
                if (claimCall === 1) return Promise.resolve({ data: null, error: { message: 'invite_already_used' } });
                return Promise.resolve({ data: 'member-new-reinvite', error: null });
            }
            if (name === 'release_staff_email_for_reinvite') {
                return Promise.resolve({ data: true, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult: any;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'recepcao@example.com',
                password: 'Password123!',
                fullName: 'Recepção Moderna',
                businessName: 'Barbearia Moderna',
                userType: 'barber',
                region: 'BR',
                phone: '',
                companyId: 'owner-123',
                teamMemberId: 'member-new-reinvite',
            });
        });

        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'recepcao@example.com',
            password: 'Password123!',
        });
        expect(supabase.rpc).toHaveBeenCalledWith('release_staff_email_for_reinvite', {
            p_company_id: 'owner-123',
            p_member_id: 'member-new-reinvite',
            p_email: 'recepcao@example.com',
        });
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
        expect(registerResult.error).toBeNull();
    });

    it('se o Auth órfão ainda existe, entra com a senha e vincula o member_id novo', async () => {
        const mockUser = { id: '78052ac0-f285-4419-9434-bfcf52f35cae', email: 'e2e.bob.colab.reinvite.20260918@gmail.com' };
        const newMemberId = 'dff1d15d-8595-432d-b1e3-de3fdc467764';

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: null },
            error: { code: 'user_already_exists', message: 'User already registered' },
        });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        (supabase.rpc as any).mockImplementation((name: string, args?: { p_member_id?: string }) => {
            if (name === 'complete_staff_invite') {
                return Promise.resolve({ data: args?.p_member_id ?? newMemberId, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'e2e.bob.colab.reinvite.20260918@gmail.com',
                password: 'Password123!',
                fullName: 'E2E Bob Colab 2',
                businessName: 'DEMO · Barbearia Corte Fino',
                userType: 'barber',
                region: 'BR',
                phone: '',
                companyId: '7baee43b-a3b0-4d96-b566-62bc88224f5c',
                teamMemberId: newMemberId,
                birthDate: '1990-01-01',
            });
        });

        expect(registerResult.error).toBeNull();
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'e2e.bob.colab.reinvite.20260918@gmail.com',
            password: 'Password123!',
        });
        expect(supabase.rpc).toHaveBeenCalledWith('complete_staff_invite', {
            p_company_id: '7baee43b-a3b0-4d96-b566-62bc88224f5c',
            p_member_id: newMemberId,
            p_birth_date: '1990-01-01',
        });
        expect(supabase.rpc).not.toHaveBeenCalledWith(
            'release_staff_email_for_reinvite',
            expect.anything(),
        );
        expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
        expect(result.current.role).toBe('staff');
        expect(result.current.teamMemberId).toBe(newMemberId);
    });

    it('após purge do Auth, o mesmo e-mail cadastra no member_id novo e não no excluído', async () => {
        const mockUser = { id: 'staff-reinvite', email: 'e2e.colab@example.com' };
        const deletedMemberId = '11111111-1111-4111-8111-111111111111';
        const newMemberId = '33333333-3333-4333-8333-333333333333';

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        (supabase.rpc as any).mockImplementation((name: string, args?: { p_member_id?: string }) => {
            if (name === 'complete_staff_invite') {
                return Promise.resolve({ data: args?.p_member_id ?? newMemberId, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'e2e.colab@example.com',
                password: 'Password123!',
                fullName: 'E2E Bob Colab',
                businessName: 'DEMO Barbearia',
                userType: 'barber',
                region: 'BR',
                phone: '',
                companyId: 'owner-123',
                teamMemberId: newMemberId,
                birthDate: '1993-06-06',
            });
        });

        expect(registerResult.error).toBeNull();
        expect(supabase.rpc).not.toHaveBeenCalledWith(
            'release_staff_email_for_reinvite',
            expect.anything(),
        );
        expect(supabase.rpc).toHaveBeenCalledWith('complete_staff_invite', {
            p_company_id: 'owner-123',
            p_member_id: newMemberId,
            p_birth_date: '1993-06-06',
        });
        expect(supabase.rpc).not.toHaveBeenCalledWith(
            'complete_staff_invite',
            expect.objectContaining({ p_member_id: deletedMemberId }),
        );
        expect(result.current.role).toBe('staff');
        expect(result.current.teamMemberId).toBe(newMemberId);
    });

    it('envia role staff e company_id no metadata do signUp do convite', async () => {
        const mockUser = { id: 'staff-meta', email: 'meta@example.com' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        (supabase.rpc as any).mockResolvedValue({ data: 'member-1', error: null });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.register({
                email: 'meta@example.com',
                password: 'Password123!',
                fullName: 'Recepção Moderna',
                businessName: 'Moderna',
                userType: 'barber',
                region: 'BR',
                phone: '',
                companyId: 'owner-123',
                teamMemberId: 'member-1',
                birthDate: '1993-06-06',
            });
        });

        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: 'meta@example.com',
            password: 'Password123!',
            options: {
                data: expect.objectContaining({
                    full_name: 'Recepção Moderna',
                    role: 'staff',
                    company_id: 'owner-123',
                    member_id: 'member-1',
                    type: 'barber',
                }),
            },
        });
        expect(supabase.rpc).toHaveBeenCalledWith('complete_staff_invite', {
            p_company_id: 'owner-123',
            p_member_id: 'member-1',
            p_birth_date: '1993-06-06',
        });
    });

    it('religa colaborador sem team_member via relink_staff_if_unbound', async () => {
        const mockUser = { id: 'staff-orphan', email: 'orphan@example.com' };
        const mockSession = { user: mockUser };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation((table: string) => {
            const query: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                single: vi.fn().mockImplementation(() => {
                    if (table === 'profiles' && query.eq.mock.calls.some((call: unknown[]) => call[1] === 'owner-123')) {
                        return Promise.resolve({
                            data: {
                                subscription_status: 'active',
                                trial_ends_at: null,
                                user_type: 'barber',
                                business_name: 'Moderna',
                                region: 'BR',
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
                            tutorial_completed: true,
                            full_name: 'Recepção Moderna',
                        },
                        error: null,
                    });
                }),
            };
            return query;
        });
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'relink_staff_if_unbound') {
                return Promise.resolve({ data: 'relinked-member', error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(supabase.rpc).toHaveBeenCalledWith('relink_staff_if_unbound');
        expect(result.current.role).toBe('staff');
        expect(result.current.teamMemberId).toBe('relinked-member');
    });
});
