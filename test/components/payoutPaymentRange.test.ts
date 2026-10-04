import { describe, expect, it } from 'vitest';
import { payoutDueAmount, payoutPaymentRange, type PayoutRowData } from '../../components/commissions/PayoutList';
import { formatIsoToBr, parseBrToIso } from '../../utils/commissionCycle';

const cycle = { start: '2026-09-06', end: '2026-10-05' };
const previousEnd = '2026-09-05';

const eva = (over: Partial<PayoutRowData> = {}): PayoutRowData => ({
    professional_id: '20000000-0000-0000-0000-0000000000f1',
    professional_name: 'Eva',
    photo_url: null,
    commission_rate: 40,
    total_due: 0,
    services_pending: 0,
    products_pending: 0,
    cycle: {
        status: 'pendente',
        saldo_acumulado: 15,
        saldo_anterior: 15,
        inactive: true,
        pago_ciclo: null,
        pago_calculado: 0,
        paid_at: null,
        primeiro_nao_pago: '2026-08-20',
    },
    ...over,
});

const ana: PayoutRowData = {
    professional_id: '20000000-0000-0000-0000-0000000000a1',
    professional_name: 'Ana',
    photo_url: null,
    commission_rate: 40,
    total_due: 257,
    services_pending: 10,
    products_pending: 3,
    cycle: {
        status: 'pendente',
        saldo_acumulado: 257,
        saldo_anterior: 0,
        inactive: false,
        pago_ciclo: null,
        pago_calculado: 0,
        paid_at: null,
        primeiro_nao_pago: '2026-09-08',
    },
};

describe('payoutPaymentRange — saldo de ciclos anteriores', () => {
    it('Eva: datas cobrem o lançamento não pago (20/08–05/09) e o valor marcado (15)', () => {
        expect(payoutDueAmount(eva())).toBe(15);
        expect(payoutPaymentRange(eva(), cycle, previousEnd)).toEqual({
            start: '2026-08-20',
            end: '2026-09-05',
            amount: 15,
        });
    });

    it('Ana no ciclo atual: datas e valor do ciclo exibido', () => {
        expect(payoutPaymentRange(ana, cycle, previousEnd)).toEqual({
            start: '2026-09-06',
            end: '2026-10-05',
            amount: 257,
        });
    });

    it('não usa saldo_acumulado quando só há saldo anterior (overpay Multi/EvaLike)', () => {
        expect(payoutDueAmount(eva({ cycle: { ...eva().cycle!, saldo_acumulado: 25, saldo_anterior: 15 } }))).toBe(15);
        expect(payoutDueAmount(eva({
            cycle: { ...eva().cycle!, saldo_acumulado: 70, saldo_anterior: 30, primeiro_nao_pago: '2026-06-10' },
        }))).toBe(30);
        expect(payoutPaymentRange(eva({
            cycle: { ...eva().cycle!, saldo_acumulado: 70, saldo_anterior: 30, primeiro_nao_pago: '2026-06-10' },
        }), cycle, previousEnd)).toEqual({ start: '2026-06-10', end: '2026-09-05', amount: 30 });
    });
});

describe('datas pt-BR do modal', () => {
    it('formata e lê dd/mm/aaaa sem aceitar 31/02', () => {
        expect(formatIsoToBr('2026-08-20')).toBe('20/08/2026');
        expect(parseBrToIso('20/08/2026')).toBe('2026-08-20');
        expect(parseBrToIso('31/02/2026')).toBeNull();
    });
});

describe('payoutPaymentRange — exceção do colaborador (PR-D)', () => {
    const own = { start: '2026-09-28', end: '2026-10-04', pay_due: '2026-10-04', frequency: 'weekly' };
    const semanal = eva({
        professional_name: 'Semanal',
        total_due: 70,
        cycle: { ...eva().cycle!, inactive: false, saldo_anterior: 0, own },
    });

    it('usa a janela própria, não o ciclo do negócio', () => {
        expect(payoutPaymentRange(semanal, cycle, previousEnd)).toEqual({ start: '2026-09-28', end: '2026-10-04', amount: 70 });
    });

    it('janela própria em andamento: paga até hoje', () => {
        expect(payoutPaymentRange(semanal, cycle, previousEnd, { today: '2026-10-01', open: false }))
            .toEqual({ start: '2026-09-28', end: '2026-10-01', amount: 70 });
    });

    it('rótulo da exceção', async () => {
        const { ownCycleLabel } = await import('../../components/commissions/PayoutList');
        expect(ownCycleLabel(own)).toBe('Exceção · Semanal · 28/09 – 04/10');
    });
});
