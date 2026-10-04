import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Loader2, Check, Clock, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { useTenantLocale } from '../hooks/useTenantLocale';
import { useAuth } from '../contexts/AuthContext';
import { resolveBusinessTimezone } from '../utils/businessTimezone';
import {
    formatPaidAtLabel,
    groupPaidRecordsByTimestamp,
    periodLabelFromRange,
    type GroupedCommissionPayment,
} from '../utils/commissionReport';
import { CommissionDetailReport } from './CommissionDetailReport';

interface CommissionPaymentHistoryProps {
    professionalId: string;
    professionalName: string;
    onClose: () => void;
    accentColor: string;
    currencySymbol: string;
    cpf?: string | null;
    commissionRate?: number;
}

export const CommissionPaymentHistory: React.FC<CommissionPaymentHistoryProps> = ({
    professionalId,
    professionalName,
    onClose,
    accentColor,
    currencySymbol,
    cpf = null,
    commissionRate = 0,
}) => {
    const { region } = useAuth();
    const tz = resolveBusinessTimezone({ region });
    const { formatMoney } = useTenantLocale();
    const isBeauty = accentColor.includes('beauty');
    const theme: ThemeVariant = isBeauty ? 'beauty' : 'barber';
    const { colors, accent, font, status, radius } = useBrutalTheme({ override: theme });
    const [payments, setPayments] = useState<GroupedCommissionPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selected, setSelected] = useState<GroupedCommissionPayment | null>(null);

    useEffect(() => {
        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        const pad = (n: number) => String(n).padStart(2, '0');
        const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        setStartDate(iso(sixMonthsAgo));
        setEndDate(iso(today));
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchPaymentHistory();
        }
    }, [professionalId, startDate, endDate]);

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('finance_records')
                .select('commission_paid_at, created_at, commission_value')
                .eq('professional_id', professionalId)
                .eq('commission_paid', true)
                .not('commission_paid_at', 'is', null)
                .gte('commission_paid_at', `${startDate}T00:00:00`)
                .lte('commission_paid_at', `${endDate}T23:59:59`)
                .order('commission_paid_at', { ascending: false });

            if (error) throw error;

            const { data: paymentRows } = await supabase
                .from('commission_payments')
                .select('paid_at, start_date, end_date')
                .eq('professional_id', professionalId)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false });

            setPayments(groupPaidRecordsByTimestamp(Array.isArray(data) ? data : [], Array.isArray(paymentRows) ? paymentRows : [], tz));
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalServices = payments.reduce((sum, p) => sum + p.servicesCount, 0);

    const dateInputClass = `w-full p-2 md:p-2.5 ${colors.inputBg} ${colors.inputBorder} border ${radius.input} ${colors.text} text-xs focus:border-[var(--color-input-focus)] outline-none transition-colors`;

    if (selected) {
        return (
            <CommissionDetailReport
                professionalId={professionalId}
                professionalName={professionalName}
                cpf={cpf}
                commissionRate={commissionRate}
                periodStart={selected.periodStart}
                periodEnd={selected.periodEnd}
                periodLabel={periodLabelFromRange(selected.periodStart, selected.periodEnd, tz)}
                currencySymbol={currencySymbol}
                accentColor={accentColor}
                mode="paid"
                paidAt={selected.paidAt}
                onClose={() => setSelected(null)}
            />
        );
    }

    return (
        <Modal open size="full" onClose={onClose} showCloseButton={false}>
            <div className="-m-5 flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden md:-m-6">
                <div className={`p-4 md:p-8 border-b ${colors.divider} ${colors.card} sticky top-0 z-20`}>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <div className={`w-10 h-10 md:w-12 md:h-12 ${radius.card} flex items-center justify-center ${colors.surface} ${colors.border} border shrink-0`}>
                                <Clock className={`w-5 h-5 md:w-6 md:h-6 ${accent.text}`} />
                            </div>
                            <div className="min-w-0">
                                <h2 className={`text-lg md:text-2xl ${font.heading} ${colors.text} tracking-tight truncate`}>Histórico de pagamentos</h2>
                                <p className={`${colors.textSecondary} text-xs md:text-sm mt-0.5 truncate`}>Repasses para <span className={`${colors.text} font-semibold`}>{professionalName}</span></p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fechar"
                            className={`${colors.textMuted} hover:text-theme-text transition-all p-2 hover:bg-theme-surface ${radius.button} border border-transparent hover:border-theme-border`}
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    <div className={`${colors.surface} p-3 md:p-4 ${radius.card} ${colors.border} border`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={`${colors.textMuted} text-xs uppercase ${font.mono} block px-1`}>Período de consulta</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className={dateInputClass}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className={dateInputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className={`${colors.textMuted} text-xs uppercase ${font.mono} block px-1`}>Seleção rápida</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const today = new Date();
                                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                            const pad = (n: number) => String(n).padStart(2, '0');
                                            const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                                            setStartDate(iso(firstDay));
                                            setEndDate(iso(lastDay));
                                        }}
                                        className={`flex-1 py-2 px-2 ${radius.button} text-xs font-semibold ${colors.inputBg} ${colors.surfaceHover} ${colors.text} ${colors.border} border min-h-[44px]`}
                                    >
                                        Este mês
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const today = new Date();
                                            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                                            const pad = (n: number) => String(n).padStart(2, '0');
                                            const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                                            setStartDate(iso(firstDay));
                                            setEndDate(iso(lastDay));
                                        }}
                                        className={`flex-1 py-2 px-2 ${radius.button} text-xs font-semibold ${colors.inputBg} ${colors.surfaceHover} ${colors.text} ${colors.border} border min-h-[44px]`}
                                    >
                                        Mês passado
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${colors.bg}`}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className={`w-10 h-10 animate-spin ${accent.text}`} />
                            <p className={`${colors.textMuted} ${font.mono} text-xs uppercase tracking-widest`}>Buscando pagamentos...</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className={`text-center py-20 ${colors.surface} ${radius.card} border-2 border-dashed ${colors.border}`}>
                            <Clock className={`w-12 h-12 ${colors.textMuted} mx-auto mb-4`} />
                            <p className={`${colors.text} font-medium`}>Nenhum pagamento registrado.</p>
                            <p className={`${colors.textSecondary} text-xs mt-1`}>Os repasses aparecem aqui depois de liquidados</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {payments.map((payment) => (
                                <article
                                    key={payment.paidAt}
                                    data-testid="payment-history-card"
                                    data-paid-at={payment.paidAt}
                                    className={`${colors.card} ${colors.border} border ${radius.card} p-4 md:p-5`}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-8 h-8 ${radius.badge} ${status.successBg} flex items-center justify-center ${status.successBorder} border shrink-0`}>
                                                    <Check className={`w-4 h-4 ${status.success}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className={`text-xs font-semibold ${status.success}`}>Pagamento efetuado</span>
                                                    <p className={`text-sm ${colors.text} tabular-nums`}>
                                                        {formatPaidAtLabel(payment.paidAt, tz)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-xs ${colors.textMuted} mb-0.5`}>Total pago</p>
                                                <p className={`${font.mono} font-bold text-lg md:text-2xl tabular-nums ${accent.text} leading-none`}>
                                                    {formatMoney(payment.amount)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 ${radius.card} ${colors.surface} ${colors.border} border`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 ${radius.badge} ${colors.card} ${colors.border} border flex items-center justify-center`}>
                                                    <Calendar className={`w-4 h-4 ${colors.textSecondary}`} />
                                                </div>
                                                <div>
                                                    <p className={`text-xs ${colors.textMuted} mb-0.5`}>Período</p>
                                                    <p className={`${colors.text} text-sm tabular-nums`}>
                                                        {periodLabelFromRange(payment.periodStart, payment.periodEnd, tz)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-3 border-t sm:border-t-0 sm:border-l ${colors.divider} pt-3 sm:pt-0 sm:pl-3`}>
                                                <div className={`w-8 h-8 ${radius.badge} ${colors.card} ${colors.border} border flex items-center justify-center`}>
                                                    <TrendingUp className={`w-4 h-4 ${colors.textSecondary}`} />
                                                </div>
                                                <div>
                                                    <p className={`text-xs ${colors.textMuted} mb-0.5`}>Serviços</p>
                                                    <p className={`${colors.text} text-sm`}>
                                                        {payment.servicesCount} {payment.servicesCount === 1 ? 'atendimento liquidado' : 'atendimentos liquidados'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:flex md:justify-end">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            className="w-full md:w-auto"
                                            onClick={() => setSelected(payment)}
                                        >
                                            Ver relatório
                                        </Button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`p-4 md:p-8 border-t ${colors.divider} ${colors.card}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                        <div className="flex justify-between md:justify-start items-center gap-6 md:gap-10 w-full md:w-auto">
                            <div>
                                <p className={`${colors.textMuted} text-xs mb-1`}>Total geral pago</p>
                                <p className={`${font.mono} font-bold text-xl md:text-3xl tabular-nums ${accent.text} leading-none`}>
                                    {formatMoney(totalPaid)}
                                </p>
                            </div>
                            <div className={`h-10 w-px ${colors.divider}`}></div>
                            <div>
                                <p className={`${colors.textMuted} text-xs mb-1`}>Serviços</p>
                                <p className={`${colors.text} ${font.mono} font-bold text-xl md:text-3xl tabular-nums leading-none`}>
                                    {totalServices}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            onClick={onClose}
                            className="w-full md:w-auto md:px-12"
                        >
                            Fechar histórico
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
