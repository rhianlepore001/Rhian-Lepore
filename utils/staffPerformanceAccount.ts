import type { OwnMetrics, PerformanceMetrics } from '../types/staffPerformance';
import type { BusinessRemainderNoun } from './businessCopy';
import {
    formatPercent,
    formatWorkHours,
    fewSampleCompare,
    moneyCompareText,
    periodShortLabel,
    plural,
    rateCompareText,
    remainderModalCompare,
    MIN_SAMPLE,
} from './staffPerformanceView';

/** Janela real da RPC get_staff_performance_v1: próximo horário em até 48 h. */
export const REBOOK_WINDOW_HOURS = 48;
export const REBOOK_WINDOW_DAYS = 2;

export type MetricKey =
    | 'retorno'
    | 'retorno_por_hora'
    | 'faturamento_por_hora'
    | 'ticket_medio'
    | 'voltou'
    | 'faltas'
    | 'atendimentos'
    | 'tempo'
    | 'produtos'
    | 'comissao_periodo';

export type AccountVoice = 'team' | 'member' | 'self';

export interface AccountLine {
    label: string;
    value: string;
    muted: boolean;
    emphasize?: boolean;
    kind?: 'row' | 'formula' | 'note';
    numerator?: string;
    denominator?: string;
}

export interface MetricAccount {
    id: MetricKey;
    label: string;
    title: string;
    period: string;
    value: string;
    hint: string | null;
    span: MetricSpan;
    lines: AccountLine[];
    meaning: string;
    comparison: string | null;
    comparisonCaption: string | null;
    cardValue: number | null;
    reconstructed: number | null;
}

type AnyMetrics = PerformanceMetrics | OwnMetrics;

const money2 = (n: number) => Math.round(n * 100) / 100;
const rate4 = (n: number) => Math.round(n * 10000) / 10000;

function hasReturn(m: AnyMetrics): m is PerformanceMetrics {
    return 'retorno' in m && 'custo_produtos' in m;
}

function commissionTotal(m: AnyMetrics): number {
    if (hasReturn(m)) return money2(m.comissao_servicos + m.comissao_produtos + m.comissao_avulsa);
    return money2(m.comissao_periodo);
}

function who(voice: AccountVoice, name: string): string {
    if (voice === 'self') return 'você';
    return name;
}

function businessOf(remainder: BusinessRemainderNoun): string {
    return remainder.withArticle;
}

export function reconstructMetric(id: MetricKey, m: AnyMetrics): number | null {
    switch (id) {
        case 'retorno': {
            if (!hasReturn(m) || m.retorno == null) return null;
            return money2(m.receita_servicos + m.receita_produtos + m.receita_avulsa - commissionTotal(m) - m.custo_produtos);
        }
        case 'retorno_por_hora': {
            if (!hasReturn(m) || m.retorno == null || !m.tempo_pago_min) return null;
            const hours = m.tempo_pago_min / 60;
            const avulsoNet = m.receita_avulsa - m.comissao_avulsa;
            return money2((m.retorno - avulsoNet) / hours);
        }
        case 'faturamento_por_hora': {
            if (!m.tempo_pago_min) return null;
            return money2(m.receita_servicos / (m.tempo_pago_min / 60));
        }
        case 'ticket_medio': {
            if (!m.atendimentos_pagos) return null;
            return money2(m.receita_servicos / m.atendimentos_pagos);
        }
        case 'voltou': {
            if (!m.maduros) return null;
            return rate4(m.voltou / m.maduros);
        }
        case 'faltas': {
            if (!m.desfechos) return null;
            return rate4(m.faltas / m.desfechos);
        }
        case 'atendimentos':
            return m.atendimentos;
        case 'tempo':
            return m.tempo_total_min;
        case 'produtos': {
            if (!m.atendimentos) return null;
            return rate4(m.visitas_com_produto / m.atendimentos);
        }
        case 'comissao_periodo':
            return money2(m.comissao_periodo);
        default:
            return null;
    }
}

function cardNumeric(id: MetricKey, m: AnyMetrics): number | null {
    switch (id) {
        case 'retorno': return hasReturn(m) ? m.retorno : null;
        case 'retorno_por_hora': return hasReturn(m) ? m.retorno_por_hora : null;
        case 'faturamento_por_hora': return m.faturamento_por_hora;
        case 'ticket_medio': return m.ticket_medio;
        case 'voltou': return m.voltou_taxa;
        case 'faltas': return m.taxa_faltas;
        case 'atendimentos': return m.atendimentos;
        case 'tempo': return m.tempo_total_min;
        case 'produtos': return m.attach;
        case 'comissao_periodo': return m.comissao_periodo;
        default: return null;
    }
}

function moneyLine(label: string, amount: number, formatMoney: (v: number) => string, mode: 'plain' | 'add' | 'sub', emphasize = false): AccountLine {
    const formatted = formatMoney(Math.abs(amount));
    const value = mode === 'add' ? `+ ${formatted}` : mode === 'sub' ? `− ${formatted}` : formatted;
    return { label, value, muted: amount === 0 && !emphasize, emphasize };
}

function ratioLine(left: string, right: string, result: string): AccountLine {
    return {
        kind: 'formula',
        label: `${left} ÷ ${right}`,
        numerator: left,
        denominator: right,
        value: result,
        muted: false,
        emphasize: true,
    };
}

function noteLine(label: string): AccountLine {
    return { kind: 'note', label, value: '', muted: true };
}

export interface AccountBuildOpts {
    formatMoney: (v: number) => string;
    remainder: BusinessRemainderNoun;
    personName: string;
    voice: AccountVoice;
    previous?: AnyMetrics | null;
    previousName: string | null;
    periodStart: string;
    periodEnd: string;
    isOwner?: boolean;
}

export type MetricSpan = 'hero' | 'wide' | 'narrow';

export function metricLabel(id: MetricKey, remainder: BusinessRemainderNoun): string {
    switch (id) {
        case 'retorno': return remainder.remainderLabel;
        case 'retorno_por_hora': return 'Rende por hora';
        case 'faturamento_por_hora': return 'Fatura por hora';
        case 'ticket_medio': return 'Cada cliente gastou, em média';
        case 'voltou': return 'Saíram com horário marcado';
        case 'faltas': return 'Não apareceram';
        case 'atendimentos': return 'Atendimentos feitos';
        case 'tempo': return 'Horas atendendo';
        case 'produtos': return 'Vendeu produto em';
        case 'comissao_periodo': return 'Comissão gerada';
        default: return id;
    }
}

export function metricSpan(id: MetricKey): MetricSpan {
    if (id === 'retorno') return 'hero';
    if (id === 'ticket_medio' || id === 'voltou') return 'wide';
    return 'narrow';
}

export function metricCellClass(span: MetricSpan): string {
    return span === 'narrow' ? 'lg:col-span-1' : 'col-span-2 lg:col-span-1';
}

/** Desktop: 3 colunas só quando fecha a linha (3, 6, 9…). Senão 4, sem card órfão. */
export function metricRestLgCols(count: number): 3 | 4 {
    if (count > 0 && count % 4 !== 0 && count % 3 === 0) return 3;
    return 4;
}

export function metricHint(id: MetricKey, m: AnyMetrics): string | null {
    switch (id) {
        case 'retorno':
            return 'Depois de pagar comissões e produtos';
        case 'retorno_por_hora': {
            const hours = formatWorkHours(m.tempo_pago_min);
            return hours ? `Em ${hours} de atendimentos` : null;
        }
        case 'faturamento_por_hora': {
            const hours = formatWorkHours(m.tempo_pago_min);
            return hours ? `Em ${hours} pagas` : null;
        }
        case 'ticket_medio':
            return m.atendimentos_pagos
                ? `Em ${plural(m.atendimentos_pagos, 'atendimento pago', 'atendimentos pagos')}`
                : 'Nenhum atendimento pago';
        case 'voltou':
            return m.maduros ? `${m.voltou} de ${m.maduros} clientes` : null;
        case 'faltas':
            return m.desfechos ? `${m.faltas} de ${m.desfechos} horários` : null;
        case 'atendimentos':
            return m.atendimentos_clube ? `${m.atendimentos_clube} do Clube` : null;
        case 'tempo':
            return 'Pela agenda';
        case 'produtos':
            return m.atendimentos ? `${m.visitas_com_produto} de ${m.atendimentos} atendimentos` : null;
        case 'comissao_periodo':
            return null;
        default:
            return null;
    }
}

function meaning(id: MetricKey, opts: AccountBuildOpts): string {
    const biz = businessOf(opts.remainder);
    const person = who(opts.voice, opts.personName);
    const self = opts.voice === 'self';
    switch (id) {
        case 'retorno':
            return `É o que sobrou para ${biz} depois de pagar a comissão e o custo dos produtos. Aluguel, luz e outras contas fixas ainda não foram descontados.`;
        case 'retorno_por_hora':
            return self
                ? `Cada hora que você passou atendendo deixou esse valor para ${biz}.`
                : `Cada hora que ${person} passou atendendo deixou esse valor para ${biz}.`;
        case 'faturamento_por_hora':
            return 'Quanto os clientes pagaram por hora de atendimento, antes da comissão.';
        case 'ticket_medio':
            return self
                ? 'Somamos o que os seus clientes pagaram pelos serviços e dividimos pelo número de atendimentos.'
                : 'Somamos o que os clientes pagaram pelos serviços e dividimos pelo número de atendimentos.';
        case 'voltou':
            return `De cada cliente atendido, quantos já deixaram o próximo horário marcado (em até ${REBOOK_WINDOW_DAYS} dias depois da visita).`;
        case 'faltas':
            return 'Horários em que o cliente não veio. Muitas vezes não depende do profissional: lembretes ajudam.';
        case 'atendimentos':
            return 'Atendimentos marcados como concluídos no período.';
        case 'tempo':
            return 'Somamos a duração de cada atendimento concluído.';
        case 'produtos':
            return 'Em quantos atendimentos o cliente levou algum produto.';
        case 'comissao_periodo':
            return self
                ? 'A comissão que você ganhou pelos atendimentos e vendas do período. O que já foi pago aparece em Pagamentos.'
                : `A comissão que ${opts.personName} ganhou pelos atendimentos e vendas do período. O que já foi pago aparece em Pagamentos.`;
        default:
            return '';
    }
}

function comparisonFor(id: MetricKey, m: AnyMetrics, opts: AccountBuildOpts): { text: string; caption: string | null } | null {
    const prev = opts.previous;
    const prevSample = prev?.atendimentos ?? 0;
    const common = { prevSample, previousName: opts.previousName, formatMoney: opts.formatMoney };
    if (!prev) return null;
    if (prevSample < MIN_SAMPLE) return { text: fewSampleCompare(opts.previousName), caption: null };
    const caption = opts.previousName
        ? `Comparado com ${opts.previousName}`
        : 'Comparado com o período anterior';
    switch (id) {
        case 'retorno': {
            if (!hasReturn(m) || !hasReturn(prev)) return null;
            const text = remainderModalCompare(m.retorno, prev.retorno, common);
            return text ? { text, caption: null } : null;
        }
        case 'retorno_por_hora':
            return hasReturn(m) && hasReturn(prev)
                ? wrapCompare(moneyCompareText(m.retorno_por_hora, prev.retorno_por_hora, common), caption)
                : null;
        case 'faturamento_por_hora':
            return wrapCompare(moneyCompareText(m.faturamento_por_hora, prev.faturamento_por_hora, common), caption);
        case 'ticket_medio':
            return wrapCompare(moneyCompareText(m.ticket_medio, prev.ticket_medio, common), caption);
        case 'voltou':
            return wrapCompare(rateCompareText(m.voltou_taxa, prev.voltou_taxa, common), caption);
        case 'faltas':
            return wrapCompare(rateCompareText(m.taxa_faltas, prev.taxa_faltas, { ...common, lowerIsBetter: true }), caption);
        case 'atendimentos':
            return wrapCompare(moneyCompareText(m.atendimentos, prev.atendimentos, { ...common, formatMoney: (n) => String(n) }), caption);
        case 'tempo':
            return null;
        case 'produtos':
            return wrapCompare(rateCompareText(m.attach, prev.attach, common), caption);
        case 'comissao_periodo':
            return wrapCompare(moneyCompareText(m.comissao_periodo, prev.comissao_periodo, common), caption);
        default:
            return null;
    }
}

function wrapCompare(text: string | null, caption: string): { text: string; caption: string } | null {
    if (!text) return null;
    return { text, caption };
}

function displayValue(id: MetricKey, m: AnyMetrics, formatMoney: (v: number) => string): string {
    const n = cardNumeric(id, m);
    if (id === 'tempo') return formatWorkHours(m.tempo_total_min) ?? '—';
    if (id === 'atendimentos') return String(m.atendimentos);
    if (id === 'voltou' || id === 'faltas' || id === 'produtos') return formatPercent(n);
    if (n == null) return '—';
    return formatMoney(n);
}

function linesFor(id: MetricKey, m: AnyMetrics, opts: AccountBuildOpts): AccountLine[] {
    const { formatMoney, remainder, personName, isOwner, voice } = opts;
    const dash = (v: number | null | undefined) => (v == null ? '—' : formatMoney(v));
    switch (id) {
        case 'retorno': {
            if (!hasReturn(m)) return [];
            const comissao = isOwner ? 0 : commissionTotal(m);
            const comissaoLabel = isOwner
                ? 'Comissão (dono: zero)'
                : voice === 'self'
                    ? 'Sua comissão'
                    : voice === 'team'
                        ? 'Comissão da equipe'
                        : `Comissão de ${personName}`;
            return [
                moneyLine('Serviços', m.receita_servicos, formatMoney, 'plain'),
                moneyLine('Produtos vendidos', m.receita_produtos, formatMoney, 'add'),
                moneyLine('Outros lançamentos', m.receita_avulsa, formatMoney, 'add'),
                moneyLine(comissaoLabel, comissao, formatMoney, 'sub'),
                moneyLine('Custo dos produtos', m.custo_produtos, formatMoney, 'sub'),
                moneyLine(remainder.remainderLabel, m.retorno ?? 0, formatMoney, 'plain', true),
            ];
        }
        case 'retorno_por_hora': {
            if (!hasReturn(m)) return [];
            const hoursLabel = formatWorkHours(m.tempo_pago_min) ?? '0 h';
            const avulsoNet = m.receita_avulsa - m.comissao_avulsa;
            const base = money2((m.retorno ?? 0) - avulsoNet);
            return [
                ratioLine(dash(base), hoursLabel, m.retorno_por_hora == null ? '—' : `${formatMoney(m.retorno_por_hora)} / h`),
                ...(m.faturamento_por_hora != null ? [{
                    label: 'Fatura por hora (o que os clientes pagaram, antes da comissão)',
                    value: `${formatMoney(m.faturamento_por_hora)} / h`,
                    muted: false,
                }] : []),
            ];
        }
        case 'faturamento_por_hora': {
            const hoursLabel = formatWorkHours(m.tempo_pago_min) ?? '0 h';
            return [
                ratioLine(formatMoney(m.receita_servicos), hoursLabel, m.faturamento_por_hora == null ? '—' : `${formatMoney(m.faturamento_por_hora)} / h`),
            ];
        }
        case 'ticket_medio':
            return [
                ratioLine(
                    formatMoney(m.receita_servicos),
                    `${m.atendimentos_pagos} ${m.atendimentos_pagos === 1 ? 'atendimento pago' : 'atendimentos pagos'}`,
                    m.ticket_medio == null ? '—' : formatMoney(m.ticket_medio),
                ),
            ];
        case 'voltou': {
            const waiting = m.imaturos > 0
                ? [noteLine(`Ainda esperando: ${plural(m.imaturos, 'cliente atendido', 'clientes atendidos')} há menos de ${REBOOK_WINDOW_DAYS} dias`)]
                : [];
            return [
                ratioLine(`${m.voltou} clientes marcaram de novo`, `${m.maduros} clientes atendidos`, formatPercent(m.voltou_taxa)),
                ...waiting,
            ];
        }
        case 'faltas': {
            const open = m.sem_desfecho > 0
                ? [noteLine(`Horários passados sem marcar se o cliente veio: ${m.sem_desfecho}`)]
                : [];
            return [
                ratioLine(`${m.faltas} faltas`, `${m.desfechos} horários`, formatPercent(m.taxa_faltas)),
                ...open,
            ];
        }
        case 'atendimentos':
            return [
                { label: 'Concluídos', value: String(m.atendimentos), muted: false, emphasize: true },
                { label: 'Do Clube', value: String(m.atendimentos_clube), muted: m.atendimentos_clube === 0 },
            ];
        case 'tempo':
            return [
                { label: 'Duração marcada na agenda', value: formatWorkHours(m.tempo_total_min) ?? '—', muted: false, emphasize: true },
                { label: 'Do Clube', value: formatWorkHours(m.tempo_clube_min) ?? '0 min', muted: !m.tempo_clube_min },
            ];
        case 'produtos':
            return [
                ratioLine(`${m.visitas_com_produto} com produto`, `${m.atendimentos} atendimentos`, formatPercent(m.attach)),
                ...(hasReturn(m) || m.receita_produtos
                    ? [moneyLine('Em produtos', m.receita_produtos, formatMoney, 'plain')]
                    : []),
            ];
        case 'comissao_periodo': {
            const parts = hasReturn(m)
                ? [
                    moneyLine('Serviços', m.comissao_servicos, formatMoney, 'plain'),
                    moneyLine('Produtos', m.comissao_produtos, formatMoney, 'add'),
                    moneyLine('Outros lançamentos', m.comissao_avulsa, formatMoney, 'add'),
                ]
                : [];
            return [
                ...parts,
                moneyLine('Comissão gerada', m.comissao_periodo, formatMoney, 'plain', true),
            ];
        }
        default:
            return [];
    }
}

export function buildMetricAccount(id: MetricKey, m: AnyMetrics, opts: AccountBuildOpts): MetricAccount {
    const label = metricLabel(id, opts.remainder);
    const period = periodShortLabel(opts.periodStart, opts.periodEnd);
    const cardValue = cardNumeric(id, m);
    const compare = comparisonFor(id, m, opts);
    return {
        id,
        label,
        title: label,
        period,
        value: displayValue(id, m, opts.formatMoney),
        hint: metricHint(id, m),
        span: metricSpan(id),
        lines: linesFor(id, m, opts),
        meaning: meaning(id, opts),
        comparison: compare?.text || null,
        comparisonCaption: compare?.caption ?? null,
        cardValue,
        reconstructed: reconstructMetric(id, m),
    };
}

export const TEAM_METRIC_IDS: MetricKey[] = ['retorno', 'atendimentos', 'faltas', 'voltou'];
export const MEMBER_METRIC_IDS: MetricKey[] = [
    'retorno',
    'retorno_por_hora',
    'atendimentos',
    'ticket_medio',
    'voltou',
    'tempo',
    'faltas',
    'produtos',
    'comissao_periodo',
];
export const STAFF_METRIC_IDS: MetricKey[] = [
    'atendimentos',
    'tempo',
    'faturamento_por_hora',
    'comissao_periodo',
    'ticket_medio',
    'voltou',
    'faltas',
    'produtos',
];
