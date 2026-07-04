import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Share2, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
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
    const isBeauty = accentColor.includes('beauty');
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });
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

    return (
        <>
            <Modal open size="full" onClose={onClose} showCloseButton={false}>
                <div className="-m-5 md:-m-6">
                    <div className={`mb-4 flex items-center justify-between border-b ${colors.divider} pb-4`}>
                        <div>
                            <h3 className={`text-lg font-bold tracking-tight ${colors.text}`}>Relatório de comissões</h3>
                            <p className={`text-xs ${font.mono} ${colors.textMuted}`}>{periodLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowShare(true)}
                                disabled={records.length === 0}
                                icon={<Share2 className="w-3.5 h-3.5" />}
                            >
                                Compartilhar
                            </Button>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`rounded-lg p-2 ${colors.textMuted} transition-all hover:${colors.surface} hover:${colors.text}`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div ref={reportRef} className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className={`${colors.text} font-bold text-xl`}>{professionalName}</p>
                                <p className={`${colors.textMuted} text-xs ${font.mono}`}>
                                    CPF: {cpf || 'Não cadastrado'}
                                </p>
                                <p className={`${colors.textMuted} text-xs ${font.mono}`}>
                                    Comissão: {commissionRate}%
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`${colors.textMuted} text-xs ${font.mono} uppercase`}>Período</p>
                                <p className={`${colors.text} text-sm ${font.mono}`}>{periodLabel}</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-16 flex items-center justify-center">
                                <Loader2 className={`w-8 h-8 animate-spin ${accent.text}`} />
                            </div>
                        ) : records.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className={colors.textMuted}>Nenhum serviço registrado neste período.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={`border-b ${colors.divider}`}>
                                                <th className={`text-left py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Data</th>
                                                <th className={`text-left py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Serviço / Cliente</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Valor</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider hidden md:table-cell`}>Pagamento</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider hidden md:table-cell`}>Taxa</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Base</th>
                                                <th className={`text-right py-2 text-xs ${font.mono} ${colors.textMuted} uppercase tracking-wider`}>Comissão</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${colors.divider}`}>
                                            {records.map(r => (
                                                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className={`py-3 ${colors.textSecondary} ${font.mono} text-xs whitespace-nowrap`}>{fmtDate(r.created_at)}</td>
                                                    <td className="py-3 pr-4">
                                                        <p className={`${colors.text} text-xs font-medium`}>{r.service_name}</p>
                                                        {r.client_name && <p className={`${colors.textMuted} text-xs`}>{r.client_name}</p>}
                                                    </td>
                                                    <td className={`py-3 text-right ${colors.text} ${font.mono} text-xs whitespace-nowrap`}>{fmt(r.amount)}</td>
                                                    <td className={`py-3 text-right ${colors.textMuted} text-xs hidden md:table-cell whitespace-nowrap`}>
                                                        {r.payment_method || '—'}
                                                    </td>
                                                    <td className="py-3 text-right hidden md:table-cell whitespace-nowrap">
                                                        {r.machine_fee_percent > 0 ? (
                                                            <span className="text-orange-400 text-xs font-mono">−{fmt(r.machine_fee_amount)}</span>
                                                        ) : (
                                                            <span className={`${colors.textMuted} opacity-50 text-xs`}>—</span>
                                                        )}
                                                    </td>
                                                    <td className={`py-3 text-right ${colors.textSecondary} ${font.mono} text-xs whitespace-nowrap`}>{fmt(r.commission_base)}</td>
                                                    <td className="py-3 text-right whitespace-nowrap">
                                                        <span className={`${font.mono} text-xs font-bold ${accent.text}`}>{fmt(r.commission_value)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className={`border-t ${colors.divider} pt-4 space-y-2 max-w-xs ml-auto`}>
                                    <div className="flex justify-between text-sm">
                                        <span className={colors.textMuted}>Subtotal bruto</span>
                                        <span className={`${colors.text} ${font.mono}`}>{fmt(totalGross)}</span>
                                    </div>
                                    {totalFee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className={colors.textMuted}>(−) Taxa maquininha</span>
                                            <span className="text-orange-400 font-mono">{fmt(totalFee)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className={colors.textMuted}>(=) Base de cálculo</span>
                                        <span className={`${colors.text} ${font.mono}`}>{fmt(totalBase)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className={colors.textMuted}>(×) {commissionRate}% comissão</span>
                                        <span className={`${colors.textSecondary} ${font.mono}`}>{fmt(totalCommission)}</span>
                                    </div>
                                    <div className={`flex justify-between text-base font-bold border-t ${colors.divider} pt-2 mt-2`}>
                                        <span className={colors.text}>Valor líquido a receber</span>
                                        <span className={`${font.mono} ${accent.text}`}>{fmt(totalCommission)}</span>
                                    </div>
                                </div>

                                <div className={`border-t ${colors.divider} pt-4 text-xs ${colors.textMuted} opacity-60 ${font.mono} flex flex-wrap gap-4`}>
                                    <span>{professionalName}</span>
                                    <span>CPF: {cpf || 'Não cadastrado'}</span>
                                    <span>Período: {periodLabel}</span>
                                    <span>{records.length} serviço{records.length !== 1 ? 's' : ''}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Modal>

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
