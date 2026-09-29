import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Modal, Skeleton, ErrorState } from '@/components/ui';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { User, Percent, Info as InfoIcon } from 'lucide-react';
import { InfoButton } from './HelpButtons';
import { useNavigate } from 'react-router-dom';
import { ProfessionalCommissionDetails } from './ProfessionalCommissionDetails';
import { CommissionPaymentHistory } from './CommissionPaymentHistory';
import { CommissionDetailReport } from './CommissionDetailReport';
import { useToast } from '@/components/ui';
import { useTenantLocale } from '../hooks/useTenantLocale';
import { lastClosedCycle, previousCycle, type CommissionCycle } from '../utils/commissionCycle';
import { PayoutList, type PayoutRowData } from './commissions/PayoutList';
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

    // Ciclo de acerto (datas locais; o servidor assume na P1)
    const [settlementDay, setSettlementDay] = useState<number>(5);
    const cycle: CommissionCycle = useMemo(() => lastClosedCycle(settlementDay), [settlementDay]);

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
        setSettlementDay(data?.commission_settlement_day_of_month || 5);
    };

    const fetchCommissionsDue = async () => {
        if (!user) return;
        setLoadState('loading');
        try {
            const { data, error } = await supabase.rpc('get_commissions_due');
            if (error) throw error;

            // Dono não entra na fila de repasse (a RPC devolve is_owner para o filtro).
            const team = (data || []).filter((i: any) => !i.is_owner);
            const ids = team.map((i: any) => i.professional_id);
            const cpfMap: Record<string, string | null> = {};
            if (ids.length > 0) {
                const { data: members } = await supabase
                    .from('team_members')
                    .select('id, cpf')
                    .in('id', ids);
                (members || []).forEach((m: any) => { cpfMap[m.id] = m.cpf || null; });
            }

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
        // Guard: colaborador sem % configurado
        if (!professional.commission_rate || professional.commission_rate === 0) {
            openRatePrompt(professional, true);
            return;
        }
        openPayModal(professional);
    };

    const applyPaymentCycle = (profId: string, c: CommissionCycle) => {
        setPaymentStartDate(c.start);
        setPaymentEndDate(c.end);
        setPaymentPeriodLabel(c.label);
        calculateAmountForDates(profId, c.start, c.end);
    };

    const openPayModal = (professional: CommissionDue) => {
        setSelectedProfessional(professional);
        setPaymentAmount((professional.total_due || 0).toFixed(2));
        applyPaymentCycle(professional.professional_id, cycle);
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

    const byId = (row: PayoutRowData) => commissionsDue.find((c) => c.professional_id === row.professional_id)!;
    const totalDue = commissionsDue.reduce((sum, p) => sum + (p.total_due || 0), 0);
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
                    <p className={`${colors.textSecondary} text-sm mt-1 tabular-nums flex flex-wrap gap-x-2`}>
                        <span className="whitespace-nowrap">Último ciclo fechado · {cycle.label}</span>
                        <span className={`whitespace-nowrap ${colors.textMuted}`}>Acerto todo dia {settlementDay}</span>
                    </p>
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
                                onRetry={fetchCommissionsDue}
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
                                {totalDue > 0 ? (
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
                                onPay={(r) => handleOpenPayModal(byId(r))}
                                onEditRate={(r) => openRatePrompt(byId(r), false)}
                                onOpenDetails={(r) => { setDetailsProfessional(byId(r)); setShowDetailsModal(true); }}
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
                        <p className={`mb-6 text-sm ${colors.textMuted}`}>Ciclo: {paymentPeriodLabel}</p>
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
                                Saldo: <span className="text-[var(--color-warning)]">{formatMoney(selectedProfessional.total_due)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className={`mb-2 block text-xs ${font.mono} uppercase tracking-widest ${colors.textMuted}`}>
                                Valor a ser liquidado ({moneySymbol})
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
                                    onClick={() => applyPaymentCycle(selectedProfessional.professional_id, cycle)}
                                    className={`min-h-[44px] rounded-xl ${colors.border} border ${colors.surface} py-2.5 text-xs font-bold uppercase ${colors.textSecondary} transition-all ${colors.surfaceHover} active:scale-95`}
                                >
                                    Último ciclo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyPaymentCycle(selectedProfessional.professional_id, previousCycle(cycle, settlementDay))}
                                    className={`min-h-[44px] rounded-xl ${colors.border} border ${colors.surface} py-2.5 text-xs font-bold uppercase ${colors.textSecondary} transition-all ${colors.surfaceHover} active:scale-95`}
                                >
                                    Ciclo anterior
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
                    currencySymbol={moneySymbol}
                />
            )}

            {/* Payment History Modal */}
            {showHistoryModal && detailsProfessional && (
                <CommissionPaymentHistory
                    professionalId={detailsProfessional.professional_id}
                    professionalName={detailsProfessional.professional_name}
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
