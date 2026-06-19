import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Loader2, Check, Clock, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';

interface PaymentRecord {
    payment_date: string;
    period_start: string;
    period_end: string;
    amount: number;
    services_count: number;
}

interface CommissionPaymentHistoryProps {
    professionalId: string;
    professionalName: string;
    onClose: () => void;
    accentColor: string;
    currencySymbol: string;
}

export const CommissionPaymentHistory: React.FC<CommissionPaymentHistoryProps> = ({
    professionalId,
    professionalName,
    onClose,
    accentColor,
    currencySymbol
}) => {
    const isBeauty = accentColor.includes('beauty');
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);

        setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
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
                .select('*')
                .eq('professional_id', professionalId)
                .eq('commission_paid', true)
                .not('commission_paid_at', 'is', null)
                .gte('commission_paid_at', new Date(startDate).toISOString())
                .lte('commission_paid_at', new Date(endDate + 'T23:59:59').toISOString())
                .order('commission_paid_at', { ascending: false });

            if (error) throw error;

            const groupedPayments = new Map<string, PaymentRecord>();

            (data || []).forEach((record: any) => {
                const paymentDate = new Date(record.commission_paid_at).toISOString().split('T')[0];

                if (!groupedPayments.has(paymentDate)) {
                    groupedPayments.set(paymentDate, {
                        payment_date: record.commission_paid_at,
                        period_start: record.created_at,
                        period_end: record.created_at,
                        amount: 0,
                        services_count: 0
                    });
                }

                const payment = groupedPayments.get(paymentDate)!;
                payment.amount += record.commission_value || 0;
                payment.services_count += 1;

                if (new Date(record.created_at) < new Date(payment.period_start)) {
                    payment.period_start = record.created_at;
                }
                if (new Date(record.created_at) > new Date(payment.period_end)) {
                    payment.period_end = record.created_at;
                }
            });

            setPayments(Array.from(groupedPayments.values()));
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalServices = payments.reduce((sum, p) => sum + p.services_count, 0);

    const dateInputClass = `w-full p-2 md:p-2.5 ${colors.inputBg} ${colors.inputBorder} border md:rounded-xl rounded-lg ${colors.text} text-[11px] md:text-xs focus:border-[var(--color-input-focus)] outline-none transition-colors`;

    return (
        <Modal open size="full" onClose={onClose} showCloseButton={false}>
            <div className="-m-5 flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden md:-m-6">
                <div className={`p-4 md:p-8 border-b ${colors.divider} ${colors.card} backdrop-blur-md sticky top-0 z-20`}>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${colors.surface} ${colors.border} border shadow-inner`}>
                                <Clock className={`w-5 h-5 md:w-6 md:h-6 ${accent.text}`} />
                            </div>
                            <div>
                                <h2 className={`text-lg md:text-2xl ${font.heading} ${colors.text} uppercase tracking-tight leading-none md:leading-normal`}>Histórico de Pagamentos</h2>
                                <p className={`${colors.textMuted} text-[10px] md:text-sm mt-0.5`}>Repasses para <span className={`${colors.text} font-bold`}>{professionalName}</span></p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`${colors.textMuted} hover:${colors.text} transition-all p-2 hover:${colors.surface} rounded-xl border border-transparent hover:${colors.border} active:scale-95`}
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    <div className={`${colors.surface} p-3 md:p-4 rounded-2xl ${colors.border} border opacity-80`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={`${colors.textMuted} text-[9px] md:text-[10px] uppercase ${font.mono} block px-1`}>Período de Consulta</label>
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
                                <label className={`${colors.textMuted} text-[9px] md:text-[10px] uppercase ${font.mono} block px-1`}>Seleção Rápida</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                            setStartDate(firstDay.toISOString().split('T')[0]);
                                            setEndDate(lastDay.toISOString().split('T')[0]);
                                        }}
                                        className={`flex-1 py-2 px-2 rounded-xl text-[9px] font-bold uppercase ${colors.inputBg} hover:${colors.surfaceHover} ${colors.textSecondary} hover:${colors.text} ${colors.border} border transition-all`}
                                    >
                                        Este Mês
                                    </button>
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                                            setStartDate(firstDay.toISOString().split('T')[0]);
                                            setEndDate(lastDay.toISOString().split('T')[0]);
                                        }}
                                        className={`flex-1 py-2 px-2 rounded-xl text-[9px] font-bold uppercase ${colors.inputBg} hover:${colors.surfaceHover} ${colors.textSecondary} hover:${colors.text} ${colors.border} border transition-all`}
                                    >
                                        Mês Passado
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar ${colors.surface} opacity-40`}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className={`w-10 h-10 animate-spin ${accent.text}`} />
                            <p className={`${colors.textMuted} ${font.mono} text-[10px] uppercase tracking-widest`}>Buscando pagamentos...</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className={`text-center py-20 ${colors.surface} rounded-[32px] border-2 border-dashed ${colors.border}`}>
                            <Clock className={`w-12 h-12 ${colors.textMuted} mx-auto mb-4 opacity-50`} />
                            <p className={`${colors.textSecondary} font-medium`}>Nenhum pagamento registrado.</p>
                            <p className={`${colors.textMuted} text-[11px] mt-1 uppercase ${font.mono}`}>Os repasses aparecerão aqui após serem liquidados</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {payments.map((payment, index) => (
                                <div
                                    key={index}
                                    className={`group ${colors.card} ${colors.border} border rounded-2xl p-4 md:p-6 hover:${colors.border} transition-all duration-300`}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg ${status.successBg} flex items-center justify-center ${status.successBorder} border`}>
                                                    <Check className={`w-4 h-4 ${status.success}`} />
                                                </div>
                                                <div>
                                                    <span className={`text-[10px] font-bold ${status.success} uppercase tracking-tight`}>Pagamento Efetuado</span>
                                                    <p className={`text-[9px] md:text-xs ${font.mono} ${colors.textMuted} uppercase`}>
                                                        Em: {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-[9px] ${colors.textMuted} uppercase ${font.mono} font-bold mb-0.5`}>Total Pago</p>
                                                <p className={`${font.mono} font-bold text-lg md:text-2xl ${accent.text} leading-none`}>
                                                    {currencySymbol} {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 md:p-4 rounded-xl ${colors.surface} ${colors.border} border opacity-80 group-hover:${colors.border} transition-colors`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg ${colors.card} ${colors.border} border flex items-center justify-center`}>
                                                    <Calendar className={`w-4 h-4 ${colors.textMuted}`} />
                                                </div>
                                                <div>
                                                    <p className={`text-[9px] ${colors.textMuted} uppercase ${font.mono} font-bold leading-none mb-1`}>Período</p>
                                                    <p className={`${colors.textSecondary} text-[11px] md:text-xs`}>
                                                        {new Date(payment.period_start).toLocaleDateString('pt-BR')} — {new Date(payment.period_end).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-3 border-t sm:border-t-0 sm:border-l ${colors.divider} pt-3 sm:pt-0 sm:pl-3`}>
                                                <div className={`w-8 h-8 rounded-lg ${colors.card} ${colors.border} border flex items-center justify-center`}>
                                                    <TrendingUp className={`w-4 h-4 ${colors.textMuted}`} />
                                                </div>
                                                <div>
                                                    <p className={`text-[9px] ${colors.textMuted} uppercase ${font.mono} font-bold leading-none mb-1`}>Serviços</p>
                                                    <p className={`${colors.textSecondary} text-[11px] md:text-xs`}>
                                                        {payment.services_count} atendimentos liquidados
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`p-4 md:p-8 border-t ${colors.divider} ${colors.card} backdrop-blur-md rounded-b-3xl`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                        <div className="flex justify-between md:justify-start items-center gap-6 md:gap-10 w-full md:w-auto">
                            <div>
                                <p className={`${colors.textMuted} text-[9px] md:text-[10px] uppercase ${font.mono} font-bold mb-1 tracking-widest leading-none`}>Total Geral Pago</p>
                                <p className={`${font.mono} font-bold text-xl md:text-3xl ${accent.text} leading-none`}>
                                    {currencySymbol} {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className={`h-10 w-px ${colors.divider}`}></div>
                            <div>
                                <p className={`${colors.textMuted} text-[9px] md:text-[10px] uppercase ${font.mono} font-bold mb-1 tracking-widest leading-none`}>Serviços</p>
                                <p className={`${colors.text} ${font.mono} font-bold text-xl md:text-3xl leading-none`}>
                                    {totalServices}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            onClick={onClose}
                            className="w-full md:w-auto md:px-12"
                        >
                            Fechar Histórico
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
