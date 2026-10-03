import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import teamJson from '../fixtures/staffPerformance/team.json';
import detailJson from '../fixtures/staffPerformance/detail.json';
import { ownerPerformanceSchema } from '../../types/staffPerformance';

const fetchStaffPerformance = vi.fn();
const fetchPerformanceLedger = vi.fn();
// O service real valida com zod; o mock devolve o mesmo formato já validado.
const team = ownerPerformanceSchema.parse(teamJson);
const detail = ownerPerformanceSchema.parse(detailJson);
vi.mock('@/services/staffPerformance', async (orig) => ({
    ...(await orig<typeof import('../../services/staffPerformance')>()),
    fetchStaffPerformance: (...a: unknown[]) => fetchStaffPerformance(...a),
}));
vi.mock('../../services/staffPerformance', async (orig) => ({
    ...(await orig<typeof import('../../services/staffPerformance')>()),
    fetchStaffPerformance: (...a: unknown[]) => fetchStaffPerformance(...a),
}));
vi.mock('@/services/performanceLedger', () => ({
    fetchPerformanceLedger: (...a: unknown[]) => fetchPerformanceLedger(...a),
    pageLedger: (rows: unknown[], page: number) => {
        const pages = Math.max(1, Math.ceil(rows.length / 20));
        const p = Math.min(Math.max(page, 1), pages);
        return { items: rows.slice((p - 1) * 20, p * 20), pages, page: p };
    },
    LEDGER_PAGE: 20,
}));
vi.mock('../../services/performanceLedger', () => ({
    fetchPerformanceLedger: (...a: unknown[]) => fetchPerformanceLedger(...a),
    pageLedger: (rows: unknown[], page: number) => {
        const PAGE = 20;
        const pages = Math.max(1, Math.ceil(rows.length / PAGE));
        const p = Math.min(Math.max(page, 1), pages);
        return { items: rows.slice((p - 1) * PAGE, p * PAGE), pages, page: p };
    },
    LEDGER_PAGE: 20,
}));
const AUTH = { user: { id: 'owner-1' }, role: 'owner', region: 'BR', userType: 'barber', isAuthenticated: true, loading: false };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('../../components/CommissionPaymentHistory', () => ({ CommissionPaymentHistory: (p: { professionalName: string }) => <div data-testid="history-modal">Histórico {p.professionalName}</div> }));
vi.mock('../../components/CommissionDetailReport', () => ({
    CommissionDetailReport: (p: { professionalName: string; periodStart: string; periodEnd: string }) => <div data-testid="report-modal">Relatório {p.professionalName} {p.periodStart} {p.periodEnd}</div>,
}));

import { StaffPerformance } from '../../pages/StaffPerformance';

const ANA = '20000000-0000-0000-0000-0000000000a1';
let lastLocation = '';
const Spy = () => { const l = useLocation(); lastLocation = l.pathname + l.search; return null; };

const mount = (url = '/financeiro/performance?de=2026-09-01&ate=2026-09-30') =>
    render(
        <MemoryRouter initialEntries={[url]}>
            <Routes>
                <Route path="/financeiro/performance" element={<><StaffPerformance /><Spy /></>} />
                <Route path="/financeiro" element={<><div>Financeiro</div><Spy /></>} />
            </Routes>
        </MemoryRouter>,
    );

const emptyTeam = () => {
    const t = structuredClone(team) as any;
    t.members = t.members.map((m: any) => ({ ...m, rank: null, eligible: false, metrics: { ...m.metrics, atendimentos: 0, retorno: null, retorno_por_hora: null, ticket_medio: null } }));
    t.team_totals = { ...t.team_totals, atendimentos: 0, vendas_produtos: 0, avulsos: 0, retorno: null };
    t.unassigned = null;
    t.ranking_available = false;
    return t;
};

describe('StaffPerformance (P2) — /financeiro/performance', () => {
    const originalTz = process.env.TZ;
    beforeEach(() => {
        process.env.TZ = 'America/Sao_Paulo';
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 9, 2, 12));
        fetchStaffPerformance.mockReset();
        fetchStaffPerformance.mockImplementation(async (p: { professionalId?: string | null }) => (p.professionalId ? detail : team));
        fetchPerformanceLedger.mockReset();
        fetchPerformanceLedger.mockResolvedValue([]);
    });
    afterEach(() => { vi.useRealTimers(); process.env.TZ = originalTz; });

    it('pede a RPC com as datas da URL e sem colaborador', async () => {
        mount();
        await screen.findByRole('heading', { name: 'Performance da equipe' });
        await waitFor(() => expect(fetchStaffPerformance).toHaveBeenCalledWith({ start: '2026-09-01', end: '2026-09-30', professionalId: null, compare: true }));
    });

    it('sem datas na URL usa "Este mês"', async () => {
        mount('/financeiro/performance');
        await waitFor(() => expect(fetchStaffPerformance).toHaveBeenCalledWith(expect.objectContaining({ start: '2026-10-01', end: '2026-10-31' })));
    });

    it('linha de equipe + ranking por Retorno por hora, com selos e aviso de comparação', async () => {
        mount();
        const overview = await screen.findByTestId('team-overview');
        expect(within(overview).getByText('Retorno total')).toBeInTheDocument();
        expect(within(overview).getByText('R$ 1.313,00')).toBeInTheDocument();
        expect(within(overview).getByText('38')).toBeInTheDocument();

        expect(screen.getByText(/Compare cada pessoa principalmente com ela mesma/)).toBeInTheDocument();
        const ana = screen.getAllByTestId(`member-${ANA}`)[0];
        expect(within(ana).getByText('1º')).toBeInTheDocument();
        expect(within(ana).getByText('R$ 68,00/h')).toBeInTheDocument();
        expect(screen.getAllByText('Amostra baixa (5 de 8)').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Dono').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Inativo').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Ana deixou R\$ 408,00 para a casa em 12 atendimentos \(R\$ 68,00 por hora\), 13% a mais que em agosto\./).length).toBeGreaterThan(0);
        expect(screen.getByText('Sem profissional')).toBeInTheDocument();
        expect(screen.queryByText(/melhor funcionário/i)).not.toBeInTheDocument();
    });

    it('abrir um colaborador põe ?pro= na URL e mostra o detalhe vs o período anterior dele', async () => {
        mount();
        const ana = (await screen.findAllByTestId(`member-${ANA}`))[0];
        fireEvent.click(within(ana).getByRole('link', { name: /Ana/ }));
        await waitFor(() => expect(lastLocation).toContain(`pro=${ANA}`));
        await waitFor(() => expect(fetchStaffPerformance).toHaveBeenLastCalledWith(expect.objectContaining({ professionalId: ANA })));

        const headline = await screen.findByTestId('detail-headline');
        expect(within(headline).getByText('Retorno para a casa')).toBeInTheDocument();
        expect(within(headline).getByText('R$ 408,00')).toBeInTheDocument();
        expect(within(headline).getByText('▲ +R$ 48,00 (+13%)')).toBeInTheDocument();
        expect(within(headline).getAllByText('vs agosto').length).toBeGreaterThan(0);
        expect(within(headline).getByText('R$ 68,00/h')).toBeInTheDocument();
        expect(within(headline).getByText(/R\$ 103,33\/h/)).toBeInTheDocument();
        expect(within(headline).getByText('R$ 62,00')).toBeInTheDocument();
        expect(within(headline).getByText('55%')).toBeInTheDocument();
        expect(within(headline).getByText('6 de 11')).toBeInTheDocument();
    });

    it('detalhe: conta do retorno, secundários, tendência de 6 meses e serviços', async () => {
        mount(`/financeiro/performance?de=2026-09-01&ate=2026-09-30&pro=${ANA}`);
        await screen.findByTestId('detail-headline');
        fireEvent.click(screen.getByRole('button', { name: /Ver a conta/ }));
        const conta = screen.getByTestId('retorno-breakdown');
        expect(within(conta).getByText('Serviços')).toBeInTheDocument();
        expect(within(conta).getByText('R$ 620,00')).toBeInTheDocument();
        expect(within(conta).getByText('− R$ 257,00')).toBeInTheDocument();
        expect(within(conta).getByText('− R$ 45,00')).toBeInTheDocument();

        expect(screen.getByText('12 atendimentos · 2 do Clube')).toBeInTheDocument();
        expect(screen.getByText('7h (1h do Clube)')).toBeInTheDocument();
        expect(screen.getByText('3 de 12 com produto (25%)')).toBeInTheDocument();
        expect(screen.getAllByTestId('trend-month')).toHaveLength(6);
        expect(screen.getByText('corte')).toBeInTheDocument();
    });

    it('detalhe: voltar para a equipe e atalhos para pagamentos (histórico e relatório)', async () => {
        mount(`/financeiro/performance?de=2026-09-01&ate=2026-09-30&pro=${ANA}`);
        await screen.findByTestId('detail-headline');
        fireEvent.click(screen.getByRole('button', { name: /Relatório de comissões/ }));
        expect(await screen.findByTestId('report-modal')).toHaveTextContent('Relatório Ana 2026-09-01 2026-09-30');
        fireEvent.click(screen.getByRole('button', { name: /Toda a equipe/ }));
        await waitFor(() => expect(lastLocation).not.toContain('pro='));
    });

    it('trocar o preset atualiza a URL e a busca', async () => {
        mount();
        await screen.findByTestId('team-overview');
        fireEvent.click(screen.getAllByRole('button', { name: 'Mês passado' })[0]);
        await waitFor(() => expect(lastLocation).toContain('de=2026-09-01&ate=2026-09-30'));
        fireEvent.click(screen.getAllByRole('button', { name: 'Este mês' })[0]);
        await waitFor(() => expect(fetchStaffPerformance).toHaveBeenLastCalledWith(expect.objectContaining({ start: '2026-10-01', end: '2026-10-31' })));
    });

    it('carregando: skeleton com aria-busy', async () => {
        fetchStaffPerformance.mockImplementation(() => new Promise(() => {}));
        mount();
        expect(await screen.findByTestId('performance-loading')).toHaveAttribute('aria-busy', 'true');
    });

    it('vazio: mensagem e botão "Mês passado"', async () => {
        fetchStaffPerformance.mockResolvedValue(emptyTeam());
        mount('/financeiro/performance');
        expect(await screen.findByText('Nenhum atendimento concluído neste período.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: "Ver 'Mês passado'" }));
        await waitFor(() => expect(lastLocation).toContain('de=2026-09-01&ate=2026-09-30'));
    });

    it('erro: mensagem + "Tentar de novo" refaz a busca', async () => {
        fetchStaffPerformance.mockRejectedValueOnce(new Error('boom'));
        mount();
        expect(await screen.findByText('Não foi possível carregar a performance.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
        expect(await screen.findByTestId('team-overview')).toBeInTheDocument();
        expect(fetchStaffPerformance).toHaveBeenCalledTimes(2);
    });

    it('RPC ainda não publicada: estado honesto, sem números', async () => {
        fetchStaffPerformance.mockRejectedValue({ code: 'PGRST202', message: 'Could not find the function' });
        mount();
        expect(await screen.findByText('A análise de performance ainda não foi ativada.')).toBeInTheDocument();
        expect(screen.queryByTestId('team-overview')).not.toBeInTheDocument();
    });

    it('selo "Mês em andamento" quando o período é parcial', async () => {
        const t = structuredClone(team) as any;
        t.period.partial = true;
        fetchStaffPerformance.mockResolvedValue(t);
        mount();
        expect(await screen.findByText('Mês em andamento')).toBeInTheDocument();
    });

    it('faixa de qualidade de dados quando há atendimentos sem registro financeiro', async () => {
        const t = structuredClone(team) as any;
        t.members[0].quality.sem_registro_financeiro = 4;
        fetchStaffPerformance.mockResolvedValue(t);
        mount();
        const q = await screen.findByTestId('data-quality');
        expect(q).toHaveTextContent('Atenção aos dados deste período');
        // soma da equipe: os 4 de Ana + os de "Sem profissional"
        expect(q).toHaveTextContent(`${4 + team.unassigned!.sem_registro_financeiro} atendimentos sem registro financeiro: comissão não calculada`);
        expect(q).toHaveTextContent('Conclua pelo botão Concluir e cobrar para registrar a comissão.');
    });

    it('detalhe: lançamentos paginados (20) e vazio honesto, sem PII no console', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        fetchPerformanceLedger.mockResolvedValue(
            Array.from({ length: 21 }, (_, i) => ({
                id: `a${i}`,
                kind: 'atendimento',
                at: '2026-09-02T13:00:00-03:00',
                title: 'Corte',
                amount: 50,
                clientName: `Cliente ${i}`,
                club: false,
            })),
        );
        mount(`/financeiro/performance?de=2026-09-01&ate=2026-09-30&pro=${ANA}`);
        await screen.findByRole('heading', { name: 'Lançamentos' });
        expect(screen.getByText('21 no período')).toBeInTheDocument();
        expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
        expect(screen.getAllByText('Cliente 0').length).toBeGreaterThan(0);
        expect(screen.queryByText('Cliente 20')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
        expect(screen.getByText('Cliente 20')).toBeInTheDocument();
        expect(spy.mock.calls.flat().join(' ')).not.toMatch(/Cliente/);
        expect(err.mock.calls.flat().join(' ')).not.toMatch(/Cliente/);
        spy.mockRestore();
        err.mockRestore();
    });

    it('detalhe: lançamentos vazios', async () => {
        mount(`/financeiro/performance?de=2026-09-01&ate=2026-09-30&pro=${ANA}`);
        expect(await screen.findByText('Nenhum lançamento neste período.')).toBeInTheDocument();
    });

    it('link "← Pagamento de comissão" volta ao Financeiro', async () => {
        mount();
        await screen.findByTestId('team-overview');
        fireEvent.click(screen.getByRole('link', { name: /Pagamento de comissão/ }));
        await waitFor(() => expect(lastLocation).toBe('/financeiro?tab=commissions'));
    });
});
