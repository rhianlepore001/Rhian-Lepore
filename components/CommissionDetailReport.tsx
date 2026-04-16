import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Loader2, Share2, Printer } from 'lucide-react';
import { BrutalButton } from './BrutalButton';
import { CommissionShareModal } from './CommissionShareModal';

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
}

export const CommissionDetailReport: React.FC<CommissionDetailReportProps> = ({
    professionalId,
    professionalName,
    cpf,
    commissionRate,
    periodStart,
    periodEnd,
    periodLabel,
    currencySymbol,
    accentColor,
    onClose
}) => {
    const { user } = useAuth();
    const [records, setRecords] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showShare, setShowShare] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchRecords();
    }, [professionalId, periodStart, periodEnd]);

    const fetchRecords = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('finance_records')
                .select(`
                    id, created_at, service_name, client_name,
                    amount, payment_method,
                    commission_rate, commission_value,
                    appointments!appointment_id (machine_fee_percent)
                `)
                .eq('user_id', user.id)
                .eq('professional_id', professionalId)
                .eq('type', 'revenue')
                .eq('commission_paid', false)
                .gte('created_at', periodStart)
                .lte('created_at', periodEnd + 'T23:59:59')
                .order('created_at', { ascending: true });

            if (error) throw error;

            const formatted: ServiceRecord[] = (data || []).map((r: any) => {
                const amount = Number(r.amount) || 0;
                const feePercent = Number(r.appointments?.machine_fee_percent) || 0;
                const feeAmount = amount * feePercent / 100;
                const base = amount - feeAmount;
                const rate = Number(r.commission_rate) || commissionRate;
                const commValue = Number(r.commission_value) || (base * rate / 100);

                return {
                    id: r.id,
                    created_at: r.created_at,
                    service_name: r.service_name || '—',
                    client_name: r.client_name || null,
                    amount,
                    payment_method: r.payment_method || null,
                    machine_fee_percent: feePercent,
                    machine_fee_amount: feeAmount,
                    commission_base: base,
                    commission_rate: rate,
                    commission_value: commValue
                };
            });

            setRecords(formatted);
        } catch (err) {
            console.error('Error fetching commission records:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalGross = records.reduce((s, r) => s + r.amount, 0);
    const totalFee = records.reduce((s, r) => s + r.machine_fee_amount, 0);
    const totalBase = records.reduce((s, r) => s + r.commission_base, 0);
    const totalCommission = records.reduce((s, r) => s + r.commission_value, 0);

    const fmt = (n: number) => `${currencySymbol} ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const accentTextClass = accentColor.startsWith('text-') ? accentColor : `text-${accentColor}`;

    return (
        <>
            <div className="fixed inset-0 bg-black/95 flex items-start justify-center z-[110] p-0 md:p-4 backdrop-blur-md overflow-y-auto">
                <div className="bg-neutral-900 border-0 md:border border-neutral-800 md:rounded-2xl w-full max-w-3xl min-h-full md:min-h-0 flex flex-col shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
                        <div>
                            <h3 className="text-white font-heading text-lg uppercase tracking-tight">Relatório de Comissões</h3>
                            <p className="text-neutral-500 text-[11px] font-mono">{periodLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowShare(true)}
                                disabled={records.length === 0}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 transition-all disabled:opacity-40"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                Compartilhar
                            </button>
                            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Report content */}
                    <div ref={reportRef} className="flex-1 p-6 space-y-6">
                        {/* Professional info */}
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-white font-bold text-xl">{professionalName}</p>
                                <p className="text-neutral-500 text-xs font-mono">
                                    CPF: {cpf || 'Não cadastrado'}
                                </p>
                                <p className="text-neutral-500 text-xs font-mono">
                                    Comissão: {commissionRate}%
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-neutral-500 text-xs font-mono uppercase">Período</p>
                                <p className="text-white text-sm font-mono">{periodLabel}</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-16 flex items-center justify-center">
                                <Loader2 className={`w-8 h-8 animate-spin ${accentTextClass}`} />
                            </div>
                        ) : records.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-neutral-500">Nenhum serviço registrado neste período.</p>
                            </div>
                        ) : (
                            <>
                                {/* Service table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-800">
                                                <th className="text-left py-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Data</th>
                                                <th className="text-left py-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Serviço / Cliente</th>
                                                <th className="text-right py-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Valor</th>
                                                <th className="text-right py-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider hidden md:table-cell">Pagamento</th>
                                                <th className="text-right py-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider hidden md:table-cell">Taxa</th>
                                                <th className="text-right py-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Base</th>
                                                <th className="text-right py-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Comissão</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-800/50">
                                            {records.map(r => (
                                                <tr key={r.id} className="hover:bg-white/2 transition-colors">
                                                    <td className="py-3 text-neutral-400 font-mono text-xs whitespace-nowrap">{fmtDate(r.created_at)}</td>
                                                    <td className="py-3 pr-4">
                                                        <p className="text-white text-xs font-medium">{r.service_name}</p>
                                                        {r.client_name && <p className="text-neutral-500 text-[10px]">{r.client_name}</p>}
                                                    </td>
                                                    <td className="py-3 text-right text-white font-mono text-xs whitespace-nowrap">{fmt(r.amount)}</td>
                                                    <td className="py-3 text-right text-neutral-500 text-xs hidden md:table-cell whitespace-nowrap">
                                                        {r.payment_method || '—'}
                                                    </td>
                                                    <td className="py-3 text-right hidden md:table-cell whitespace-nowrap">
                                                        {r.machine_fee_percent > 0 ? (
                                                            <span className="text-orange-400 text-xs font-mono">−{fmt(r.machine_fee_amount)}</span>
                                                        ) : (
                                                            <span className="text-neutral-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right text-neutral-300 font-mono text-xs whitespace-nowrap">{fmt(r.commission_base)}</td>
                                                    <td className="py-3 text-right whitespace-nowrap">
                                                        <span className={`font-mono text-xs font-bold ${accentTextClass}`}>{fmt(r.commission_value)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="border-t border-neutral-800 pt-4 space-y-2 max-w-xs ml-auto">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-500">Subtotal bruto</span>
                                        <span className="text-white font-mono">{fmt(totalGross)}</span>
                                    </div>
                                    {totalFee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-500">(−) Taxa maquininha</span>
                                            <span className="text-orange-400 font-mono">{fmt(totalFee)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-500">(=) Base de cálculo</span>
                                        <span className="text-white font-mono">{fmt(totalBase)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-500">(×) {commissionRate}% comissão</span>
                                        <span className="text-neutral-300 font-mono">{fmt(totalCommission)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold border-t border-neutral-700 pt-2 mt-2">
                                        <span className="text-white">Valor líquido a receber</span>
                                        <span className={`font-mono ${accentTextClass}`}>{fmt(totalCommission)}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="border-t border-neutral-800/50 pt-4 text-[10px] text-neutral-600 font-mono flex flex-wrap gap-4">
                                    <span>{professionalName}</span>
                                    <span>CPF: {cpf || 'Não cadastrado'}</span>
                                    <span>Período: {periodLabel}</span>
                                    <span>{records.length} serviço{records.length !== 1 ? 's' : ''}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showShare && (
                <CommissionShareModal
                    professionalName={professionalName}
                    cpf={cpf}
                    periodLabel={periodLabel}
                    netAmount={totalCommission}
                    currencySymbol={currencySymbol}
                    onClose={() => setShowShare(false)}
                    reportRef={reportRef}
                />
            )}
        </>
    );
};
