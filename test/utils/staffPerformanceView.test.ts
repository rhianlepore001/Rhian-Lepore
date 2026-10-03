import { afterEach, describe, expect, it } from 'vitest';
import team from '../fixtures/staffPerformance/team.json';
import { ownerPerformanceSchema } from '../../types/staffPerformance';
import {
    comparisonLabel,
    detectPreset,
    filtersToSearch,
    formatHours,
    formatPercent,
    memberBadge,
    moneyDelta,
    parseFilters,
    periodLabel,
    presetRange,
    rankLabel,
    rateDelta,
    sortMembers,
    summarySentence,
} from '../../utils/staffPerformanceView';

const brl = (v: number | null | undefined) =>
    `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const data = ownerPerformanceSchema.parse(team);
const byName = (n: string) => data.members.find((m) => m.name.startsWith(n))!;

describe('staffPerformanceView — períodos (R3.5, R3.6) sem toISOString', () => {
    const originalTz = process.env.TZ;
    afterEach(() => { process.env.TZ = originalTz; });

    it.each(['Europe/Lisbon', 'America/Sao_Paulo'])('presets em %s com hoje = 02/10/2026 00:30', (tz) => {
        process.env.TZ = tz;
        const today = new Date(2026, 9, 2, 0, 30);
        expect(presetRange('este_mes', today)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
        expect(presetRange('mes_passado', today)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
        expect(presetRange('ultimos_30', today)).toEqual({ start: '2026-09-03', end: '2026-10-02' });
        expect(presetRange('ciclo', today, 5)).toEqual({ start: '2026-09-06', end: '2026-10-05' });
    });

    it('ciclo: depois do dia de acerto vai para o próximo; dia 31 em mês curto', () => {
        expect(presetRange('ciclo', new Date(2026, 8, 29), 5)).toEqual({ start: '2026-09-06', end: '2026-10-05' });
        expect(presetRange('ciclo', new Date(2026, 8, 5), 5)).toEqual({ start: '2026-08-06', end: '2026-09-05' });
        expect(presetRange('ciclo', new Date(2026, 1, 10), 31)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    });

    it('detecta o preset a partir das datas e cai em personalizado', () => {
        const today = new Date(2026, 9, 2);
        expect(detectPreset('2026-10-01', '2026-10-31', today, 5)).toBe('este_mes');
        expect(detectPreset('2026-09-01', '2026-09-30', today, 5)).toBe('mes_passado');
        expect(detectPreset('2026-09-03', '2026-10-02', today, 5)).toBe('ultimos_30');
        expect(detectPreset('2026-09-06', '2026-10-05', today, 5)).toBe('ciclo');
        expect(detectPreset('2026-09-10', '2026-09-20', today, 5)).toBe('personalizado');
    });

    it('rótulos: mês cheio por extenso, outros por intervalo; comparação "vs agosto" / "vs 01–30 ago"', () => {
        expect(periodLabel('2026-09-01', '2026-09-30')).toBe('setembro de 2026');
        expect(periodLabel('2026-09-03', '2026-10-02')).toBe('03/09 – 02/10/2026');
        expect(comparisonLabel({ start: '2026-08-01', end: '2026-08-31' })).toBe('vs agosto');
        expect(comparisonLabel({ start: '2026-08-01', end: '2026-08-30' })).toBe('vs 01–30 ago');
        expect(comparisonLabel({ start: '2026-08-04', end: '2026-09-02' })).toBe('vs 04 ago–02 set');
        expect(comparisonLabel(null)).toBeNull();
    });

    it('URL: lê e escreve de/ate/pro; datas inválidas voltam para "Este mês"', () => {
        const today = new Date(2026, 9, 2);
        expect(parseFilters('?de=2026-09-01&ate=2026-09-30&pro=abc', today)).toEqual({ start: '2026-09-01', end: '2026-09-30', pro: 'abc' });
        expect(parseFilters('?de=2026-13-01&ate=x', today)).toEqual({ start: '2026-10-01', end: '2026-10-31', pro: null });
        expect(parseFilters('?de=2026-09-30&ate=2026-09-01', today)).toEqual({ start: '2026-10-01', end: '2026-10-31', pro: null });
        expect(filtersToSearch({ start: '2026-09-01', end: '2026-09-30', pro: null })).toBe('de=2026-09-01&ate=2026-09-30');
        expect(filtersToSearch({ start: '2026-09-01', end: '2026-09-30', pro: 'abc' })).toBe('de=2026-09-01&ate=2026-09-30&pro=abc');
    });
});

describe('staffPerformanceView — formatos (R3.13, R3.14)', () => {
    it('horas e percentuais', () => {
        expect(formatHours(420)).toBe('7h');
        expect(formatHours(390)).toBe('6h 30min');
        expect(formatHours(45)).toBe('45min');
        expect(formatHours(0)).toBe('—');
        expect(formatPercent(0.5455)).toBe('55%');
        expect(formatPercent(0.0714)).toBe('7%');
        expect(formatPercent(null)).toBe('—');
    });
});

describe('staffPerformanceView — deltas (R3.15)', () => {
    it('dinheiro: ▲ +R$ 48,00 (+13%) e melhor', () => {
        expect(moneyDelta(408, 360, { prevSample: 11, formatMoney: brl })).toEqual({ text: '▲ +R$ 48,00 (+13%)', tone: 'good', label: 'melhor' });
        expect(moneyDelta(300, 360, { prevSample: 11, formatMoney: brl })).toEqual({ text: '▼ −R$ 60,00 (−17%)', tone: 'bad', label: 'pior' });
    });

    it('neutro: |Δ%| < 5%; "novo" quando o anterior é 0; delta zero some', () => {
        expect(moneyDelta(360, 360, { prevSample: 11, formatMoney: brl })).toBeNull();
        expect(moneyDelta(370, 360, { prevSample: 11, formatMoney: brl })).toMatchObject({ tone: 'neutral', label: 'estável' });
        expect(moneyDelta(408, 0, { prevSample: 11, formatMoney: brl })).toEqual({ text: 'novo', tone: 'neutral', label: 'novo' });
        expect(moneyDelta(null, 360, { prevSample: 11, formatMoney: brl })).toBeNull();
        expect(moneyDelta(408, null, { prevSample: 0, formatMoney: brl })).toBeNull();
    });

    it('amostra < 8: mostra o número em cinza, sem melhor/pior; queda simétrica também', () => {
        expect(moneyDelta(408, 360, { prevSample: 5, formatMoney: brl })).toEqual({ text: '▲ +R$ 48,00 (+13%)', tone: 'neutral', label: 'sem_base' });
        expect(moneyDelta(300, 360, { prevSample: 5, formatMoney: brl })).toEqual({ text: '▼ −R$ 60,00 (−17%)', tone: 'neutral', label: 'sem_base' });
        expect(moneyDelta(341, 100, { prevSample: 2, formatMoney: brl })).toMatchObject({ tone: 'neutral', label: 'sem_base' });
    });

    it('1313 vs 385 com amostra suficiente é melhor +241%; a queda simétrica é pior', () => {
        expect(moneyDelta(1313, 385, { prevSample: 12, formatMoney: brl })).toEqual({ text: '▲ +R$ 928,00 (+241%)', tone: 'good', label: 'melhor' });
        expect(moneyDelta(385, 1313, { prevSample: 12, formatMoney: brl })).toEqual({ text: '▼ −R$ 928,00 (−71%)', tone: 'bad', label: 'pior' });
        expect(moneyDelta(408, 360, { prevSample: 11, formatMoney: brl })).toMatchObject({ tone: 'good', label: 'melhor' });
    });

    it('taxas em p.p.; para faltas, cair é bom', () => {
        expect(rateDelta(0.5455, 0.5, { prevSample: 12 })).toEqual({ text: '▲ +5 p.p.', tone: 'good', label: 'melhor' });
        expect(rateDelta(0.04, 0.1, { prevSample: 12, lowerIsBetter: true })).toEqual({ text: '▼ −6 p.p.', tone: 'good', label: 'melhor' });
        expect(rateDelta(0.1, 0.04, { prevSample: 12, lowerIsBetter: true })).toEqual({ text: '▲ +6 p.p.', tone: 'bad', label: 'pior' });
    });
});

describe('staffPerformanceView — ranking e selos (R4.8, R3.9–R3.11)', () => {
    it('posição, selos e ordem padrão: ranqueados primeiro, depois sem posição', () => {
        expect(rankLabel(1)).toBe('1º');
        expect(memberBadge(byName('Caio'), 8)).toBe('Amostra baixa (5 de 8)');
        expect(memberBadge(byName('Rhian'), 8)).toBe('Dono');
        expect(memberBadge(byName('Duda'), 8)).toBe('Inativo');
        expect(memberBadge(byName('Ana'), 8)).toBeNull();
        expect(sortMembers(data.members, 'rank').map((m) => m.name)).toEqual(['Ana', 'Bruno', 'Caio', 'Duda', 'Rhian (dono)']);
    });

    it('ordenar por coluna mantém os sem posição abaixo; ticket desc, faltas asc', () => {
        expect(sortMembers(data.members, 'ticket_medio').map((m) => m.name)).toEqual(['Ana', 'Bruno', 'Rhian (dono)', 'Caio', 'Duda']);
        expect(sortMembers(data.members, 'taxa_faltas').slice(0, 2).map((m) => m.name)).toEqual(['Ana', 'Bruno']);
        expect(sortMembers(data.members, 'taxa_faltas', 'desc').slice(0, 2).map((m) => m.name)).toEqual(['Bruno', 'Ana']);
    });
});

describe('staffPerformanceView — frase-resumo determinística (R7.3)', () => {
    it('Ana: retorno, atendimentos, por hora e comparação com agosto', () => {
        expect(summarySentence(byName('Ana'), { formatMoney: brl, minSample: 8, previousName: 'agosto' }))
            .toBe('Ana deixou R$ 408,00 para a casa em 12 atendimentos (R$ 68,00 por hora), 13% a mais que em agosto.');
    });

    it('amostra baixa e dono', () => {
        expect(summarySentence(byName('Caio'), { formatMoney: brl, minSample: 8, previousName: 'agosto' }))
            .toBe('Caio fez 5 atendimentos: poucos para comparar (mínimo 8).');
        expect(summarySentence(byName('Rhian'), { formatMoney: brl, minSample: 8, previousName: 'agosto' }))
            .toBe('Rhian (dono) fez 3 atendimentos. Como dono, a comissão conta como zero.');
    });

    it('sem anterior comparável: frase sem comparação', () => {
        expect(summarySentence(byName('Bruno'), { formatMoney: brl, minSample: 8, previousName: null }))
            .toBe('Bruno deixou R$ 300,00 para a casa em 15 atendimentos (R$ 40,00 por hora).');
    });
});
