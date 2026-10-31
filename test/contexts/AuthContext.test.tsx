import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TRIAL_DAYS } from '@/constants';
import { queryClient } from '@/lib/queryClient';

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

    it('registers owner via ensure_owner_profile (sem upsert direto em profiles, que dá 42501 em prod)', async () => {
        const mockUser = { id: 'owner-new', email: 'owner@example.com', identities: [{ id: 'i1' }] };
        const profileWrites: any[] = [];

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        // Como prod: cliente não tem INSERT em profiles (REVOKE de 2026-09-18).
        const denied = { data: null, error: { code: '42501', message: 'permission denied for table profiles' } };
        (supabase.from as any).mockImplementation((table: string) => ({
            insert: vi.fn().mockImplementation((rows) => {
                if (table === 'profiles') { profileWrites.push(rows); return Promise.resolve(denied); }
                return Promise.resolve({ data: null, error: null });
            }),
            upsert: vi.fn().mockImplementation((row) => {
                if (table === 'profiles') { profileWrites.push(row); return Promise.resolve(denied); }
                return Promise.resolve({ data: null, error: null });
            }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));
        (supabase.rpc as any).mockImplementation((fn: string) => Promise.resolve(
            fn === 'ensure_owner_profile'
                ? { data: { status: 'exists', role: 'owner' }, error: null }
                : { data: null, error: null },
        ));

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
        expect(profileWrites).toEqual([]);
        expect(supabase.rpc).toHaveBeenCalledWith('ensure_owner_profile');
        expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
            options: { data: expect.objectContaining({ role: 'owner', business_name: 'Barbearia Teste', region: 'BR', type: 'barber', phone: '11999999999' }) },
        }));
        expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', {
            p_company_id: mockUser.id,
            p_current_step: 1,
            p_completed_steps: [],
            p_step_data: {},
        });
        expect(result.current.companyId).toBe(mockUser.id);
        expect(result.current.role).toBe('owner');
    });

    describe('origem do cadastro', () => {
        const mockUser = { id: 'owner-attr', email: 'o@example.com', identities: [{ id: 'i1' }] };
        const regData = { email: 'o@example.com', password: 'Password123!', fullName: 'O', businessName: 'B', userType: 'barber' as const, region: 'BR' as const, phone: '11999999999' };
        const setup = (attrRpc: () => Promise<any>) => {
            localStorage.setItem('agendix:signup-attribution:v1', JSON.stringify({ v: 1, capturedAt: Date.now(), utm_source: 'instagram', landing_path: '/register' }));
            (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
            (supabase.auth.signUp as any).mockResolvedValue({ data: { user: mockUser, session: { user: mockUser } }, error: null });
            (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }));
            (supabase.rpc as any).mockImplementation((fn: string) => {
                if (fn === 'save_signup_attribution') return attrRpc();
                return Promise.resolve(fn === 'ensure_owner_profile' ? { data: { status: 'exists', role: 'owner' }, error: null } : { data: null, error: null });
            });
        };
        beforeEach(() => localStorage.removeItem('agendix:signup-attribution:v1'));

        it('dono: salva a origem depois do perfil criado e o cadastro segue normalmente', async () => {
            setup(() => Promise.resolve({ data: 'saved', error: null }));
            const { result } = renderHook(() => useAuth(), { wrapper });
            let r: any;
            await act(async () => { r = await result.current.register(regData); });
            expect(r.error).toBeNull();
            const calls = (supabase.rpc as any).mock.calls.map((c: any[]) => c[0]);
            expect(calls.indexOf('save_signup_attribution')).toBeGreaterThan(calls.indexOf('ensure_owner_profile'));
            expect(supabase.rpc).toHaveBeenCalledWith('save_signup_attribution', expect.objectContaining({ p_utm_source: 'instagram', p_landing_path: '/register' }));
            expect(localStorage.getItem('agendix:signup-attribution:v1')).toBeNull();
        });

        it('falha ao salvar a origem (erro ou rede) não impede o cadastro', async () => {
            for (const attr of [() => Promise.resolve({ data: null, error: { message: 'x' } }), () => Promise.reject(new Error('rede'))]) {
                vi.clearAllMocks();
                setup(attr);
                const { result } = renderHook(() => useAuth(), { wrapper });
                let r: any;
                await act(async () => { r = await result.current.register(regData); });
                expect(r.error).toBeNull();
                expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', expect.anything());
            }
        });

        it('convite de equipe: não grava origem', async () => {
            setup(() => Promise.resolve({ data: 'saved', error: null }));
            (supabase.rpc as any).mockImplementation((fn: string) => Promise.resolve(fn === 'claim_team_invite' ? { data: 'company-1', error: null } : { data: null, error: null }));
            const { result } = renderHook(() => useAuth(), { wrapper });
            await act(async () => { await result.current.register({ ...regData, companyId: 'company-1', teamMemberId: 'tm-1', birthDate: '1990-01-01' }); });
            expect(supabase.rpc).not.toHaveBeenCalledWith('save_signup_attribution', expect.anything());
        });
    });

    it('cadastro de dono: erro da ensure_owner_profile volta para a tela (sem seguir para o onboarding)', async () => {
        const mockUser = { id: 'owner-err', email: 'o@example.com', identities: [{ id: 'i1' }] };
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({ data: { user: mockUser, session: { user: mockUser } }, error: null });
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));
        (supabase.rpc as any).mockImplementation((fn: string) => Promise.resolve(
            fn === 'ensure_owner_profile' ? { data: null, error: { code: '500', message: 'boom' } } : { data: null, error: null },
        ));
        const { result } = renderHook(() => useAuth(), { wrapper });
        let r: any;
        await act(async () => {
            r = await result.current.register({ email: 'o@example.com', password: 'Password123!', fullName: 'O', businessName: 'B', userType: 'barber', region: 'BR', phone: '1' });
        });
        expect(r.error).toMatchObject({ message: 'boom' });
        expect(supabase.rpc).not.toHaveBeenCalledWith('upsert_onboarding_progress', expect.anything());
    });

    it('cadastro de dono com confirmação de e-mail ligada (sem sessão): não chama a RPC (o trigger cria o perfil)', async () => {
        const mockUser = { id: 'owner-conf', email: 'c@example.com', identities: [{ id: 'i1' }] };
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({ data: { user: mockUser, session: null }, error: null });
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));
        (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await act(async () => {
            await result.current.register({ email: 'c@example.com', password: 'Password123!', fullName: 'C', businessName: 'B', userType: 'barber', region: 'BR', phone: '1' });
        });
        expect(supabase.rpc).not.toHaveBeenCalledWith('ensure_owner_profile');
    });

    it('login de dono órfão (sem profile): chama ensure_owner_profile e recarrega o perfil', async () => {
        const mockUser = { id: 'c804ea7a-orphan', email: 'lead@example.com' };
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
        let created = false;
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
                if (table === 'profiles') {
                    return Promise.resolve(created
                        ? { data: { id: mockUser.id, role: 'owner', company_id: mockUser.id, user_type: 'barber', region: 'BR', business_name: 'Oliveira cortes', full_name: 'Rafael', tutorial_completed: false, subscription_status: 'trial', trial_ends_at: null }, error: null }
                        : { data: null, error: { code: 'PGRST116', message: 'no rows' } });
                }
                if (table === 'onboarding_progress') return Promise.resolve({ data: { is_completed: true }, error: null });
                return Promise.resolve({ data: null, error: null });
            }),
        }));
        (supabase.rpc as any).mockImplementation((fn: string) => {
            if (fn === 'ensure_owner_profile') { created = true; return Promise.resolve({ data: { status: 'created', role: 'owner' }, error: null }); }
            return Promise.resolve({ data: null, error: null });
        });

        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(supabase.rpc).toHaveBeenCalledWith('ensure_owner_profile');
        expect(result.current.businessName).toBe('Oliveira cortes');
        expect(result.current.companyId).toBe(mockUser.id);
        expect(result.current.role).toBe('owner');
        expect(result.current.tutorialCompleted).toBe(true);
    });

    it('login sem profile e RPC devolve skipped_staff (convite): não insiste nem vira dono', async () => {
        const mockUser = { id: 'staff-orphan', email: 's@example.com' };
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
        }));
        (supabase.rpc as any).mockImplementation((fn: string) => Promise.resolve(
            fn === 'ensure_owner_profile' ? { data: { status: 'skipped_staff' }, error: null } : { data: null, error: null },
        ));
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect((supabase.rpc as any).mock.calls.filter((c: any[]) => c[0] === 'ensure_owner_profile')).toHaveLength(1);
        expect(result.current.companyId).toBeNull();
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

    // Monta um supabase.from() de dono já concluindo o onboarding. profileRows = linhas devolvidas pelo UPDATE do perfil.
    const mountOwnerCompleting = async (opts: {
        profileRows: Array<unknown[]>; // uma resposta por chamada de UPDATE em profiles
        businessSettingsError?: { message: string } | null;
        ensureError?: { message: string } | null;
    }) => {
        const mockUser = { id: 'owner-complete', email: 'owner@example.com' };
        const upsertOnboarding = vi.fn().mockResolvedValue({ data: null, error: null });
        const profileUpdates: unknown[] = [];
        let call = 0;
        const updateProfile = vi.fn().mockImplementation((payload: unknown) => {
            profileUpdates.push(payload);
            return {
                eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockImplementation(() => {
                        const rows = opts.profileRows[Math.min(call++, opts.profileRows.length - 1)];
                        return Promise.resolve({ data: rows, error: null });
                    }),
                }),
            };
        });
        const bsEq = vi.fn().mockResolvedValue({ data: null, error: opts.businessSettingsError ?? null });
        const updateBusinessSettings = vi.fn().mockReturnValue({ eq: bsEq });
        (supabase.rpc as any).mockImplementation((fn: string) => {
            if (fn === 'ensure_owner_profile') return Promise.resolve({ data: { status: 'created' }, error: opts.ensureError ?? null });
            return Promise.resolve({ data: null, error: null });
        });
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: table === 'profiles' ? updateProfile : table === 'business_settings' ? updateBusinessSettings : vi.fn().mockReturnThis(),
            upsert: table === 'onboarding_progress' ? upsertOnboarding : vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({
                data: table === 'profiles'
                    ? { id: mockUser.id, role: 'owner', company_id: mockUser.id, user_type: 'barber', region: 'BR', tutorial_completed: false }
                    : { is_completed: false },
                error: null,
            }),
        }));
        const hook = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        return { ...hook, mockUser, upsertOnboarding, updateProfile, updateBusinessSettings, bsEq, profileUpdates };
    };

    it('marks owner onboarding as completed in onboarding_progress (e grava o perfil e o sinalizador legado)', async () => {
        const t = await mountOwnerCompleting({ profileRows: [[{ id: 'owner-complete' }]] });
        let res: any;
        await act(async () => { res = await t.result.current.markTutorialCompleted(); });

        expect(res.error).toBeNull();
        expect(t.upsertOnboarding).toHaveBeenCalledWith(
            expect.objectContaining({ company_id: t.mockUser.id, current_step: 5, completed_steps: [1, 2, 3, 4, 5], is_completed: true }),
            { onConflict: 'company_id' }
        );
        expect(t.updateProfile).toHaveBeenCalledWith({ tutorial_completed: true });
        // business_settings.onboarding_completed passa a ser gravado ao concluir (antes ficava false para todos)
        expect(t.updateBusinessSettings).toHaveBeenCalledWith({ onboarding_completed: true, onboarding_step: 5 });
        expect(t.bsEq).toHaveBeenCalledWith('user_id', t.mockUser.id);
        expect(t.result.current.tutorialCompleted).toBe(true);
    });

    it('perfil ausente (0 linhas no UPDATE): recria via ensure_owner_profile e grava de novo, em vez de "concluir" sem salvar', async () => {
        const t = await mountOwnerCompleting({ profileRows: [[], [{ id: 'owner-complete' }]] });
        let res: any;
        await act(async () => { res = await t.result.current.markTutorialCompleted(); });

        expect(supabase.rpc).toHaveBeenCalledWith('ensure_owner_profile');
        expect(t.profileUpdates).toHaveLength(2);
        expect(res.error).toBeNull();
        expect(t.result.current.tutorialCompleted).toBe(true);
    });

    it('perfil continua ausente após ensure_owner_profile: devolve erro e NÃO marca como concluído (sem falso positivo)', async () => {
        const t = await mountOwnerCompleting({ profileRows: [[]] });
        let res: any;
        await act(async () => { res = await t.result.current.markTutorialCompleted(); });

        expect(res.error).toBeTruthy();
        expect(t.result.current.tutorialCompleted).toBe(false);
    });

    it('falha ao gravar o sinalizador legado de business_settings não impede concluir o onboarding', async () => {
        const t = await mountOwnerCompleting({ profileRows: [[{ id: 'owner-complete' }]], businessSettingsError: { message: 'boom' } });
        let res: any;
        await act(async () => { res = await t.result.current.markTutorialCompleted(); });

        expect(res.error).toBeNull();
        expect(t.result.current.tutorialCompleted).toBe(true);
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

        queryClient.setQueryData(['clients', 'user-123', 'agenda-options'], [{ id: 'c1' }]);
        // 2. Executar logout
        await act(async () => {
            await result.current.logout();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(queryClient.getQueryData(['clients', 'user-123', 'agenda-options'])).toBeUndefined();
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
        // Código explícito: a tela não pode mais cair em "#unknown" (caso Tales, 24/09).
        expect(registerResult.error.code).toBe('invite_email_wrong_password');
        expect(registerResult.error.message).toMatch(/já tem uma conta/);
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
        const releaseCallIndex = (supabase.rpc as any).mock.calls.findIndex(
            (call: unknown[]) => call[0] === 'release_staff_email_for_reinvite',
        );
        const releaseOrder = (supabase.rpc as any).mock.invocationCallOrder[releaseCallIndex];
        const signOutOrder = (supabase.auth.signOut as any).mock.invocationCallOrder[0];
        expect(releaseOrder).toBeLessThan(signOutOrder);
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
        expect(registerResult.error).toBeNull();
    });

    it('dirty path não tenta signUp de novo se o release do órfão falhar', async () => {
        const mockUser = { id: 'staff-retry', email: 'recepcao@example.com' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: null },
            error: { code: 'user_already_exists', message: 'User already registered' },
        });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        (supabase.auth.signOut as any).mockResolvedValue({ error: null });
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'complete_staff_invite') {
                return Promise.resolve({ data: null, error: { message: 'invite_already_used' } });
            }
            if (name === 'release_staff_email_for_reinvite') {
                return Promise.resolve({ data: false, error: null });
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

        expect(supabase.rpc).toHaveBeenCalledWith('release_staff_email_for_reinvite', {
            p_company_id: 'owner-123',
            p_member_id: 'member-new-reinvite',
            p_email: 'recepcao@example.com',
        });
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
        expect(registerResult.error).toBeTruthy();
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

    it.each([
        ['session_missing', { message: 'not_authenticated' }],
        ['unknown', { message: 'something unexpected' }],
    ])('retry com sessão do mesmo e-mail e vínculo %s: sai da sessão e segue para signUp (sem loop)', async (_label, claimFailure) => {
        const mockUser = { id: 'staff-stale', email: 'stale@example.com' };
        const memberId = 'member-stale-1';

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));

        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Sessão local (obsoleta) do mesmo e-mail só no momento do cadastro.
        (supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: { user: mockUser } }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: null },
            error: { code: 'user_already_exists', message: 'User already registered' },
        });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({
            data: { user: mockUser, session: { user: mockUser } },
            error: null,
        });
        let claimCall = 0;
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'complete_staff_invite') {
                claimCall += 1;
                if (claimCall === 1) return Promise.resolve({ data: null, error: claimFailure });
                return Promise.resolve({ data: memberId, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });

        let registerResult: any;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'Stale@example.com',
                password: 'Password123!',
                fullName: 'Colab Stale',
                businessName: 'Barbearia Stale',
                userType: 'barber',
                region: 'BR',
                phone: '',
                companyId: 'owner-stale',
                teamMemberId: memberId,
                birthDate: '1990-01-01',
            });
        });

        expect(registerResult.error).toBeNull();
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
        const signOutOrder = (supabase.auth.signOut as any).mock.invocationCallOrder[0];
        const signUpOrder = (supabase.auth.signUp as any).mock.invocationCallOrder[0];
        expect(signOutOrder).toBeLessThan(signUpOrder);
        expect(claimCall).toBe(2);
        expect(result.current.role).toBe('staff');
        expect(result.current.teamMemberId).toBe(memberId);
    });

    it('retry com sessão do mesmo e-mail e convite já usado: mantém o erro, sem signUp', async () => {
        const mockUser = { id: 'staff-used', email: 'used@example.com' };
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        (supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: { user: mockUser } }, error: null });
        (supabase.rpc as any).mockImplementation((name: string) => (
            name === 'complete_staff_invite'
                ? Promise.resolve({ data: null, error: { message: 'invite_already_used' } })
                : Promise.resolve({ data: null, error: null })
        ));

        let registerResult: any;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'used@example.com',
                password: 'Password123!',
                fullName: 'Colab Used',
                businessName: 'Barbearia Used',
                userType: 'barber',
                region: 'BR',
                phone: '',
                companyId: 'owner-used',
                teamMemberId: 'member-used',
                birthDate: '1990-01-01',
            });
        });

        expect(registerResult.error).toEqual({ message: 'invite_already_used' });
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
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

    it('e-mail existente com confirmação ligada (user sem identities) vira user_already_exists, sem criar perfil', async () => {
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: { id: 'fake-obfuscated', identities: [] }, session: null },
            error: null,
        });
        const upsert = vi.fn();
        (supabase.from as any).mockReturnValue({ upsert, select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) });

        const { result } = renderHook(() => useAuth(), { wrapper });

        let registerResult: any;
        await act(async () => {
            registerResult = await result.current.register({
                email: 'dono@example.com',
                password: 'Password123!',
                fullName: 'Dono',
                businessName: 'Barbearia',
                userType: 'barber',
                region: 'BR',
                phone: '11988888888',
            });
        });

        expect(registerResult.error).toMatchObject({ code: 'user_already_exists' });
        expect(upsert).not.toHaveBeenCalled();
    });
});
