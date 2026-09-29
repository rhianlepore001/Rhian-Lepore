import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

const STAFF = { id: 'staff-orphan', email: 'orphan@example.com' };
const staffProfile = {
    id: STAFF.id, role: 'staff', company_id: 'owner-123', user_type: 'barber', region: 'PT',
    tutorial_completed: true, full_name: 'Caique',
};

type Opts = { member?: { id: string } | null; memberError?: any; ownerReadable?: boolean; memberSequence?: Array<{ id: string } | null> };
const teamQueries: any[] = [];

function mockTables({ member = null, memberError = null, ownerReadable = false, memberSequence }: Opts) {
    teamQueries.length = 0;
    let memberCall = 0;
    (supabase.from as any).mockImplementation((table: string) => {
        const query: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockImplementation(() => {
                const data = memberSequence ? (memberSequence[Math.min(memberCall, memberSequence.length - 1)] ?? null) : member;
                memberCall += 1;
                return Promise.resolve({ data, error: memberError });
            }),
            single: vi.fn().mockImplementation(() => {
                const isOwnerLookup = query.eq.mock.calls.some((c: unknown[]) => c[1] === 'owner-123');
                if (table === 'profiles' && isOwnerLookup) {
                    // Depois da migration o órfão não lê o perfil do dono
                    return Promise.resolve(ownerReadable
                        ? { data: { subscription_status: 'active', user_type: 'barber', business_name: 'Moderna', region: 'PT' }, error: null }
                        : { data: null, error: { code: 'PGRST116' } });
                }
                return Promise.resolve({ data: staffProfile, error: null });
            }),
        };
        if (table === 'team_members') teamQueries.push(query);
        return query;
    });
}

describe('AuthContext: colaborador sem vínculo vivo (S-06, E2.3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { user: STAFF } }, error: null });
        (supabase.auth.signOut as any).mockResolvedValue({ error: null });
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'get_company_for_invite') {
                return Promise.resolve({ data: [{ user_type: 'barber', business_name: 'Moderna Barbearia' }], error: null });
            }
            return Promise.resolve({ data: null, error: null }); // relink sem resultado
        });
    });

    it('busca o vínculo ignorando cadastros excluídos (deleted_at IS NULL)', async () => {
        mockTables({ member: { id: 'tm-1' } });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(teamQueries[0].is).toHaveBeenCalledWith('deleted_at', null);
        expect(result.current.accessRemoved).toBeNull();
        expect(result.current.teamMemberId).toBe('tm-1');
    });

    it('órfão (sem vínculo, relink sem resultado): tela "acesso removido" com o nome da empresa e sai da conta', async () => {
        mockTables({ member: null });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.accessRemoved).not.toBeNull(), { timeout: 4000 });
        expect(supabase.rpc).toHaveBeenCalledWith('relink_staff_if_unbound');
        // Reconfere o vínculo uma vez antes de decidir
        expect(teamQueries.length).toBe(2);
        expect(supabase.rpc).toHaveBeenCalledWith('get_company_for_invite', { p_company_id: 'owner-123' });
        expect(result.current.accessRemoved).toEqual({ companyName: 'Moderna Barbearia' });
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(result.current.teamMemberId).toBeNull();
    });

    it('erro de rede ao buscar o vínculo NÃO mostra "acesso removido" nem desloga', async () => {
        mockTables({ member: null, memberError: { message: 'Failed to fetch' } });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.accessRemoved).toBeNull();
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });

    it('dismissAccessRemoved limpa o estado (volta para o login)', async () => {
        mockTables({ member: null });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.accessRemoved).not.toBeNull(), { timeout: 4000 });
        act(() => result.current.dismissAccessRemoved());
        expect(result.current.accessRemoved).toBeNull();
    });

    it('erro no relink_staff_if_unbound NÃO mostra "acesso removido" nem desloga', async () => {
        mockTables({ member: null });
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'relink_staff_if_unbound') return Promise.resolve({ data: null, error: { message: 'timeout', code: '57014' } });
            return Promise.resolve({ data: null, error: null });
        });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(supabase.rpc).toHaveBeenCalledWith('relink_staff_if_unbound');
        expect(result.current.accessRemoved).toBeNull();
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
        expect(result.current.teamMemberId).toBeNull();
    });

    it('sem vínculo na 1ª consulta e com vínculo na 2ª: reconfere uma vez e NÃO desloga', async () => {
        mockTables({ memberSequence: [null, { id: 'tm-9' }] });
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.teamMemberId).toBe('tm-9'), { timeout: 4000 });
        expect(result.current.accessRemoved).toBeNull();
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });

    it('cadastro pelo convite em andamento: o perfil carregado antes do vínculo NÃO desloga o novo colaborador', async () => {
        mockTables({ member: null });
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        let authCallback: ((event: string, session: unknown) => void) | null = null;
        (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
            authCallback = cb;
            return { data: { subscription: { unsubscribe: vi.fn() } } };
        });
        const newSession = { user: { ...STAFF, email: 'novo@example.com' } };
        (supabase.auth.signUp as any).mockImplementation(async () => {
            // O Auth dispara SIGNED_IN antes de o app gravar o vínculo do convite
            authCallback?.('SIGNED_IN', newSession);
            await new Promise((r) => setTimeout(r, 80));
            return { data: { user: { id: STAFF.id, identities: [{ id: 'i1' }] }, session: newSession }, error: null };
        });
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'complete_staff_invite') return Promise.resolve({ data: 'tm-new', error: null });
            if (name === 'get_company_for_invite') return Promise.resolve({ data: [{ business_name: 'Moderna Barbearia' }], error: null });
            return Promise.resolve({ data: null, error: null });
        });

        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        let res: any;
        await act(async () => {
            res = await result.current.register({
                email: 'novo@example.com', password: 'Senha#2026', fullName: 'Novo', businessName: '',
                userType: 'barber', region: 'PT', phone: '', companyId: 'owner-123', teamMemberId: 'tm-new',
            });
        });
        expect(res.error).toBeNull();
        expect(supabase.rpc).toHaveBeenCalledWith('relink_staff_if_unbound'); // o perfil foi carregado no meio do cadastro
        expect(result.current.accessRemoved).toBeNull();
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
        expect(result.current.teamMemberId).toBe('tm-new');
    });
});
