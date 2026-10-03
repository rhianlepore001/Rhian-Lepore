/**
 * Ciclo de acerto de comissão (mês cheio terminando no dia de acerto).
 * Datas sempre como "AAAA-MM-DD" da data de calendário LOCAL — nunca via
 * toISOString(), que recua 1 dia em fusos a leste de UTC (B5).
 */
export interface CommissionCycle {
    /** primeiro dia do ciclo, AAAA-MM-DD */
    start: string;
    /** último dia do ciclo (dia de acerto), AAAA-MM-DD */
    end: string;
    /** "06/08 – 05/09" */
    label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Data de calendário local → "AAAA-MM-DD". */
export function toLocalISODate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "AAAA-MM-DD" → Date à meia-noite local (new Date('AAAA-MM-DD') seria UTC). */
export function parseLocalISODate(iso: string): Date {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

/** "AAAA-MM-DD" → "dd/mm". */
export function formatDayMonth(iso: string): string {
    const d = parseLocalISODate(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** "AAAA-MM-DD" → "dd/mm/aaaa" (input pt-BR). */
export function formatIsoToBr(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** "dd/mm/aaaa" → "AAAA-MM-DD", ou null se a data não existir. */
export function parseBrToIso(br: string): string | null {
    const m = br.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
}

export function formatCycleLabel(start: string, end: string): string {
    return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}

/** Último dia de acerto válido do mês (dia 31 em fevereiro → 28/29). */
function settlementDate(year: number, month: number, day: number): Date {
    const last = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, last));
}

function cycleEndingAt(end: Date, day: number): CommissionCycle {
    const prevEnd = settlementDate(end.getFullYear(), end.getMonth() - 1, day);
    const start = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() + 1);
    const s = toLocalISODate(start);
    const e = toLocalISODate(end);
    return { start: s, end: e, label: formatCycleLabel(s, e) };
}

/**
 * Último ciclo FECHADO em `today`.
 * Ex.: acerto dia 5, hoje 29/09 → 06/08 – 05/09; hoje 05/09 → 06/07 – 05/08
 * (o ciclo que termina hoje ainda está em aberto até o fim do dia).
 */
export function lastClosedCycle(settlementDay: number, today: Date = new Date()): CommissionCycle {
    const day = Math.min(Math.max(Math.trunc(settlementDay) || 5, 1), 31);
    const thisMonth = settlementDate(today.getFullYear(), today.getMonth(), day);
    const end = today.getDate() > thisMonth.getDate()
        ? thisMonth
        : settlementDate(today.getFullYear(), today.getMonth() - 1, day);
    return cycleEndingAt(end, day);
}

/** Ciclo imediatamente anterior a `cycle`. */
export function previousCycle(cycle: CommissionCycle, settlementDay: number): CommissionCycle {
    const day = Math.min(Math.max(Math.trunc(settlementDay) || 5, 1), 31);
    const e = parseLocalISODate(cycle.end);
    return cycleEndingAt(settlementDate(e.getFullYear(), e.getMonth() - 1, day), day);
}
