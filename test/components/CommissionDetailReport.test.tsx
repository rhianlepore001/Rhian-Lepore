import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let selectArg = '';
let result: { data: unknown; error: unknown } = { data: [], error: null };
vi.mock('../../lib/supabase', () => {
    const q: any = {};
    q.select = (s: string) => { selectArg = s; return q; };
    for (const op of ['eq', 'gte', 'lte', 'order']) q[op] = () => q;
    q.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
    return { supabase: { from: () => q } };
});
const AUTH = { user: { id: 'owner-1' }, region: 'BR', userType: 'barber', businessName: 'Barbearia' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => AUTH }));

import { CommissionDetailReport } from '../../components/CommissionDetailReport';

const mount = () => render(
    <CommissionDetailReport professionalId="ana" professionalName="Ana Souza" commissionRate={40}
        periodStart="2026-08-06" periodEnd="2026-09-05" periodLabel="06/08 – 05/09" currencySymbol="R$"
        accentColor="accent-gold" onClose={() => undefined} />,
);

describe('CommissionDetailReport (B2)', () => {
    beforeEach(() => { selectArg = ''; });

    it('não pede a coluna inexistente finance_records.amount', async () => {
        result = { data: [], error: null };
        mount();
        await screen.findByText(/Nenhum serviço/i);
        expect(selectArg).not.toMatch(/(^|[\s,])amount([\s,]|$)/);
        expect(selectArg).toMatch(/revenue/);
    });

    it('usa só a comissão registrada (não estima quando commission_value é 0)', async () => {
        result = { data: [
            { id: 'r1', created_at: '2026-08-10T12:00:00Z', service_name: 'Corte', client_name: null, description: null, revenue: 100, payment_method: 'pix', commission_rate: 40, commission_value: 40, appointments: null },
            { id: 'r2', created_at: '2026-08-11T12:00:00Z', service_name: 'Barba', client_name: null, description: null, revenue: 50, payment_method: 'pix', commission_rate: 40, commission_value: 0, appointments: null },
        ], error: null };
        mount();
        expect(await screen.findByTestId('report-total-commission')).toHaveTextContent(/40,00/);
    });

    it('erro mostra mensagem, não "Nenhum serviço"', async () => {
        result = { data: null, error: { code: '42703' } };
        mount();
        expect(await screen.findByText('Não foi possível carregar o relatório.')).toBeInTheDocument();
        expect(screen.queryByText(/Nenhum serviço/i)).toBeNull();
    });
});
