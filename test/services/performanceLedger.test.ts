import { beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }));

import { fetchPerformanceLedger, ledgerBounds } from '../../services/performanceLedger';

function chain(result: { data: unknown; error: unknown }) {
    const q: Record<string, unknown> = {};
    const self = () => q;
    q.select = vi.fn(self);
    q.eq = vi.fn(self);
    q.in = vi.fn(self);
    q.gte = vi.fn(self);
    q.lt = vi.fn(self);
    q.order = vi.fn().mockResolvedValue(result);
    return q;
}

describe('fetchPerformanceLedger (R7.6)', () => {
    beforeEach(() => from.mockReset());

    it('uma query de atendimentos + uma de produtos (sem N+1), tenant da sessão, período [de, até+1)', async () => {
        const apts = chain({
            data: [
                { id: 'a1', appointment_time: '2026-09-02T13:00:00-03:00', service: 'Corte', price: 50, payment_method: 'pix', status: 'Completed', clients: { name: 'Cliente A' } },
                { id: 'a2', appointment_time: '2026-09-03T10:00:00-03:00', service: 'Barba', price: 0, payment_method: 'membership', status: 'Completed', clients: { name: 'Cliente B' } },
            ],
            error: null,
        });
        const sales = chain({
            data: [
                { id: 's1', created_at: '2026-09-02T13:20:00-03:00', quantity: 1, total_revenue: 30, products: { name: 'Pomada' }, clients: { name: 'Cliente A' } },
            ],
            error: null,
        });
        from.mockImplementation((t: string) => (t === 'appointments' ? apts : sales));

        const rows = await fetchPerformanceLedger({
            companyId: 'owner-1',
            professionalId: 'ana',
            start: '2026-09-01',
            end: '2026-09-30',
            tz: 'America/Sao_Paulo',
        });

        expect(from).toHaveBeenCalledTimes(2);
        expect(from).toHaveBeenCalledWith('appointments');
        expect(from).toHaveBeenCalledWith('product_sales');
        expect(apts.eq).toHaveBeenCalledWith('user_id', 'owner-1');
        expect(apts.eq).toHaveBeenCalledWith('professional_id', 'ana');
        expect(apts.gte).toHaveBeenCalledWith('appointment_time', '2026-09-01T00:00:00-03:00');
        expect(apts.lt).toHaveBeenCalledWith('appointment_time', '2026-10-01T00:00:00-03:00');
        expect(sales.eq).toHaveBeenCalledWith('company_id', 'owner-1');
        expect(rows).toHaveLength(3);
        expect(rows[0]).toMatchObject({ kind: 'atendimento', title: 'Corte', amount: 50, clientName: 'Cliente A' });
        expect(rows[1]).toMatchObject({ kind: 'produto', title: 'Pomada', amount: 30 });
        expect(rows[2]).toMatchObject({ kind: 'atendimento', title: 'Barba', club: true, amount: 0 });
    });

    it('página 20; não loga nome de cliente', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        const many = Array.from({ length: 25 }, (_, i) => ({
            id: `a${i}`,
            appointment_time: `2026-09-01T10:${String(i).padStart(2, '0')}:00-03:00`,
            service: 'Corte',
            price: 50,
            payment_method: 'pix',
            status: 'Completed',
            clients: { name: `Pessoa ${i}` },
        }));
        from.mockImplementation((t: string) => chain({ data: t === 'appointments' ? many : [], error: null }));
        const rows = await fetchPerformanceLedger({ companyId: 'o', professionalId: 'p', start: '2026-09-01', end: '2026-09-30', tz: 'America/Sao_Paulo' });
        expect(rows).toHaveLength(25);
        expect(spy.mock.calls.flat().join(' ')).not.toMatch(/Pessoa/);
        expect(err.mock.calls.flat().join(' ')).not.toMatch(/Pessoa/);
        spy.mockRestore();
        err.mockRestore();
    });

    it('limites no fuso do tenant: São Paulo (−03) e Lisboa (borda WEST→WET)', () => {
        expect(ledgerBounds('2026-09-01', '2026-09-30', 'America/Sao_Paulo')).toEqual({
            from: '2026-09-01T00:00:00-03:00',
            to: '2026-10-01T00:00:00-03:00',
        });
        expect(ledgerBounds('2026-10-25', '2026-10-25', 'Europe/Lisbon')).toEqual({
            from: '2026-10-25T00:00:00+01:00',
            to: '2026-10-26T00:00:00+00:00',
        });
    });
});
