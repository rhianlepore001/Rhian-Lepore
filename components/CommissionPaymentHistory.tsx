import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Loader2, Check, Clock, TrendingUp } from 'lucide-react';
import { BrutalButton } from './BrutalButton';

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
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        // Set default dates (last 6 months)
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
            // Fetch commission records from finance_records that have been paid
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

            // Group by commission_paid_at date to create payment records
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

                // Update period range (based on created_at which is the service date)
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

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 md:p-4 backdrop-blur-md">
            <div className="bg-neutral-900 border-0 md:border-2 border-neutral-800 md:rounded-3xl w-full max-w-4xl h-full md:h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-8 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center bg-neutral-800 border border-neutral-700 shadow-inner">
                                <Clock className={`w-5 h-5 md:w-6 md:h-6 ${accentColor}`} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-2xl font-heading text-white uppercase tracking-tight leading-none md:leading-normal">Histórico de Pagamentos</h2>
                                <p className="text-neutral-500 text-[10px] md:text-sm mt-0.5">Repasses para <span className="text-white font-bold">{professionalName}</span></p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-neutral-500 hover:text-white transition-all p-2 hover:bg-neutral-800 rounded-xl border border-transparent hover:border-neutral-700 active:scale-95"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    {/* Filters - Improved for Mobile */}
                    <div className="bg-neutral-800/20 p-3 md:p-4 rounded-2xl border border-neutral-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-neutral-500 text-[9px] md:text-[10px] uppercase font-mono block px-1">📅 Período de Consulta</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full p-2 md:p-2.5 bg-black border border-neutral-700 md:rounded-xl rounded-lg text-white text-[11px] md:text-xs focus:border-neutral-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full p-2 md:p-2.5 bg-black border border-neutral-700 md:rounded-xl rounded-lg text-white text-[11px] md:text-xs focus:border-neutral-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-neutral-500 text-[9px] md:text-[10px] uppercase font-mono block px-1">Seleção Rápida</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                            setStartDate(firstDay.toISOString().split('T')[0]);
                                            setEndDate(lastDay.toISOString().split('T')[0]);
                                        }}
                                        className="flex-1 py-2 px-2 rounded-xl text-[9px] font-bold uppercase bg-black hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 transition-all"
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
                                        className="flex-1 py-2 px-2 rounded-xl text-[9px] font-bold uppercase bg-black hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 transition-all"
                                    >
                                        Mês Passado
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content - Optimized for Mobile */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-neutral-900/40">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className={`w-10 h-10 animate-spin ${accentColor}`} />
                            <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest">Buscando pagamentos...</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-800/10 rounded-[32px] border-2 border-dashed border-neutral-800/50">
                            <Clock className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
                            <p className="text-neutral-500 font-medium">Nenhum pagamento registrado.</p>
                            <p className="text-neutral-600 text-[11px] mt-1 uppercase font-mono">Os repasses aparecerão aqui após serem liquidados</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {payments.map((payment, index) => (
                                <div
                                    key={index}
                                    className="group bg-neutral-950/50 border border-neutral-800/80 rounded-2xl p-4 md:p-6 hover:border-neutral-700 transition-all duration-300"
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-tight">Pagamento Efetuado</span>
                                                    <p className="text-[9px] md:text-xs font-mono text-neutral-500 uppercase">
                                                        Em: {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-neutral-600 uppercase font-mono font-bold mb-0.5">Total Pago</p>
                                                <p className={`font-mono font-bold text-lg md:text-2xl ${accentColor} leading-none`}>
                                                    {currencySymbol} {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 md:p-4 rounded-xl bg-black/40 border border-neutral-800/50 group-hover:border-neutral-700 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                                    <Calendar className="w-4 h-4 text-neutral-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-neutral-600 uppercase font-mono font-bold leading-none mb-1">Período</p>
                                                    <p className="text-neutral-400 text-[11px] md:text-xs">
                                                        {new Date(payment.period_start).toLocaleDateString('pt-BR')} — {new Date(payment.period_end).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-neutral-800/50 pt-3 sm:pt-0 sm:pl-3">
                                                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                                    <TrendingUp className="w-4 h-4 text-neutral-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-neutral-600 uppercase font-mono font-bold leading-none mb-1">Serviços</p>
                                                    <p className="text-neutral-400 text-[11px] md:text-xs">
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

                {/* Footer - Optimized for Mobile */}
                <div className="p-4 md:p-8 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-md rounded-b-3xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                        <div className="flex justify-between md:justify-start items-center gap-6 md:gap-10 w-full md:w-auto">
                            <div>
                                <p className="text-neutral-600 text-[9px] md:text-[10px] uppercase font-mono font-bold mb-1 tracking-widest leading-none">Total Geral Pago</p>
                                <p className={`font-mono font-bold text-xl md:text-3xl ${accentColor} leading-none`}>
                                    {currencySymbol} {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="h-10 w-px bg-neutral-800"></div>
                            <div>
                                <p className="text-neutral-600 text-[9px] md:text-[10px] uppercase font-mono font-bold mb-1 tracking-widest leading-none">Serviços</p>
                                <p className="text-white font-mono font-bold text-xl md:text-3xl leading-none">
                                    {totalServices}
                                </p>
                            </div>
                        </div>

                        <BrutalButton
                            variant="primary"
                            onClick={onClose}
                            className="w-full md:w-auto md:px-12 h-11 rounded-2xl text-xs md:text-sm font-bold active:scale-95 transition-transform"
                        >
                            Fechar Histórico
                        </BrutalButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
