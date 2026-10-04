import { getBusinessCopy } from './businessCopy';
import { addDaysToDateString, getDateStringInTimeZone, zonedDateTimeToIso } from './businessTimezone';
import { formatIsoToBr } from './commissionCycle';

export type CommissionReportMode = 'pending' | 'paid';
export type CommissionPdfVariant = 'resumido' | 'detalhado';

export interface PaidFinanceRow {
    commission_paid_at: string;
    created_at: string;
    commission_value?: number | null;
}

export interface CommissionPaymentPeriod {
    paid_at: string;
    start_date: string;
    end_date: string;
}

export interface GroupedCommissionPayment {
    paidAt: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    servicesCount: number;
}

export interface CommissionReportLineItem {
    created_at: string;
    service_name: string;
    client_name: string | null;
    amount: number;
    machine_fee_amount: number;
    commission_base: number;
    commission_rate: number;
    commission_value: number;
}

export interface CommissionReportShareInput {
    professionalName: string;
    cpf?: string | null;
    periodLabel: string;
    commissionRate: number;
    records: CommissionReportLineItem[];
    totals: { gross: number; fee: number; base: number; commission: number };
    paidAtLabel?: string | null;
    businessName: string;
    businessType: string;
    formatMoney: (n: number) => string;
}

export interface CommissionReportQueryFilters {
    eq: [string, unknown][];
    gte?: [string, string];
    lte?: [string, string];
    lt?: [string, string];
}

export interface CommissionHistoryRangeBounds {
    gte: string;
    lt: string;
}

export interface CommissionPdfTableRow {
    date: string;
    service: string;
    client: string;
    amount: string;
    fee: string;
    base: string;
    rate: string;
    commission: string;
}

export interface CommissionPdfModel {
    variant: CommissionPdfVariant;
    businessName: string;
    businessTypeHeading: string;
    title: string;
    professionalName: string;
    periodLabel: string;
    commissionRate: number;
    statusLabel: string;
    serviceCount: number;
    rows: CommissionPdfTableRow[];
    totals: { gross: string; fee: string; base: string; commission: string; showFee: boolean };
    generatedAtLabel: string;
}

const DASH = '—';

function textOrEmpty(value: unknown): string {
    return String(value ?? '').trim();
}

function isUsableLabel(value: unknown): boolean {
    const t = textOrEmpty(value);
    return t.length > 0 && t !== DASH && t !== '-';
}

function joinedAppointmentService(
    appointments: { service?: string | null } | { service?: string | null }[] | null | undefined,
): string | null {
    if (!appointments) return null;
    const row = Array.isArray(appointments) ? appointments[0] : appointments;
    return row?.service ?? null;
}

/** service_name → description → serviço do agendamento; '—' só se nada existir. */
export function resolveCommissionServiceName(row: {
    service_name?: string | null;
    description?: string | null;
    appointments?: { service?: string | null } | { service?: string | null }[] | null;
}): string {
    const joined = joinedAppointmentService(row.appointments);
    for (const candidate of [row.service_name, row.description, joined]) {
        if (isUsableLabel(candidate)) return textOrEmpty(candidate);
    }
    return DASH;
}

function capitalizePt(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Tipo do negócio via helper existente; 'negócio' se o segmento for desconhecido. */
export function reportBusinessTypeLabel(userType: string | null | undefined): string {
    if (userType === 'barber' || userType === 'beauty') {
        return getBusinessCopy(userType).businessNoun;
    }
    return 'negócio';
}

/** Cabeçalho do PDF: Barbearia / Salão / Negócio, a partir do helper dinâmico. */
export function reportBusinessTypeHeading(userType: string | null | undefined): string {
    return capitalizePt(reportBusinessTypeLabel(userType));
}

export function formatDatePtBrTz(iso: string, tz: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatIsoToBr(iso);
    try {
        return formatIsoToBr(getDateStringInTimeZone(iso, tz));
    } catch {
        return '';
    }
}

export function formatPaidAtLabel(iso: string, tz: string): string {
    const day = formatDatePtBrTz(iso, tz);
    return day ? `Pago em ${day}` : 'Pago';
}

/** 06/08 – 05/09/2026 (mesmo ano) ou 06/08/2025 – 05/01/2026. */
export function periodLabelFromRange(start: string, end: string, tz: string): string {
    const a = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : getDateStringInTimeZone(start, tz);
    const b = /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : getDateStringInTimeZone(end, tz);
    const fa = formatIsoToBr(a);
    const fb = formatIsoToBr(b);
    if (!fa || !fb) return [fa, fb].filter(Boolean).join(' – ');
    if (a.slice(0, 4) === b.slice(0, 4)) return `${fa.slice(0, 5)} – ${fb}`;
    return `${fa} – ${fb}`;
}

/**
 * Limites de commission_paid_at no fuso do negócio.
 * `${date}T00:00:00` sem offset é lido como UTC pelo PostgREST.
 */
export function historyPaidAtRangeBounds(
    startDate: string,
    endDate: string,
    tz: string,
): CommissionHistoryRangeBounds {
    return {
        gte: zonedDateTimeToIso(startDate, '00:00', tz),
        lt: zonedDateTimeToIso(addDaysToDateString(endDate, 1), '00:00', tz),
    };
}

function paidAtMs(iso: string): number {
    const n = new Date(iso).getTime();
    return Number.isNaN(n) ? Number.NaN : n;
}

function matchPaymentPeriod(
    paidAt: string,
    payments: CommissionPaymentPeriod[],
): CommissionPaymentPeriod | undefined {
    const exact = payments.find((p) => p.paid_at === paidAt);
    if (exact) return exact;
    const ms = paidAtMs(paidAt);
    if (Number.isNaN(ms)) return undefined;
    return payments.find((p) => paidAtMs(p.paid_at) === ms);
}

function ymdInTz(iso: string, tz: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    return getDateStringInTimeZone(iso, tz);
}

/**
 * Agrupa linhas pagas pelo timestamp exato de commission_paid_at
 * (não pelo dia UTC). Duas liquidações no mesmo dia ficam em cards separados.
 */
export function groupPaidRecordsByTimestamp(
    rows: PaidFinanceRow[],
    payments: CommissionPaymentPeriod[] = [],
    tz: string,
): GroupedCommissionPayment[] {
    const groups = new Map<string, GroupedCommissionPayment & { created: string[] }>();

    for (const row of rows) {
        const key = row.commission_paid_at;
        if (!key) continue;
        let group = groups.get(key);
        if (!group) {
            group = {
                paidAt: key,
                periodStart: ymdInTz(row.created_at, tz),
                periodEnd: ymdInTz(row.created_at, tz),
                amount: 0,
                servicesCount: 0,
                created: [],
            };
            groups.set(key, group);
        }
        group.amount += Number(row.commission_value) || 0;
        group.servicesCount += 1;
        group.created.push(row.created_at);
        const day = ymdInTz(row.created_at, tz);
        if (day < group.periodStart) group.periodStart = day;
        if (day > group.periodEnd) group.periodEnd = day;
    }

    const result: GroupedCommissionPayment[] = [];
    for (const group of groups.values()) {
        const matched = matchPaymentPeriod(group.paidAt, payments);
        result.push({
            paidAt: group.paidAt,
            periodStart: matched?.start_date || group.periodStart,
            periodEnd: matched?.end_date || group.periodEnd,
            amount: group.amount,
            servicesCount: group.servicesCount,
        });
    }

    return result.sort((a, b) => paidAtMs(b.paidAt) - paidAtMs(a.paidAt));
}

export function commissionReportFilters(opts: {
    mode: CommissionReportMode;
    userId: string;
    professionalId: string;
    periodStart: string;
    periodEnd: string;
    paidAt?: string | null;
}): CommissionReportQueryFilters {
    const eq: [string, unknown][] = [
        ['user_id', opts.userId],
        ['professional_id', opts.professionalId],
        ['type', 'revenue'],
    ];
    if (opts.mode === 'paid') {
        eq.push(['commission_paid', true]);
        // String crua do PostgREST (microsegundos). Nunca Date / toISOString().
        if (opts.paidAt) eq.push(['commission_paid_at', opts.paidAt]);
        return { eq };
    }
    eq.push(['commission_paid', false]);
    return {
        eq,
        gte: ['created_at', opts.periodStart],
        lte: ['created_at', `${opts.periodEnd}T23:59:59`],
    };
}

export function slugifyCommissionPart(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'comissao';
}

export function commissionPdfFileName(opts: {
    professionalName: string;
    periodLabel: string;
    variant: CommissionPdfVariant;
}): string {
    const name = slugifyCommissionPart(opts.professionalName);
    const period = slugifyCommissionPart(opts.periodLabel);
    return `comissao-${name}-${period}-${opts.variant}.pdf`;
}

function formatPdfTableDate(iso: string): string {
    const ymd = iso.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
    return iso;
}

export function formatPdfGeneratedAt(now: Date = new Date()): string {
    const date = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `Gerado pelo AgendiX em ${date} ${time}`;
}

export function buildCommissionPdfModel(
    input: CommissionReportShareInput,
    variant: CommissionPdfVariant,
    now: Date = new Date(),
): CommissionPdfModel {
    const money = input.formatMoney;
    return {
        variant,
        businessName: input.businessName || 'AgendiX',
        businessTypeHeading: input.businessType,
        title: variant === 'resumido'
            ? 'Relatório resumido de comissões'
            : 'Relatório detalhado de comissões',
        professionalName: input.professionalName,
        periodLabel: input.periodLabel,
        commissionRate: input.commissionRate,
        statusLabel: input.paidAtLabel?.trim() || 'Pendente',
        serviceCount: input.records.length,
        rows: input.records.map((row) => ({
            date: formatPdfTableDate(row.created_at),
            service: row.service_name,
            client: row.client_name || '—',
            amount: money(row.amount),
            fee: money(row.machine_fee_amount),
            base: money(row.commission_base),
            rate: `${row.commission_rate}%`,
            commission: money(row.commission_value),
        })),
        totals: {
            gross: money(input.totals.gross),
            fee: money(input.totals.fee),
            base: money(input.totals.base),
            commission: money(input.totals.commission),
            showFee: input.totals.fee > 0,
        },
        generatedAtLabel: formatPdfGeneratedAt(now),
    };
}

export function buildCommissionCopyText(input: CommissionReportShareInput): string {
    return [
        'Resumo de Comissões',
        '',
        `Profissional: ${input.professionalName}`,
        input.cpf ? `CPF: ${input.cpf}` : null,
        `Período: ${input.periodLabel}`,
        input.paidAtLabel || null,
        '',
        `Valor a receber: ${input.formatMoney(input.totals.commission)}`,
        '',
        'Gerado pelo AgendiX',
    ].filter((line): line is string => line != null).join('\n');
}
