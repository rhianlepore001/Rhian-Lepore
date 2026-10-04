import { afterEach, describe, expect, it } from 'vitest';
import team from '../fixtures/staffPerformance/team.json';
import { ownerPerformanceSchema } from '../../types/staffPerformance';
import { getBusinessRemainderNoun } from '../../utils/businessCopy';
import {
    comparingHeadline,
    comparisonLabel,
    detectPreset,
    emptyPeriodSuggestion,
    filtersToSearch,
    formatHours,
    formatPercent,
    formatWorkHours,
    memberBadge,
    moneyCompareText,
    moneyDelta,
    parseFilters,
    periodLabel,
    periodShortLabel,
    presetRange,
    rankLabel,
    rateCompareText,
    rateDelta,
    remainderModalCompare,
    sortMembers,
    summarySentence,
    unrankedSentence,
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
        expect(periodShortLabel('2026-09-01', '2026-09-30')).toBe('setembro');
        expect(comparingHeadline('2026-09-01', '2026-09-30', { start: '2026-08-01', end: '2026-08-31' }))
            .toBe('Comparando setembro com agosto');
        expect(comparisonLabel({ start: '2026-08-01', end: '2026-08-31' })).toBe('vs agosto');
        expect(comparisonLabel({ start: '2026-08-01', end: '2026-08-30' })).toBe('vs 01–30 ago');
        expect(comparisonLabel({ start: '2026-08-04', end: '2026-09-02' })).toBe('vs 04 ago–02 set');
        expect(comparisonLabel(null)).toBeNull();
    });

    it('empty state sugere outro período, nunca o atual', () => {
        expect(emptyPeriodSuggestion('mes_passado')).toEqual({ id: 'ultimos_30', label: 'Últimos 30 dias' });
        expect(emptyPeriodSuggestion('este_mes')).toEqual({ id: 'mes_passado', label: 'Mês passado' });
        expect(emptyPeriodSuggestion('ultimos_30')).toEqual({ id: 'este_mes', label: 'Este mês' });
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

describe('staffPerformanceView — comparações em frase, sem seta nem p.p.', () => {
    it('dinheiro: "R$ 48,00 a mais que em agosto"', () => {
        expect(moneyCompareText(408, 360, { prevSample: 11, formatMoney: brl, previousName: 'agosto' }))
            .toBe('R$ 48,00 a mais que em agosto');
        expect(moneyCompareText(300, 360, { prevSample: 11, formatMoney: brl, previousName: 'agosto' }))
            .toBe('R$ 60,00 a menos que em agosto');
        expect(moneyDelta(408, 360, { prevSample: 11, formatMoney: brl, previousName: 'agosto' }))
            .toMatchObject({ text: 'R$ 48,00 a mais que em agosto', tone: 'good', label: 'melhor' });
    });

    it('delta zero some; sem valor anterior some', () => {
        expect(moneyDelta(360, 360, { prevSample: 11, formatMoney: brl })).toBeNull();
        expect(moneyDelta(null, 360, { prevSample: 11, formatMoney: brl })).toBeNull();
        expect(moneyDelta(408, null, { prevSample: 0, formatMoney: brl })).toBeNull();
    });

    it('amostra < 8: nenhuma comparação numérica', () => {
        expect(moneyCompareText(408, 360, { prevSample: 5, formatMoney: brl, previousName: 'agosto' }))
            .toBe('Em agosto teve poucos atendimentos para comparar');
        expect(moneyDelta(300, 360, { prevSample: 5, formatMoney: brl, previousName: 'agosto' }))
            .toEqual({ text: 'Em agosto teve poucos atendimentos para comparar', tone: 'neutral', label: 'sem_base' });
        expect(rateCompareText(0, 1, { prevSample: 2, previousName: 'agosto' }))
            .toBe('Em agosto teve poucos atendimentos para comparar');
    });

    it('percentuais: subiu/caiu de X para Y, sem p.p.', () => {
        expect(rateCompareText(0.5455, 0.5, { prevSample: 12 })).toBe('subiu de 50% para 55%');
        expect(rateCompareText(0.04, 0.1, { prevSample: 12, lowerIsBetter: true })).toBe('caiu de 10% para 4%');
        expect(rateDelta(0.1, 0.04, { prevSample: 12, lowerIsBetter: true }))
            .toMatchObject({ text: 'subiu de 4% para 10%', tone: 'bad', label: 'pior' });
        expect(rateCompareText(0.5, 0.5, { prevSample: 12 })).toBeNull();
    });

    it('modal de retorno: "Em agosto ficaram … Agora, … a mais"', () => {
        expect(remainderModalCompare(408, 360, { prevSample: 12, formatMoney: brl, previousName: 'agosto' }))
            .toBe('Em agosto ficaram R$ 360,00. Agora, R$ 48,00 a mais.');
    });

    it('horas de trabalho com espaço', () => {
        expect(formatWorkHours(180)).toBe('3 h');
        expect(formatWorkHours(390)).toBe('6 h 30 min');
        expect(formatWorkHours(0)).toBeNull();
    });
});

describe('staffPerformanceView — ranking e selos (R4.8, R3.9–R3.11)', () => {
    it('posição, selos e ordem padrão: ranqueados primeiro, depois sem posição', () => {
        expect(rankLabel(1)).toBe('1º');
        expect(memberBadge(byName('Caio'), 8)).toBe('Poucos atendimentos para comparar');
        expect(unrankedSentence(byName('Caio'), 8)).toBe('Fez 5 atendimentos; o ranking começa em 8');
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
    const remainder = getBusinessRemainderNoun('barber');
    it('Ana: retorno, atendimentos, por hora e comparação com agosto', () => {
        expect(summarySentence(byName('Ana'), { formatMoney: brl, minSample: 8, previousName: 'agosto', remainder }))
            .toBe('Ana deixou R$ 408,00 para a barbearia em 12 atendimentos (R$ 68,00 por hora), R$ 48,00 a mais que em agosto.');
    });

    it('amostra baixa e dono', () => {
        expect(summarySentence(byName('Caio'), { formatMoney: brl, minSample: 8, previousName: 'agosto', remainder }))
            .toBe('Caio fez 5 atendimentos: o ranking começa em 8.');
        expect(summarySentence(byName('Rhian'), { formatMoney: brl, minSample: 8, previousName: 'agosto', remainder }))
            .toBe('Rhian (dono) fez 3 atendimentos. Como dono, a comissão conta como zero.');
    });

    it('sem anterior comparável: frase sem comparação', () => {
        expect(summarySentence(byName('Bruno'), { formatMoney: brl, minSample: 8, previousName: null, remainder }))
            .toBe('Bruno deixou R$ 300,00 para a barbearia em 15 atendimentos (R$ 40,00 por hora).');
    });
});
