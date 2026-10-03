import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, User } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

export interface PayoutRowData {
    professional_id: string;
    professional_name: string;
    photo_url: string | null;
    commission_rate: number;
    total_due: number;
    services_pending: number;
    products_pending: number;
}

interface PayoutListProps {
    rows: PayoutRowData[];
    theme: ThemeVariant;
    formatMoney: (v: number) => string;
    payingId: string | null;
    onPay: (row: PayoutRowData) => void;
    onEditRate: (row: PayoutRowData) => void;
    onOpenDetails: (row: PayoutRowData) => void;
    onOpenReport: (row: PayoutRowData) => void;
    onOpenHistory: (row: PayoutRowData) => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function pendingContext(services: number, products: number): string {
    if (!services && !products) return 'Nada pendente';
    return `Pendentes: ${plural(services, 'serviço', 'serviços')} · ${plural(products, 'produto', 'produtos')}`;
}

/** Colunas da tabela no desktop (≥1024 px). No mobile a mesma linha vira cartão. */
const GRID = 'lg:grid lg:grid-cols-[minmax(0,1.6fr)_4.5rem_5rem_5rem_8.5rem_6.5rem_minmax(0,2.3fr)] lg:items-center lg:gap-4';

const RowMenu: React.FC<{ row: PayoutRowData; theme: ThemeVariant; onReport: () => void; onHistory: () => void }> = ({ row, theme, onReport, onHistory }) => {
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
    const item = `w-full text-left px-3 py-2.5 min-h-[44px] text-sm ${colors.text} ${colors.surfaceHover} ${radius.button}`;
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
                </div>
            )}
        </div>
    );
};

export const PayoutList: React.FC<PayoutListProps> = ({ rows, theme, formatMoney, payingId, onPay, onEditRate, onOpenDetails, onOpenReport, onOpenHistory }) => {
    const { colors, font, radius, accent, isBeauty } = useBrutalTheme({ override: theme });
    const lgRadius = isBeauty ? 'lg:rounded-2xl' : 'lg:rounded-lg';
    const head = `${font.mono} text-xs uppercase tracking-wide ${colors.textMuted}`;
    return (
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
            <ul className={`space-y-3 lg:space-y-0 lg:divide-y lg:divide-[var(--color-divider)]`}>
                {rows.map((r) => {
                    const due = r.total_due > 0;
                    const paying = payingId === r.professional_id;
                    return (
                        <li
                            key={r.professional_id}
                            data-testid={`payout-row-${r.professional_id}`}
                            className={`p-4 border ${colors.border} ${radius.card} ${colors.card} lg:border-0 lg:rounded-none lg:bg-transparent lg:px-5 lg:py-3.5 ${GRID}`}
                        >
                            {/* Colaborador */}
                            <div className="flex items-start lg:items-center gap-3 min-w-0">
                                {r.photo_url ? (
                                    <img src={r.photo_url} alt="" className={`w-10 h-10 shrink-0 object-cover ${radius.avatar} border ${colors.border}`} />
                                ) : (
                                    <span className={`w-10 h-10 shrink-0 flex items-center justify-center ${radius.avatar} ${colors.surface} border ${colors.border}`}>
                                        <User className={`w-5 h-5 ${colors.textMuted}`} aria-hidden="true" />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className={`font-semibold ${colors.text} leading-tight break-words`}>{r.professional_name}</p>
                                    <p className={`mt-1 text-xs ${colors.textMuted} flex items-center gap-1.5 lg:hidden`}>
                                        <span className="tabular-nums">{r.commission_rate || 0}%</span>
                                        <span aria-hidden="true">·</span>
                                        <button type="button" onClick={() => onEditRate(r)} className={`${accent.text} inline-flex items-center min-h-[44px] -my-3 px-1 -mx-1 underline-offset-2 hover:underline`} aria-label={`Alterar % de ${r.professional_name}`}>
                                            Alterar %
                                        </button>
                                    </p>
                                </div>
                                {/* mobile: valor + status à direita, 1ª linha */}
                                <div className="text-right shrink-0 lg:hidden">
                                    <p className={`${font.mono} text-lg font-bold tabular-nums whitespace-nowrap ${due ? colors.text : colors.textMuted}`}>{formatMoney(r.total_due)}</p>
                                    <Badge variant={due ? 'warning' : 'neutral'} forceTheme={theme} className="mt-1">{due ? 'Pendente' : 'Em dia'}</Badge>
                                </div>
                            </div>

                            {/* desktop: colunas */}
                            <div className="hidden lg:flex lg:justify-end">
                                <button type="button" onClick={() => onEditRate(r)} title="Alterar %" aria-label={`Alterar % de ${r.professional_name} (${r.commission_rate || 0}%)`} className={`${font.mono} tabular-nums text-sm ${colors.textSecondary} hover:text-theme-accent underline decoration-dotted underline-offset-4 min-h-[36px]`}>
                                    {r.commission_rate || 0}%
                                </button>
                            </div>
                            <span className={`hidden lg:block text-right ${font.mono} tabular-nums text-sm ${colors.textSecondary}`}>{r.services_pending}</span>
                            <span className={`hidden lg:block text-right ${font.mono} tabular-nums text-sm ${colors.textSecondary}`}>{r.products_pending}</span>
                            <span className={`hidden lg:block text-right ${font.mono} tabular-nums font-bold whitespace-nowrap ${due ? colors.text : colors.textMuted}`}>{formatMoney(r.total_due)}</span>
                            <span className="hidden lg:block"><Badge variant={due ? 'warning' : 'neutral'} forceTheme={theme}>{due ? 'Pendente' : 'Em dia'}</Badge></span>

                            {/* contexto (mobile) */}
                            <p className={`mt-3 text-xs ${colors.textMuted} lg:hidden`}>{pendingContext(r.services_pending, r.products_pending)}</p>

                            {/* ações */}
                            <div className="mt-3 flex flex-col gap-2 lg:mt-0 lg:flex-row lg:items-center lg:justify-end">
                                <Button
                                    variant={due ? 'primary' : 'secondary'}
                                    size="sm"
                                    forceTheme={theme}
                                    className="w-full lg:w-auto lg:min-w-[112px] min-h-[44px]"
                                    disabled={!due || !!payingId}
                                    loading={paying}
                                    onClick={() => onPay(r)}
                                    aria-label={due ? `Pagar ${r.professional_name}` : `Nada a pagar para ${r.professional_name}`}
                                >
                                    {paying ? 'Processando' : due ? 'Pagar' : 'Nada a pagar'}
                                </Button>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onOpenDetails(r)}
                                        className={`flex-1 lg:flex-none text-left lg:text-right text-sm ${accent.text} min-h-[44px] px-1 underline-offset-4 hover:underline whitespace-nowrap`}
                                    >
                                        Ver histórico e análise
                                    </button>
                                    <RowMenu row={r} theme={theme} onReport={() => onOpenReport(r)} onHistory={() => onOpenHistory(r)} />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
