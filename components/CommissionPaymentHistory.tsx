import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Loader2, Check } from 'lucide-react';
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
            // Fetch commission records that have been paid
            const { data, error } = await supabase
                .from('commission_records')
                .select('*')
                .eq('professional_id', professionalId)
                .eq('paid', true)
                .not('paid_at', 'is', null)
                .gte('paid_at', new Date(startDate).toISOString())
                .lte('paid_at', new Date(endDate + 'T23:59:59').toISOString())
                .order('paid_at', { ascending: false });

            if (error) throw error;

            // Group by paid_at date to create payment records
            const groupedPayments = new Map<string, PaymentRecord>();

            (data || []).forEach((record: any) => {
                const paymentDate = new Date(record.paid_at).toISOString().split('T')[0];

                if (!groupedPayments.has(paymentDate)) {
                    groupedPayments.set(paymentDate, {
                        payment_date: record.paid_at,
                        period_start: record.created_at, // Will be updated to min
                        period_end: record.created_at, // Will be updated to max
                        amount: 0,
                        services_count: 0
                    });
                }

                const payment = groupedPayments.get(paymentDate)!;
                payment.amount += record.commission_amount || 0;
                payment.services_count += 1;

                // Update period range
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-heading text-white uppercase">Histórico de Pagamentos</h2>
                            <p className="text-neutral-400 mt-1">{professionalName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-neutral-400 text-xs uppercase font-mono mb-2 block">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Data Inicial
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 bg-black border border-neutral-700 rounded-lg text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-neutral-400 text-xs uppercase font-mono mb-2 block">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Data Final
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 bg-black border border-neutral-700 rounded-lg text-white text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500">
                            <Check className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Nenhum pagamento encontrado no período selecionado</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment, index) => (
                                <div
                                    key={index}
                                    className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-4 hover:border-green-500/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-green-500 text-black">
                                                    ✓ PAGO
                                                </span>
                                                <span className="text-xs font-mono text-neutral-500">
                                                    {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            <p className="text-white font-bold text-lg mb-2">
                                                {currencySymbol} {payment.amount.toFixed(2)}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-neutral-400">
                                                <span>
                                                    📅 Período: {new Date(payment.period_start).toLocaleDateString('pt-BR')} - {new Date(payment.period_end).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span>
                                                    ✂️ {payment.services_count} serviço(s)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-800 bg-neutral-900/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-neutral-500 text-xs uppercase font-mono mb-1">Total de Pagamentos</p>
                                <p className="text-white font-bold text-xl">{payments.length}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500 text-xs uppercase font-mono mb-1">Total de Serviços</p>
                                <p className="text-white font-bold text-xl">{totalServices}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500 text-xs uppercase font-mono mb-1">Total Pago</p>
                                <p className={`font-mono font-bold text-2xl ${accentColor}`}>
                                    {currencySymbol} {totalPaid.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <BrutalButton
                        variant="primary"
                        onClick={onClose}
                        className="w-full"
                    >
                        Fechar
                    </BrutalButton>
                </div>
            </div>
        </div>
    );
};
