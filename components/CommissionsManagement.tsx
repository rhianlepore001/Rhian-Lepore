import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from '@/components/ui';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { User, DollarSign, Loader2, Percent, TrendingUp, Clock, Scissors, Package, Info as InfoIcon, FileText } from 'lucide-react';
import { InfoButton } from './HelpButtons';
import { useNavigate } from 'react-router-dom';
import { ProfessionalCommissionDetails } from './ProfessionalCommissionDetails';
import { CommissionPaymentHistory } from './CommissionPaymentHistory';
import { CommissionDetailReport } from './CommissionDetailReport';
import { useToast } from '@/components/ui';

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
    services_pending: number;
    products_pending: number;
    services_month: number;
    products_sold_month: number;
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

function MoneyInline({
    symbol,
    amount,
    className = '',
}: {
    symbol: string;
    amount: number;
    className?: string;
}) {
    return (
        <span className={`inline-flex items-baseline gap-0.5 whitespace-nowrap tabular-nums ${className}`}>
            <span className="text-[0.65em] font-semibold leading-none opacity-80">{symbol}</span>
            <span className="leading-none">
                {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </span>
    );
}

export const CommissionsManagement: React.FC<CommissionsManagementProps> = ({ accentColor, currencySymbol, onPaymentSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isBeauty = accentColor.includes('beauty');
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });
    const accentTextClass = accent.text;

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
    const [openPayAfterRateSave, setOpenPayAfterRateSave] = useState(false);
    const [inlineRate, setInlineRate] = useState('');
    const [savingRate, setSavingRate] = useState(false);

    const { showToast } = useToast();

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
            const { data, error } = await supabase.rpc('get_commissions_due');
            if (error) throw error;

            // Fetch CPF for each professional
            const ids = (data || []).filter((i: any) => !i.is_owner).map((i: any) => i.professional_id);
            const cpfMap: Record<string, string | null> = {};
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
                    services_pending: Number(item.services_pending) || 0,
                    products_pending: Number(item.products_pending) || 0,
                    services_month: Number(item.services_month) || 0,
                    products_sold_month: Number(item.products_sold_month) || 0,
                    cpf: cpfMap[item.professional_id] ?? null
                }))
                // Dono não entra na fila de repasse; ainda assim a RPC devolve is_owner
                // para o filtro funcionar sem depender de join client-side.
                .filter((item: any) => !item.is_owner);

            setCommissionsDue(formatted);
        } catch (error) {
            console.error('Error fetching commissions:', error);
            showToast('Não foi possível carregar as comissões. Tente novamente.', 'error');
            setCommissionsDue([]);
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
            setOpenPayAfterRateSave(true);
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
            showToast('Informe um percentual válido entre 0 e 100.', 'error');
            return;
        }
        setSavingRate(true);
        try {
            const { error } = await supabase
                .from('team_members')
                .update({
                    commission_rate: rate,
                    commission_percent: rate,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', pendingPayProfessional.professional_id)
                .eq('user_id', user.id);
            if (error) throw error;

            const { error: recalculateError } = await supabase.rpc('recalculate_pending_commissions', {
                p_professional_id: pendingPayProfessional.professional_id,
                p_new_rate: rate,
            });
            if (recalculateError) throw recalculateError;

            const updated = { ...pendingPayProfessional, commission_rate: rate };
            const shouldOpenPay = openPayAfterRateSave;
            setShowRatePrompt(false);
            setPendingPayProfessional(null);
            setOpenPayAfterRateSave(false);
            showToast(`Taxa de ${updated.professional_name} atualizada para ${rate}%.`, 'success');
            await fetchCommissionsDue();
            if (shouldOpenPay) openPayModal(updated);
        } catch (err: unknown) {
            console.error('Erro ao salvar comissão:', err);
            showToast('Não foi possível salvar a comissão. Tente novamente.', 'error');
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
            showToast('Por favor, preencha todos os campos.', 'error');
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

            showToast(`Comissão de ${selectedProfessional.professional_name} paga com sucesso!`, 'success');
            setShowPayModal(false);
            setSelectedProfessional(null);
            fetchCommissionsDue();
            if (onPaymentSuccess) onPaymentSuccess();
        } catch (error: any) {
            console.error('Erro ao registrar pagamento:', error);
            showToast('Não foi possível registrar o pagamento. Tente novamente.', 'error');
        } finally {
            setPayingProfessionalId(null);
        }
    };

    const totalDueOverall = commissionsDue.reduce((sum, p) => sum + (p.total_due || 0), 0);
    const totalPaidMonth = commissionsDue.reduce((sum, p) => sum + (p.total_paid || 0), 0);
    const topPerformer = commissionsDue.length > 0
        ? [...commissionsDue].sort((a, b) => (b.total_earnings_month || 0) - (a.total_earnings_month || 0))[0]
        : null;

    return (
        <div className="space-y-6 md:space-y-8 pb-10">
            {/* Header */}
            <div className="px-1 md:px-0">
                <div className="flex items-center gap-1 min-w-0">
                    <h2 className={`text-xl sm:text-2xl md:text-3xl min-w-0 ${font.heading} ${colors.text} uppercase tracking-tight`}>Gestão de Comissões</h2>
                    <InfoButton text="Controle total dos repasses da sua equipe. O sistema calcula automaticamente o que cada profissional deve receber com base nas taxas configuradas." />
                </div>
                <p className={`${colors.textSecondary} text-sm md:text-base max-w-2xl leading-relaxed`}>
                    {periodLabel ? `Período atual: ${periodLabel}` : 'Controle financeiro total da sua equipe.'}
                </p>
            </div>

            {/* Tabs: Pendente / Pago */}
            <div className={`flex gap-1 p-1 ${colors.card} rounded-xl ${colors.border} border w-fit`}>
                {(['pending', 'paid'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            activeTab === tab
                                ? `${accent.bg} text-[var(--color-on-accent)]`
                                : `${colors.textMuted} hover:text-theme-text`
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
                            <Card variant="outlined" className="p-4 md:p-6 relative" noPadding>
                                <div className={`p-4 md:p-6`}>
                                    <div className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full ${accent.bg}`}></div>
                                    <p className={`${colors.textMuted} text-xs uppercase ${font.mono} font-bold mb-1 md:mb-2 tracking-wide`}>Pendente</p>
                                    <h4 className={`text-lg md:text-3xl ${font.mono} font-bold ${totalDueOverall > 0 ? 'text-[var(--color-warning)]' : colors.textMuted}`}>
                                        <MoneyInline symbol={currencySymbol} amount={totalDueOverall || 0} />
                                    </h4>
                                </div>
                            </Card>
                            <Card variant="outlined" className="p-4 md:p-6 relative" noPadding>
                                <div className="p-4 md:p-6">
                                    <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full bg-[var(--color-success)]"></div>
                                    <p className={`${colors.textMuted} text-xs uppercase ${font.mono} font-bold mb-1 md:mb-2 tracking-wide`}>Pago (mês)</p>
                                    <h4 className={`text-lg md:text-3xl ${font.mono} font-bold text-[var(--color-success)]`}>
                                        <MoneyInline symbol={currencySymbol} amount={totalPaidMonth || 0} />
                                    </h4>
                                </div>
                            </Card>
                            <Card variant="outlined" className="col-span-2 lg:col-span-1 p-4 md:p-6 relative" noPadding>
                                <div className="p-4 md:p-6">
                                    <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full bg-[var(--color-info)]"></div>
                                    <p className={`${colors.textMuted} text-xs uppercase ${font.mono} font-bold mb-1 md:mb-2 tracking-wide`}>Destaque</p>
                                    <h4 className={`text-lg md:text-3xl ${font.mono} font-bold text-[var(--color-info)] truncate`}>
                                        {topPerformer ? (topPerformer.professional_name?.split(' ')[0] || '-') : '-'}
                                    </h4>
                                    <p className={`text-xs ${colors.textMuted} mt-1 ${font.mono} uppercase tracking-wide`}>Melhor desempenho</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* List */}
                    <div className={`${colors.surface} border-0 md:border-2 ${colors.border} md:rounded-3xl p-0 md:p-8 overflow-visible`}>
                        {loading ? (
                            <div className={`text-center py-24 ${colors.textMuted}`}>
                                <Loader2 className={`w-12 h-12 mx-auto animate-spin mb-4 ${accentTextClass}`} />
                                <p className={`${font.mono} uppercase tracking-widest animate-pulse`}>Sincronizando dados...</p>
                            </div>
                        ) : commissionsDue.length === 0 ? (
                            <div className={`text-center py-20 ${colors.card} rounded-2xl border-2 border-dashed ${colors.border} mx-4 md:mx-0`}>
                                <div className={`w-16 h-16 ${colors.surface} rounded-full flex items-center justify-center mx-auto mb-6`}>
                                    <User className={`w-8 h-8 ${colors.textMuted}`} />
                                </div>
                                <p className={`text-lg font-bold ${colors.text} mb-2 uppercase ${font.heading}`}>Sem colaboradores</p>
                                <p className={`${colors.textMuted} max-w-sm mx-auto text-sm px-4 mb-6`}>
                                    Cadastre a equipe em Ajustes → Equipe e defina o % de comissão de cada profissional para acompanhar serviços, histórico e repasses aqui.
                                </p>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate('/configuracoes/equipe')}
                                >
                                    Ir para Equipe
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:gap-6">
                                {commissionsDue.map(professional => (
                                    <Card
                                        key={professional.professional_id}
                                        variant="outlined"
                                        className="hover:border-[var(--color-border-strong)] transition-all duration-300"
                                        noPadding
                                    >
                                        <div className="p-4 md:p-6 overflow-visible">
                                            <div className="flex flex-col gap-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="relative shrink-0">
                                                            {professional.photo_url ? (
                                                                <img src={professional.photo_url} alt={professional.professional_name} className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border border-[var(--color-border)]" />
                                                            ) : (
                                                                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl ${colors.surface} ${colors.border} border flex items-center justify-center`}>
                                                                    <User className={`w-6 h-6 md:w-8 md:h-8 ${colors.textMuted}`} />
                                                                </div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPendingPayProfessional(professional);
                                                                    setInlineRate(String(professional.commission_rate || 0));
                                                                    setOpenPayAfterRateSave(false);
                                                                    setShowRatePrompt(true);
                                                                }}
                                                                className={`absolute -bottom-1 -right-1 min-w-[28px] px-1.5 py-0.5 rounded-full text-xs font-bold border ${colors.card} ${colors.border} ${accentTextClass} hover:scale-105 transition-transform leading-none`}
                                                                title="Alterar taxa de comissão"
                                                            >
                                                                {(professional.commission_rate || 0)}%
                                                            </button>
                                                        </div>
                                                    <div className="min-w-0 flex-1">
                                                            <h3 className={`text-base md:text-xl font-bold ${colors.text} leading-tight truncate`}>{professional.professional_name}</h3>
                                                            <p className={`${colors.textMuted} text-xs ${font.mono} mt-1 uppercase tracking-wide flex items-center gap-1 min-w-0`}>
                                                                <span className="truncate">{(professional.commission_rate || 0) > 0 ? 'Comissão por serviço' : 'Taxa não configurada'}</span>
                                                                <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                                                            </p>
                                                        </div>
                                                    <div className="shrink-0 text-right pl-1">
                                                        <p className={`text-xs ${colors.textMuted} ${font.mono} uppercase tracking-wide mb-1`}>Saldo atual</p>
                                                        <p className={`text-base md:text-2xl ${font.mono} font-bold ${professional.total_due > 0 ? 'text-[var(--color-warning)]' : colors.textMuted}`}>
                                                            <MoneyInline symbol={currencySymbol} amount={professional.total_due || 0} />
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                                                    <div className={`p-2.5 md:p-3 rounded-xl ${colors.inputBg} ${colors.border} border min-w-0`}>
                                                        <p className={`text-xs ${colors.textMuted} uppercase font-bold mb-1 ${font.mono} tracking-wide`}>Este mês</p>
                                                        <p className={`text-sm md:text-lg ${font.mono} font-bold ${colors.text}`}>
                                                            <MoneyInline symbol={currencySymbol} amount={professional.total_earnings_month} />
                                                        </p>
                                                    </div>
                                                    <div className={`p-2.5 md:p-3 rounded-xl ${colors.inputBg} ${colors.border} border min-w-0`}>
                                                        <p className={`text-xs ${colors.textMuted} uppercase font-bold mb-1 ${font.mono} tracking-wide`}>Liquidado</p>
                                                        <p className={`text-sm md:text-lg ${font.mono} font-bold ${colors.textSecondary}`}>
                                                            <MoneyInline symbol={currencySymbol} amount={professional.total_paid} />
                                                        </p>
                                                    </div>
                                                    <div className={`p-2.5 md:p-3 rounded-xl ${colors.inputBg} ${colors.border} border min-w-0`}>
                                                        <p className={`text-xs ${colors.textMuted} uppercase font-bold mb-1 ${font.mono} tracking-wide flex items-center gap-1`}>
                                                            <Scissors className="w-3 h-3 shrink-0" /> <span className="truncate">Serviços</span>
                                                        </p>
                                                        <p className={`text-sm md:text-lg ${font.mono} font-bold ${colors.text}`}>
                                                            {professional.services_month || 0}
                                                            <span className={`${colors.textMuted} text-xs font-normal ml-1`}>
                                                                ({professional.services_pending || 0} pend.)
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className={`p-2.5 md:p-3 rounded-xl ${colors.inputBg} ${colors.border} border min-w-0`}>
                                                        <p className={`text-xs ${colors.textMuted} uppercase font-bold mb-1 ${font.mono} tracking-wide flex items-center gap-1`}>
                                                            <Package className="w-3 h-3 shrink-0" /> <span className="truncate">Produtos</span>
                                                        </p>
                                                        <p className={`text-sm md:text-lg ${font.mono} font-bold ${colors.text}`}>
                                                            {professional.products_sold_month || 0}
                                                            <span className={`${colors.textMuted} text-xs font-normal ml-1`}>
                                                                ({professional.products_pending || 0} pend.)
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setDetailsProfessional(professional); setShowDetailsModal(true); }}
                                                            className={`flex-1 min-w-0 min-h-[44px] rounded-xl ${colors.surface} ${colors.surfaceHover} ${colors.text} transition-all flex items-center justify-center gap-2 px-3 text-xs ${font.mono} font-bold ${colors.border} border active:scale-95`}
                                                        >
                                                            <Scissors className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="truncate">Serviços e produtos</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setDetailsProfessional(professional); setShowReportModal(true); }}
                                                            className={`shrink-0 min-w-[44px] min-h-[44px] rounded-xl ${colors.surface} ${colors.surfaceHover} ${colors.text} transition-all flex items-center justify-center ${colors.border} border active:scale-95`}
                                                            title="Relatório detalhado"
                                                            aria-label="Relatório detalhado"
                                                        >
                                                            <FileText className={`w-4 h-4 ${colors.textMuted}`} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setDetailsProfessional(professional); setShowHistoryModal(true); }}
                                                            className={`shrink-0 min-w-[44px] min-h-[44px] rounded-xl ${colors.surface} ${colors.surfaceHover} ${colors.text} transition-all flex items-center justify-center ${colors.border} border active:scale-95`}
                                                            title="Histórico de pagamentos"
                                                            aria-label="Histórico de pagamentos"
                                                        >
                                                            <Clock className={`w-4 h-4 ${colors.textMuted}`} />
                                                        </button>
                                                    </div>
                                                    <Button
                                                        variant="primary"
                                                        className="w-full"
                                                        icon={payingProfessionalId === professional.professional_id ? undefined : <DollarSign className="w-4 h-4" />}
                                                        onClick={() => handleOpenPayModal(professional)}
                                                        disabled={!!payingProfessionalId || professional.total_due <= 0}
                                                        loading={payingProfessionalId === professional.professional_id}
                                                    >
                                                        {payingProfessionalId === professional.professional_id ? 'Processando' : 'Pagar comissão'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Paid Tab */}
            {activeTab === 'paid' && (
                <div className={`${colors.surface} border-0 md:border-2 ${colors.border} md:rounded-3xl p-0 md:p-8`}>
                    {loadingPaid ? (
                        <div className="text-center py-24">
                            <Loader2 className={`w-10 h-10 mx-auto animate-spin mb-4 ${accentTextClass}`} />
                        </div>
                    ) : paidCommissions.length === 0 ? (
                        <div className="text-center py-20">
                            <p className={colors.textMuted}>Nenhum pagamento registrado ainda.</p>
                        </div>
                    ) : (
                        <div className={`divide-y ${colors.divider}`}>
                            {paidCommissions.map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-3 py-4 px-2 md:px-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {item.photo_url ? (
                                            <img src={item.photo_url} alt={item.professional_name} className={`w-10 h-10 rounded-lg object-cover ${colors.border} border shrink-0`} />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-lg ${colors.surface} flex items-center justify-center shrink-0`}>
                                                <User className={`w-5 h-5 ${colors.textMuted}`} />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className={`${colors.text} font-bold text-sm truncate`}>{item.professional_name}</p>
                                            <p className={`${colors.textMuted} text-xs ${font.mono}`}>
                                                {new Date(item.period_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → {new Date(item.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-[var(--color-success)] ${font.mono} font-bold whitespace-nowrap tabular-nums`}>
                                            <MoneyInline symbol={currencySymbol} amount={item.net_amount} />
                                        </p>
                                        <p className={`${colors.textMuted} text-xs ${font.mono}`}>
                                            Pago em {new Date(item.paid_at).toLocaleDateString('pt-BR')}
                                        </p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full ${status.successBg} ${status.success} text-xs font-bold uppercase ${status.successBorder} border`}>
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
                <Modal
                    open
                    onClose={() => { setShowRatePrompt(false); setPendingPayProfessional(null); }}
                    title="Taxa de comissão de serviços"
                    size="sm"
                >
                    <p className={`${colors.textSecondary} text-sm mb-6`}>
                        Defina a taxa padrão de <strong className={colors.text}>{pendingPayProfessional.professional_name}</strong>.
                        As comissões pendentes serão recalculadas; as já pagas não mudam.
                    </p>
                    <label className={`${colors.textMuted} ${font.mono} text-xs uppercase block mb-2`}>Percentual de comissão (%)</label>
                    <div className="flex gap-3 mb-6">
                        <div className="relative flex-1">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={inlineRate}
                                onChange={e => setInlineRate(e.target.value)}
                                className={`w-full p-3 ${colors.inputBg} ${colors.inputBorder} border-2 rounded-xl ${colors.text} ${font.mono} text-xl focus:outline-none focus:border-[var(--color-input-focus)]`}
                                placeholder="Ex: 40"
                                autoFocus
                            />
                            <Percent className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.textMuted}`} />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" fullWidth onClick={() => { setShowRatePrompt(false); setPendingPayProfessional(null); }}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleSaveInlineRate}
                            disabled={savingRate || !inlineRate}
                            loading={savingRate}
                        >
                            {savingRate ? 'Salvando...' : 'Confirmar e Pagar'}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Pay Modal */}
            {showPayModal && selectedProfessional && (
                <Modal
                    open
                    size="full"
                    onClose={() => setShowPayModal(false)}
                    title="Confirmar repasse"
                    footer={
                        <div className="flex flex-col gap-3 md:flex-row">
                            <Button variant="secondary" className="order-2 flex-1 md:order-1" onClick={() => setShowPayModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="order-1 flex-1 md:order-2"
                                onClick={handlePayCommissions}
                                disabled={!!payingProfessionalId}
                                loading={payingProfessionalId === selectedProfessional.professional_id}
                            >
                                {payingProfessionalId === selectedProfessional.professional_id ? 'Confirmando...' : 'Pagar agora'}
                            </Button>
                        </div>
                    }
                >
                    {paymentPeriodLabel && (
                        <p className={`mb-6 text-sm ${colors.textMuted}`}>Período: {paymentPeriodLabel}</p>
                    )}

                    <div className={`mb-8 flex items-center gap-4 rounded-2xl ${colors.border} border ${colors.inputBg} p-4`}>
                        {selectedProfessional.photo_url ? (
                            <img src={selectedProfessional.photo_url} alt={selectedProfessional.professional_name} className={`h-12 w-12 rounded-xl object-cover ring-2 ${colors.border}`} />
                        ) : (
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.surface}`}>
                                <User className={`h-6 w-6 ${colors.textMuted}`} />
                            </div>
                        )}
                        <div>
                            <p className={`mb-1 text-lg font-bold leading-none ${colors.text}`}>{selectedProfessional.professional_name}</p>
                            <p className={`text-xs ${font.mono} ${colors.textMuted}`}>
                                Saldo: <span className="text-[var(--color-warning)]">{currencySymbol} {selectedProfessional.total_due.toFixed(2)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className={`mb-2 block text-xs ${font.mono} uppercase tracking-widest ${colors.textMuted}`}>
                                Valor a ser liquidado ({currencySymbol})
                            </label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                step="0.01"
                                className={`w-full rounded-2xl border-2 ${colors.border} ${colors.inputBg} p-4 ${font.mono} text-2xl ${colors.text} transition-all focus:border-[var(--color-success)] focus:outline-none`}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className={`block text-xs ${font.mono} uppercase tracking-widest ${colors.textMuted}`}>Intervalo de referência</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const p = calcCommissionPeriod(settlementDay);
                                        setPaymentStartDate(p.start);
                                        setPaymentEndDate(p.end);
                                        setPaymentPeriodLabel(p.label);
                                        calculateAmountForDates(selectedProfessional.professional_id, p.start, p.end);
                                    }}
                                    className={`rounded-xl ${colors.border} border ${colors.surface} py-2.5 text-xs font-bold uppercase ${colors.textSecondary} transition-all ${colors.surfaceHover} active:scale-95`}
                                >
                                    Período atual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
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
                                    className={`rounded-xl ${colors.border} border ${colors.surface} py-2.5 text-xs font-bold uppercase ${colors.textSecondary} transition-all ${colors.surfaceHover} active:scale-95`}
                                >
                                    Período anterior
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="date"
                                    value={paymentStartDate}
                                    onChange={(e) => { setPaymentStartDate(e.target.value); calculateAmountForDates(selectedProfessional.professional_id, e.target.value, paymentEndDate); }}
                                    className={`w-full rounded-xl ${colors.border} border ${colors.inputBg} p-3 text-xs ${colors.text} outline-none focus:ring-1 focus:ring-[var(--color-input-focus)]`}
                                />
                                <input
                                    type="date"
                                    value={paymentEndDate}
                                    onChange={(e) => { setPaymentEndDate(e.target.value); calculateAmountForDates(selectedProfessional.professional_id, paymentStartDate, e.target.value); }}
                                    className={`w-full rounded-xl ${colors.border} border ${colors.inputBg} p-3 text-xs ${colors.text} outline-none focus:ring-1 focus:ring-[var(--color-input-focus)]`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`mt-8 flex gap-3 rounded-2xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4`}>
                        <InfoIcon className="h-5 w-5 shrink-0 text-[var(--color-info)]" />
                        <p className="text-xs leading-snug text-[var(--color-info)]">
                            <strong>Aviso:</strong> Este pagamento será registrado como despesa e as comissões do período serão marcadas como pagas.
                        </p>
                    </div>
                </Modal>
            )}

            {/* Professional Details Modal */}
            {showDetailsModal && detailsProfessional && (
                <ProfessionalCommissionDetails
                    professionalId={detailsProfessional.professional_id}
                    professionalName={detailsProfessional.professional_name}
                    commissionRate={detailsProfessional.commission_rate}
                    onClose={() => { setShowDetailsModal(false); setDetailsProfessional(null); fetchCommissionsDue(); }}
                    onRateUpdated={(rate) => {
                        setDetailsProfessional((prev) => prev ? { ...prev, commission_rate: rate } : prev);
                        setCommissionsDue((prev) => prev.map((p) =>
                            p.professional_id === detailsProfessional.professional_id
                                ? { ...p, commission_rate: rate }
                                : p
                        ));
                        fetchCommissionsDue();
                    }}
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
