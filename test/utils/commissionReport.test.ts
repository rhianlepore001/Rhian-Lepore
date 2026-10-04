import { describe, expect, it } from 'vitest';
import { getBusinessCopy } from '@/utils/businessCopy';
import { zonedDateTimeToIso } from '@/utils/businessTimezone';
import {
    buildCommissionPdfModel,
    commissionPdfFileName,
    commissionReportFilters,
    formatPaidAtLabel,
    groupPaidRecordsByTimestamp,
    historyPaidAtRangeBounds,
    periodLabelFromRange,
    reportBusinessTypeHeading,
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

    it('preserva a string crua com microsegundos como chave do grupo', () => {
        const paidAt = '2026-09-10T15:00:00.123456+00:00';
        const groups = groupPaidRecordsByTimestamp(
            [{ commission_paid_at: paidAt, created_at: '2026-08-10T12:00:00.000Z', commission_value: 10 }],
            [],
            'Europe/Lisbon',
        );
        expect(groups[0].paidAt).toBe(paidAt);
        expect(groups[0].paidAt).not.toBe(new Date(paidAt).toISOString());
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

    it('modo pago usa a string crua com microsegundos, nunca toISOString', () => {
        const paidAt = '2026-09-10T15:00:00.123456+00:00';
        const truncated = new Date(paidAt).toISOString();
        expect(truncated).toBe('2026-09-10T15:00:00.123Z');
        expect(truncated).not.toBe(paidAt);
        const filters = commissionReportFilters({
            mode: 'paid',
            userId: 'owner-1',
            professionalId: 'ana',
            periodStart: '2026-08-06',
            periodEnd: '2026-09-05',
            paidAt,
        });
        expect(filters.eq).toContainEqual(['commission_paid_at', paidAt]);
        expect(filters.eq).not.toContainEqual(['commission_paid_at', truncated]);
        const raw = filters.eq.find(([col]) => col === 'commission_paid_at')?.[1];
        expect(raw).toBe(paidAt);
        expect(String(raw)).toContain('.123456');
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

describe('historyPaidAtRangeBounds', () => {
    it('usa meia-noite no fuso do negócio, não T00:00:00 UTC', () => {
        const lisbon = historyPaidAtRangeBounds('2026-08-06', '2026-09-05', 'Europe/Lisbon');
        expect(lisbon.gte).toBe(zonedDateTimeToIso('2026-08-06', '00:00', 'Europe/Lisbon'));
        expect(lisbon.lt).toBe(zonedDateTimeToIso('2026-09-06', '00:00', 'Europe/Lisbon'));
        expect(lisbon.gte).toBe('2026-08-06T00:00:00+01:00');
        expect(lisbon.lt).toBe('2026-09-06T00:00:00+01:00');
        expect(lisbon.gte).not.toBe('2026-08-06T00:00:00');

        const sp = historyPaidAtRangeBounds('2026-08-06', '2026-09-05', 'America/Sao_Paulo');
        expect(sp.gte).toBe('2026-08-06T00:00:00-03:00');
        expect(sp.lt).toBe('2026-09-06T00:00:00-03:00');
    });
});

describe('periodLabelFromRange', () => {
    const tz = 'Europe/Lisbon';

    it('mostra o ano no período (mesmo ano compacto)', () => {
        expect(periodLabelFromRange('2026-08-06', '2026-09-05', tz)).toBe('06/08 – 05/09/2026');
    });

    it('mostra os dois anos quando o período cruza o ano', () => {
        expect(periodLabelFromRange('2025-12-06', '2026-01-05', tz)).toBe('06/12/2025 – 05/01/2026');
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

describe('PDF model e nome do arquivo', () => {
    const share = {
        professionalName: 'Ana Souza',
        cpf: '123.456.789-00',
        periodLabel: '06/08 – 05/09/2026',
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
        businessType: 'Barbearia',
        formatMoney: money,
    };

    it('resumo tem cabeçalho, info, totais e só a contagem de serviços', () => {
        const model = buildCommissionPdfModel(share, 'resumido', new Date('2026-10-04T15:00:00.000Z'));
        expect(model.businessName).toBe('Studio Atlas');
        expect(model.businessTypeHeading).toBe('Barbearia');
        expect(model.title).toBe('Relatório resumido de comissões');
        expect(model.professionalName).toBe('Ana Souza');
        expect(model.periodLabel).toBe('06/08 – 05/09/2026');
        expect(model.commissionRate).toBe(40);
        expect(model.statusLabel).toBe('Pago em 10/09/2026');
        expect(model.serviceCount).toBe(2);
        expect(model.totals.commission).toContain('35,20');
        expect(model.generatedAtLabel).toMatch(/^Gerado pelo AgendiX em /);
        expect(model.rows).toHaveLength(2);
    });

    it('detalhado inclui cada linha da tabela', () => {
        const model = buildCommissionPdfModel(share, 'detalhado');
        expect(model.title).toBe('Relatório detalhado de comissões');
        expect(model.rows.map((r) => r.service)).toEqual(['Corte', 'Barba']);
        expect(model.rows[0].client).toBe('João');
        expect(model.rows[1].client).toBe('—');
        expect(model.rows[0].date).toBe('10/08');
        expect(model.statusLabel).toBe('Pago em 10/09/2026');
    });

    it('pendente aparece no status quando não há paidAtLabel', () => {
        const model = buildCommissionPdfModel({ ...share, paidAtLabel: null }, 'resumido');
        expect(model.statusLabel).toBe('Pendente');
    });

    it('nome do arquivo segue comissao-<nome>-<periodo>-<variante>.pdf', () => {
        expect(commissionPdfFileName({
            professionalName: 'Ana Souza',
            periodLabel: '06/08 – 05/09/2026',
            variant: 'resumido',
        })).toBe('comissao-ana-souza-06-08-05-09-2026-resumido.pdf');
        expect(commissionPdfFileName({
            professionalName: 'Caio Lima',
            periodLabel: '06/08 – 05/09/2026',
            variant: 'detalhado',
        })).toBe('comissao-caio-lima-06-08-05-09-2026-detalhado.pdf');
    });

    it('tipo do negócio usa o helper, capitaliza no cabeçalho e cai em negócio', () => {
        expect(reportBusinessTypeLabel('barber')).toBe(getBusinessCopy('barber').businessNoun);
        expect(reportBusinessTypeLabel('beauty')).toBe(getBusinessCopy('beauty').businessNoun);
        expect(reportBusinessTypeLabel(null)).toBe('negócio');
        expect(reportBusinessTypeLabel('studio')).toBe('negócio');
        expect(reportBusinessTypeHeading('barber')).toBe('Barbearia');
        expect(reportBusinessTypeHeading('beauty')).toBe('Salão');
        expect(reportBusinessTypeHeading(null)).toBe('Negócio');
        expect(formatPaidAtLabel('2026-09-10T15:00:00.000Z', 'Europe/Lisbon')).toBe('Pago em 10/09/2026');
    });
});
