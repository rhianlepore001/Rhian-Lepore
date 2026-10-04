import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
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

const mount = () => render(<AlertsProvider><div /></AlertsProvider>);
const flush = () => new Promise((r) => setTimeout(r, 20));

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
