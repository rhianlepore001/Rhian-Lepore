import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import React from 'react';

type AuthState = { user: { id: string } | null; role: 'owner' | 'staff'; companyId: string | null; loading: boolean };
let auth: AuthState;

const rpc = vi.fn(async () => ({ data: { inserted: 0 }, error: null }));
const chain = (): any => {
    const c: any = {};
    ['select', 'eq', 'in', 'lt', 'order', 'update', 'limit'].forEach((m) => { c[m] = vi.fn(() => c); });
    c.single = vi.fn(async () => ({ data: null, error: null }));
    c.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    c.then = (res: any) => Promise.resolve({ data: [], error: null }).then(res);
    return c;
};
const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };

vi.mock('@/lib/supabase', () => ({
    supabase: { rpc: (...a: unknown[]) => rpc(...(a as [])), from: vi.fn(() => chain()), channel: vi.fn(() => channel), removeChannel: vi.fn() },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import { AlertsProvider } from '@/contexts/AlertsContext';
import { supabase } from '@/lib/supabase';

const mount = () => render(<AlertsProvider><div /></AlertsProvider>);
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });

describe('AlertsContext — lembretes de comissão no servidor', () => {
    beforeEach(() => { rpc.mockClear(); });

    it('dono com perfil carregado gera lembretes no servidor', async () => {
        auth = { user: { id: 'owner-1' }, role: 'owner', companyId: 'owner-1', loading: false };
        mount();
        await waitFor(() => expect(rpc).toHaveBeenCalledWith('generate_commission_reminders_v1'));
    });

    it('colaborador nunca gera lembretes de comissão', async () => {
        auth = { user: { id: 'staff-1' }, role: 'staff', companyId: 'owner-1', loading: false };
        mount();
        await flush();
        expect(rpc).not.toHaveBeenCalledWith('generate_commission_reminders_v1');
    });

    it('não consulta antes de o perfil resolver o papel (login de colaborador começa com role=owner)', async () => {
        auth = { user: { id: 'staff-1' }, role: 'owner', companyId: null, loading: false };
        mount();
        await flush();
        expect(rpc).not.toHaveBeenCalledWith('generate_commission_reminders_v1');
    });

    it('não consulta enquanto a autenticação carrega', async () => {
        auth = { user: { id: 'staff-1' }, role: 'owner', companyId: 'owner-1', loading: true };
        mount();
        await flush();
        expect(rpc).not.toHaveBeenCalledWith('generate_commission_reminders_v1');
    });
});

describe('AlertsContext — canais somente com sessão e empresa prontas', () => {
    const blockedStates: [string, AuthState][] = [
        ['visitante sem sessão', { user: null, role: 'owner', companyId: null, loading: false }],
        ['autenticação carregando', { user: { id: 'owner-1' }, role: 'owner', companyId: 'owner-1', loading: true }],
        ['perfil sem empresa', { user: { id: 'owner-1' }, role: 'owner', companyId: null, loading: false }],
    ];

    it.each(blockedStates)('%s não abre canais externos', async (_label, state) => {
        auth = state;
        mount();
        await flush();
        expect(supabase.channel).not.toHaveBeenCalled();
        expect(channel.subscribe).not.toHaveBeenCalled();
    });

    it('mantém os três canais filtrados para o usuário autenticado', async () => {
        auth = { user: { id: 'owner-1' }, role: 'owner', companyId: 'owner-1', loading: false };
        mount();
        await flush();
        expect(supabase.channel).toHaveBeenCalledTimes(3);
        expect(supabase.channel).toHaveBeenCalledWith('public_bookings_alerts');
        expect(supabase.channel).toHaveBeenCalledWith('public_bookings_updates');
        expect(supabase.channel).toHaveBeenCalledWith('notifications_bell');
        expect(channel.subscribe).toHaveBeenCalledTimes(3);
        expect(channel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ filter: 'business_id=eq.owner-1' }), expect.any(Function));
        expect(channel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ filter: 'user_id=eq.owner-1' }), expect.any(Function));
    });

    it('remove os três canais ao sair e não reabre canais para o visitante', async () => {
        auth = { user: { id: 'owner-1' }, role: 'owner', companyId: 'owner-1', loading: false };
        const { rerender } = mount();
        await flush();
        expect(supabase.channel).toHaveBeenCalledTimes(3);
        auth = { user: null, role: 'owner', companyId: null, loading: false };
        rerender(<AlertsProvider><div /></AlertsProvider>);
        await flush();
        expect(supabase.removeChannel).toHaveBeenCalledTimes(3);
        expect(supabase.channel).toHaveBeenCalledTimes(3);
    });
});
