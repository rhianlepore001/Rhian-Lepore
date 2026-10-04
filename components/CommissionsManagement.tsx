import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Modal, Skeleton, ErrorState } from '@/components/ui';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { User, Percent, Info as InfoIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { InfoButton } from './HelpButtons';
import { useNavigate } from 'react-router-dom';
import { CommissionPaymentHistory } from './CommissionPaymentHistory';
import { CommissionDetailReport } from './CommissionDetailReport';
import { useToast } from '@/components/ui';
import { useTenantLocale } from '../hooks/useTenantLocale';
import { lastClosedCycle, formatCycleLabel, formatIsoToBr, parseBrToIso, formatDayMonth, type CommissionCycle } from '../utils/commissionCycle';
import { fetchCommissionCycle, isRpcUnavailable, payCommission, previewCommissionPay } from '../services/staffPerformance';
import { getTodayInTimeZone } from '../utils/businessTimezone';
import type { CommissionCycleResult } from '../types/staffPerformance';
import { PayoutList, payoutDueAmount, payoutPaymentRange, type PayoutRowData } from './commissions/PayoutList';
import { PaidPaymentsList, type PaidPayment } from './commissions/PaidPaymentsList';

interface CommissionDue extends PayoutRowData {
    is_owner: boolean;
    total_earnings_month: number;
    total_pending_records: number;
    total_paid: number;
    services_month: number;
    products_sold_month: number;
    cpf?: string | null;
}

interface CommissionsManagementProps {
    accentColor: string;
    currencySymbol: string;
    onPaymentSuccess?: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';

export const CommissionsManagement: React.FC<CommissionsManagementProps> = ({ accentColor, currencySymbol, onPaymentSuccess }) => {
    const { user } = useAuth();
    const { formatMoney, currencySymbol: tenantSymbol } = useTenantLocale();
    const moneySymbol = tenantSymbol || currencySymbol;
    const navigate = useNavigate();
    const isBeauty = accentColor.includes('beauty');
    const theme: ThemeVariant = isBeauty ? 'beauty' : 'barber';
    const { colors, font, radius } = useBrutalTheme({ override: theme });

    const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');

    const [commissionsDue, setCommissionsDue] = useState<CommissionDue[]>([]);
    const [loadState, setLoadState] = useState<LoadState>('loading');

    const [paidCommissions, setPaidCommissions] = useState<PaidPayment[]>([]);
    const [paidState, setPaidState] = useState<LoadState>('loading');

    // Ciclo de acerto: calculado no servidor, no fuso do tenant (P1, get_commission_cycle_v1).
    // Sem a RPC (migration ainda não aplicada) cai no cálculo local da P0.
    const [settlementDay, setSettlementDay] = useState<number>(5);
    const [cycleData, setCycleData] = useState<CommissionCycleResult | null>(null);
    const [requestedEnd, setRequestedEnd] = useState<string | null>(null);
    const cycle: CommissionCycle = useMemo(
        () => cycleData
            ? { start: cycleData.cycle.start, end: cycleData.cycle.end, label: formatCycleLabel(cycleData.cycle.start, cycleData.cycle.end) }
            : lastClosedCycle(settlementDay),
        [cycleData, settlementDay],
    );

    // Pay modal
    const [payingProfessionalId, setPayingProfessionalId] = useState<string | null>(null);
    const [settledIds, setSettledIds] = useState<Set<string>>(() => new Set());
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<CommissionDue | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [paymentEndDate, setPaymentEndDate] = useState('');
    const [paymentPeriodLabel, setPaymentPeriodLabel] = useState('');
    const [startDraft, setStartDraft] = useState('');
    const [endDraft, setEndDraft] = useState('');
    const [previewing, setPreviewing] = useState(false);

    // Inline % prompt
    const [showRatePrompt, setShowRatePrompt] = useState(false);
    const [pendingPayProfessional, setPendingPayProfessional] = useState<CommissionDue | null>(null);
    const [openPayAfterRateSave, setOpenPayAfterRateSave] = useState(false);
    const [inlineRate, setInlineRate] = useState('');
    const [savingRate, setSavingRate] = useState(false);

    const { showToast } = useToast();

    // Modals
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [detailsProfessional, setDetailsProfessional] = useState<CommissionDue | null>(null);

    useEffect(() => {
        fetchSettlementDay();
        loadPayouts(null);
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
        setSettlementDay(data?.commission_settlement_day_of_month || 5);
    };

    const fetchCpfs = async (ids: string[]) => {
        const cpfMap: Record<string, string | null> = {};
        if (ids.length === 0) return cpfMap;
        const { data: members } = await supabase.from('team_members').select('id, cpf').in('id', ids);
        (members || []).forEach((m: any) => { cpfMap[m.id] = m.cpf || null; });
        return cpfMap;
    };

    /** Carrega a lista do ciclo `end` (null = ciclo padrão do servidor). */
    const loadPayouts = async (end: string | null = requestedEnd) => {
        if (!user) return;
        setLoadState('loading');
        let result: CommissionCycleResult;
        try {
            result = await fetchCommissionCycle(end);
        } catch (error) {
            if (isRpcUnavailable(error)) {
                setCycleData(null);
                await fetchCommissionsDue();
                return;
            }
            console.error('Error fetching commission cycle:', error);
            setCommissionsDue([]);
            setLoadState('error');
            return;
        }
        try {
            const cpfMap = await fetchCpfs(result.members.map((m) => m.professional_id));
            setCycleData(result);
            setSettlementDay(result.settlement_day);
            setCommissionsDue(result.members.map((m) => ({
                professional_id: m.professional_id,
                professional_name: m.name,
                photo_url: m.photo_url,
                commission_rate: m.commission_rate,
                total_due: m.a_pagar_ciclo,
                services_pending: m.servicos_ciclo,
                products_pending: m.produtos_ciclo,
                is_owner: false,
                total_earnings_month: 0,
                total_pending_records: 0,
                total_paid: m.pago_ciclo ?? 0,
                services_month: m.servicos_ciclo,
                products_sold_month: m.produtos_ciclo,
                cpf: cpfMap[m.professional_id] ?? null,
                cycle: {
                    status: m.status,
                    saldo_acumulado: m.saldo_acumulado,
                    saldo_anterior: m.saldo_anterior,
                    inactive: m.inactive,
                    pago_ciclo: m.pago_ciclo,
                    pago_calculado: m.pago_calculado,
                    paid_at: m.pago_ciclo_em,
                    primeiro_nao_pago: m.primeiro_nao_pago,
                },
            })));
            setLoadState('ready');
        } catch (error) {
            console.error('Error mapping commission cycle:', error);
            setCommissionsDue([]);
            setLoadState('error');
        }
    };

    const goToCycle = (end: string) => {
        setRequestedEnd(end);
        loadPayouts(end);
    };

    /** Caminho da P0 (sem a RPC da P1): saldo acumulado + ciclo calculado no navegador. */
    const fetchCommissionsDue = async () => {
        if (!user) return;
        setLoadState('loading');
        try {
            const { data, error } = await supabase.rpc('get_commissions_due');
            if (error) throw error;

            // Dono não entra na fila de repasse (a RPC devolve is_owner para o filtro).
            const team = (data || []).filter((i: any) => !i.is_owner);
            const cpfMap = await fetchCpfs(team.map((i: any) => i.professional_id));

            setCommissionsDue(team.map((item: any) => ({
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
                cpf: cpfMap[item.professional_id] ?? null,
            })));
            setLoadState('ready');
        } catch (error) {
            console.error('Error fetching commissions:', error);
            setCommissionsDue([]);
            setLoadState('error');
        }
    };

    const fetchPaidCommissions = async () => {
        if (!user) return;
        setPaidState('loading');
        try {
            // Colunas reais de commission_payments (B1): professional_id, start_date,
            // end_date, amount/net_amount, paid_at, user_id (= tenant).
            const { data, error } = await supabase
                .from('commission_payments')
                .select('id, professional_id, start_date, end_date, amount, net_amount, paid_at, team_members!professional_id (name, photo_url)')
                .eq('user_id', user.id)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false })
                .limit(50);
            if (error) throw error;

            setPaidCommissions((data || []).map((item: any) => ({
                id: item.id,
                professional_name: item.team_members?.name || 'Colaborador removido',
                photo_url: item.team_members?.photo_url || null,
                start_date: item.start_date,
                end_date: item.end_date,
                amount: Number(item.net_amount ?? item.amount) || 0,
                paid_at: item.paid_at,
            })));
            setPaidState('ready');
        } catch (error) {
            console.error('Error fetching paid commissions:', error);
            setPaidCommissions([]);
            setPaidState('error');
        }
    };

    const openRatePrompt = (professional: CommissionDue, payAfter: boolean) => {
        setPendingPayProfessional(professional);
        setInlineRate(payAfter ? '' : String(professional.commission_rate || 0));
        setOpenPayAfterRateSave(payAfter);
        setShowRatePrompt(true);
    };

    const handleOpenPayModal = (professional: CommissionDue) => {
        if (settledIds.has(professional.professional_id)) return;
        // Guard: colaborador sem % configurado
        if (!professional.commission_rate || professional.commission_rate === 0) {
            openRatePrompt(professional, true);
            return;
        }
        openPayModal(professional);
    };

    const applyDates = (start: string, end: string, professional: CommissionDue) => {
        setPaymentStartDate(start);
        setPaymentEndDate(end);
        setStartDraft(formatIsoToBr(start));
        setEndDraft(formatIsoToBr(end));
        setPaymentPeriodLabel(formatCycleLabel(start, end));
        void refreshPreview(professional.professional_id, start, end);
    };

    const refreshPreview = async (profId: string, start: string, end: string) => {
        if (!start || !end || start > end) {
            setPaymentAmount('0.00');
            return;
        }
        if (!cycleData) {
            await calculateAmountForDates(profId, start, end);
            return;
        }
        setPreviewing(true);
        try {
            const preview = await previewCommissionPay(profId, start, end);
            setPaymentAmount(Number(preview.amount).toFixed(2));
        } catch (error) {
            if (isRpcUnavailable(error)) {
                await calculateAmountForDates(profId, start, end);
                return;
            }
            console.error('Error previewing commission pay:', error);
            setPaymentAmount('0.00');
        } finally {
            setPreviewing(false);
        }
    };

    const commitDraftDate = (which: 'start' | 'end') => {
        if (!selectedProfessional) return;
        const raw = which === 'start' ? startDraft : endDraft;
        const iso = parseBrToIso(raw);
        if (!iso) {
            if (which === 'start') setStartDraft(formatIsoToBr(paymentStartDate));
            else setEndDraft(formatIsoToBr(paymentEndDate));
            return;
        }
        const start = which === 'start' ? iso : paymentStartDate;
        const end = which === 'end' ? iso : paymentEndDate;
        applyDates(start, end, selectedProfessional);
    };

    const openPayModal = (professional: CommissionDue) => {
        setSelectedProfessional(professional);
        if (!cycleData) {
            const start = cycle.start;
            const end = cycle.end;
            setPaymentAmount(payoutDueAmount(professional).toFixed(2));
            setPaymentStartDate(start);
            setPaymentEndDate(end);
            setStartDraft(formatIsoToBr(start));
            setEndDraft(formatIsoToBr(end));
            setPaymentPeriodLabel(formatCycleLabel(start, end));
            setShowPayModal(true);
            void calculateAmountForDates(professional.professional_id, start, end);
            return;
        }
        const range = payoutPaymentRange(professional, cycle, cycleData.previous_end, {
            today: getTodayInTimeZone(cycleData.tz),
            open: cycleData.cycle.open,
        });
        setPaymentAmount(range.amount.toFixed(2));
        setPaymentStartDate(range.start);
        setPaymentEndDate(range.end);
        setStartDraft(formatIsoToBr(range.start));
        setEndDraft(formatIsoToBr(range.end));
        setPaymentPeriodLabel(formatCycleLabel(range.start, range.end));
        setShowPayModal(true);
        void refreshPreview(professional.professional_id, range.start, range.end);
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
            await loadPayouts();
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
        if (payingProfessionalId || settledIds.has(selectedProfessional.professional_id)) return;

        if (Number(paymentAmount) <= 0) {
            showToast('Nada a marcar neste período.', 'error');
            return;
        }
        setPayingProfessionalId(selectedProfessional.professional_id);
        try {
            let paid = Number(paymentAmount);
            if (cycleData) {
                const result = await payCommission(selectedProfessional.professional_id, paymentStartDate, paymentEndDate);
                paid = Number(result.amount);
            } else {
                const { error } = await supabase.rpc('mark_commissions_as_paid', {
                    p_user_id: user.id,
                    p_professional_id: selectedProfessional.professional_id,
                    p_amount: paid,
                    p_start_date: paymentStartDate,
                    p_end_date: paymentEndDate,
                });
                if (error) throw error;
            }
            if (paid <= 0) {
                showToast('Nada a marcar neste período.', 'error');
                return;
            }

            const paidId = selectedProfessional.professional_id;
            setSettledIds((prev) => {
                const next = new Set(prev);
                next.add(paidId);
                return next;
            });
            showToast(`Comissão de ${selectedProfessional.professional_name} paga: ${formatMoney(paid)}.`, 'success');
            setShowPayModal(false);
            setSelectedProfessional(null);
            loadPayouts();
            if (onPaymentSuccess) onPaymentSuccess();
        } catch (error: any) {
            console.error('Erro ao registrar pagamento:', error);
            showToast('Não foi possível registrar o pagamento. Tente novamente.', 'error');
        } finally {
            setPayingProfessionalId(null);
        }
    };

    const byId = (row: PayoutRowData) => commissionsDue.find((c) => c.professional_id === row.professional_id)!;
    const totalDue = cycleData ? cycleData.totals.a_pagar_ciclo : commissionsDue.reduce((sum, p) => sum + (p.total_due || 0), 0);
    const withBalance = commissionsDue.filter((p) => p.total_due > 0).length;
    const subTab = (id: 'pending' | 'paid', label: string) => (
        <button
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`px-4 min-h-[44px] md:min-h-[36px] text-sm font-semibold ${radius.button} transition-colors ${
                activeTab === id ? `${colors.card} ${colors.text} border ${colors.border}` : `${colors.textMuted} border border-transparent hover:text-theme-text`
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-5 md:space-y-6 pb-10">
            {/* Cabeçalho */}
            <header className="px-1 md:px-0 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                        <h2 className={`text-xl sm:text-2xl md:text-3xl min-w-0 ${font.heading} ${colors.text} tracking-tight`}>Pagamento de comissão</h2>
                        <InfoButton text="Quanto cada colaborador tem a receber e o registro de cada repasse. O saldo soma as comissões registradas ainda não pagas." />
                    </div>
                    {cycleData ? (
                        <div className="mt-2 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <div className={`inline-flex items-center border ${colors.border} ${radius.button} ${colors.card}`}>
                                    <button
                                        type="button"
                                        aria-label="Ciclo anterior"
                                        disabled={loadState === 'loading'}
                                        onClick={() => goToCycle(cycleData.previous_end)}
                                        className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-h-[40px] ${colors.textSecondary} ${colors.surfaceHover} disabled:opacity-40`}
                                    >
                                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <span className={`px-1 text-sm font-semibold ${colors.text} tabular-nums whitespace-nowrap`} aria-live="polite">
                                        {formatDayMonth(cycleData.cycle.start)} – {formatDayMonth(cycleData.cycle.end)}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Próximo ciclo"
                                        disabled={loadState === 'loading' || cycleData.cycle.open}
                                        onClick={() => goToCycle(cycleData.next_end)}
                                        className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-h-[40px] ${colors.textSecondary} ${colors.surfaceHover} disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <p className={`text-sm ${colors.textSecondary} tabular-nums`} data-testid="commission-cycle-header">
                                Período {formatDayMonth(cycleData.cycle.start)} – {formatDayMonth(cycleData.cycle.end)}
                                {' · '}fecha em {formatDayMonth(cycleData.cycle.end)}
                                {cycleData.cycle.pay_due || cycleData.pay_due
                                    ? ` · pagar até ${formatDayMonth((cycleData.cycle.pay_due || cycleData.pay_due)!)}`
                                    : ''}
                            </p>
                        </div>
                    ) : (
                        <p className={`${colors.textSecondary} text-sm mt-1 tabular-nums flex flex-wrap gap-x-2`}>
                            <span className="whitespace-nowrap">Último ciclo fechado · {cycle.label}</span>
                            <span className={`whitespace-nowrap ${colors.textMuted}`}>Acerto todo dia {settlementDay}</span>
                        </p>
                    )}
                </div>
                <div role="tablist" aria-label="Repasses" className={`inline-flex gap-1 p-1 ${colors.surface} ${radius.button} w-fit`}>
                    {subTab('pending', 'A pagar')}
                    {subTab('paid', 'Pagos')}
                </div>
            </header>

            {activeTab === 'pending' && (
                <section aria-label="A pagar" className="space-y-4">
                    {loadState === 'loading' && (
                        <div className="space-y-3" aria-busy="true">
                            <Skeleton className="h-6 w-64" />
                            <Skeleton count={3} className="h-24 lg:h-14 w-full" />
                        </div>
                    )}

                    {loadState === 'error' && (
                        <div className={`border ${colors.border} ${radius.card} ${colors.card}`}>
                            <ErrorState
                                forceTheme={theme}
                                title="Não foi possível carregar os repasses."
                                message="Confira a conexão e tente de novo. Nenhum pagamento foi alterado."
                                retryLabel="Tentar de novo"
                                onRetry={() => loadPayouts()}
                            />
                        </div>
                    )}

                    {loadState === 'ready' && commissionsDue.length === 0 && (
                        <div className={`text-center py-14 px-6 border border-dashed ${colors.border} ${radius.card}`}>
                            <User className={`w-8 h-8 mx-auto mb-4 ${colors.textMuted}`} aria-hidden="true" />
                            <p className={`font-semibold ${colors.text} mb-1`}>Sem colaboradores</p>
                            <p className={`${colors.textMuted} max-w-sm mx-auto text-sm mb-5`}>
                                Cadastre a equipe em Ajustes → Equipe e defina o % de comissão de cada profissional para acompanhar os repasses aqui.
                            </p>
                            <Button variant="secondary" forceTheme={theme} onClick={() => navigate('/configuracoes/equipe')}>Ir para Equipe</Button>
                        </div>
                    )}

                    {loadState === 'ready' && commissionsDue.length > 0 && (
                        <>
                            <p className={`text-sm ${colors.textSecondary} flex flex-wrap items-baseline gap-x-2 gap-y-1`} data-testid="payout-summary">
                                {cycleData ? (
                                    cycleData.totals.a_pagar_ciclo > 0 || cycleData.totals.pago_ciclo > 0 ? (
                                        <>
                                            <span>A pagar</span>
                                            <strong className={`${font.mono} text-lg md:text-xl tabular-nums whitespace-nowrap ${colors.text}`}>{formatMoney(cycleData.totals.a_pagar_ciclo)}</strong>
                                            <span aria-hidden="true">·</span>
                                            <span className="whitespace-nowrap">{cycleData.totals.pendentes} {cycleData.totals.pendentes === 1 ? 'pendente' : 'pendentes'}</span>
                                            <span aria-hidden="true" className="hidden sm:inline">·</span>
                                            <span className="basis-full sm:basis-auto whitespace-nowrap">Pago neste ciclo <span className={`${font.mono} tabular-nums ${colors.text}`}>{formatMoney(cycleData.totals.pago_ciclo)}</span></span>
                                        </>
                                    ) : (
                                        <span>Nenhuma comissão pendente neste ciclo.</span>
                                    )
                                ) : totalDue > 0 ? (
                                    <>
                                        <span>A pagar</span>
                                        <strong className={`${font.mono} text-lg md:text-xl tabular-nums whitespace-nowrap ${colors.text}`}>{formatMoney(totalDue)}</strong>
                                        <span aria-hidden="true" className="hidden sm:inline">·</span>
                                        <span className="basis-full sm:basis-auto">{withBalance} {withBalance === 1 ? 'colaborador com saldo' : 'colaboradores com saldo'}</span>
                                    </>
                                ) : (
                                    <span>Nenhuma comissão pendente.</span>
                                )}
                            </p>
                            <PayoutList
                                rows={commissionsDue}
                                theme={theme}
                                formatMoney={formatMoney}
                                payingId={payingProfessionalId}
                                settledIds={settledIds}
                                onPay={(r) => handleOpenPayModal(byId(r))}
                                onEditRate={(r) => openRatePrompt(byId(r), false)}
                                analysisHref={(r) => `/financeiro/performance?de=${cycle.start}&ate=${cycle.end}&pro=${encodeURIComponent(r.professional_id)}`}
                                onOpenReport={(r) => { setDetailsProfessional(byId(r)); setShowReportModal(true); }}
                                onOpenHistory={(r) => { setDetailsProfessional(byId(r)); setShowHistoryModal(true); }}
                            />
                        </>
                    )}
                </section>
            )}

            {activeTab === 'paid' && (
                <section aria-label="Pagos">
                    {paidState === 'loading' && <Skeleton count={3} className="h-16 w-full" />}
                    {paidState === 'error' && (
                        <div className={`border ${colors.border} ${radius.card} ${colors.card}`}>
                            <ErrorState forceTheme={theme} title="Não foi possível carregar os pagamentos." message="Confira a conexão e tente de novo." retryLabel="Tentar de novo" onRetry={fetchPaidCommissions} />
                        </div>
                    )}
                    {paidState === 'ready' && paidCommissions.length === 0 && (
                        <p className={`text-center py-14 text-sm ${colors.textMuted} border border-dashed ${colors.border} ${radius.card}`}>Nenhum pagamento registrado ainda.</p>
                    )}
                    {paidState === 'ready' && paidCommissions.length > 0 && (
                        <PaidPaymentsList items={paidCommissions} theme={theme} formatMoney={formatMoney} />
                    )}
                </section>
            )}

            <p className={`text-xs ${colors.textMuted} px-1 md:px-0`}>
                Os valores assumem comissão por atendimento. Aluguel de cadeira ainda não é suportado.
            </p>

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
                            {savingRate ? 'Salvando...' : openPayAfterRateSave ? 'Salvar e pagar' : 'Salvar'}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Pay Modal */}
            {showPayModal && selectedProfessional && (
                <Modal
                    open
                    size="lg"
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
                                disabled={!!payingProfessionalId || previewing || Number(paymentAmount) <= 0}
                                loading={payingProfessionalId === selectedProfessional.professional_id}
                            >
                                {payingProfessionalId === selectedProfessional.professional_id
                                    ? 'Confirmando...'
                                    : `Pagar ${formatMoney(Number(paymentAmount) || 0)} de ${formatDayMonth(paymentStartDate)} a ${
                                        cycleData?.cycle.open && paymentEndDate === getTodayInTimeZone(cycleData.tz)
                                            ? 'hoje'
                                            : formatDayMonth(paymentEndDate)
                                    }`}
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
                                {selectedProfessional.cycle && selectedProfessional.total_due <= 0 && (selectedProfessional.cycle.saldo_anterior ?? 0) > 0 ? (
                                    <>Ciclos anteriores: <span className={colors.text}>{formatMoney(selectedProfessional.cycle.saldo_anterior)}</span></>
                                ) : (
                                    <>
                                        {selectedProfessional.cycle ? 'Neste ciclo' : 'Saldo'}: <span className="text-[var(--color-warning)]">{formatMoney(selectedProfessional.total_due)}</span>
                                        {selectedProfessional.cycle && selectedProfessional.cycle.saldo_acumulado > selectedProfessional.total_due && (
                                            <> · Saldo total: {formatMoney(selectedProfessional.cycle.saldo_acumulado)}</>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className={`mb-2 block text-xs ${font.mono} uppercase tracking-widest ${colors.textMuted}`}>
                                Valor a ser liquidado ({moneySymbol})
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                readOnly
                                aria-label="Valor a ser liquidado"
                                value={formatMoney(Number(paymentAmount) || 0)}
                                aria-busy={previewing}
                                className={`w-full rounded-2xl border-2 ${colors.border} ${colors.inputBg} p-4 ${font.mono} text-2xl ${colors.text} transition-all focus:border-[var(--color-success)] focus:outline-none`}
                                placeholder={formatMoney(0)}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className={`block text-xs ${font.mono} uppercase tracking-widest ${colors.textMuted}`}>Intervalo de referência</label>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    aria-label="Data inicial"
                                    placeholder="dd/mm/aaaa"
                                    value={startDraft}
                                    onChange={(e) => setStartDraft(e.target.value)}
                                    onBlur={() => commitDraftDate('start')}
                                    className={`w-full rounded-xl ${colors.border} border ${colors.inputBg} p-3 text-xs ${colors.text} outline-none focus:ring-1 focus:ring-[var(--color-input-focus)]`}
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    aria-label="Data final"
                                    placeholder="dd/mm/aaaa"
                                    value={endDraft}
                                    onChange={(e) => setEndDraft(e.target.value)}
                                    onBlur={() => commitDraftDate('end')}
                                    className={`w-full rounded-xl ${colors.border} border ${colors.inputBg} p-3 text-xs ${colors.text} outline-none focus:ring-1 focus:ring-[var(--color-input-focus)]`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`mt-8 flex gap-3 rounded-2xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4`}>
                        <InfoIcon className="h-5 w-5 shrink-0 text-[var(--color-info)]" />
                        <p className="text-xs leading-snug text-[var(--color-info)]">
                            <strong>Aviso:</strong> Este pagamento marca as comissões de {paymentStartDate.slice(8, 10)}/{paymentStartDate.slice(5, 7)} a {paymentEndDate.slice(8, 10)}/{paymentEndDate.slice(5, 7)} e registra a despesa de {formatMoney(Number(paymentAmount) || 0)}.
                        </p>
                    </div>
                </Modal>
            )}

            {/* Payment History Modal */}
            {showHistoryModal && detailsProfessional && (
                <CommissionPaymentHistory
                    professionalId={detailsProfessional.professional_id}
                    professionalName={detailsProfessional.professional_name}
                    cpf={detailsProfessional.cpf}
                    commissionRate={detailsProfessional.commission_rate}
                    onClose={() => { setShowHistoryModal(false); setDetailsProfessional(null); }}
                    accentColor={accentColor}
                    currencySymbol={moneySymbol}
                />
            )}

            {/* Commission Detail Report Modal */}
            {showReportModal && detailsProfessional && (
                <CommissionDetailReport
                    professionalId={detailsProfessional.professional_id}
                    professionalName={detailsProfessional.professional_name}
                    cpf={detailsProfessional.cpf}
                    commissionRate={detailsProfessional.commission_rate}
                    periodStart={cycle.start}
                    periodEnd={cycle.end}
                    periodLabel={cycle.label}
                    currencySymbol={moneySymbol}
                    accentColor={accentColor}
                    onClose={() => { setShowReportModal(false); setDetailsProfessional(null); }}
                />
            )}
        </div>
    );
};
