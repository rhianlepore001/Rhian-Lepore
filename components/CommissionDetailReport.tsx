import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Share2, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { CommissionShareModal } from './CommissionShareModal';
import { useTenantLocale } from '../hooks/useTenantLocale';
import { resolveBusinessTimezone } from '../utils/businessTimezone';
import {
    commissionReportFilters,
    formatPaidAtLabel,
    periodLabelFromRange,
    reportBusinessTypeHeading,
    resolveCommissionServiceName,
    type CommissionReportMode,
    type CommissionReportShareInput,
} from '../utils/commissionReport';

interface ServiceRecord {
    id: string;
    created_at: string;
    service_name: string;
    client_name: string | null;
    amount: number;
    payment_method: string | null;
    machine_fee_percent: number;
    machine_fee_amount: number;
    commission_base: number;
    commission_rate: number;
    commission_value: number;
}

interface LatestPayment {
    paid_at: string;
    start_date: string;
    end_date: string;
}

interface CommissionDetailReportProps {
    professionalId: string;
    professionalName: string;
    cpf?: string | null;
    commissionRate: number;
    periodStart: string;
    periodEnd: string;
    periodLabel: string;
    currencySymbol: string;
    accentColor: string;
    onClose: () => void;
    mode?: CommissionReportMode;
    paidAt?: string | null;
}

const SELECT = `
    id, created_at, service_name, client_name, description,
    revenue, payment_method,
    commission_rate, commission_value,
    appointments!appointment_id (machine_fee_percent, service)
`;

export const CommissionDetailReport: React.FC<CommissionDetailReportProps> = ({
    professionalId,
    professionalName,
    cpf,
    commissionRate,
    periodStart,
    periodEnd,
    periodLabel,
    currencySymbol: _currencySymbol,
    accentColor,
    onClose,
    mode = 'pending',
    paidAt = null,
}) => {
    const { user, region, businessName, userType } = useAuth();
    const { formatMoney } = useTenantLocale();
    const tz = resolveBusinessTimezone({ region });
    const isBeauty = accentColor.includes('beauty');
    const { colors, accent, font, radius, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });
    const [records, setRecords] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [view, setView] = useState<CommissionReportMode>(mode);
    const [viewPaidAt, setViewPaidAt] = useState<string | null>(paidAt);
    const [viewPeriod, setViewPeriod] = useState({ start: periodStart, end: periodEnd, label: periodLabel });
    const [latestPayment, setLatestPayment] = useState<LatestPayment | null>(null);

    useEffect(() => {
        setView(mode);
        setViewPaidAt(paidAt);
        setViewPeriod({ start: periodStart, end: periodEnd, label: periodLabel });
    }, [mode, paidAt, periodStart, periodEnd, periodLabel]);

    useEffect(() => {
        fetchRecords();
    }, [professionalId, view, viewPaidAt, viewPeriod.start, viewPeriod.end]);

    const fetchRecords = async () => {
        if (!user) return;
        setLoading(true);
        setLoadError(false);
        try {
            const filters = commissionReportFilters({
                mode: view,
                userId: user.id,
                professionalId,
                periodStart: viewPeriod.start,
                periodEnd: viewPeriod.end,
                paidAt: viewPaidAt,
            });
            let q = supabase.from('finance_records').select(SELECT);
            for (const [col, val] of filters.eq) q = q.eq(col, val);
            if (filters.gte) q = q.gte(filters.gte[0], filters.gte[1]);
            if (filters.lte) q = q.lte(filters.lte[0], filters.lte[1]);
            if (filters.lt) q = q.lt(filters.lt[0], filters.lt[1]);
            const { data, error } = await q.order('created_at', { ascending: true });

            if (error) throw error;

            const formatted: ServiceRecord[] = (data || []).map((r: any) => {
                const amount = Number(r.revenue) || 0;
                const appt = Array.isArray(r.appointments) ? r.appointments[0] : r.appointments;
                const feePercent = Number(appt?.machine_fee_percent) || 0;
                const feeAmount = amount * feePercent / 100;
                const base = amount - feeAmount;
                const rate = Number(r.commission_rate) || commissionRate;
                const commValue = Number(r.commission_value) || 0;

                return {
                    id: r.id,
                    created_at: r.created_at,
                    service_name: resolveCommissionServiceName(r),
                    client_name: r.client_name || null,
                    amount,
                    payment_method: r.payment_method || null,
                    machine_fee_percent: feePercent,
                    machine_fee_amount: feeAmount,
                    commission_base: base,
                    commission_rate: rate,
                    commission_value: commValue,
                };
            });

            setRecords(formatted);

            if (view === 'pending' && formatted.length === 0) {
                const { data: paidRows, error: paidErr } = await supabase
                    .from('commission_payments')
                    .select('paid_at, start_date, end_date')
                    .eq('user_id', user.id)
                    .eq('professional_id', professionalId)
                    .eq('status', 'paid')
                    .order('paid_at', { ascending: false })
                    .limit(1);
                if (paidErr) throw paidErr;
                const latest = Array.isArray(paidRows) ? paidRows[0] : paidRows;
                setLatestPayment(latest?.paid_at ? latest : null);
            } else {
                setLatestPayment(null);
            }
        } catch (err) {
            console.error('Error fetching commission records:', err);
            setRecords([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    const openLatestPayment = () => {
        if (!latestPayment) return;
        setView('paid');
        setViewPaidAt(latestPayment.paid_at);
        setViewPeriod({
            start: latestPayment.start_date,
            end: latestPayment.end_date,
            label: periodLabelFromRange(latestPayment.start_date, latestPayment.end_date, tz),
        });
    };

    const totalGross = records.reduce((s, r) => s + r.amount, 0);
    const totalFee = records.reduce((s, r) => s + r.machine_fee_amount, 0);
    const totalBase = records.reduce((s, r) => s + r.commission_base, 0);
    const totalCommission = records.reduce((s, r) => s + r.commission_value, 0);
    const withoutCommission = records.filter((r) => !r.commission_value).length;
    const paidLabel = view === 'paid' && viewPaidAt ? formatPaidAtLabel(viewPaidAt, tz) : null;

    const fmt = (n: number) => formatMoney(n);
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: tz });

    const shareInput: CommissionReportShareInput = useMemo(() => ({
        professionalName,
        cpf,
        periodLabel: viewPeriod.label,
        commissionRate,
        records,
        totals: { gross: totalGross, fee: totalFee, base: totalBase, commission: totalCommission },
        paidAtLabel: paidLabel,
        businessName: businessName || 'AgendiX',
        businessType: reportBusinessTypeHeading(userType),
        formatMoney,
    }), [professionalName, cpf, viewPeriod.label, commissionRate, records, totalGross, totalFee, totalBase, totalCommission, paidLabel, businessName, userType, formatMoney]);

    const totalsBlock = (
        <div className={`border-t ${colors.divider} pt-4 space-y-2`} data-testid="report-totals">
            <div className="flex justify-between text-sm">
                <span className={colors.textMuted}>Subtotal bruto</span>
                <span className={`${colors.text} ${font.mono} tabular-nums`}>{fmt(totalGross)}</span>
            </div>
            {totalFee > 0 && (
                <div className="flex justify-between text-sm">
                    <span className={colors.textMuted}>(−) Taxa maquininha</span>
                    <span className="text-[var(--color-warning)] font-mono tabular-nums">{fmt(totalFee)}</span>
                </div>
            )}
            <div className="flex justify-between text-sm">
                <span className={colors.textMuted}>(=) Base de cálculo</span>
                <span className={`${colors.text} ${font.mono} tabular-nums`}>{fmt(totalBase)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className={colors.textMuted}>Comissão ({commissionRate}%)</span>
                <span className={`${colors.textSecondary} ${font.mono} tabular-nums`}>{fmt(totalCommission)}</span>
            </div>
            <div className={`mt-3 flex items-end justify-between border-t ${colors.divider} pt-3`}>
                <span className={`text-sm font-semibold ${colors.text}`}>Valor líquido a receber</span>
                <span className={`${font.mono} text-xl font-bold tabular-nums ${accent.text}`} data-testid="report-total-commission">{fmt(totalCommission)}</span>
            </div>
            {withoutCommission > 0 && (
                <p className="text-xs text-[var(--color-warning)] pt-1">
                    {withoutCommission} {withoutCommission === 1 ? 'serviço sem comissão registrada não entra' : 'serviços sem comissão registrada não entram'} no total. A comissão não é estimada.
                </p>
            )}
        </div>
    );

    return (
        <>
            <Modal open size="full" onClose={onClose} showCloseButton={false} bodyClassName="flex flex-1 flex-col overflow-hidden p-0">
                <div className="flex min-h-0 flex-1 flex-col">
                    <header className={`shrink-0 border-b px-4 pt-4 pb-3 ${colors.divider}`}>
                        <div className="flex items-center gap-2">
                            <h3 className={`min-w-0 flex-1 truncate text-base font-bold tracking-tight md:text-lg ${colors.text}`}>
                                Relatório de comissões
                            </h3>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowShare(true)}
                                disabled={records.length === 0}
                                icon={<Share2 className="w-3.5 h-3.5" />}
                                aria-label="Compartilhar"
                                className="shrink-0 px-2.5 md:px-3"
                            >
                                <span className="hidden sm:inline">Compartilhar</span>
                            </Button>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Fechar"
                                className={`shrink-0 rounded-lg p-2 ${colors.textMuted} transition-all hover:bg-theme-surface hover:text-theme-text`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className={`mt-1 truncate text-xs ${font.mono} tabular-nums ${colors.textSecondary}`}>
                            {viewPeriod.label}
                            {paidLabel ? ` · ${paidLabel}` : ''}
                        </p>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-5 space-y-5">
                        {showShare ? (
                            <CommissionShareModal
                                report={shareInput}
                                onClose={() => setShowShare(false)}
                            />
                        ) : (
                        <>
                        <section className={`bg-card-elevated border ${colors.border} ${radius.card} p-4`}>
                            <p className={`${colors.text} font-semibold text-lg leading-tight`}>{professionalName}</p>
                            <p className={`mt-1 text-xs ${font.mono} ${colors.textSecondary}`}>
                                CPF: {cpf || 'Não cadastrado'}
                                <span aria-hidden="true"> · </span>
                                Comissão {commissionRate}%
                            </p>
                            {paidLabel && (
                                <p className={`mt-2 text-xs font-semibold ${status.success}`}>{paidLabel}</p>
                            )}
                        </section>

                        {loading ? (
                            <div className="py-16 flex items-center justify-center">
                                <Loader2 className={`w-8 h-8 animate-spin ${accent.text}`} />
                            </div>
                        ) : loadError ? (
                            <div className="py-16 text-center" role="alert">
                                <p className={`${colors.text} font-semibold`}>Não foi possível carregar o relatório.</p>
                                <button type="button" onClick={fetchRecords} className={`mt-3 text-sm ${accent.text} underline underline-offset-4 min-h-[44px]`}>Tentar de novo</button>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="py-12 text-center px-4" data-testid="report-empty">
                                <p className={`${colors.text} font-semibold`}>
                                    {view === 'paid' ? 'Nenhum serviço neste pagamento.' : 'Nada pendente neste período'}
                                </p>
                                {view === 'pending' && latestPayment && (
                                    <button
                                        type="button"
                                        onClick={openLatestPayment}
                                        className={`mt-3 text-sm font-semibold ${accent.text} underline underline-offset-4 min-h-[44px]`}
                                        data-testid="report-open-latest"
                                    >
                                        Ver último pagamento
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <ul className="space-y-2.5 md:hidden" data-testid="report-mobile-list">
                                    {records.map((r) => (
                                        <li key={r.id} className={`border ${colors.border} ${radius.card} ${colors.card} p-3.5`}>
                                            <p className={`text-sm leading-snug ${colors.text}`}>
                                                <span className={`${font.mono} tabular-nums ${colors.textSecondary}`}>{fmtDate(r.created_at)}</span>
                                                <span className={colors.textMuted}> · </span>
                                                <span className="font-medium">{r.service_name}</span>
                                                {r.client_name ? (
                                                    <>
                                                        <span className={colors.textMuted}> · </span>
                                                        <span className={colors.textSecondary}>{r.client_name}</span>
                                                    </>
                                                ) : null}
                                            </p>
                                            <dl className="mt-3 grid grid-cols-3 gap-2 text-right">
                                                <div>
                                                    <dt className={`text-xs ${colors.textMuted}`}>Valor</dt>
                                                    <dd className={`${font.mono} tabular-nums text-sm ${colors.text}`}>{fmt(r.amount)}</dd>
                                                </div>
                                                <div>
                                                    <dt className={`text-xs ${colors.textMuted}`}>Base</dt>
                                                    <dd className={`${font.mono} tabular-nums text-sm ${colors.text}`}>{fmt(r.commission_base)}</dd>
                                                </div>
                                                <div>
                                                    <dt className={`text-xs ${colors.textMuted}`}>Comissão</dt>
                                                    <dd className={`${font.mono} tabular-nums text-sm font-bold ${accent.text}`}>{fmt(r.commission_value)}</dd>
                                                </div>
                                            </dl>
                                        </li>
                                    ))}
                                </ul>

                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={`border-b ${colors.divider}`}>
                                                <th className={`text-left py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Data</th>
                                                <th className={`text-left py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Serviço / Cliente</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Valor</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider hidden md:table-cell`}>Pagamento</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider hidden lg:table-cell`}>Taxa</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Base</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Comissão</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${colors.divider}`}>
                                            {records.map((r) => (
                                                <tr key={r.id} className="hover:bg-[var(--color-card-hover)] transition-colors">
                                                    <td className={`py-3 ${colors.textSecondary} ${font.mono} text-xs whitespace-nowrap tabular-nums`}>{fmtDate(r.created_at)}</td>
                                                    <td className="py-3 pr-4">
                                                        <p className={`${colors.text} text-xs font-medium`}>{r.service_name}</p>
                                                        {r.client_name && <p className={`${colors.textMuted} text-xs`}>{r.client_name}</p>}
                                                    </td>
                                                    <td className={`py-3 text-right ${colors.text} ${font.mono} text-xs whitespace-nowrap tabular-nums`}>{fmt(r.amount)}</td>
                                                    <td className={`py-3 text-right ${colors.textMuted} text-xs hidden md:table-cell whitespace-nowrap`}>
                                                        {r.payment_method || '—'}
                                                    </td>
                                                    <td className="py-3 text-right hidden lg:table-cell whitespace-nowrap">
                                                        {r.machine_fee_percent > 0 ? (
                                                            <span className="text-[var(--color-warning)] text-xs font-mono tabular-nums">−{fmt(r.machine_fee_amount)}</span>
                                                        ) : (
                                                            <span className={`${colors.textMuted} text-xs`}>—</span>
                                                        )}
                                                    </td>
                                                    <td className={`py-3 text-right ${colors.textSecondary} ${font.mono} text-xs whitespace-nowrap tabular-nums`}>{fmt(r.commission_base)}</td>
                                                    <td className="py-3 text-right whitespace-nowrap">
                                                        <span className={`${font.mono} text-xs font-bold tabular-nums ${accent.text}`}>{fmt(r.commission_value)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {totalsBlock}

                                <p className={`pb-4 text-xs ${colors.textMuted} ${font.mono}`}>
                                    {professionalName} · {records.length} serviço{records.length !== 1 ? 's' : ''} · {viewPeriod.label}
                                </p>
                            </>
                        )}
                        </>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};
