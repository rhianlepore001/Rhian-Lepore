import { getBusinessCopy } from './businessCopy';
import { getDateStringInTimeZone } from './businessTimezone';
import { formatCycleLabel, formatIsoToBr } from './commissionCycle';

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

/** Tipo do negócio via helper existente; 'negócio' se o segmento for desconhecido. */
export function reportBusinessTypeLabel(userType: string | null | undefined): string {
    if (userType === 'barber' || userType === 'beauty') {
        return getBusinessCopy(userType).businessNoun;
    }
    return 'negócio';
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

export function periodLabelFromRange(start: string, end: string, tz: string): string {
    const a = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : getDateStringInTimeZone(start, tz);
    const b = /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : getDateStringInTimeZone(end, tz);
    return formatCycleLabel(a, b);
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

function headerLines(input: CommissionReportShareInput, variant: CommissionPdfVariant): string[] {
    const title = variant === 'resumido' ? 'Relatório resumido de comissões' : 'Relatório detalhado de comissões';
    const lines = [
        input.businessName || 'AgendiX',
        input.businessType,
        '',
        title,
        '',
        `Profissional: ${input.professionalName}`,
    ];
    if (input.cpf) lines.push(`CPF: ${input.cpf}`);
    lines.push(`Período: ${input.periodLabel}`);
    lines.push(`Comissão: ${input.commissionRate}%`);
    if (input.paidAtLabel) lines.push(input.paidAtLabel);
    return lines;
}

function totalLines(input: CommissionReportShareInput): string[] {
    const { formatMoney: money, totals } = input;
    const lines = [
        '',
        `Subtotal bruto: ${money(totals.gross)}`,
    ];
    if (totals.fee > 0) {
        lines.push(`(-) Taxa maquininha: ${money(totals.fee)}`);
    }
    lines.push(`(=) Base de cálculo: ${money(totals.base)}`);
    lines.push(`Comissão: ${money(totals.commission)}`);
    lines.push('');
    lines.push(`Valor líquido a receber: ${money(totals.commission)}`);
    return lines;
}

export function buildSummaryPdfLines(input: CommissionReportShareInput): string[] {
    return [
        ...headerLines(input, 'resumido'),
        ...totalLines(input),
        '',
        'Gerado pelo AgendiX',
    ];
}

function formatDetailDate(iso: string): string {
    const ymd = iso.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
    return iso;
}

export function buildDetailedPdfLines(input: CommissionReportShareInput): string[] {
    const { formatMoney: money } = input;
    const lines = [
        ...headerLines(input, 'detalhado'),
        '',
        'Linhas',
    ];
    for (const row of input.records) {
        const client = row.client_name ? ` · ${row.client_name}` : '';
        lines.push(
            `${formatDetailDate(row.created_at)} · ${row.service_name}${client}`,
        );
        lines.push(
            `Valor ${money(row.amount)}  Taxa ${money(row.machine_fee_amount)}  Base ${money(row.commission_base)}  ${row.commission_rate}%  Comissão ${money(row.commission_value)}`,
        );
    }
    lines.push(...totalLines(input));
    if (input.paidAtLabel) {
        lines.push(input.paidAtLabel);
    }
    lines.push('');
    lines.push('Gerado pelo AgendiX');
    return lines;
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
