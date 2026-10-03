import { describe, expect, it } from 'vitest';
import { payoutDueAmount, payoutPaymentRange, type PayoutRowData } from '../../components/commissions/PayoutList';

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
});
