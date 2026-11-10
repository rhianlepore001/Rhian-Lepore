import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

type Call = { table: string; select?: string; filters: [string, string, unknown][] };
const calls: Call[] = [];

function query(table: string) {
    const call: Call = { table, filters: [] };
    calls.push(call);
    const result = () => Promise.resolve({ data: [], error: null });
    const q: any = {
        select: (s: string) => { call.select = s; return q; },
        update: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: result,
        single: result,
        then: (res: any, rej: any) => result().then(res, rej),
    };
    for (const op of ['eq', 'in', 'gte', 'lte', 'lt', 'gt', 'or']) {
        q[op] = (col: string, val: unknown) => { call.filters.push([op, col, val]); return q; };
    }
    return q;
}

vi.mock('../../lib/supabase', () => ({ supabase: { from: (t: string) => query(t), rpc: vi.fn() } }));
const AUTH = { user: { id: 'owner-1' }, role: 'owner', region: 'BR', userType: 'barber' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));

import { ProfessionalCommissionDetails } from '../../components/ProfessionalCommissionDetails';
import { ToastProvider } from '../../components/ui';

describe('Detalhe de comissão: período pela data de conclusão', () => {
    it('busca atendimentos concluídos pela data de conclusão (fallback legado), não pela data marcada', async () => {
        render(
            <ToastProvider>
                <ProfessionalCommissionDetails
                    professionalId="pro-1"
                    professionalName="Ana"
                    commissionRate={40}
                    onClose={() => {}}
                    accentColor="text-accent-gold"
                    currencySymbol="R$"
                />
            </ToastProvider>,
        );
        await waitFor(() => expect(calls.some((c) => c.table === 'appointments')).toBe(true));
        const apt = calls.find((c) => c.table === 'appointments')!;
        expect(apt.select).toContain('completed_at');
        expect(apt.filters.some(([op, col]) => (op === 'gte' || op === 'lte') && col === 'appointment_time')).toBe(false);
        const or = apt.filters.find(([op]) => op === 'or');
        expect(or).toBeDefined();
        expect(String(or![1])).toMatch(/^and\(completed_at\.gte\.\d{4}-\d{2}-01T00:00:00,completed_at\.lte\.\d{4}-\d{2}-\d{2}T23:59:59\),and\(completed_at\.is\.null,appointment_time\.gte\./);
    });
});
