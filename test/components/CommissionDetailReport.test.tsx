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
const AUTH = { user: { id: 'owner-1' }, region: 'PT', userType: 'beauty', businessName: 'Studio Atlas' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));

import { CommissionDetailReport } from '../../components/CommissionDetailReport';

const mount = (over: Partial<React.ComponentProps<typeof CommissionDetailReport>> = {}) => render(
    <CommissionDetailReport
        professionalId="ana"
        professionalName="Ana Souza"
        commissionRate={40}
        periodStart="2026-08-06"
        periodEnd="2026-09-05"
        periodLabel="06/08 – 05/09"
        currencySymbol="R$"
        accentColor="accent-gold"
        onClose={() => undefined}
        {...over}
    />,
);

describe('CommissionDetailReport', () => {
    beforeEach(() => {
        calls.length = 0;
        tableData = { finance_records: { data: [], error: null }, commission_payments: { data: [], error: null } };
    });

    it('não pede a coluna inexistente finance_records.amount', async () => {
        mount();
        await screen.findByTestId('report-empty');
        const fr = calls.find((c) => c.table === 'finance_records')!;
        expect(fr.select).not.toMatch(/(^|[\s,])amount([\s,]|$)/);
        expect(fr.select).toMatch(/revenue/);
        expect(fr.select).toMatch(/appointments!appointment_id/);
        expect(fr.select).toMatch(/service/);
    });

    it('usa só a comissão registrada (não estima quando commission_value é 0)', async () => {
        tableData.finance_records = { data: [
            { id: 'r1', created_at: '2026-08-10T12:00:00Z', service_name: 'Corte', client_name: null, description: null, revenue: 100, payment_method: 'pix', commission_rate: 40, commission_value: 40, appointments: null },
            { id: 'r2', created_at: '2026-08-11T12:00:00Z', service_name: 'Barba', client_name: null, description: null, revenue: 50, payment_method: 'pix', commission_rate: 40, commission_value: 0, appointments: null },
        ], error: null };
        mount();
        expect(await screen.findByTestId('report-total-commission')).toHaveTextContent(/40,00/);
    });

    it('erro mostra mensagem, não empty state', async () => {
        tableData.finance_records = { data: null, error: { code: '42703' } };
        mount();
        expect(await screen.findByText('Não foi possível carregar o relatório.')).toBeInTheDocument();
        expect(screen.queryByTestId('report-empty')).toBeNull();
    });

    it('modo pago filtra commission_paid=true e commission_paid_at do card', async () => {
        const paidAt = '2026-09-10T15:00:00.123Z';
        tableData.finance_records = { data: [
            { id: 'r1', created_at: '2026-08-10T12:00:00Z', service_name: 'Corte', client_name: 'João', description: null, revenue: 100, payment_method: 'pix', commission_rate: 40, commission_value: 40, appointments: null },
        ], error: null };
        mount({ mode: 'paid', paidAt, periodStart: '2026-08-06', periodEnd: '2026-09-05' });
        expect(await screen.findByText('Pago em 10/09/2026')).toBeInTheDocument();
        await waitFor(() => {
            const fr = calls.find((c) => c.table === 'finance_records');
            expect(fr?.filters).toContainEqual(['eq', 'commission_paid', true]);
            expect(fr?.filters).toContainEqual(['eq', 'commission_paid_at', paidAt]);
            expect(fr?.filters).toContainEqual(['eq', 'professional_id', 'ana']);
            expect(fr?.filters.some(([op, col]) => op === 'gte' && col === 'created_at')).toBe(false);
        });
        expect(screen.queryByRole('button', { name: /Pagar/i })).toBeNull();
        expect(await screen.findByTestId('report-total-commission')).toHaveTextContent(/40,00/);
    });

    it('modo pago envia microsegundos crus, sem toISOString', async () => {
        const paidAt = '2026-09-10T15:00:00.123456+00:00';
        const truncated = new Date(paidAt).toISOString();
        expect(truncated).toBe('2026-09-10T15:00:00.123Z');
        tableData.finance_records = { data: [
            { id: 'r1', created_at: '2026-08-10T12:00:00Z', service_name: 'Corte', client_name: 'João', description: null, revenue: 100, payment_method: 'pix', commission_rate: 40, commission_value: 40, appointments: null },
        ], error: null };
        mount({ mode: 'paid', paidAt, periodStart: '2026-08-06', periodEnd: '2026-09-05' });
        await waitFor(() => {
            const fr = calls.find((c) => c.table === 'finance_records');
            expect(fr?.filters).toContainEqual(['eq', 'commission_paid_at', paidAt]);
            expect(fr?.filters).not.toContainEqual(['eq', 'commission_paid_at', truncated]);
        });
    });

    it('pendente vazio oferece o último pagamento', async () => {
        tableData.commission_payments = {
            data: [{ paid_at: '2026-09-10T15:00:00.000Z', start_date: '2026-08-06', end_date: '2026-09-05' }],
            error: null,
        };
        mount();
        expect(await screen.findByText('Nada pendente neste período')).toBeInTheDocument();
        const link = await screen.findByTestId('report-open-latest');
        expect(link).toHaveTextContent('Ver último pagamento');

        tableData.finance_records = { data: [
            { id: 'p1', created_at: '2026-08-10T12:00:00Z', service_name: 'Corte', client_name: null, description: null, revenue: 80, payment_method: 'pix', commission_rate: 40, commission_value: 32, appointments: null },
        ], error: null };
        fireEvent.click(link);
        expect(await screen.findByTestId('report-total-commission')).toHaveTextContent(/32,00/);
        const paidCall = calls.filter((c) => c.table === 'finance_records').at(-1);
        expect(paidCall?.filters).toContainEqual(['eq', 'commission_paid', true]);
        expect(paidCall?.filters).toContainEqual(['eq', 'commission_paid_at', '2026-09-10T15:00:00.000Z']);
    });

    it('Compartilhar abre sheet com resumido, detalhado e copiar texto', async () => {
        tableData.finance_records = { data: [
            { id: 'r1', created_at: '2026-08-10T12:00:00Z', service_name: 'Corte', client_name: null, description: null, revenue: 100, payment_method: 'pix', commission_rate: 40, commission_value: 40, appointments: null },
        ], error: null };
        mount();
        fireEvent.click(await screen.findByRole('button', { name: /Compartilhar/i }));
        expect(screen.getByTestId('commission-share-sheet')).toBeInTheDocument();
        expect(screen.getByTestId('share-option-resumido')).toHaveTextContent('Relatório resumido');
        expect(screen.getByTestId('share-option-detalhado')).toHaveTextContent('Relatório detalhado');
        expect(screen.getByRole('button', { name: /Copiar texto/i })).toBeInTheDocument();
    });

    it('mostra serviço do agendamento e o cliente quando service_name vem vazio', async () => {
        tableData.finance_records = { data: [
            {
                id: 'r1', created_at: '2026-08-10T12:00:00Z', service_name: '—', client_name: 'Maria Lima',
                description: null, revenue: 90, payment_method: 'pix', commission_rate: 40, commission_value: 36,
                appointments: { machine_fee_percent: 0, service: 'Luzes' },
            },
        ], error: null };
        mount();
        expect((await screen.findAllByText('Luzes')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Maria Lima').length).toBeGreaterThan(0);
    });
});
