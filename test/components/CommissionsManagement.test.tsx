import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

// ---- Supabase mock: registra cada query por tabela ----
type Call = { table: string; select?: string; filters: [string, string, unknown][] };
const calls: Call[] = [];
let tableData: Record<string, { data: unknown; error: unknown }> = {};
let rpcResult: { data: unknown; error: unknown } = { data: [], error: null };
// P1: a aba lê get_commission_cycle_v1; aqui simulamos a migration ainda não aplicada
// (PGRST202), e a tela cai no caminho da P0 (get_commissions_due + ciclo local).
const rpc = vi.fn(async (name: string) =>
    name === 'get_commission_cycle_v1'
        ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.get_commission_cycle_v1' } }
        : rpcResult);

function query(table: string) {
    const call: Call = { table, filters: [] };
    calls.push(call);
    const result = () => Promise.resolve(tableData[table] ?? { data: [], error: null });
    const q: any = {
        select: (s: string) => { call.select = s; return q; },
        update: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: result,
        single: result,
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
const AUTH = { user: { id: 'owner-1' }, role: 'owner', region: 'BR', userType: 'barber' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('../../components/ProfessionalCommissionDetails', () => ({
    ProfessionalCommissionDetails: (p: { professionalName: string }) => <div data-testid="details-modal">Detalhes de {p.professionalName}</div>,
}));
vi.mock('../../components/CommissionPaymentHistory', () => ({
    CommissionPaymentHistory: (p: { professionalName: string }) => <div data-testid="history-modal">Histórico de {p.professionalName}</div>,
}));
vi.mock('../../components/CommissionDetailReport', () => ({
    CommissionDetailReport: (p: { professionalName: string; periodStart: string; periodEnd: string }) => (
        <div data-testid="report-modal">Relatório {p.professionalName} {p.periodStart} {p.periodEnd}</div>
    ),
}));

import { CommissionsManagement } from '../../components/CommissionsManagement';
import { ToastProvider } from '../../components/ui';

const row = (over: Record<string, unknown>) => ({
    professional_id: 'p', professional_name: 'X', photo_url: null, is_owner: false,
    total_due: 0, total_earnings_month: 0, total_paid: 0, total_pending_records: 0, commission_rate: 40,
    services_pending: 0, products_pending: 0, services_month: 0, products_sold_month: 0, ...over,
});
const TEAM = [
    row({ professional_id: 'owner-m', professional_name: 'Bob Dono', is_owner: true, total_due: 999, total_earnings_month: 999 }),
    row({ professional_id: 'ana', professional_name: 'Ana Souza', total_due: 408, services_pending: 12, products_pending: 3, total_earnings_month: 500 }),
    row({ professional_id: 'caio', professional_name: 'Caio Lima', total_due: 0, commission_rate: 50 }),
];

let lastLocation = '';
const Spy = () => { const l = useLocation(); lastLocation = l.pathname + l.search; return null; };
const mount = () => render(
    <MemoryRouter><ToastProvider><CommissionsManagement accentColor="accent-gold" currencySymbol="R$" /></ToastProvider><Spy /></MemoryRouter>,
);

describe('CommissionsManagement — aba Pagamento de comissão (P0; fallback sem a RPC da P1)', () => {
    const originalTz = process.env.TZ;
    beforeEach(() => {
        calls.length = 0;
        rpc.mockClear();
        rpcResult = { data: TEAM, error: null };
        tableData = { business_settings: { data: { commission_settlement_day_of_month: 5 }, error: null } };
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-09-29T09:00:00Z'));
    });
    afterEach(() => { vi.useRealTimers(); process.env.TZ = originalTz; });

    it('título novo, sem card "Destaque" nem mini-métricas "Este mês"/"Liquidado" (B6, R6.5)', async () => {
        mount();
        expect(await screen.findByRole('heading', { name: 'Pagamento de comissão' })).toBeInTheDocument();
        await screen.findByText('Ana Souza');
        expect(screen.queryByText(/Gestão de Comissões/i)).toBeNull();
        expect(screen.queryByText(/Destaque/i)).toBeNull();
        expect(screen.queryByText(/Melhor desempenho/i)).toBeNull();
        expect(screen.queryByText(/^Este mês$/i)).toBeNull();
        expect(screen.queryByText(/^Liquidado$/i)).toBeNull();
    });

    it('dono fica fora da lista de repasse; colaborador sem saldo mostra "Nada a pagar" desabilitado', async () => {
        mount();
        await screen.findByText('Ana Souza');
        expect(screen.queryByText('Bob Dono')).toBeNull();
        const caio = screen.getByTestId('payout-row-caio');
        expect(within(caio).getByRole('button', { name: /Nada a pagar/i })).toBeDisabled();
        const ana = screen.getByTestId('payout-row-ana');
        expect(within(ana).getByText('Pendentes: 12 serviços · 3 produtos')).toBeInTheDocument();
        expect(within(ana).getByRole('button', { name: 'Pagar Ana Souza' })).toBeEnabled();
    });

    it.each(['Europe/Lisbon', 'America/Sao_Paulo'])('ciclo 06/08 – 05/09 rotulado e enviado igual com navegador em %s (B5, B7)', async (tz) => {
        process.env.TZ = tz;
        mount();
        expect(await screen.findByText(/Último ciclo fechado · 06\/08 – 05\/09/)).toBeInTheDocument();
        fireEvent.click(await screen.findByRole('button', { name: 'Pagar Ana Souza' }));
        await waitFor(() => {
            const fr = calls.find((c) => c.table === 'finance_records');
            expect(fr?.filters).toContainEqual(['gte', 'created_at', '2026-08-06']);
            expect(fr?.filters).toContainEqual(['lte', 'created_at', '2026-09-05T23:59:59']);
        });
    });

    it('"Ver histórico e análise" abre a Performance do colaborador com as datas do ciclo (R6.4, P2)', async () => {
        process.env.TZ = 'Europe/Lisbon';
        mount();
        const ana = await screen.findByTestId('payout-row-ana');
        fireEvent.click(within(ana).getByRole('link', { name: /Ver histórico e análise/i }));
        await waitFor(() => expect(lastLocation).toBe('/financeiro/performance?de=2026-08-06&ate=2026-09-05&pro=ana'));
        expect(screen.queryByTestId('details-modal')).toBeNull();
    });

    it('menu "Mais" abre o relatório com as datas do ciclo', async () => {
        process.env.TZ = 'Europe/Lisbon';
        mount();
        const ana = await screen.findByTestId('payout-row-ana');
        fireEvent.click(within(ana).getByRole('button', { name: /Mais ações de Ana Souza/i }));
        fireEvent.click(await screen.findByRole('menuitem', { name: /Relatório de comissões/i }));
        expect(await screen.findByTestId('report-modal')).toHaveTextContent('Relatório Ana Souza 2026-08-06 2026-09-05');
    });

    it('erro no carregamento mostra mensagem e "Tentar de novo" (nunca vazio silencioso)', async () => {
        rpcResult = { data: null, error: { message: 'boom' } };
        mount();
        expect(await screen.findByText('Não foi possível carregar os repasses.')).toBeInTheDocument();
        expect(screen.queryByText(/Sem colaboradores/i)).toBeNull();
        rpcResult = { data: TEAM, error: null };
        fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/i }));
        expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    });

    it('aba Pagos usa as colunas reais de commission_payments e mostra o período sem recuar 1 dia (B1)', async () => {
        process.env.TZ = 'America/Sao_Paulo';
        tableData.commission_payments = {
            data: [{ id: 'cp1', professional_id: 'ana', start_date: '2026-08-06', end_date: '2026-09-05', amount: 408, net_amount: 408, paid_at: '2026-09-10T15:00:00+00:00', team_members: { name: 'Ana Souza', photo_url: null } }],
            error: null,
        };
        mount();
        await screen.findByText('Ana Souza');
        fireEvent.click(screen.getByRole('tab', { name: /Pagos/i }));
        const item = await screen.findByTestId('paid-row-cp1');
        const cp = calls.find((c) => c.table === 'commission_payments')!;
        expect(cp.select).toMatch(/professional_id/);
        expect(cp.select).toMatch(/team_members!professional_id/);
        expect(cp.select).not.toMatch(/collaborator_id|period_start|company_id/);
        expect(cp.filters).toContainEqual(['eq', 'user_id', 'owner-1']);
        expect(cp.filters).toContainEqual(['eq', 'status', 'paid']);
        expect(within(item).getByText('Ana Souza')).toBeInTheDocument();
        expect(within(item).getByText('06/08 – 05/09')).toBeInTheDocument();
        expect(within(item).getByText('Pago em 10/09/2026')).toBeInTheDocument();
    });

    it('aba Pagos com erro mostra mensagem, não "Nenhum pagamento"', async () => {
        tableData.commission_payments = { data: null, error: { message: 'PGRST200' } };
        mount();
        await screen.findByText('Ana Souza');
        fireEvent.click(screen.getByRole('tab', { name: /Pagos/i }));
        expect(await screen.findByText('Não foi possível carregar os pagamentos.')).toBeInTheDocument();
        expect(screen.queryByText(/Nenhum pagamento/i)).toBeNull();
    });

    it('rodapé explica o modelo de comissão (D4)', async () => {
        mount();
        await screen.findByText('Ana Souza');
        expect(screen.getByText('Os valores assumem comissão por atendimento. Aluguel de cadeira ainda não é suportado.')).toBeInTheDocument();
    });
});
