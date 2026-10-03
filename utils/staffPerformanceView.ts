import type { PerformanceMember } from '../types/staffPerformance';
import { parseLocalISODate, toLocalISODate } from './commissionCycle';

/**
 * Regras de apresentação da página Performance dos colaboradores (ACCEPTANCE §3, §4, §7).
 * Datas sempre como "AAAA-MM-DD" do calendário local, nunca via toISOString() (B5/B8).
 * Tudo determinístico: nenhum número é estimado aqui (R3.16).
 */

export type PeriodPreset = 'este_mes' | 'mes_passado' | 'ultimos_30' | 'ciclo' | 'personalizado';
export interface DateRange { start: string; end: string }
export interface PerformanceFilters extends DateRange { pro: string | null }

export const PRESETS: { id: Exclude<PeriodPreset, 'personalizado'>; label: string }[] = [
    { id: 'este_mes', label: 'Este mês' },
    { id: 'mes_passado', label: 'Mês passado' },
    { id: 'ultimos_30', label: 'Últimos 30 dias' },
    { id: 'ciclo', label: 'Ciclo de comissão' },
];

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MAX_DAYS = 366;
const pad = (n: number) => String(n).padStart(2, '0');

const lastDayOf = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const settleDate = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, lastDayOf(y, m)));
const iso = (d: Date) => toLocalISODate(d);

export function presetRange(preset: Exclude<PeriodPreset, 'personalizado'>, today: Date, settlementDay = 5): DateRange {
    const y = today.getFullYear();
    const m = today.getMonth();
    switch (preset) {
        case 'este_mes':
            return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
        case 'mes_passado':
            return { start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) };
        case 'ultimos_30':
            return { start: iso(new Date(y, m, today.getDate() - 29)), end: iso(new Date(y, m, today.getDate())) };
        case 'ciclo': {
            const day = Math.min(Math.max(Math.trunc(settlementDay) || 5, 1), 31);
            const thisMonth = settleDate(y, m, day);
            const end = today.getDate() <= thisMonth.getDate() ? thisMonth : settleDate(y, m + 1, day);
            const prevEnd = settleDate(end.getFullYear(), end.getMonth() - 1, day);
            return { start: iso(new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() + 1)), end: iso(end) };
        }
    }
}

export function detectPreset(start: string, end: string, today: Date, settlementDay = 5): PeriodPreset {
    const hit = PRESETS.find((p) => {
        const r = presetRange(p.id, today, settlementDay);
        return r.start === start && r.end === end;
    });
    return hit ? hit.id : 'personalizado';
}

function isFullMonth(start: string, end: string): boolean {
    const s = parseLocalISODate(start);
    const e = parseLocalISODate(end);
    return s.getDate() === 1 && s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()
        && e.getDate() === lastDayOf(e.getFullYear(), e.getMonth());
}

/** "setembro de 2026" para mês cheio; "03/09 – 02/10/2026" nos demais. */
export function periodLabel(start: string, end: string): string {
    const s = parseLocalISODate(start);
    const e = parseLocalISODate(end);
    if (isFullMonth(start, end)) return `${MONTHS[s.getMonth()]} de ${s.getFullYear()}`;
    return `${pad(s.getDate())}/${pad(s.getMonth() + 1)} – ${pad(e.getDate())}/${pad(e.getMonth() + 1)}/${e.getFullYear()}`;
}

/** Nome do mês anterior quando o período anterior é um mês cheio ("agosto"); senão null. */
export function previousMonthName(prev: DateRange | null | undefined): string | null {
    if (!prev || !isFullMonth(prev.start, prev.end)) return null;
    return MONTHS[parseLocalISODate(prev.start).getMonth()];
}

/** R3.6: "vs agosto" · "vs 01–30 ago" · "vs 04 ago–02 set". */
export function comparisonLabel(prev: DateRange | null | undefined): string | null {
    if (!prev) return null;
    const month = previousMonthName(prev);
    if (month) return `vs ${month}`;
    const s = parseLocalISODate(prev.start);
    const e = parseLocalISODate(prev.end);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
        return `vs ${pad(s.getDate())}–${pad(e.getDate())} ${MONTHS_SHORT[e.getMonth()]}`;
    }
    return `vs ${pad(s.getDate())} ${MONTHS_SHORT[s.getMonth()]}–${pad(e.getDate())} ${MONTHS_SHORT[e.getMonth()]}`;
}

export function monthShortLabel(yyyyMm: string): string {
    const m = Number(yyyyMm.split('-')[1]);
    return MONTHS_SHORT[(m || 1) - 1];
}

// ---- URL (?de=&ate=&pro=) ----
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(v: string | null): v is string {
    if (!v || !ISO_RE.test(v)) return false;
    const d = parseLocalISODate(v);
    return iso(d) === v;
}

export function parseFilters(search: string, today: Date): PerformanceFilters {
    const q = new URLSearchParams(search);
    const de = q.get('de');
    const ate = q.get('ate');
    const pro = q.get('pro') || null;
    if (validDate(de) && validDate(ate) && de <= ate) {
        const days = Math.round((parseLocalISODate(ate).getTime() - parseLocalISODate(de).getTime()) / 86_400_000) + 1;
        if (days <= MAX_DAYS) return { start: de, end: ate, pro };
    }
    return { ...presetRange('este_mes', today), pro };
}

export function filtersToSearch(f: PerformanceFilters): string {
    const q = new URLSearchParams({ de: f.start, ate: f.end });
    if (f.pro) q.set('pro', f.pro);
    return q.toString();
}

// ---- Formatos (R3.13, R3.14) ----
export function formatHours(min: number | null | undefined): string {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (!h) return `${m}min`;
    return m ? `${h}h ${m}min` : `${h}h`;
}

export function formatPercent(ratio: number | null | undefined): string {
    if (ratio == null || Number.isNaN(ratio)) return '—';
    return `${Math.round(ratio * 100)}%`;
}

/** 1 casa, para o tooltip ("54,5%"). */
export function formatPercentPrecise(ratio: number | null | undefined): string {
    if (ratio == null || Number.isNaN(ratio)) return '—';
    return `${(Math.round(ratio * 1000) / 10).toFixed(1).replace('.', ',')}%`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ---- Deltas (R3.15) ----
export type Tone = 'good' | 'bad' | 'neutral';
export interface Delta { text: string; tone: Tone; label: 'melhor' | 'pior' | 'estável' | 'novo' | 'sem_base' }

interface DeltaOpts { prevSample: number; lowerIsBetter?: boolean }
const MIN_SAMPLE = 8;
const MINUS = '\u2212';

function tone(diff: number, rel: number, { prevSample, lowerIsBetter }: DeltaOpts): Pick<Delta, 'tone' | 'label'> {
    if (prevSample < MIN_SAMPLE) return { tone: 'neutral', label: 'sem_base' };
    if (Math.abs(rel) < 0.05 || diff === 0) return { tone: 'neutral', label: 'estável' };
    const good = lowerIsBetter ? diff < 0 : diff > 0;
    return good ? { tone: 'good', label: 'melhor' } : { tone: 'bad', label: 'pior' };
}

export function valueDelta(
    curr: number | null | undefined,
    prev: number | null | undefined,
    opts: DeltaOpts & { format: (v: number) => string },
): Delta | null {
    if (curr == null || prev == null) return null;
    if (prev === 0) return curr === 0 ? null : { text: 'novo', tone: 'neutral', label: 'novo' };
    const diff = curr - prev;
    if (diff === 0) return { text: 'igual', tone: 'neutral', label: 'estável' };
    const rel = diff / Math.abs(prev);
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '=';
    const sign = diff > 0 ? '+' : diff < 0 ? MINUS : '';
    const text = `${arrow} ${sign}${opts.format(Math.abs(diff))} (${sign}${Math.round(Math.abs(rel) * 100)}%)`;
    return { text, ...tone(diff, rel, opts) };
}

export function moneyDelta(
    curr: number | null | undefined,
    prev: number | null | undefined,
    opts: DeltaOpts & { formatMoney: (v: number) => string },
): Delta | null {
    return valueDelta(curr, prev, { ...opts, format: opts.formatMoney });
}

/** Taxas: diferença em pontos percentuais ("▲ +5 p.p."). */
export function rateDelta(curr: number | null | undefined, prev: number | null | undefined, opts: DeltaOpts): Delta | null {
    if (curr == null || prev == null) return null;
    const pp = Math.round((curr - prev) * 100);
    const rel = prev === 0 ? (curr === 0 ? 0 : 1) : (curr - prev) / prev;
    if (pp === 0) return { text: '= 0 p.p.', tone: 'neutral', label: 'estável' };
    const text = `${pp > 0 ? '▲ +' : `▼ ${MINUS}`}${Math.abs(pp)} p.p.`;
    return { text, ...tone(curr - prev, rel, opts) };
}

// ---- Ranking e selos (R4.8, R3.9–R3.11) ----
export const rankLabel = (rank: number) => `${rank}º`;

export function memberBadge(m: PerformanceMember, minSample: number): string | null {
    if (m.is_owner) return 'Dono';
    if (m.inactive) return 'Inativo';
    if (m.low_sample) return `Amostra baixa (${m.metrics.atendimentos} de ${minSample})`;
    return null;
}

export type SortKey = 'rank' | 'retorno' | 'retorno_por_hora' | 'ticket_medio' | 'voltou_taxa' | 'taxa_faltas' | 'atendimentos';
export type SortDir = 'asc' | 'desc';
export const defaultDir = (key: SortKey): SortDir => (key === 'rank' || key === 'taxa_faltas' ? 'asc' : 'desc');

const unrankedGroup = (m: PerformanceMember) => (m.is_owner ? 2 : m.inactive ? 1 : 0);

/** Ranqueados sempre em cima (na ordem pedida); sem posição abaixo. Nulos no fim; empate por nome. */
export function sortMembers(members: PerformanceMember[], key: SortKey, dir: SortDir = defaultDir(key)): PerformanceMember[] {
    const byName = (a: PerformanceMember, b: PerformanceMember) => a.name.localeCompare(b.name, 'pt-BR');
    const byKey = (a: PerformanceMember, b: PerformanceMember) => {
        if (key === 'rank') return 0;
        const va = a.metrics[key];
        const vb = b.metrics[key];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return dir === 'asc' ? va - vb : vb - va;
    };
    const ranked = members.filter((m) => m.rank != null);
    const unranked = members.filter((m) => m.rank == null);
    ranked.sort((a, b) => (key === 'rank' ? (dir === 'asc' ? a.rank! - b.rank! : b.rank! - a.rank!) : byKey(a, b) || a.rank! - b.rank!));
    unranked.sort((a, b) => key === 'rank'
        ? unrankedGroup(a) - unrankedGroup(b) || b.metrics.atendimentos - a.metrics.atendimentos || byName(a, b)
        : byKey(a, b) || byName(a, b));
    return [...ranked, ...unranked];
}

// ---- Frase-resumo (R7.3) ----
export function summarySentence(
    m: PerformanceMember,
    opts: { formatMoney: (v: number) => string; minSample: number; previousName: string | null },
): string {
    const n = m.metrics.atendimentos;
    if (n === 0 && m.metrics.retorno == null) return `${m.name} não teve atendimentos concluídos neste período.`;
    if (m.is_owner) return `${m.name} fez ${plural(n, 'atendimento', 'atendimentos')}. Como dono, a comissão conta como zero.`;
    if (m.low_sample) return `${m.name} fez ${plural(n, 'atendimento', 'atendimentos')}: poucos para comparar (mínimo ${opts.minSample}).`;
    const money = (v: number | null) => (v == null ? '—' : opts.formatMoney(v));
    let s = `${m.name} deixou ${money(m.metrics.retorno)} para a casa em ${plural(n, 'atendimento', 'atendimentos')}`;
    if (m.metrics.retorno_por_hora != null) s += ` (${money(m.metrics.retorno_por_hora)} por hora)`;
    const d = moneyDelta(m.metrics.retorno, m.previous?.retorno, { prevSample: m.previous?.atendimentos ?? 0, formatMoney: opts.formatMoney });
    if (d && d.tone !== 'neutral' && m.previous?.retorno) {
        const pct = Math.round(Math.abs((m.metrics.retorno! - m.previous.retorno) / m.previous.retorno) * 100);
        const when = opts.previousName ? `em ${opts.previousName}` : 'no período anterior';
        s += `, ${pct}% a ${d.tone === 'good' ? 'mais' : 'menos'} que ${when}`;
    }
    return `${s}.`;
}

/** R3.3: rodapé do filtro. */
export function timezoneLabel(tz: string): string {
    if (tz === 'Europe/Lisbon') return 'Horário de Lisboa';
    if (tz === 'America/Sao_Paulo') return 'Horário de Brasília';
    return `Fuso ${tz}`;
}
