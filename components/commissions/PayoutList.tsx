import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, User } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import type { CycleStatus } from '../../types/staffPerformance';

export interface PayoutRowData {
    professional_id: string;
    professional_name: string;
    photo_url: string | null;
    commission_rate: number;
    total_due: number;
    services_pending: number;
    products_pending: number;
    /** P1 (ciclo do servidor): status M2, saldo de ciclos anteriores e selo Inativo. */
    cycle?: {
        status: CycleStatus;
        saldo_acumulado: number;
        saldo_anterior: number;
        inactive: boolean;
        pago_ciclo: number | null;
        pago_calculado: number;
        paid_at: string | null;
        /** Data local do lançamento não pago mais antigo (fuso do tenant). */
        primeiro_nao_pago: string | null;
        /** Exceção do colaborador: ciclo próprio (semanal/quinzenal/mensal) em vez do ciclo do negócio. */
        own?: { start: string; end: string; pay_due: string; frequency: string } | null;
    };
}

interface PayoutListProps {
    rows: PayoutRowData[];
    theme: ThemeVariant;
    formatMoney: (v: number) => string;
    payingId: string | null;
    /** Já liquidados nesta sessão — o botão não volta a ficar clicável. */
    settledIds?: ReadonlySet<string>;
    onPay: (row: PayoutRowData) => void;
    /** Análise do colaborador na Performance, com as datas do ciclo (R6.4) — fica no menu "⋯" da linha. */
    analysisHref: (row: PayoutRowData) => string;
    /** Link único "Ver histórico e análise" no topo da lista (PR-F #10): Performance da equipe no ciclo. */
    historyHref: string;
    /** "Período 06/09 – 05/10" mostrado em cada cartão com valor a pagar. */
    periodLabel?: string;
    onOpenReport: (row: PayoutRowData) => void;
    onOpenHistory: (row: PayoutRowData) => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const FREQ_LABEL: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal' };

/** "Exceção · Semanal · 28/09 – 04/10" para quem tem regra própria. */
export function ownCycleLabel(own: { start: string; end: string; frequency: string }): string {
    return `Exceção · ${FREQ_LABEL[own.frequency] ?? 'Ciclo próprio'} · ${ddmm(own.start)} – ${ddmm(own.end)}`;
}

export function pendingContext(services: number, products: number): string {
    if (!services && !products) return 'Nada pendente';
    return `Pendentes: ${plural(services, 'serviço', 'serviços')} · ${plural(products, 'produto', 'produtos')}`;
}

export function cycleContext(services: number, products: number): string {
    if (!services && !products) return 'Nenhum lançamento neste ciclo';
    return `${plural(services, 'serviço', 'serviços')} · ${plural(products, 'produto', 'produtos')} neste ciclo`;
}

/** Valor efetivamente devido neste clique: ciclo atual, ou só o saldo anterior (nunca o acumulado). */
export function payoutDueAmount(row: PayoutRowData): number {
    if (row.total_due > 0) return row.total_due;
    const earlier = row.cycle?.saldo_anterior ?? 0;
    return earlier > 0 ? earlier : 0;
}

/** Intervalo enviado a pay_commission_v1: cobre o lançamento mais antigo quando só há saldo anterior. */
export function payoutPaymentRange(
    row: PayoutRowData,
    cycle: { start: string; end: string },
    previousEnd: string,
    opts?: { today?: string; open?: boolean },
): { start: string; end: string; amount: number } {
    const amount = payoutDueAmount(row);
    const earliest = row.cycle?.primeiro_nao_pago;
    const priorOnly = (row.total_due ?? 0) <= 0 && (row.cycle?.saldo_anterior ?? 0) > 0;
    if (priorOnly && earliest) {
        return { start: earliest, end: previousEnd, amount };
    }
    const window = row.cycle?.own ?? cycle;
    const end = opts?.today && opts.today >= window.start && opts.today <= window.end
        && (opts.open || row.cycle?.own)
        ? opts.today
        : window.end;
    return { start: window.start, end, amount };
}

const STATUS: Record<CycleStatus, { label: string; variant: 'warning' | 'success' | 'accent' | 'neutral' }> = {
    pendente: { label: 'Pendente', variant: 'warning' },
    pago: { label: 'Pago', variant: 'success' },
    pago_com_ajuste: { label: 'Pago com ajuste', variant: 'accent' },
    nada_a_pagar: { label: 'Nada a pagar', variant: 'neutral' },
};

/** Data local do pagamento ("Pago em 06/09"); o timestamp vem com fuso. */
const paidDay = (ts: string) => {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const StatusCell: React.FC<{ row: PayoutRowData; theme: ThemeVariant; formatMoney: (v: number) => string; className?: string }> = ({ row, theme, formatMoney, className }) => {
    const { colors } = useBrutalTheme({ override: theme });
    const c = row.cycle;
    if (!c) {
        const due = row.total_due > 0;
        return <Badge variant={due ? 'warning' : 'neutral'} forceTheme={theme} className={className}>{due ? 'Pendente' : 'Em dia'}</Badge>;
    }
    const status: CycleStatus = c.status === 'nada_a_pagar' && c.saldo_anterior > 0 ? 'pendente' : c.status;
    const s = STATUS[status];
    const title = status === 'pago_com_ajuste' && c.pago_ciclo != null
        ? `Pago ${formatMoney(c.pago_ciclo)} · calculado ${formatMoney(c.pago_calculado)}`
        : undefined;
    const paid = (status === 'pago' || status === 'pago_com_ajuste') && c.paid_at ? paidDay(c.paid_at) : null;
    return (
        <span className={`inline-flex flex-col items-end lg:items-start gap-0.5 ${className ?? ''}`} title={title}>
            <Badge variant={s.variant} forceTheme={theme} className="whitespace-nowrap">{s.label}</Badge>
            {paid && (
                <span className={`text-xs leading-snug ${colors.textMuted} tabular-nums text-right lg:text-left`}>
                    {`Pago em ${paid}${status === 'pago_com_ajuste' && c.pago_ciclo != null ? ` · ${formatMoney(c.pago_ciclo).replace(/ /g, '\u00a0')}` : ''}`}
                </span>
            )}
        </span>
    );
};

/** Colunas da tabela no desktop (≥1024 px). No mobile a mesma linha vira cartão. */
const GRID = 'lg:grid lg:grid-cols-[minmax(0,1.5fr)_3.5rem_4.5rem_4.5rem_10rem_8.5rem_minmax(0,2.3fr)] lg:items-center lg:gap-4';

type RowKind = 'due' | 'paid' | 'nothing';

/** Separa quem tem valor (cartão), quem já recebeu no período e quem não tem nada a receber (lista simples). */
export function payoutRowKind(row: PayoutRowData, settled: boolean): RowKind {
    if (settled) return 'paid';
    if (payoutDueAmount(row) > 0) return 'due';
    const st = row.cycle?.status;
    if (st === 'pago' || st === 'pago_com_ajuste') return 'paid';
    return 'nothing';
}

const RowMenu: React.FC<{ row: PayoutRowData; theme: ThemeVariant; analysisHref: string; onReport: () => void; onHistory: () => void }> = ({ row, theme, analysisHref, onReport, onHistory }) => {
    const { colors, radius } = useBrutalTheme({ override: theme });
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
    }, [open]);
    const item = `flex items-center w-full text-left px-3 py-2.5 min-h-[44px] text-sm ${colors.text} ${colors.surfaceHover} ${radius.button}`;
    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Mais ações de ${row.professional_name}`}
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] ${radius.button} border ${colors.border} ${colors.textMuted} ${colors.surfaceHover}`}
            >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            {open && (
                <div role="menu" className={`absolute right-0 top-full mt-1 z-20 w-56 p-1 ${colors.card} border ${colors.border} ${radius.card} shadow-[var(--shadow-modal)]`}>
                    <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onReport(); }}>Relatório de comissões</button>
                    <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onHistory(); }}>Histórico de pagamentos</button>
                    <Link role="menuitem" to={analysisHref} className={item} onClick={() => setOpen(false)}>Análise na Performance</Link>
                </div>
            )}
        </div>
    );
};

const Avatar: React.FC<{ row: PayoutRowData; theme: ThemeVariant }> = ({ row, theme }) => {
    const { colors, radius } = useBrutalTheme({ override: theme });
    return row.photo_url ? (
        <img src={row.photo_url} alt="" className={`w-10 h-10 shrink-0 object-cover ${radius.avatar} border ${colors.border}`} />
    ) : (
        <span className={`w-10 h-10 shrink-0 flex items-center justify-center ${radius.avatar} ${colors.surface} border ${colors.border}`}>
            <User className={`w-5 h-5 ${colors.textMuted}`} aria-hidden="true" />
        </span>
    );
};

export const PayoutList: React.FC<PayoutListProps> = ({ rows, theme, formatMoney, payingId, settledIds, onPay, analysisHref, historyHref, periodLabel, onOpenReport, onOpenHistory }) => {
    const { colors, font, radius, accent, isBeauty } = useBrutalTheme({ override: theme });
    const lgRadius = isBeauty ? 'lg:rounded-2xl' : 'lg:rounded-lg';
    const head = `text-[13px] font-medium ${colors.textSecondary}`;
    const kinds = rows.map((r) => ({ r, kind: payoutRowKind(r, settledIds?.has(r.professional_id) ?? false) }));
    const dueRows = kinds.filter((k) => k.kind === 'due').map((k) => k.r);
    const paidRows = kinds.filter((k) => k.kind === 'paid').map((k) => k.r);
    const nothingRows = kinds.filter((k) => k.kind === 'nothing').map((k) => k.r);
    const firstDueId = dueRows[0]?.professional_id;

    return (
        <div className="space-y-6">
            <div className="flex justify-end -mt-2">
                <Link
                    to={historyHref}
                    className={`inline-flex items-center text-sm font-medium ${accent.text} min-h-[44px] px-1 underline-offset-4 hover:underline whitespace-nowrap`}
                >
                    Ver histórico e análise
                </Link>
            </div>

            {dueRows.length > 0 && (
                <div className={`lg:border lg:border-theme-border lg:bg-theme-card ${lgRadius}`}>
                    <div className={`hidden ${GRID} px-5 py-3 border-b ${colors.border}`} aria-hidden="true">
                        <span className={head}>Colaborador</span>
                        <span className={`${head} text-right`}>%</span>
                        <span className={`${head} text-right`}>Serviços</span>
                        <span className={`${head} text-right`}>Produtos</span>
                        <span className={`${head} text-right`}>A pagar</span>
                        <span className={head}>Status</span>
                        <span className={`${head} text-right`}>Ações</span>
                    </div>
                    <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-[var(--color-divider)]">
                        {dueRows.map((r) => {
                            const payable = payoutDueAmount(r);
                            const paying = payingId === r.professional_id;
                            const earlier = r.cycle?.saldo_anterior ?? 0;
                            const priorOnly = earlier > 0 && r.total_due <= 0;
                            const emphasize = r.professional_id === firstDueId;
                            const amount = formatMoney(r.total_due > 0 ? r.total_due : payable);
                            return (
                                <li
                                    key={r.professional_id}
                                    data-testid={`payout-row-${r.professional_id}`}
                                    className={`p-4 border ${colors.border} ${radius.card} ${colors.card} lg:border-0 lg:rounded-none lg:bg-transparent lg:px-5 lg:py-3.5 ${GRID}`}
                                >
                                    {/* Colaborador */}
                                    <div className="flex items-start lg:items-center gap-3 min-w-0">
                                        <Avatar row={r} theme={theme} />
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-semibold ${colors.text} leading-tight break-words`}>
                                                {r.professional_name}
                                                {r.cycle?.inactive && <Badge variant="neutral" forceTheme={theme} className="ml-2 align-middle">Inativo</Badge>}
                                            </p>
                                            {r.cycle?.own ? (
                                                <p data-testid={`own-cycle-${r.professional_id}`} className={`mt-1 text-xs ${colors.textSecondary} tabular-nums`}>
                                                    {ownCycleLabel(r.cycle.own)}
                                                </p>
                                            ) : periodLabel ? (
                                                <p className={`mt-1 text-xs ${colors.textSecondary} tabular-nums lg:hidden`}>{periodLabel}</p>
                                            ) : null}
                                            <p className={`mt-0.5 text-xs ${colors.textSecondary} lg:hidden`}>
                                                <span className="tabular-nums">{r.commission_rate || 0}%</span> de comissão
                                            </p>
                                        </div>
                                        {/* mobile: valor + status à direita, 1ª linha */}
                                        <div className="text-right shrink-0 lg:hidden">
                                            <p className={`${font.mono} text-lg font-bold tabular-nums whitespace-nowrap ${colors.text}`}>{amount}</p>
                                            <StatusCell row={r} theme={theme} formatMoney={formatMoney} className="mt-1" />
                                        </div>
                                    </div>

                                    {/* desktop: colunas */}
                                    <div className="hidden lg:flex lg:justify-end">
                                        {/* % é editado no drawer do colaborador (Ajustes › Equipe) */}
                                        <span className={`${font.mono} tabular-nums text-sm ${colors.textSecondary}`}>
                                            {r.commission_rate || 0}%
                                        </span>
                                    </div>
                                    <span className={`hidden lg:block text-right ${font.mono} tabular-nums text-sm ${colors.textSecondary}`}>{r.services_pending}</span>
                                    <span className={`hidden lg:block text-right ${font.mono} tabular-nums text-sm ${colors.textSecondary}`}>{r.products_pending}</span>
                                    <span className="hidden lg:block text-right">
                                        <span className={`block ${font.mono} tabular-nums font-bold whitespace-nowrap ${colors.text}`}>{amount}</span>
                                        {earlier > 0 && r.total_due > 0 && <span className={`block mt-0.5 text-xs leading-snug ${colors.textSecondary} tabular-nums`}><span className="whitespace-nowrap">+ {formatMoney(earlier)}</span> de ciclos anteriores</span>}
                                        {priorOnly && <span className={`block mt-0.5 text-xs leading-snug ${colors.textSecondary}`}>de ciclos anteriores</span>}
                                    </span>
                                    <span className="hidden lg:block"><StatusCell row={r} theme={theme} formatMoney={formatMoney} /></span>

                                    {/* contexto (mobile) */}
                                    {priorOnly ? (
                                        <p className={`mt-3 text-xs ${colors.textSecondary} tabular-nums lg:hidden`}>{formatMoney(payable)} de ciclos anteriores</p>
                                    ) : (
                                        <>
                                            <p className={`mt-3 text-xs ${colors.textSecondary} lg:hidden`}>
                                                {r.cycle ? cycleContext(r.services_pending, r.products_pending) : pendingContext(r.services_pending, r.products_pending)}
                                            </p>
                                            {earlier > 0 && r.total_due > 0 && (
                                                <p className={`mt-1 text-xs ${colors.textSecondary} tabular-nums lg:hidden`}>+ {formatMoney(earlier)} de ciclos anteriores</p>
                                            )}
                                        </>
                                    )}

                                    {/* ações */}
                                    <div className="mt-3 flex items-center gap-2 lg:mt-0 lg:justify-end">
                                        <Button
                                            variant={emphasize ? 'primary' : 'secondary'}
                                            size="sm"
                                            forceTheme={theme}
                                            className="flex-1 lg:flex-none lg:min-w-[112px] min-h-[44px]"
                                            disabled={!!payingId}
                                            loading={paying}
                                            onClick={() => onPay(r)}
                                            aria-label={`Pagar ${r.professional_name}`}
                                        >
                                            {paying ? 'Processando' : 'Pagar'}
                                        </Button>
                                        <RowMenu row={r} theme={theme} analysisHref={analysisHref(r)} onReport={() => onOpenReport(r)} onHistory={() => onOpenHistory(r)} />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {paidRows.length > 0 && (
                <section aria-labelledby="payout-paid-title" className="space-y-3">
                    <h3 id="payout-paid-title" className={`text-sm font-semibold ${colors.text}`}>Pagos neste período</h3>
                    <ul className={`divide-y ${colors.divider} border ${colors.border} ${radius.card} ${colors.card}`}>
                        {paidRows.map((r) => {
                            const settledNow = settledIds?.has(r.professional_id) ?? false;
                            return (
                                <li key={r.professional_id} data-testid={`payout-paid-${r.professional_id}`} className="flex items-center gap-3 px-4 py-2.5 min-h-[60px]">
                                    <Avatar row={r} theme={theme} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-semibold ${colors.text} truncate`}>{r.professional_name}</p>
                                        {r.cycle?.pago_ciclo != null && (
                                            <p className={`text-xs ${colors.textSecondary} tabular-nums`}>{formatMoney(r.cycle.pago_ciclo)} pagos</p>
                                        )}
                                    </div>
                                    {settledNow && !(r.cycle?.status === 'pago' || r.cycle?.status === 'pago_com_ajuste') ? (
                                        <Badge variant="success" forceTheme={theme}>Pago agora</Badge>
                                    ) : (
                                        <StatusCell row={r} theme={theme} formatMoney={formatMoney} className="shrink-0" />
                                    )}
                                    <RowMenu row={r} theme={theme} analysisHref={analysisHref(r)} onReport={() => onOpenReport(r)} onHistory={() => onOpenHistory(r)} />
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {nothingRows.length > 0 && (
                <p data-testid="payout-nothing-due" className={`text-sm leading-relaxed ${colors.textSecondary}`}>
                    <span className={`font-medium ${colors.text}`}>Nada a pagar neste período:</span>{' '}
                    {nothingRows.map((r, i) => (
                        <React.Fragment key={r.professional_id}>
                            {i > 0 && ' '}
                            <span className="whitespace-nowrap">
                                <button
                                    type="button"
                                    onClick={() => onOpenHistory(r)}
                                    aria-label={`Histórico de pagamentos de ${r.professional_name}`}
                                    title="Ver histórico de pagamentos"
                                    className="inline -my-2 py-2 underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                                >
                                    {r.professional_name}
                                </button>
                                {i < nothingRows.length - 1 ? ',' : '.'}
                            </span>
                        </React.Fragment>
                    ))}
                </p>
            )}
        </div>
    );
};
