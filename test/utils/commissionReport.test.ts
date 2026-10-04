import { describe, expect, it } from 'vitest';
import { getBusinessCopy } from '@/utils/businessCopy';
import {
    buildDetailedPdfLines,
    buildSummaryPdfLines,
    commissionPdfFileName,
    commissionReportFilters,
    formatPaidAtLabel,
    groupPaidRecordsByTimestamp,
    reportBusinessTypeLabel,
    resolveCommissionServiceName,
} from '@/utils/commissionReport';

const money = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

describe('groupPaidRecordsByTimestamp', () => {
    const tz = 'Europe/Lisbon';

    it('dois pagamentos no mesmo dia geram 2 grupos (timestamp exato, não dia UTC)', () => {
        const morning = '2026-09-10T09:00:00.000Z';
        const afternoon = '2026-09-10T18:30:00.000Z';
        const groups = groupPaidRecordsByTimestamp(
            [
                { commission_paid_at: morning, created_at: '2026-08-10T12:00:00.000Z', commission_value: 40 },
                { commission_paid_at: morning, created_at: '2026-08-11T12:00:00.000Z', commission_value: 20 },
                { commission_paid_at: afternoon, created_at: '2026-09-01T12:00:00.000Z', commission_value: 80 },
            ],
            [
                { paid_at: morning, start_date: '2026-08-06', end_date: '2026-09-05' },
                { paid_at: afternoon, start_date: '2026-09-06', end_date: '2026-09-10' },
            ],
            tz,
        );
        expect(groups).toHaveLength(2);
        expect(groups.map((g) => g.paidAt)).toEqual([afternoon, morning]);
        expect(groups[1].amount).toBe(60);
        expect(groups[1].servicesCount).toBe(2);
        expect(groups[1].periodStart).toBe('2026-08-06');
        expect(groups[1].periodEnd).toBe('2026-09-05');
        expect(groups[0].amount).toBe(80);
        expect(groups[0].periodStart).toBe('2026-09-06');
        expect(groups[0].periodEnd).toBe('2026-09-10');
    });

    it('sem commission_payments usa min/max created_at no fuso do negócio', () => {
        const paidAt = '2026-09-10T23:30:00.000Z';
        const groups = groupPaidRecordsByTimestamp(
            [
                { commission_paid_at: paidAt, created_at: '2026-08-06T01:00:00.000Z', commission_value: 10 },
                { commission_paid_at: paidAt, created_at: '2026-09-05T22:00:00.000Z', commission_value: 15 },
            ],
            [],
            'Europe/Lisbon',
        );
        expect(groups).toHaveLength(1);
        expect(groups[0].periodStart).toBe('2026-08-06');
        expect(groups[0].periodEnd).toBe('2026-09-05');
        expect(groups[0].amount).toBe(25);
    });

    it('não agrupa pelo dia UTC de toISOString', () => {
        const a = '2026-10-01T00:30:00.000Z';
        const b = '2026-10-01T22:00:00.000Z';
        expect(new Date(a).toISOString().split('T')[0]).toBe(new Date(b).toISOString().split('T')[0]);
        const groups = groupPaidRecordsByTimestamp(
            [
                { commission_paid_at: a, created_at: a, commission_value: 1 },
                { commission_paid_at: b, created_at: b, commission_value: 2 },
            ],
            [],
            'America/Sao_Paulo',
        );
        expect(groups).toHaveLength(2);
    });
});

describe('commissionReportFilters', () => {
    it('modo pago filtra commission_paid=true e o timestamp exato, sem período created_at', () => {
        const paidAt = '2026-09-10T15:00:00.123Z';
        const filters = commissionReportFilters({
            mode: 'paid',
            userId: 'owner-1',
            professionalId: 'ana',
            periodStart: '2026-08-06',
            periodEnd: '2026-09-05',
            paidAt,
        });
        expect(filters.eq).toContainEqual(['commission_paid', true]);
        expect(filters.eq).toContainEqual(['commission_paid_at', paidAt]);
        expect(filters.eq).toContainEqual(['professional_id', 'ana']);
        expect(filters.gte).toBeUndefined();
        expect(filters.lte).toBeUndefined();
    });

    it('modo pendente filtra commission_paid=false e o período', () => {
        const filters = commissionReportFilters({
            mode: 'pending',
            userId: 'owner-1',
            professionalId: 'ana',
            periodStart: '2026-08-06',
            periodEnd: '2026-09-05',
        });
        expect(filters.eq).toContainEqual(['commission_paid', false]);
        expect(filters.gte).toEqual(['created_at', '2026-08-06']);
        expect(filters.lte).toEqual(['created_at', '2026-09-05T23:59:59']);
        expect(filters.eq.some(([col]) => col === 'commission_paid_at')).toBe(false);
    });
});

describe('resolveCommissionServiceName', () => {
    it('cai de service_name para description e depois para o serviço do agendamento', () => {
        expect(resolveCommissionServiceName({ service_name: 'Corte', description: 'x', appointments: { service: 'y' } })).toBe('Corte');
        expect(resolveCommissionServiceName({ service_name: '—', description: 'Barba', appointments: { service: 'y' } })).toBe('Barba');
        expect(resolveCommissionServiceName({
            service_name: '',
            description: null,
            appointments: { service: 'Degradê' },
        })).toBe('Degradê');
        expect(resolveCommissionServiceName({
            service_name: null,
            description: '  ',
            appointments: [{ service: 'Pigmentação' }],
        })).toBe('Pigmentação');
        expect(resolveCommissionServiceName({ service_name: null, description: null, appointments: null })).toBe('—');
    });
});

describe('PDF builders e nome do arquivo', () => {
    const share = {
        professionalName: 'Ana Souza',
        cpf: '123.456.789-00',
        periodLabel: '06/08 – 05/09',
        commissionRate: 40,
        records: [
            {
                created_at: '2026-08-10T12:00:00.000Z',
                service_name: 'Corte',
                client_name: 'João',
                amount: 50,
                machine_fee_amount: 0,
                commission_base: 50,
                commission_rate: 40,
                commission_value: 20,
            },
            {
                created_at: '2026-08-11T12:00:00.000Z',
                service_name: 'Barba',
                client_name: null,
                amount: 40,
                machine_fee_amount: 2,
                commission_base: 38,
                commission_rate: 40,
                commission_value: 15.2,
            },
        ],
        totals: { gross: 90, fee: 2, base: 88, commission: 35.2 },
        paidAtLabel: 'Pago em 10/09/2026',
        businessName: 'Studio Atlas',
        businessType: 'negócio',
        formatMoney: money,
    };

    it('resumo tem totais e não lista cada serviço', () => {
        const lines = buildSummaryPdfLines(share);
        expect(lines.join('\n')).toContain('Studio Atlas');
        expect(lines.join('\n')).toContain('negócio');
        expect(lines.join('\n')).toContain('Relatório resumido de comissões');
        expect(lines.join('\n')).toContain('Profissional: Ana Souza');
        expect(lines.join('\n')).toContain('Período: 06/08 – 05/09');
        expect(lines.join('\n')).toContain('Comissão: 40%');
        expect(lines.join('\n')).toContain('Subtotal bruto');
        expect(lines.join('\n')).toContain('Base de cálculo');
        expect(lines.join('\n')).toContain('Valor líquido a receber');
        expect(lines.join('\n')).toContain('Pago em 10/09/2026');
        expect(lines.join('\n')).not.toContain('Corte');
        expect(lines.join('\n')).not.toContain('João');
    });

    it('detalhado inclui cada linha para conferência', () => {
        const lines = buildDetailedPdfLines(share);
        expect(lines.join('\n')).toContain('Relatório detalhado de comissões');
        expect(lines.join('\n')).toContain('Corte');
        expect(lines.join('\n')).toContain('João');
        expect(lines.join('\n')).toContain('Barba');
        expect(lines.join('\n')).toContain('Valor');
        expect(lines.join('\n')).toContain('Taxa');
        expect(lines.join('\n')).toContain('Base');
        expect(lines.join('\n')).toContain('Comissão');
        expect(lines.join('\n')).toContain('Valor líquido a receber');
        expect(lines.join('\n')).toContain('Pago em 10/09/2026');
    });

    it('nome do arquivo segue comissao-<nome>-<periodo>-<variante>.pdf', () => {
        expect(commissionPdfFileName({
            professionalName: 'Ana Souza',
            periodLabel: '06/08 – 05/09',
            variant: 'resumido',
        })).toBe('comissao-ana-souza-06-08-05-09-resumido.pdf');
        expect(commissionPdfFileName({
            professionalName: 'Caio Lima',
            periodLabel: '06/08 – 05/09',
            variant: 'detalhado',
        })).toBe('comissao-caio-lima-06-08-05-09-detalhado.pdf');
    });

    it('tipo do negócio usa o helper e cai em negócio', () => {
        expect(reportBusinessTypeLabel('barber')).toBe(getBusinessCopy('barber').businessNoun);
        expect(reportBusinessTypeLabel('beauty')).toBe(getBusinessCopy('beauty').businessNoun);
        expect(reportBusinessTypeLabel(null)).toBe('negócio');
        expect(reportBusinessTypeLabel('studio')).toBe('negócio');
        expect(formatPaidAtLabel('2026-09-10T15:00:00.000Z', 'Europe/Lisbon')).toBe('Pago em 10/09/2026');
    });
});
