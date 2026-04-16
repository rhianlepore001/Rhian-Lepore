import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from './BrutalCard';
import { BrutalButton } from './BrutalButton';
import { User, DollarSign, Check, Loader2, X, Percent, TrendingUp, Clock, Scissors, Info as InfoIcon, FileText } from 'lucide-react';
import { InfoButton } from './HelpButtons';
import { useNavigate } from 'react-router-dom';
import { ProfessionalCommissionDetails } from './ProfessionalCommissionDetails';
import { CommissionPaymentHistory } from './CommissionPaymentHistory';
import { CommissionDetailReport } from './CommissionDetailReport';

interface CommissionDue {
    professional_id: string;
    professional_name: string;
    photo_url: string | null;
    is_owner: boolean;
    total_due: number;
    total_earnings_month: number;
    total_pending_records: number;
    commission_rate: number;
    total_paid: number;
    cpf?: string | null;
}

interface CommissionPaid {
    id: string;
    collaborator_id: string;
    professional_name: string;
    photo_url?: string | null;
    period_start: string;
    period_end: string;
    net_amount: number;
    commission_percent: number;
    paid_at: string;
}

interface CommissionsManagementProps {
    accentColor: string;
    currencySymbol: string;
    onPaymentSuccess?: () => void;
}

/** Calcula o período do ciclo mês cheio baseado no dia de acerto.
 *  Ex: settlementDay=5, hoje=16/abr → start=06/mar, end=05/abr */
function calcCommissionPeriod(settlementDay: number): { start: string; end: string; label: string } {
    const today = new Date();
    const day = today.getDate();

    let periodEnd: Date;
    let periodStart: Date;

    if (day > settlementDay) {
        // Estamos após o dia de acerto deste mês → período: (sd+1) do mês passado → sd deste mês
        periodEnd = new Date(today.getFullYear(), today.getMonth(), settlementDay);
        periodStart = new Date(today.getFullYear(), today.getMonth() - 1, settlementDay + 1);
    } else {
        // Ainda não chegou o dia de acerto → período: (sd+1) de 2 meses atrás → sd do mês passado
        periodEnd = new Date(today.getFullYear(), today.getMonth() - 1, settlementDay);
        periodStart = new Date(today.getFullYear(), today.getMonth() - 2, settlementDay + 1);
    }

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const fmtLabel = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    return {
        start: fmt(periodStart),
        end: fmt(periodEnd),
        label: `${fmtLabel(periodStart)} → ${fmtLabel(periodEnd)}`
    };
}

export const CommissionsManagement: React.FC<CommissionsManagementProps> = ({ accentColor, currencySymbol, onPaymentSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Tab state
    const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');

    // Pending tab data
    const [commissionsDue, setCommissionsDue] = useState<CommissionDue[]>([]);
    const [loading, setLoading] = useState(true);

    // Paid tab data
    const [paidCommissions, setPaidCommissions] = useState<CommissionPaid[]>([]);
    const [loadingPaid, setLoadingPaid] = useState(false);

    // Settlement cycle
    const [settlementDay, setSettlementDay] = useState<number>(5);
    const [periodLabel, setPeriodLabel] = useState('');

    // Pay modal
    const [payingProfessionalId, setPayingProfessionalId] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<CommissionDue | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [paymentEndDate, setPaymentEndDate] = useState('');
    const [paymentPeriodLabel, setPaymentPeriodLabel] = useState('');

    // Inline % prompt
    const [showRatePrompt, setShowRatePrompt] = useState(false);
    const [pendingPayProfessional, setPendingPayProfessional] = useState<CommissionDue | null>(null);
    const [inlineRate, setInlineRate] = useState('');
    const [savingRate, setSavingRate] = useState(false);

    // Modals
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [detailsProfessional, setDetailsProfessional] = useState<CommissionDue | null>(null);

    useEffect(() => {
        fetchSettlementDay();
        fetchCommissionsDue();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'paid') fetchPaidCommissions();
    }, [activeTab, user]);

    const fetchSettlementDay = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('business_settings')
            .select('commission_settlement_day_of_month')
            .eq('user_id', user.id)
            .maybeSingle();
        const day = data?.commission_settlement_day_of_month || 5;
        setSettlementDay(day);
        const period = calcCommissionPeriod(day);
        setPeriodLabel(period.label);
    };

    const fetchCommissionsDue = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_commissions_due', { p_user_id: user.id });
            if (error) throw error;

            // Fetch CPF for each professional
            const ids = (data || []).filter((i: any) => !i.is_owner).map((i: any) => i.professional_id);
            let cpfMap: Record<string, string | null> = {};
            if (ids.length > 0) {
                const { data: members } = await supabase
                    .from('team_members')
                    .select('id, cpf')
                    .in('id', ids);
                (members || []).forEach((m: any) => { cpfMap[m.id] = m.cpf || null; });
            }

            const formatted = (data || [])
                .map((item: any) => ({
                    ...item,
                    total_due: Number(item.total_due) || 0,
                    total_earnings_month: Number(item.total_earnings_month) || 0,
                    total_paid: Number(item.total_paid) || 0,
                    commission_rate: Number(item.commission_rate) || 0,
                    total_pending_records: Number(item.total_pending_records) || 0,
                    cpf: cpfMap[item.professional_id] ?? null
                }))
                .filter((item: any) => !item.is_owner);

            setCommissionsDue(formatted);
        } catch (error) {
            console.error('Error fetching commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaidCommissions = async () => {
        if (!user) return;
        setLoadingPaid(true);
        try {
            const { data, error } = await supabase
                .from('commission_payments')
                .select(`
                    id, collaborator_id, period_start, period_end,
                    net_amount, commission_percent, paid_at,
                    team_members!collaborator_id (name, photo_url)
                `)
                .eq('company_id', user.id)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const formatted = (data || []).map((item: any) => ({
                ...item,
                professional_name: item.team_members?.name || '—',
                photo_url: item.team_members?.photo_url || null,
                net_amount: Number(item.net_amount) || 0
            }));
            setPaidCommissions(formatted);
        } catch (error) {
            console.error('Error fetching paid commissions:', error);
        } finally {
            setLoadingPaid(false);
        }
    };

    const handleOpenPayModal = (professional: CommissionDue) => {
        // Guard: colaborador sem % configurado
        if (!professional.commission_rate || professional.commission_rate === 0) {
            setPendingPayProfessional(professional);
            setInlineRate('');
            setShowRatePrompt(true);
            return;
        }
        openPayModal(professional);
    };

    const openPayModal = (professional: CommissionDue) => {
        setSelectedProfessional(professional);
        setPaymentAmount((professional.total_due || 0).toFixed(2));

        const period = calcCommissionPeriod(settlementDay);
        setPaymentStartDate(period.start);
        setPaymentEndDate(period.end);
        setPaymentPeriodLabel(period.label);

        calculateAmountForDates(professional.professional_id, period.start, period.end);
        setShowPayModal(true);
    };

    const handleSaveInlineRate = async () => {
        if (!user || !pendingPayProfessional) return;
        const rate = parseFloat(inlineRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            showAlert('Informe um percentual válido entre 0 e 100.', 'error');
            return;
        }
        setSavingRate(true);
        try {
            const { error } = await supabase
                .from('team_members')
                .update({ commission_rate: rate })
                .eq('id', pendingPayProfessional.professional_id)
                .eq('user_id', user.id);
            if (error) throw error;

            const updated = { ...pendingPayProfessional, commission_rate: rate };
            setCommissionsDue(prev => prev.map(p =>
                p.professional_id === updated.professional_id ? updated : p
            ));
            setShowRatePrompt(false);
            setPendingPayProfessional(null);
            openPayModal(updated);
        } catch (err: any) {
            showAlert(`Erro ao salvar comissão: ${err.message}`, 'error');
        } finally {
            setSavingRate(false);
        }
    };

    const calculateAmountForDates = async (profId: string, start: string, end: string) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('finance_records')
                .select('commission_value')
                .eq('user_id', user.id)
                .eq('professional_id', profId)
                .eq('type', 'revenue')
                .eq('commission_paid', false)
                .gte('created_at', start)
                .lte('created_at', end + 'T23:59:59');

            if (error) throw error;
            const total = (data || []).reduce((sum, r) => sum + (Number(r.commission_value) || 0), 0);
            setPaymentAmount(total.toFixed(2));
        } catch (error) {
            console.error('Error calculating amount:', error);
        }
    };

    const handlePayCommissions = async () => {
        if (!user || !selectedProfessional || !paymentAmount || !paymentStartDate || !paymentEndDate) {
            showAlert('Por favor, preencha todos os campos.', 'error');
            return;
        }
        if (payingProfessionalId) return; // EC-F3-01: prevent double click

        setPayingProfessionalId(selectedProfessional.professional_id);
        try {
            const { error } = await supabase.rpc('mark_commissions_as_paid', {
                p_user_id: user.id,
                p_professional_id: selectedProfessional.professional_id,
                p_amount: parseFloat(paymentAmount),
                p_start_date: paymentStartDate,
                p_end_date: paymentEndDate
            });

            if (error) throw error;

            showAlert(`Comissão de ${selectedProfessional.professional_name} paga com sucesso!`, 'success');
            setShowPayModal(false);
            setSelectedProfessional(null);
            fetchCommissionsDue();
            if (onPaymentSuccess) onPaymentSuccess();
        } catch (error: any) {
            showAlert(`Erro ao registrar pagamento: ${error.message || 'Tente novamente.'}`, 'error');
        } finally {
            setPayingProfessionalId(null);
        }
    };

    const totalDueOverall = commissionsDue.reduce((sum, p) => sum + (p.total_due || 0), 0);
    const totalPaidMonth = commissionsDue.reduce((sum, p) => sum + (p.total_paid || 0), 0);
    const topPerformer = commissionsDue.length > 0
        ? [...commissionsDue].sort((a, b) => (b.total_earnings_month || 0) - (a.total_earnings_month || 0))[0]
        : null;

    const accentTextClass = accentColor.startsWith('text-') ? accentColor : `text-${accentColor}`;

    return (
        <div className="space-y-6 md:space-y-8 pb-10">
            {/* Header */}
            <div className="px-1 md:px-0">
                <div className="flex items-center gap-1">
                    <h2 className="text-2xl md:text-3xl font-heading text-white uppercase tracking-tighter">Gestão de Comissões</h2>
                    <InfoButton text="Controle total dos repasses da sua equipe. O sistema calcula automaticamente o que cada profissional deve receber com base nas taxas configuradas." />
                </div>
                <p className="text-neutral-400 text-sm md:text-base max-w-2xl leading-relaxed">
                    {periodLabel ? `Período atual: ${periodLabel}` : 'Controle financeiro total da sua equipe.'}
                </p>
            </div>

            {/* Tabs: Pendente / Pago */}
            <div className="flex gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 w-fit">
                {(['pending', 'paid'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            activeTab === tab
                                ? `${accentColor.startsWith('text-') ? accentColor.replace('text-', 'bg-') : 'bg-accent-gold'} text-black`
                                : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                        {tab === 'pending' ? 'Pendente' : 'Pago'}
                    </button>
                ))}
            </div>

            {/* Pending Tab */}
            {activeTab === 'pending' && (
                <>
                    {/* Metrics */}
                    {!loading && commissionsDue.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-4 md:p-6 relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full ${accentColor === 'text-beauty-neon' ? 'bg-beauty-neon' : 'bg-accent-gold'}`}></div>
                                <p className="text-neutral-500 text-[9px] md:text-xs uppercase font-mono font-bold mb-1 md:mb-2 tracking-widest">Pendente</p>
                                <h4 className={`text-lg md:text-3xl font-mono font-bold ${totalDueOverall > 0 ? 'text-yellow-400' : 'text-neutral-400'}`}>
                                    {currencySymbol} {(totalDueOverall || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h4>
                            </div>
                            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-4 md:p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full bg-green-500"></div>
                                <p className="text-neutral-500 text-[9px] md:text-xs uppercase font-mono font-bold mb-1 md:mb-2 tracking-widest">Pago (Mês)</p>
                                <h4 className="text-lg md:text-3xl font-mono font-bold text-green-400">
                                    {currencySymbol} {(totalPaidMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h4>
                            </div>
                            <div className="col-span-2 lg:col-span-1 bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-4 md:p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full bg-blue-500"></div>
                                <p className="text-neutral-500 text-[9px] md:text-xs uppercase font-mono font-bold mb-1 md:mb-2 tracking-widest">Destaque</p>
                                <h4 className="text-lg md:text-3xl font-mono font-bold text-blue-400 truncate">
                                    {topPerformer ? (topPerformer.professional_name?.split(' ')[0] || '-') : '-'}
                                </h4>
                                <p className="text-[9px] text-neutral-600 mt-1 font-mono uppercase tracking-widest">Melhor Desempenho</p>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="bg-neutral-900/40 border-0 md:border-2 border-neutral-800 md:rounded-3xl p-0 md:p-8 backdrop-blur-sm overflow-hidden">
                        {loading ? (
                            <div className="text-center py-24 text-neutral-500">
                                <Loader2 className={`w-12 h-12 mx-auto animate-spin mb-4 ${accentTextClass}`} />
                                <p className="font-mono uppercase tracking-widest animate-pulse">Sincronizando dados...</p>
                            </div>
                        ) : commissionsDue.length === 0 ? (
                            <div className="text-center py-20 bg-neutral-900/50 rounded-2xl border-2 border-dashed border-neutral-800 mx-4 md:mx-0">
                                <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-8 h-8 text-green-500" />
                                </div>
                                <p className="text-lg font-bold text-white mb-2 uppercase font-heading">Tudo em dia!</p>
                                <p className="text-neutral-500 max-w-xs mx-auto text-sm px-4">
                                    Nenhum profissional com comissões pendentes no momento.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:gap-6">
                                {commissionsDue.map(professional => (
                                    <div
                                        key={professional.professional_id}
                                        className="group bg-neutral-900 border-y md:border-2 border-neutral-800 md:rounded-2xl p-4 md:p-6 hover:border-neutral-700 transition-all duration-300"
                                    >
                                        <div className="flex flex-col gap-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className="relative">
                                                        {professional.photo_url ? (
                                                            <img src={professional.photo_url} alt={professional.professional_name} className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border border-neutral-800" />
                                                        ) : (
                                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                                                                <User className="w-6 h-6 md:w-8 md:h-8 text-neutral-600" />
                                                            </div>
                                                        )}
                                                        <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded shadow-lg text-[8px] md:text-[10px] font-bold border-2 bg-neutral-950 border-neutral-800 ${accentTextClass}`}>
                                                            {(professional.commission_rate || 0)}%
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base md:text-xl font-bold text-white leading-tight">{professional.professional_name}</h3>
                                                        <p className="text-neutral-500 text-[9px] md:text-[10px] font-mono mt-1 uppercase tracking-tight flex items-center gap-1">
                                                            Comissão por Serviço
                                                            <TrendingUp className="w-2.5 h-2.5" />
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] text-neutral-500 font-mono uppercase mb-0.5">Saldo Atual</p>
                                                    <p className={`text-lg md:text-2xl font-mono font-bold ${professional.total_due > 0 ? 'text-yellow-400' : 'text-neutral-600'}`}>
                                                        {currencySymbol} {(professional.total_due || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 md:gap-4">
                                                <div className="p-2 md:p-3 rounded-xl bg-black/30 border border-neutral-800/50">
                                                    <p className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-bold mb-0.5 font-mono tracking-tighter">Este Mês</p>
                                                    <p className="text-xs md:text-lg font-mono font-bold text-white">{currencySymbol} {professional.total_earnings_month.toFixed(2)}</p>
                                                </div>
                                                <div className="p-2 md:p-3 rounded-xl bg-black/30 border border-neutral-800/50">
                                                    <p className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-bold mb-0.5 font-mono tracking-tighter">Liquidado</p>
                                                    <p className="text-xs md:text-lg font-mono font-bold text-neutral-400">{currencySymbol} {professional.total_paid.toFixed(2)}</p>
                                                </div>
                                                <div className="p-2 md:p-3 rounded-xl bg-black/30 border border-neutral-800/50">
                                                    <p className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-bold mb-0.5 font-mono tracking-tighter">Serviços</p>
                                                    <p className="text-xs md:text-lg font-mono font-bold text-white">{professional.total_pending_records || 0}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-2 flex-1">
                                                    <button
                                                        onClick={() => { setDetailsProfessional(professional); setShowDetailsModal(true); }}
                                                        className="flex-1 h-10 md:h-12 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-white transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold border border-neutral-700 active:scale-95"
                                                    >
                                                        <Scissors className="w-3.5 h-3.5" />
                                                        <span>Serviços</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { setDetailsProfessional(professional); setShowReportModal(true); }}
                                                        className="w-10 md:w-14 h-10 md:h-12 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-white transition-all flex items-center justify-center border border-neutral-700 active:scale-95"
                                                        title="Relatório detalhado"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setDetailsProfessional(professional); setShowHistoryModal(true); }}
                                                        className="w-10 md:w-14 h-10 md:h-12 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-white transition-all flex items-center justify-center border border-neutral-700 active:scale-95"
                                                        title="Histórico de pagamentos"
                                                    >
                                                        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-400" />
                                                    </button>
                                                </div>
                                                <BrutalButton
                                                    variant="primary"
                                                    className="flex-[1.5] md:flex-none md:w-48 h-10 md:h-12 text-xs md:text-sm font-bold"
                                                    icon={payingProfessionalId === professional.professional_id ? <Loader2 className="animate-spin w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                                    onClick={() => handleOpenPayModal(professional)}
                                                    disabled={!!payingProfessionalId || professional.total_due <= 0}
                                                >
                                                    {payingProfessionalId === professional.professional_id ? 'Processando' : 'Realizar Pagamento'}
                                                </BrutalButton>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Paid Tab */}
            {activeTab === 'paid' && (
                <div className="bg-neutral-900/40 border-0 md:border-2 border-neutral-800 md:rounded-3xl p-0 md:p-8 backdrop-blur-sm">
                    {loadingPaid ? (
                        <div className="text-center py-24">
                            <Loader2 className={`w-10 h-10 mx-auto animate-spin mb-4 ${accentTextClass}`} />
                        </div>
                    ) : paidCommissions.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-neutral-500">Nenhum pagamento registrado ainda.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-800">
                            {paidCommissions.map(item => (
                                <div key={item.id} className="flex items-center justify-between py-4 px-2 md:px-0">
                                    <div className="flex items-center gap-3">
                                        {item.photo_url ? (
                                            <img src={item.photo_url} alt={item.professional_name} className="w-10 h-10 rounded-lg object-cover border border-neutral-800" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                                                <User className="w-5 h-5 text-neutral-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-white font-bold text-sm">{item.professional_name}</p>
                                            <p className="text-neutral-500 text-[10px] font-mono">
                                                {new Date(item.period_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → {new Date(item.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-400 font-mono font-bold">{currencySymbol} {item.net_amount.toFixed(2)}</p>
                                        <p className="text-neutral-500 text-[10px] font-mono">
                                            Pago em {new Date(item.paid_at).toLocaleDateString('pt-BR')}
                                        </p>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[9px] font-bold uppercase border border-green-500/20">
                                            Pago
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Inline Rate Prompt — colaborador sem % */}
            {showRatePrompt && pendingPayProfessional && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
                    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-white font-heading text-lg uppercase mb-2">Comissão não configurada</h3>
                        <p className="text-neutral-400 text-sm mb-6">
                            <strong className="text-white">{pendingPayProfessional.professional_name}</strong> não tem percentual de comissão definido. Defina agora para calcular automaticamente.
                        </p>
                        <label className="text-neutral-500 font-mono text-[10px] uppercase block mb-2">Percentual de comissão (%)</label>
                        <div className="flex gap-3 mb-6">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={inlineRate}
                                    onChange={e => setInlineRate(e.target.value)}
                                    className="w-full p-3 bg-black border-2 border-neutral-700 rounded-xl text-white font-mono text-xl focus:outline-none focus:border-accent-gold"
                                    placeholder="Ex: 40"
                                    autoFocus
                                />
                                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <BrutalButton variant="secondary" className="flex-1" onClick={() => { setShowRatePrompt(false); setPendingPayProfessional(null); }}>
                                Cancelar
                            </BrutalButton>
                            <BrutalButton
                                variant="primary"
                                className="flex-1"
                                onClick={handleSaveInlineRate}
                                disabled={savingRate || !inlineRate}
                                icon={savingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                            >
                                {savingRate ? 'Salvando...' : 'Confirmar e Pagar'}
                            </BrutalButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {showPayModal && selectedProfessional && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-0 md:p-4 backdrop-blur-md">
                    <div className="bg-neutral-900 border-0 md:border-2 border-neutral-800 md:rounded-[32px] w-full max-w-md h-full md:h-auto flex flex-col p-6 md:p-8 shadow-2xl relative overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                    <DollarSign className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-white font-heading text-xl uppercase tracking-tight">Confirmar Repasse</h3>
                                    {paymentPeriodLabel && (
                                        <p className="text-neutral-500 text-[10px] font-mono">Período: {paymentPeriodLabel}</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="text-neutral-500 hover:text-white transition-all p-2 hover:bg-neutral-800 rounded-xl">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-8 p-4 bg-black/40 rounded-2xl border border-neutral-800">
                            {selectedProfessional.photo_url ? (
                                <img src={selectedProfessional.photo_url} alt={selectedProfessional.professional_name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-neutral-800" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                                    <User className="w-6 h-6 text-neutral-600" />
                                </div>
                            )}
                            <div>
                                <p className="text-white font-bold text-lg leading-none mb-1">{selectedProfessional.professional_name}</p>
                                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                    Saldo: <span className="text-yellow-500">{currencySymbol} {selectedProfessional.total_due.toFixed(2)}</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-neutral-500 font-mono text-[10px] uppercase mb-2 block tracking-widest">Valor a Ser Liquidado ({currencySymbol})</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    step="0.01"
                                    className="w-full p-4 bg-black border-2 border-neutral-800 rounded-2xl text-white font-mono text-2xl focus:outline-none focus:border-green-500 transition-all"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-neutral-500 font-mono text-[10px] uppercase block tracking-widest">Intervalo de Referência</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            const p = calcCommissionPeriod(settlementDay);
                                            setPaymentStartDate(p.start);
                                            setPaymentEndDate(p.end);
                                            setPaymentPeriodLabel(p.label);
                                            calculateAmountForDates(selectedProfessional.professional_id, p.start, p.end);
                                        }}
                                        className="py-2.5 rounded-xl text-[10px] font-bold uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all active:scale-95"
                                    >
                                        Período Atual
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Período anterior: um ciclo antes do atual
                                            const current = calcCommissionPeriod(settlementDay);
                                            const prevEnd = new Date(current.start);
                                            prevEnd.setDate(prevEnd.getDate() - 1);
                                            const prevStart = new Date(prevEnd);
                                            prevStart.setDate(prevStart.getDate() - 30);
                                            const fmt = (d: Date) => d.toISOString().split('T')[0];
                                            const fmtLabel = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                                            const start = fmt(prevStart);
                                            const end = fmt(prevEnd);
                                            setPaymentStartDate(start);
                                            setPaymentEndDate(end);
                                            setPaymentPeriodLabel(`${fmtLabel(prevStart)} → ${fmtLabel(prevEnd)}`);
                                            calculateAmountForDates(selectedProfessional.professional_id, start, end);
                                        }}
                                        className="py-2.5 rounded-xl text-[10px] font-bold uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all active:scale-95"
                                    >
                                        Período Anterior
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="date"
                                        value={paymentStartDate}
                                        onChange={e => { setPaymentStartDate(e.target.value); calculateAmountForDates(selectedProfessional.professional_id, e.target.value, paymentEndDate); }}
                                        className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-neutral-500 outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={paymentEndDate}
                                        onChange={e => { setPaymentEndDate(e.target.value); calculateAmountForDates(selectedProfessional.professional_id, paymentStartDate, e.target.value); }}
                                        className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-neutral-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3">
                            <InfoIcon className="w-5 h-5 text-blue-500 shrink-0" />
                            <p className="text-blue-400 text-[11px] leading-snug">
                                <strong>Aviso:</strong> Este pagamento será registrado como despesa e as comissões do período serão marcadas como pagas.
                            </p>
                        </div>

                        <div className="mt-auto md:mt-8 pt-6 flex flex-col md:flex-row gap-3">
                            <BrutalButton variant="secondary" className="w-full h-12 rounded-2xl text-xs md:text-sm font-bold order-2 md:order-1" onClick={() => setShowPayModal(false)}>
                                Cancelar
                            </BrutalButton>
                            <BrutalButton
                                variant="primary"
                                className="w-full h-12 rounded-2xl text-xs md:text-sm font-bold order-1 md:order-2"
                                onClick={handlePayCommissions}
                                disabled={!!payingProfessionalId}
                                icon={payingProfessionalId === selectedProfessional.professional_id ? <Loader2 className="animate-spin" /> : undefined}
                            >
                                {payingProfessionalId === selectedProfessional.professional_id ? 'Confirmando...' : 'Liquidar Agora'}
                            </BrutalButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Professional Details Modal */}
            {showDetailsModal && detailsProfessional && (
                <ProfessionalCommissionDetails
                    professionalId={detailsProfessional.professional_id}
                    professionalName={detailsProfessional.professional_name}
                    commissionRate={detailsProfessional.commission_rate}
                    onClose={() => { setShowDetailsModal(false); setDetailsProfessional(null); }}
                    accentColor={accentColor}
                    currencySymbol={currencySymbol}
                />
            )}

            {/* Payment History Modal */}
            {showHistoryModal && detailsProfessional && (
                <CommissionPaymentHistory
                    professionalId={detailsProfessional.professional_id}
                    professionalName={detailsProfessional.professional_name}
                    onClose={() => { setShowHistoryModal(false); setDetailsProfessional(null); }}
                    accentColor={accentColor}
                    currencySymbol={currencySymbol}
                />
            )}

            {/* Commission Detail Report Modal */}
            {showReportModal && detailsProfessional && (
                <CommissionDetailReport
                    professionalId={detailsProfessional.professional_id}
                    professionalName={detailsProfessional.professional_name}
                    cpf={detailsProfessional.cpf}
                    commissionRate={detailsProfessional.commission_rate}
                    periodStart={calcCommissionPeriod(settlementDay).start}
                    periodEnd={calcCommissionPeriod(settlementDay).end}
                    periodLabel={periodLabel}
                    currencySymbol={currencySymbol}
                    accentColor={accentColor}
                    onClose={() => { setShowReportModal(false); setDetailsProfessional(null); }}
                />
            )}
        </div>
    );
};
