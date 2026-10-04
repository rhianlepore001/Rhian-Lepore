import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

type AuthState = { user: { id: string } | null; role: 'owner' | 'staff'; companyId: string | null; loading: boolean };
let auth: AuthState;

const rpc = vi.fn(async () => ({ data: [{ total_due: 10, is_owner: false }], error: null }));
const chain = (): any => {
    const c: any = {};
    ['select', 'eq', 'in', 'lt', 'order', 'update'].forEach((m) => { c[m] = vi.fn(() => c); });
    c.single = vi.fn(async () => ({ data: { commission_settlement_day_of_month: new Date().getDate() }, error: null }));
    c.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    c.then = (res: any) => Promise.resolve({ data: [], error: null }).then(res);
    return c;
};
const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };

vi.mock('@/lib/supabase', () => ({
    supabase: { rpc: (...a: unknown[]) => rpc(...(a as [])), from: vi.fn(() => chain()), channel: vi.fn(() => channel), removeChannel: vi.fn() },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useTenantLocale', () => ({ useTenantLocale: () => ({ formatMoney: (n: number) => `€${n}` }) }));

import { AlertsProvider } from '@/contexts/AlertsContext';

const mount = () => render(<AlertsProvider><div /></AlertsProvider>);
const flush = () => new Promise((r) => setTimeout(r, 20));

describe('AlertsContext — comissões da equipe só para o dono (P-SEC)', () => {
    beforeEach(() => { rpc.mockClear(); });

    it('dono com perfil carregado consulta get_commissions_due', async () => {
        auth = { user: { id: 'owner-1' }, role: 'owner', companyId: 'owner-1', loading: false };
        mount();
        await waitFor(() => expect(rpc).toHaveBeenCalledWith('get_commissions_due'));
    });

    it('colaborador nunca consulta get_commissions_due', async () => {
        auth = { user: { id: 'staff-1' }, role: 'staff', companyId: 'owner-1', loading: false };
        mount();
        await flush();
        expect(rpc).not.toHaveBeenCalledWith('get_commissions_due');
    });

    it('não consulta antes de o perfil resolver o papel (login de colaborador começa com role=owner)', async () => {
        auth = { user: { id: 'staff-1' }, role: 'owner', companyId: null, loading: false };
        mount();
        await flush();
        expect(rpc).not.toHaveBeenCalledWith('get_commissions_due');
    });

    it('não consulta enquanto a autenticação carrega', async () => {
        auth = { user: { id: 'staff-1' }, role: 'owner', companyId: 'owner-1', loading: true };
        mount();
        await flush();
        expect(rpc).not.toHaveBeenCalledWith('get_commissions_due');
    });
});
