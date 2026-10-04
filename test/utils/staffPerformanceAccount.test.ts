import { describe, expect, it } from 'vitest';
import team from '../fixtures/staffPerformance/team.json';
import staff from '../fixtures/staffPerformance/staff.json';
import { getBusinessRemainderNoun } from '../../utils/businessCopy';
import {
    MEMBER_METRIC_IDS,
    STAFF_METRIC_IDS,
    TEAM_METRIC_IDS,
    buildMetricAccount,
    metricSpan,
    reconstructMetric,
    type MetricKey,
} from '../../utils/staffPerformanceAccount';
import { ownerPerformanceSchema, staffPerformanceSchema } from '../../types/staffPerformance';

const brl = (v: number) =>
    `R$ ${Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const data = ownerPerformanceSchema.parse(team);
const ana = data.members.find((m) => m.name === 'Ana')!;
const staffData = staffPerformanceSchema.parse(staff);
const remainder = getBusinessRemainderNoun('barber');

function closeEnough(a: number | null, b: number | null) {
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(Math.abs((a as number) - (b as number))).toBeLessThanOrEqual(0.005);
}

describe('staffPerformanceAccount — a conta fecha com o valor do card', () => {
    const opts = {
        formatMoney: brl,
        remainder,
        personName: 'Ana',
        voice: 'member' as const,
        previous: ana.previous,
        previousName: 'agosto',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
    };

    it.each(MEMBER_METRIC_IDS)('Ana · %s', (id: MetricKey) => {
        const account = buildMetricAccount(id, ana.metrics, opts);
        const reconstructed = reconstructMetric(id, ana.metrics);
        closeEnough(account.cardValue, reconstructed);
        expect(account.reconstructed).toBe(reconstructed);
        expect(account.lines.length).toBeGreaterThan(0);
        expect(account.meaning.length).toBeGreaterThan(10);
        expect(account.title).toBe(account.label);
        expect(account.period).toBe('setembro');
        expect(account.title).not.toMatch(/p\.p\./);
    });

    it.each(TEAM_METRIC_IDS)('equipe · %s', (id: MetricKey) => {
        const totals = data.team_totals!;
        const account = buildMetricAccount(id, totals, {
            ...opts,
            personName: 'a equipe',
            voice: 'team',
            previous: data.team_previous,
        });
        closeEnough(account.cardValue, reconstructMetric(id, totals));
        expect(account.label).not.toMatch(/Retorno para a casa/i);
    });

    it.each(STAFF_METRIC_IDS)('colaborador · %s', (id: MetricKey) => {
        const account = buildMetricAccount(id, staffData.me.metrics, {
            ...opts,
            voice: 'self',
            personName: 'Ana',
            previous: staffData.me.previous,
        });
        closeEnough(account.cardValue, reconstructMetric(id, staffData.me.metrics));
        expect(account.meaning.toLowerCase()).not.toContain('para a casa');
    });

    it('retorno de Ana: 620 + 90 + 0 − 257 − 45 = 408', () => {
        const account = buildMetricAccount('retorno', ana.metrics, opts);
        expect(account.cardValue).toBe(408);
        expect(account.reconstructed).toBe(408);
        expect(account.lines.find((l) => l.emphasize)?.value).toBe('R$ 408,00');
        expect(account.lines.filter((l) => l.muted).map((l) => l.label)).toContain('Outros lançamentos');
        expect(account.comparison).toBe('Em agosto ficaram R$ 360,00. Agora, R$ 48,00 a mais.');
        expect(account.label).toBe('Ficou para a barbearia');
    });

    it('voltou: 6 ÷ 11 = 55%, janela de 2 dias', () => {
        const account = buildMetricAccount('voltou', ana.metrics, opts);
        expect(account.value).toBe('55%');
        expect(account.hint).toBe('6 de 11 clientes');
        expect(account.meaning).toContain('em até 2 dias');
        expect(account.comparison).toBe('subiu de 50% para 55%');
        expect(account.comparisonCaption).toBe('Comparado com agosto');
        expect(account.lines.find((l) => l.kind === 'formula')?.numerator).toBe('6 clientes marcaram de novo');
        expect(account.lines.find((l) => l.kind === 'note')?.label).toBe('Ainda esperando: 1 cliente atendido há menos de 2 dias');
        expect(account.lines.filter((l) => l.kind !== 'formula' && l.kind !== 'note')).toHaveLength(0);
    });

    it('equipe: comissão da equipe, não “de a equipe”', () => {
        const totals = data.team_totals!;
        const account = buildMetricAccount('retorno', totals, {
            ...opts,
            personName: 'a equipe',
            voice: 'team',
            previous: data.team_previous,
        });
        expect(account.lines.map((l) => l.label)).toContain('Comissão da equipe');
        expect(account.lines.map((l) => l.label).join(' ')).not.toMatch(/Comissão de a /);
    });

    it('tipo desconhecido não inventa barbearia', () => {
        const account = buildMetricAccount('retorno', ana.metrics, {
            ...opts,
            remainder: getBusinessRemainderNoun(null),
        });
        expect(account.label).toBe('Ficou para o negócio');
    });

    it.each([
        ['equipe', TEAM_METRIC_IDS],
        ['colaborador', MEMBER_METRIC_IDS],
        ['meus resultados', STAFF_METRIC_IDS],
    ])('%s: cards de meia largura entram em pares no grid', (_label, ids) => {
        let pending = 0;
        for (const id of ids) {
            if (metricSpan(id) !== 'narrow') expect(pending % 2).toBe(0);
            else pending += 1;
        }
        expect(pending % 2).toBe(0);
    });
});
