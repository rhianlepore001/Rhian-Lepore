import { describe, expect, it } from 'vitest';
import { buildCommissionPdfModel, type CommissionReportShareInput } from '@/utils/commissionReport';
import { generateCommissionPdf } from '@/utils/commissionPdf';

const money = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

function shareInput(rows: number): CommissionReportShareInput {
    return {
        professionalName: 'Ana Souza',
        periodLabel: '06/08 – 05/09/2026',
        commissionRate: 40,
        records: Array.from({ length: rows }, (_, i) => ({
            created_at: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T12:00:00.000Z`,
            service_name: `Serviço ${i + 1}`,
            client_name: `Cliente ${i + 1}`,
            amount: 50,
            machine_fee_amount: 0,
            commission_base: 50,
            commission_rate: 40,
            commission_value: 20,
        })),
        totals: { gross: 50 * rows, fee: 0, base: 50 * rows, commission: 20 * rows },
        paidAtLabel: 'Pago em 10/09/2026',
        businessName: 'Studio Atlas',
        businessType: 'Barbearia',
        formatMoney: money,
    };
}

describe('generateCommissionPdf', () => {
    it('resumo cabe em uma página e o blob é PDF', async () => {
        const model = buildCommissionPdfModel(shareInput(3), 'resumido', new Date('2026-10-04T15:00:00.000Z'));
        const { blob, pageCount } = await generateCommissionPdf(model);
        expect(pageCount).toBe(1);
        expect(blob.type).toMatch(/pdf/);
        expect(blob.size).toBeGreaterThan(500);
    });

    it('detalhado com 25 linhas quebra página', async () => {
        const model = buildCommissionPdfModel(shareInput(25), 'detalhado', new Date('2026-10-04T15:00:00.000Z'));
        const { blob, pageCount } = await generateCommissionPdf(model);
        expect(pageCount).toBeGreaterThanOrEqual(2);
        expect(blob.size).toBeGreaterThan(800);
    });
});
