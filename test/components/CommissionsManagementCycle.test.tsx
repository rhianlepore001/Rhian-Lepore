import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import openCycle from '../fixtures/staffPerformance/cycle.json';

// P1: a aba "Pagamento de comissão" lê o ciclo calculado no servidor (get_commission_cycle_v1).
type Call = { table: string; select?: string; filters: [string, string, unknown][] };
const calls: Call[] = [];
let tableData: Record<string, { data: unknown; error: unknown }> = {};
let cycles: Record<string, { data: unknown; error: unknown }> = {};
const rpc = vi.fn(async (name: string, args?: { p_cycle_end?: string | null }) => {
    if (name === 'get_commission_cycle_v1') return cycles[args?.p_cycle_end ?? 'default'] ?? { data: null, error: { message: 'sem fixture' } };
    if (name === 'mark_commissions_as_paid') return { data: null, error: null };
    return { data: [], error: null };
});

function query(table: string) {
    const call: Call = { table, filters: [] };
    calls.push(call);
    const result = () => Promise.resolve(tableData[table] ?? { data: [], error: null });
    const q: any = {
        select: (s: string) => { call.select = s; return q; },
        update: () => q, order: () => q, limit: () => q, maybeSingle: result, single: result,
        then: (res: any, rej: any) => result().then(res, rej),
    };
    for (const op of ['eq', 'in', 'gte', 'lte', 'lt', 'gt']) {
        q[op] = (col: string, val: unknown) => { call.filters.push([op, col, val]); return q; };
    }
    return q;
}

vi.mock('../../lib/supabase', () => ({
    supabase: { rpc: (...a: unknown[]) => rpc(...(a as [string])), from: (t: string) => query(t) },
}));
vi.mock('@/lib/supabase', () => ({
    supabase: { rpc: (...a: unknown[]) => rpc(...(a as [string])), from: (t: string) => query(t) },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-1' }, role: 'owner', region: 'BR', userType: 'barber' }) }));
vi.mock('../../components/ProfessionalCommissionDetails', () => ({ ProfessionalCommissionDetails: () => <div /> }));
vi.mock('../../components/CommissionPaymentHistory', () => ({ CommissionPaymentHistory: () => <div /> }));
vi.mock('../../components/CommissionDetailReport', () => ({
    CommissionDetailReport: (p: { periodStart: string; periodEnd: string }) => <div data-testid="report-modal">{p.periodStart} {p.periodEnd}</div>,
}));

import { CommissionsManagement } from '../../components/CommissionsManagement';
import { ToastProvider } from '../../components/ui';

/** Ciclo fechado 06/08–05/09: Ana paga certo, Bruno pago com ajuste (250 × 257). */
const closedCycle = () => {
    const c = structuredClone(openCycle) as any;
    c.cycle = { start: '2026-08-06', end: '2026-09-05', open: false };
    c.previous_end = '2026-08-05';
    c.next_end = '2026-10-05';
    const set = (name: string, o: Record<string, unknown>) => Object.assign(c.members.find((m: any) => m.name === name), o);
    set('Ana', { a_pagar_ciclo: 0, status: 'pago', pago_ciclo: 264, pago_calculado: 264 });
    set('Bruno', { a_pagar_ciclo: 0, status: 'pago_com_ajuste', pago_ciclo: 250, pago_calculado: 257, ultimo_pagamento: { paid_at: '2026-09-07T12:00:00+00:00', amount: 250, start_date: '2026-08-06', end_date: '2026-09-05' } });
    set('Caio', { a_pagar_ciclo: 7, saldo_acumulado: 107, status: 'pendente', servicos_ciclo: 1 });
    set('Duda', { a_pagar_ciclo: 0, status: 'nada_a_pagar', servicos_ciclo: 0 });
    c.totals = { a_pagar_ciclo: 7, pendentes: 1, pago_ciclo: 514 };
    return c;
};

const mount = () => render(
    <MemoryRouter><ToastProvider><CommissionsManagement accentColor="accent-gold" currencySymbol="R$" /></ToastProvider></MemoryRouter>,
);
const money = (v: string) => new RegExp(`R\\$\\s${v.replace('.', '\\.')}`);

describe('CommissionsManagement — ciclo do servidor (P1, get_commission_cycle_v1)', () => {
    beforeEach(() => {
        calls.length = 0;
        rpc.mockClear();
        tableData = { business_settings: { data: { commission_settlement_day_of_month: 5 }, error: null } };
        cycles = { default: { data: openCycle, error: null }, '2026-09-05': { data: closedCycle(), error: null }, '2026-10-05': { data: openCycle, error: null } };
    });

    it('lê o ciclo do servidor, não get_commissions_due; rótulo e linha-resumo (R6.2)', async () => {
        mount();
        expect(await screen.findByText('Ciclo em aberto · 06/09 – 05/10')).toBeInTheDocument();
        expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: null });
        expect(rpc.mock.calls.some((c) => c[0] === 'get_commissions_due')).toBe(false);
        const summary = screen.getByTestId('payout-summary');
        expect(summary).toHaveTextContent('A pagar neste ciclo');
        expect(summary).toHaveTextContent(money('677,00'));
        expect(summary).toHaveTextContent('4 pendentes');
        expect(summary).toHaveTextContent(/Pago neste ciclo\s*R\$\s0,00/);
    });

    it('linha: valor do ciclo, saldo de ciclos anteriores, contexto e selo Inativo; dono fora (R6.3, R4.1.3)', async () => {
        mount();
        const caio = await screen.findByTestId('payout-row-20000000-0000-0000-0000-0000000000c1');
        expect(within(caio).getAllByText(money('100,00')).length).toBeGreaterThan(0);
        expect(within(caio).getByText(/\+\sR\$\s7,00 de ciclos anteriores/)).toBeInTheDocument();
        const ana = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000a1');
        expect(within(ana).getByText('10 serviços · 3 produtos neste ciclo')).toBeInTheDocument();
        expect(within(ana).queryByText(/ciclos anteriores/)).toBeNull();
        const duda = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000e1');
        expect(within(duda).getByText('Inativo')).toBeInTheDocument();
        expect(screen.queryByText(/dono/i)).toBeNull();
        const eva = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000f1');
        expect(within(eva).getByRole('button', { name: /Nada a pagar/ })).toBeDisabled();
    });

    it('‹ vai para o ciclo anterior do servidor; › fica desabilitado no ciclo em aberto', async () => {
        mount();
        await screen.findByText('Ciclo em aberto · 06/09 – 05/10');
        expect(screen.getByRole('button', { name: 'Próximo ciclo' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Ciclo anterior' }));
        expect(await screen.findByText('Ciclo fechado · 06/08 – 05/09')).toBeInTheDocument();
        expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: '2026-09-05' });
        expect(screen.getByRole('button', { name: 'Próximo ciclo' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Próximo ciclo' }));
        expect(await screen.findByText('Ciclo em aberto · 06/09 – 05/10')).toBeInTheDocument();
        expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: '2026-10-05' });
    });

    it('chips de status M2: Pago (com data), Pago com ajuste (valor pago × calculado), Pendente, Nada a pagar', async () => {
        cycles.default = cycles['2026-09-05'];
        mount();
        const ana = await screen.findByTestId('payout-row-20000000-0000-0000-0000-0000000000a1');
        expect(within(ana).getAllByText('Pago').length).toBeGreaterThan(0);
        expect(within(ana).getAllByText('Pago em 06/09').length).toBeGreaterThan(0);
        const bruno = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000b1');
        expect(within(bruno).getAllByText('Pago com ajuste').length).toBeGreaterThan(0);
        expect(within(bruno).getAllByTitle(/Pago R\$\s250,00 · calculado R\$\s257,00/).length).toBeGreaterThan(0);
        const caio = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000c1');
        expect(within(caio).getAllByText('Pendente').length).toBeGreaterThan(0);
        const duda = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000e1');
        expect(within(duda).getAllByText('Nada a pagar').length).toBeGreaterThan(0);
        expect(screen.getByTestId('payout-summary')).toHaveTextContent(/Pago neste ciclo\s*R\$\s514,00/);
    });

    it('modal Pagar usa as datas e o valor do servidor e paga esse intervalo (R6.4)', async () => {
        mount();
        const ana = await screen.findByTestId('payout-row-20000000-0000-0000-0000-0000000000a1');
        fireEvent.click(within(ana).getByRole('button', { name: 'Pagar Ana' }));
        expect(await screen.findByText('Ciclo: 06/09 – 05/10')).toBeInTheDocument();
        expect((screen.getByDisplayValue('257.00') as HTMLInputElement).value).toBe('257.00');
        expect(calls.some((c) => c.table === 'finance_records')).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Pagar agora' }));
        await waitFor(() => expect(rpc).toHaveBeenCalledWith('mark_commissions_as_paid', expect.objectContaining({
            p_professional_id: '20000000-0000-0000-0000-0000000000a1', p_amount: 257, p_start_date: '2026-09-06', p_end_date: '2026-10-05',
        })));
    });

    it('relatório do menu "Mais" usa o ciclo exibido', async () => {
        mount();
        const ana = await screen.findByTestId('payout-row-20000000-0000-0000-0000-0000000000a1');
        fireEvent.click(within(ana).getByRole('button', { name: /Mais ações de Ana/ }));
        fireEvent.click(await screen.findByRole('menuitem', { name: /Relatório de comissões/ }));
        expect(await screen.findByTestId('report-modal')).toHaveTextContent('2026-09-06 2026-10-05');
    });

    it('ciclo sem nada a pagar: "Nenhuma comissão pendente neste ciclo." (R6.9)', async () => {
        const empty = structuredClone(openCycle) as any;
        empty.members.forEach((m: any) => { m.a_pagar_ciclo = 0; m.saldo_acumulado = 0; m.status = 'nada_a_pagar'; });
        empty.totals = { a_pagar_ciclo: 0, pendentes: 0, pago_ciclo: 0 };
        cycles.default = { data: empty, error: null };
        mount();
        expect(await screen.findByText('Nenhuma comissão pendente neste ciclo.')).toBeInTheDocument();
    });

    it('erro real (não é "RPC ausente") mostra "Tentar de novo", sem cair no cálculo antigo', async () => {
        cycles.default = { data: null, error: { message: 'Failed to fetch' } };
        mount();
        expect(await screen.findByText('Não foi possível carregar os repasses.')).toBeInTheDocument();
        expect(rpc.mock.calls.some((c) => c[0] === 'get_commissions_due')).toBe(false);
    });
});
