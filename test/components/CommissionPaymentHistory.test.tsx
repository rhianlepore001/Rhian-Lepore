import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

type Call = { table: string; select?: string; filters: [string, string, unknown][]; limit?: number };
const calls: Call[] = [];
let tableData: Record<string, { data: unknown; error: unknown }> = {};

function query(table: string) {
    const call: Call = { table, filters: [] };
    calls.push(call);
    const result = () => Promise.resolve(tableData[table] ?? { data: [], error: null });
    const q: any = {
        select: (s: string) => { call.select = s; return q; },
        not: (col: string, op: string, val: unknown) => { call.filters.push(['not', `${col}.${op}`, val]); return q; },
        order: () => q,
        limit: (n: number) => { call.limit = n; return q; },
        then: (res: any, rej: any) => result().then(res, rej),
    };
    for (const op of ['eq', 'in', 'gte', 'lte', 'lt', 'gt']) {
        q[op] = (col: string, val: unknown) => { call.filters.push([op, col, val]); return q; };
    }
    return q;
}

vi.mock('../../lib/supabase', () => ({
    supabase: { from: (t: string) => query(t) },
}));
const AUTH = { user: { id: 'owner-1' }, region: 'BR', userType: 'barber', businessName: 'Studio Atlas' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('../../components/CommissionDetailReport', () => ({
    CommissionDetailReport: (p: { mode?: string; paidAt?: string; periodStart: string; periodEnd: string }) => (
        <div data-testid="paid-report">{p.mode} {p.paidAt} {p.periodStart} {p.periodEnd}</div>
    ),
}));

import { CommissionPaymentHistory } from '../../components/CommissionPaymentHistory';

const morning = '2026-09-10T09:15:00.000Z';
const afternoon = '2026-09-10T18:40:00.000Z';

const mount = () => render(
    <CommissionPaymentHistory
        professionalId="ana"
        professionalName="Ana Souza"
        onClose={() => undefined}
        accentColor="accent-gold"
        currencySymbol="R$"
        commissionRate={40}
    />,
);

describe('CommissionPaymentHistory', () => {
    beforeEach(() => {
        calls.length = 0;
        tableData = {
            finance_records: {
                data: [
                    { commission_paid_at: morning, created_at: '2026-08-10T12:00:00.000Z', commission_value: 40 },
                    { commission_paid_at: morning, created_at: '2026-08-12T12:00:00.000Z', commission_value: 20 },
                    { commission_paid_at: afternoon, created_at: '2026-09-08T12:00:00.000Z', commission_value: 80 },
                ],
                error: null,
            },
            commission_payments: {
                data: [
                    { paid_at: morning, start_date: '2026-08-06', end_date: '2026-09-05' },
                    { paid_at: afternoon, start_date: '2026-09-06', end_date: '2026-09-10' },
                ],
                error: null,
            },
        };
    });

    it('dois pagamentos no mesmo dia viram 2 cards com Ver relatório', async () => {
        mount();
        const cards = await screen.findAllByTestId('payment-history-card');
        expect(cards).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'Ver relatório' })).toHaveLength(2);
        expect(screen.queryByText(/Nenhum pagamento/i)).toBeNull();
    });

    it('Ver relatório abre o modo pago com o timestamp daquele card', async () => {
        mount();
        const buttons = await screen.findAllByRole('button', { name: 'Ver relatório' });
        fireEvent.click(buttons[0]);
        const report = await screen.findByTestId('paid-report');
        expect(report).toHaveTextContent('paid');
        expect(report).toHaveTextContent(afternoon);
        expect(report).toHaveTextContent('2026-09-06');
        expect(report).toHaveTextContent('2026-09-10');
    });
});
