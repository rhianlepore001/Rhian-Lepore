/**
 * Convite com token (invite hardening) no AuthContext.register: o token vai na
 * metadata do signUp, no complete_staff_invite e no release do e-mail; sem
 * token o convite é recusado antes de criar conta.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const TOKEN = 'd'.repeat(64);
const base = {
    email: 'recepcao@example.com', password: 'Password123!', fullName: 'Recepção', businessName: 'Moderna',
    userType: 'barber' as const, region: 'BR' as const, phone: '', companyId: 'owner-123', teamMemberId: 'member-1',
};

describe('AuthContext.register: token do convite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
        (supabase.auth.signOut as any).mockResolvedValue({ error: null });
    });

    it('sem token: recusa o convite sem criar conta', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });
        let r: any;
        await act(async () => { r = await result.current.register({ ...base }); });
        expect(r.error.code).toBe('invalid_invite');
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
        expect(supabase.rpc).not.toHaveBeenCalledWith('complete_staff_invite', expect.anything());
    });

    it('metadata do signUp e o vínculo levam o token', async () => {
        const user = { id: 'staff-1', email: base.email };
        (supabase.auth.signUp as any).mockResolvedValue({ data: { user, session: { user } }, error: null });
        (supabase.rpc as any).mockResolvedValue({ data: 'member-1', error: null });
        const { result } = renderHook(() => useAuth(), { wrapper });
        let r: any;
        await act(async () => { r = await result.current.register({ ...base, inviteToken: TOKEN }); });
        expect(r.error).toBeNull();
        expect((supabase.auth.signUp as any).mock.calls[0][0].options.data).toMatchObject({
            role: 'staff', company_id: 'owner-123', member_id: 'member-1', invite_token: TOKEN,
        });
        expect(supabase.rpc).toHaveBeenCalledWith('complete_staff_invite', {
            p_company_id: 'owner-123', p_member_id: 'member-1', p_birth_date: null, p_invite_token: TOKEN,
        });
    });

    it('release do e-mail (conta antiga) leva o token', async () => {
        const user = { id: 'staff-old', email: base.email };
        (supabase.auth.signUp as any)
            .mockResolvedValueOnce({ data: { user: null }, error: { code: 'user_already_exists', message: 'User already registered' } })
            .mockResolvedValueOnce({ data: { user, session: { user } }, error: null });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: { user, session: { user } }, error: null });
        let claims = 0;
        (supabase.rpc as any).mockImplementation((name: string) => {
            if (name === 'complete_staff_invite') {
                claims += 1;
                return Promise.resolve(claims === 1 ? { data: null, error: { message: 'invite_already_used' } } : { data: 'member-1', error: null });
            }
            if (name === 'release_staff_email_for_reinvite') return Promise.resolve({ data: true, error: null });
            return Promise.resolve({ data: null, error: null });
        });
        const { result } = renderHook(() => useAuth(), { wrapper });
        let r: any;
        await act(async () => { r = await result.current.register({ ...base, inviteToken: TOKEN }); });
        expect(r.error).toBeNull();
        expect(supabase.rpc).toHaveBeenCalledWith('release_staff_email_for_reinvite', {
            p_company_id: 'owner-123', p_member_id: 'member-1', p_email: base.email, p_invite_token: TOKEN,
        });
    });
});
