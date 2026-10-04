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
const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === 'get_commission_cycle_v1') return cycles[(args?.p_cycle_end as string | null | undefined) ?? 'default'] ?? { data: null, error: { message: 'sem fixture' } };
    if (name === 'preview_commission_pay_v1') {
        const start = args && 'p_start' in args ? String((args as { p_start?: string }).p_start) : '';
        const end = args && 'p_end' in args ? String((args as { p_end?: string }).p_end) : '';
        const amount = start === '2026-08-20' ? 15 : start === '2026-09-06' ? 257 : 0;
        return { data: { amount, count: amount > 0 ? 1 : 0, start, end, tz: 'America/Sao_Paulo' }, error: null };
    }
    if (name === 'pay_commission_v1') {
        const start = args && 'p_start' in args ? String((args as { p_start?: string }).p_start) : '';
        const end = args && 'p_end' in args ? String((args as { p_end?: string }).p_end) : '';
        const amount = start === '2026-08-20' ? 15 : start === '2026-09-06' ? 257 : 0;
        return { data: { amount, count: amount > 0 ? 1 : 0, start, end, tz: 'America/Sao_Paulo' }, error: null };
    }
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
const AUTH = { user: { id: 'owner-1' }, role: 'owner', region: 'BR', userType: 'barber' }; // referência estável, como no app
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('../../components/ProfessionalCommissionDetails', () => ({ ProfessionalCommissionDetails: () => <div /> }));
vi.mock('../../components/CommissionPaymentHistory', () => ({ CommissionPaymentHistory: () => <div /> }));
vi.mock('../../components/CommissionDetailReport', () => ({
    CommissionDetailReport: (p: { periodStart: string; periodEnd: string }) => <div data-testid="report-modal">{p.periodStart} {p.periodEnd}</div>,
}));

vi.mock('../../utils/businessTimezone', async () => {
    const actual = await vi.importActual<typeof import('../../utils/businessTimezone')>('../../utils/businessTimezone');
    return { ...actual, getTodayInTimeZone: () => '2026-10-04' };
});
import { CommissionsManagement } from '../../components/CommissionsManagement';
import { ToastProvider } from '../../components/ui';

/** Ciclo fechado 06/08–05/09: Ana paga certo, Bruno pago com ajuste (250 × 257). */
const closedCycle = () => {
    const c = structuredClone(openCycle) as any;
    c.cycle = { start: '2026-08-06', end: '2026-09-05', open: false };
    c.previous_end = '2026-08-05';
    c.next_end = '2026-10-05';
    const set = (name: string, o: Record<string, unknown>) => Object.assign(c.members.find((m: any) => m.name === name), o);
    set('Ana', { a_pagar_ciclo: 0, saldo_anterior: 0, status: 'pago', pago_ciclo: 264, pago_calculado: 264, pago_ciclo_em: '2026-09-06T13:00:00+00:00' });
    set('Bruno', { a_pagar_ciclo: 0, saldo_anterior: 0, status: 'pago_com_ajuste', pago_ciclo: 250, pago_calculado: 257, pago_ciclo_em: '2026-09-07T12:00:00+00:00', ultimo_pagamento: { paid_at: '2026-09-07T12:00:00+00:00', amount: 250, start_date: '2026-08-06', end_date: '2026-09-05' } });
    // saldo_acumulado 107 inclui os 100 do ciclo SEGUINTE: não é "de ciclos anteriores".
    set('Caio', { a_pagar_ciclo: 7, saldo_acumulado: 107, saldo_anterior: 0, status: 'pendente', servicos_ciclo: 1 });
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
        expect(await screen.findByTestId('commission-cycle-header')).toHaveTextContent(
            'Período 06/09 – 05/10 · fecha em 05/10 · pagar até 05/10',
        );
        expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: null });
        expect(rpc.mock.calls.some((c) => c[0] === 'get_commissions_due')).toBe(false);
        const summary = screen.getByTestId('payout-summary');
        expect(summary).toHaveTextContent('A pagar');
        expect(summary).toHaveTextContent(money('699,00'));
        expect(summary).toHaveTextContent('5 pendentes');
        expect(summary).toHaveTextContent(/Pago neste ciclo\s*R\$\s0,00/);
    });

    it('PR-G: ciclo, período, resumo e A pagar/Pagos ficam num só cartão', async () => {
        mount();
        const card = await screen.findByTestId('payout-summary-card');
        expect(within(card).getByRole('button', { name: 'Ciclo anterior' })).toBeInTheDocument();
        expect(within(card).getByTestId('commission-cycle-header')).toHaveTextContent('Período 06/09 – 05/10');
        expect(await within(card).findByTestId('payout-summary')).toHaveTextContent('5 pendentes');
        expect(within(card).getByTestId('payout-summary-amount')).toHaveTextContent(money('699,00'));
        expect(within(card).getByRole('tablist', { name: 'Repasses' })).toBeInTheDocument();
    });

    it('linha: valor do ciclo, saldo de ciclos anteriores, contexto e selo Inativo; dono fora (R6.3, R4.1.3)', async () => {
        mount();
        const caio = await screen.findByTestId('payout-row-20000000-0000-0000-0000-0000000000c1');
        expect(within(caio).getAllByText(money('100,00')).length).toBeGreaterThan(0);
        expect(within(caio).getAllByText(/\+\sR\$\s7,00 de ciclos anteriores/).length).toBeGreaterThan(0);
        const ana = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000a1');
        expect(within(ana).getByText('10 serviços · 3 produtos neste ciclo')).toBeInTheDocument();
        expect(within(ana).queryByText(/ciclos anteriores/)).toBeNull();
        const duda = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000e1');
        expect(within(duda).getByText('Inativo')).toBeInTheDocument();
        expect(screen.queryByText(/dono/i)).toBeNull();
        const eva = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000f1');
        expect(within(eva).getAllByText('Pendente').length).toBeGreaterThan(0);
        expect(within(eva).getByRole('button', { name: /Pagar Eva/ })).toBeEnabled();
        expect(within(eva).getAllByText(money('15,00')).length).toBeGreaterThan(0);
        expect(within(eva).queryByText(/\+\sR\$\s15,00/)).toBeNull();
        expect(within(eva).queryByText(/Nenhum lançamento neste ciclo/)).toBeNull();
        expect(within(eva).getByText(/15,00 de ciclos anteriores/)).toBeInTheDocument();
        fireEvent.click(within(eva).getByRole('button', { name: /Pagar Eva/ }));
        expect(await screen.findByText('Confirmar repasse')).toBeInTheDocument();
        expect(await screen.findByText('Período: 20/08 – 05/09')).toBeInTheDocument();
        expect(screen.queryByText(/^Ciclo:/)).toBeNull();
        expect(screen.queryByRole('button', { name: /Este ciclo/i })).toBeNull();
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveTextContent(/Ciclos anteriores:\s*R\$\s*15,00/);
        expect(modal).not.toHaveTextContent(/Neste ciclo:\s*R\$\s*0,00/);
        expect((screen.getByLabelText('Valor a ser liquidado') as HTMLInputElement).value).toMatch(/R\$\s*15,00/);
        expect((screen.getByDisplayValue('20/08/2026') as HTMLInputElement).value).toBe('20/08/2026');
        expect((screen.getByDisplayValue('05/09/2026') as HTMLInputElement).value).toBe('05/09/2026');
        expect(screen.getByText(/marca as comissões de 20\/08 a 05\/09/i)).toBeInTheDocument();
        await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^Pagar R\$/ })).toBeEnabled());
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Pagar R\$/ }));
        await waitFor(() => expect(rpc).toHaveBeenCalledWith('pay_commission_v1', expect.objectContaining({
            p_professional_id: '20000000-0000-0000-0000-0000000000f1',
            p_start: '2026-08-20',
            p_end: '2026-09-05',
        })));
        expect(rpc.mock.calls.some((c) => c[0] === 'mark_commissions_as_paid')).toBe(false);
        expect(rpc.mock.calls.some((c) => c[0] === 'pay_commission_v1' && (c[1] as { p_amount?: number })?.p_amount != null)).toBe(false);
        expect(await screen.findByText(/Comissão de Eva paga:.*15,00/)).toBeInTheDocument();
        // PR-F #10: pago nesta sessão sai do cartão e vai para "Pagos neste período" (sem botão desativado).
        const evaAfter = await screen.findByTestId('payout-paid-20000000-0000-0000-0000-0000000000f1');
        expect(within(evaAfter).queryByRole('button', { name: /Pagar Eva/ })).toBeNull();
    });

    it('‹ vai para o ciclo anterior do servidor; › fica desabilitado no ciclo em aberto', async () => {
        mount();
        await screen.findByTestId('commission-cycle-header');
        expect(screen.getByTestId('commission-cycle-header')).toHaveTextContent('Período 06/09 – 05/10');
        expect(screen.getByRole('button', { name: 'Próximo ciclo' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Ciclo anterior' }));
        expect(await screen.findByTestId('commission-cycle-header')).toHaveTextContent(/Período 06\/08 – 05\/09/);
        expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: '2026-09-05' });
        expect(screen.getByRole('button', { name: 'Próximo ciclo' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Próximo ciclo' }));
        await waitFor(() => expect(screen.getByTestId('commission-cycle-header')).toHaveTextContent(/Período 06\/09 – 05\/10/));
        expect(rpc).toHaveBeenCalledWith('get_commission_cycle_v1', { p_cycle_end: '2026-10-05' });
    });

    it('chips de status M2: Pago (com data), Pago com ajuste (valor pago × calculado), Pendente, Nada a pagar', async () => {
        cycles.default = cycles['2026-09-05'];
        mount();
        // PR-F #10: quem já recebeu fica em "Pagos neste período"; sem valor vai para a frase "Nada a pagar".
        const ana = await screen.findByTestId('payout-paid-20000000-0000-0000-0000-0000000000a1');
        expect(within(ana).getAllByText('Pago').length).toBeGreaterThan(0);
        expect(within(ana).getAllByText('Pago em 06/09').length).toBeGreaterThan(0);
        const bruno = screen.getByTestId('payout-paid-20000000-0000-0000-0000-0000000000b1');
        expect(within(bruno).getAllByText('Pago com ajuste').length).toBeGreaterThan(0);
        expect(within(bruno).getAllByTitle(/Pago R\$\s250,00 · calculado R\$\s257,00/).length).toBeGreaterThan(0);
        expect(within(bruno).getAllByText(/Pago em 07\/09 · R\$\s250,00/).length).toBeGreaterThan(0);
        const caio = screen.getByTestId('payout-row-20000000-0000-0000-0000-0000000000c1');
        expect(within(caio).getAllByText('Pendente').length).toBeGreaterThan(0);
        expect(within(caio).queryByText(/ciclos anteriores/)).toBeNull();
        expect(screen.queryByTestId('payout-row-20000000-0000-0000-0000-0000000000e1')).toBeNull();
        expect(screen.getByTestId('payout-nothing-due')).toHaveTextContent(/Nada a pagar neste período:.*Duda/);
        expect(screen.getByTestId('payout-summary')).toHaveTextContent(/Pago neste ciclo\s*R\$\s514,00/);
    });

    it('modal Pagar usa as datas e o valor do servidor e paga esse intervalo (R6.4)', async () => {
        mount();
        const ana = await screen.findByTestId('payout-row-20000000-0000-0000-0000-0000000000a1');
        fireEvent.click(within(ana).getByRole('button', { name: 'Pagar Ana' }));
        expect(await screen.findByText('Período: 06/09 – 04/10')).toBeInTheDocument();
        expect((screen.getByLabelText('Valor a ser liquidado') as HTMLInputElement).value).toMatch(/R\$\s*257,00/);
        expect(screen.getByText(/Neste ciclo/)).toBeInTheDocument();
        expect((screen.getByDisplayValue('06/09/2026') as HTMLInputElement).value).toBe('06/09/2026');
        expect(calls.some((c) => c.table === 'finance_records')).toBe(false);
        await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^Pagar R\$/ })).toBeEnabled());
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Pagar R\$/ }));
        await waitFor(() => expect(rpc).toHaveBeenCalledWith('pay_commission_v1', expect.objectContaining({
            p_professional_id: '20000000-0000-0000-0000-0000000000a1', p_start: '2026-09-06', p_end: '2026-10-04',
        })));
        expect(rpc.mock.calls.some((c) => c[0] === 'mark_commissions_as_paid')).toBe(false);
    });

    it('mudar o intervalo no modal atualiza o valor pelo preview (não conserva saldo anterior)', async () => {
        mount();
        const eva = await screen.findByTestId('payout-row-20000000-0000-0000-0000-0000000000f1');
        fireEvent.click(within(eva).getByRole('button', { name: /Pagar Eva/ }));
        expect((await screen.findByLabelText('Valor a ser liquidado') as HTMLInputElement).value).toMatch(/R\$\s*15,00/);
        fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '06/09/2026' } });
        fireEvent.blur(screen.getByLabelText('Data inicial'));
        fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '05/10/2026' } });
        fireEvent.blur(screen.getByLabelText('Data final'));
        await waitFor(() => expect((screen.getByLabelText('Valor a ser liquidado') as HTMLInputElement).value).toMatch(/R\$\s*257,00/));
        expect(screen.getByText('Período: 06/09 – 05/10')).toBeInTheDocument();
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
        empty.members.forEach((m: any) => { m.a_pagar_ciclo = 0; m.saldo_acumulado = 0; m.saldo_anterior = 0; m.status = 'nada_a_pagar'; });
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
