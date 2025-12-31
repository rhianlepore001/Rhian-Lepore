import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from './BrutalCard';
import { BrutalButton } from './BrutalButton';
import { User, DollarSign, Check, Loader2, X, Percent, TrendingUp, Clock, Scissors, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfessionalCommissionDetails } from './ProfessionalCommissionDetails';
import { CommissionPaymentHistory } from './CommissionPaymentHistory';

interface CommissionDue {
    professional_id: string;
    professional_name: string;
    photo_url: string | null;
    total_due: number;
    total_earnings_month: number;
    total_pending_records: number;
    commission_rate: number;
    total_paid: number;
}

interface CommissionsManagementProps {
    accentColor: string;
    currencySymbol: string;
    onPaymentSuccess?: () => void;
}

export const CommissionsManagement: React.FC<CommissionsManagementProps> = ({ accentColor, currencySymbol, onPaymentSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [commissionsDue, setCommissionsDue] = useState<CommissionDue[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingProfessionalId, setPayingProfessionalId] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<CommissionDue | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [paymentEndDate, setPaymentEndDate] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [detailsProfessional, setDetailsProfessional] = useState<CommissionDue | null>(null);

    useEffect(() => {
        fetchCommissionsDue();
    }, [user]);

    const fetchCommissionsDue = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Use the upgraded RPC which returns all metrics and professional info
            const { data, error } = await supabase.rpc('get_commissions_due', { p_user_id: user.id });

            if (error) throw error;

            setCommissionsDue(data || []);
        } catch (error) {
            console.error('Error fetching commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPayModal = (professional: CommissionDue) => {
        setSelectedProfessional(professional);
        setPaymentAmount((professional.total_due || 0).toFixed(2));
        // Set default dates for the current month
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const start = firstDayOfMonth.toISOString().split('T')[0];
        const end = lastDayOfMonth.toISOString().split('T')[0];

        setPaymentStartDate(start);
        setPaymentEndDate(end);

        // Initial calculation for the current month
        calculateAmountForDates(professional.professional_id, start, end);

        setShowPayModal(true);
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

            const total = (data || []).reduce((sum, record) => sum + (Number(record.commission_value) || 0), 0);
            setPaymentAmount(total.toFixed(2));
        } catch (error) {
            console.error('Error calculating amount for range:', error);
        }
    };

    const handlePayCommissions = async () => {
        if (!user || !selectedProfessional || !paymentAmount || !paymentStartDate || !paymentEndDate) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        setPayingProfessionalId(selectedProfessional.professional_id);
        try {
            // Note: The RPC 'mark_commissions_as_paid' expects date strings in 'YYYY-MM-DD' format, which is what input type="date" provides.
            const { error } = await supabase.rpc('mark_commissions_as_paid', {
                p_user_id: user.id,
                p_professional_id: selectedProfessional.professional_id,
                p_amount: parseFloat(paymentAmount),
                p_start_date: paymentStartDate,
                p_end_date: paymentEndDate
            });

            if (error) {
                console.error('Erro detalhado do Supabase:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }

            alert(`✅ Comissão de ${selectedProfessional.professional_name} paga com sucesso!`);
            setShowPayModal(false);
            setSelectedProfessional(null);
            fetchCommissionsDue(); // Refresh the local list
            if (onPaymentSuccess) onPaymentSuccess(); // Refresh the parent finance data
        } catch (error: any) {
            console.error('Erro ao pagar comissões:', error);
            alert(`❌ Erro ao registrar pagamento de comissão: ${error.message || JSON.stringify(error)}`);
        } finally {
            setPayingProfessionalId(null);
        }
    };

    const totalDueOverall = commissionsDue.reduce((sum, p) => sum + (p.total_due || 0), 0);
    const totalPaidMonth = commissionsDue.reduce((sum, p) => sum + (p.total_paid || 0), 0);
    const topPerformer = commissionsDue.length > 0
        ? [...commissionsDue].sort((a, b) => (b.total_earnings_month || 0) - (a.total_earnings_month || 0))[0]
        : null;

    // Sanitize accentColor for classes (ensure it's just the color name if needed, or keep as is if it's already a full class)
    const accentTextClass = accentColor.startsWith('text-') ? accentColor : `text-${accentColor}`;
    const accentBgClass = accentColor.replace('text-', 'bg-');

    return (
        <div className="space-y-6 md:space-y-8 pb-10">
            {/* Header Section */}
            <div className="px-1 md:px-0">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl md:text-3xl font-heading text-white uppercase tracking-tighter">Gestão de Comissões</h2>
                    <div className="group relative">
                        <HelpCircle className="w-5 h-5 text-neutral-500 cursor-help hover:text-white transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 md:w-72 p-4 bg-neutral-900 border-2 border-neutral-700 rounded-xl shadow-2xl text-[10px] md:text-xs text-neutral-300 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50">
                            <p className="mb-2"><strong className="text-white text-sm">💡 Como funciona:</strong></p>
                            <p className="mb-1">1. O sistema calcula a comissão em cada corte concluído.</p>
                            <p className="mb-1">2. Aqui você vê o saldo acumulado de cada profissional.</p>
                            <p className="mb-1">3. Ao <strong>Pagar</strong>, o sistema gera uma despesa e zera o saldo pendente.</p>
                            <div className="mt-2 pt-2 border-t border-neutral-800 text-[9px] md:text-[10px] text-neutral-500 italic">
                                * Valores baseados nas taxas configuradas em Configurações.
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-neutral-400 text-sm md:text-base max-w-2xl leading-relaxed">
                    Controle financeiro total da sua equipe. Acompanhe ganhos, valide serviços e realize pagamentos de forma transparente.
                </p>
            </div>

            {/* Metrics Dashboard - More compact on Mobile */}
            {!loading && commissionsDue.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-4 md:p-6 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full ${accentColor === 'text-beauty-neon' ? 'bg-beauty-neon' : 'bg-accent-gold'}`}></div>
                        <p className="text-neutral-500 text-[9px] md:text-xs uppercase font-mono font-bold mb-1 md:mb-2 tracking-widest">Pendente</p>
                        <h4 className={`text-lg md:text-3xl font-mono font-bold ${totalDueOverall > 0 ? 'text-yellow-400' : 'text-neutral-400'}`}>
                            {currencySymbol} {(totalDueOverall || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h4>
                    </div>

                    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-4 md:p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full bg-green-500"></div>
                        <p className="text-neutral-500 text-[9px] md:text-xs uppercase font-mono font-bold mb-1 md:mb-2 tracking-widest">Pago (Mês)</p>
                        <h4 className="text-lg md:text-3xl font-mono font-bold text-green-400">
                            {currencySymbol} {(totalPaidMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h4>
                    </div>

                    <div className="col-span-2 lg:col-span-1 bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-4 md:p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 -mr-6 md:-mr-8 -mt-6 md:-mt-8 opacity-10 rounded-full bg-blue-500"></div>
                        <p className="text-neutral-500 text-[9px] md:text-xs uppercase font-mono font-bold mb-1 md:mb-2 tracking-widest">Destaque</p>
                        <h4 className="text-lg md:text-3xl font-mono font-bold text-blue-400 truncate">
                            {topPerformer ? (topPerformer.professional_name?.split(' ')[0] || '-') : '-'}
                        </h4>
                        <p className="text-[9px] text-neutral-600 mt-1 font-mono uppercase tracking-widest">Top Performance</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="bg-neutral-900/40 border-0 md:border-2 border-neutral-800 md:rounded-3xl p-0 md:p-8 backdrop-blur-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-24 text-neutral-500">
                        <Loader2 className={`w-12 h-12 mx-auto animate-spin mb-4 ${accentTextClass}`} />
                        <p className="font-mono uppercase tracking-widest animate-pulse">Sincronizando dados...</p>
                    </div>
                ) : commissionsDue.length === 0 ? (
                    <div className="text-center py-20 bg-neutral-900/50 rounded-2xl border-2 border-dashed border-neutral-800 group hover:border-neutral-700 transition-colors mx-4 md:mx-0">
                        <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
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
                                    {/* Top: Info & Name */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="relative">
                                                {professional.photo_url ? (
                                                    <img
                                                        src={professional.photo_url}
                                                        alt={professional.professional_name}
                                                        className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border border-neutral-800"
                                                    />
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
                                                <h3 className="text-base md:text-xl font-bold text-white leading-tight">
                                                    {professional.professional_name}
                                                </h3>
                                                <p className="text-neutral-500 text-[9px] md:text-[10px] font-mono mt-1 uppercase tracking-tight flex items-center gap-1 group-hover:text-neutral-400 transition-colors">
                                                    Escala de Comissionamento <TrendingUp className="w-2.5 h-2.5" />
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

                                    {/* Middle: Stats grid */}
                                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                                        <div className="p-2 md:p-3 rounded-xl bg-black/30 border border-neutral-800/50">
                                            <p className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-bold mb-0.5 font-mono tracking-tighter">Este Mês</p>
                                            <p className="text-xs md:text-lg font-mono font-bold text-white">
                                                {currencySymbol} {professional.total_earnings_month.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="p-2 md:p-3 rounded-xl bg-black/30 border border-neutral-800/50">
                                            <p className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-bold mb-0.5 font-mono tracking-tighter">Liquidado</p>
                                            <p className="text-xs md:text-lg font-mono font-bold text-neutral-400">
                                                {currencySymbol} {professional.total_paid.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="p-2 md:p-3 rounded-xl bg-black/30 border border-neutral-800/50">
                                            <p className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-bold mb-0.5 font-mono tracking-tighter">Serviços</p>
                                            <p className="text-xs md:text-lg font-mono font-bold text-white">
                                                {professional.total_pending_records || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bottom: Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-2 flex-1">
                                            <button
                                                onClick={() => {
                                                    setDetailsProfessional(professional);
                                                    setShowDetailsModal(true);
                                                }}
                                                className="flex-1 h-10 md:h-12 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-white transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold border border-neutral-700 active:scale-95"
                                            >
                                                <Scissors className="w-3.5 h-3.5" />
                                                <span>Serviços</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDetailsProfessional(professional);
                                                    setShowHistoryModal(true);
                                                }}
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
                                            disabled={payingProfessionalId === professional.professional_id || professional.total_due <= 0}
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

            {/* Pay Commission Modal - Mobile Responsive */}
            {showPayModal && selectedProfessional && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-0 md:p-4 backdrop-blur-md">
                    <div className="bg-neutral-900 border-0 md:border-2 border-neutral-800 md:rounded-[32px] w-full max-w-md h-full md:h-auto flex flex-col p-6 md:p-8 shadow-2xl relative overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                    <DollarSign className="w-5 h-5 text-green-500" />
                                </div>
                                <h3 className="text-white font-heading text-xl uppercase tracking-tight">Confirmar Repasse</h3>
                            </div>
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="text-neutral-500 hover:text-white transition-all p-2 hover:bg-neutral-800 rounded-xl border border-transparent active:scale-90"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-8 p-4 bg-black/40 rounded-2xl border border-neutral-800 shadow-inner">
                            {selectedProfessional.photo_url ? (
                                <img
                                    src={selectedProfessional.photo_url}
                                    alt={selectedProfessional.professional_name}
                                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-neutral-800"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                                    <User className="w-6 h-6 text-neutral-600" />
                                </div>
                            )}
                            <div>
                                <p className="text-white font-bold text-lg leading-none mb-1">{selectedProfessional.professional_name}</p>
                                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                                    Saldo: <span className="text-yellow-500">{currencySymbol} {selectedProfessional.total_due.toFixed(2)}</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-neutral-500 font-mono text-[10px] uppercase mb-2 block px-1 tracking-widest">Valor a Ser Liquidado ({currencySymbol})</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        step="0.01"
                                        className={`w-full p-4 bg-black border-2 border-neutral-800 rounded-2xl text-white font-mono text-2xl focus:outline-none focus:border-green-500 transition-all shadow-lg placeholder:text-neutral-800`}
                                        placeholder="0.00"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-700 font-mono">OK</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-neutral-500 font-mono text-[10px] uppercase block px-1 tracking-widest">📅 Intervalo de Referência</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                            const start = firstDay.toISOString().split('T')[0];
                                            const end = lastDay.toISOString().split('T')[0];
                                            setPaymentStartDate(start);
                                            setPaymentEndDate(end);
                                            calculateAmountForDates(selectedProfessional.professional_id, start, end);
                                        }}
                                        className="py-2.5 rounded-xl text-[10px] font-bold uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all active:scale-95"
                                    >
                                        Este Mês
                                    </button>
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                                            const start = firstDay.toISOString().split('T')[0];
                                            const end = lastDay.toISOString().split('T')[0];
                                            setPaymentStartDate(start);
                                            setPaymentEndDate(end);
                                            calculateAmountForDates(selectedProfessional.professional_id, start, end);
                                        }}
                                        className="py-2.5 rounded-xl text-[10px] font-bold uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all active:scale-95"
                                    >
                                        Mês Passado
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="date"
                                        value={paymentStartDate}
                                        onChange={(e) => {
                                            setPaymentStartDate(e.target.value);
                                            calculateAmountForDates(selectedProfessional.professional_id, e.target.value, paymentEndDate);
                                        }}
                                        className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-neutral-500 outline-none transition-all"
                                        required
                                    />
                                    <input
                                        type="date"
                                        value={paymentEndDate}
                                        onChange={(e) => {
                                            setPaymentEndDate(e.target.value);
                                            calculateAmountForDates(selectedProfessional.professional_id, paymentStartDate, e.target.value);
                                        }}
                                        className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-neutral-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3">
                            <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />
                            <p className="text-blue-400 text-[11px] leading-snug">
                                <strong>Aviso:</strong> Este registro gerará uma saída no caixa (Despesa) e marcará as comissões do período como liquidadas.
                            </p>
                        </div>

                        <div className="mt-auto md:mt-8 pt-6 flex flex-col md:flex-row gap-3">
                            <BrutalButton
                                variant="secondary"
                                className="w-full h-12 rounded-2xl text-xs md:text-sm font-bold order-2 md:order-1 active:scale-95"
                                onClick={() => setShowPayModal(false)}
                            >
                                Abandonar
                            </BrutalButton>
                            <BrutalButton
                                variant="primary"
                                className="w-full h-12 rounded-2xl text-xs md:text-sm font-bold order-1 md:order-2 active:scale-95"
                                onClick={handlePayCommissions}
                                disabled={payingProfessionalId === selectedProfessional.professional_id}
                                icon={payingProfessionalId === selectedProfessional.professional_id ? <Loader2 className="animate-spin" /> : undefined}
                            >
                                {payingProfessionalId === selectedProfessional.professional_id ? 'Confirmando...' : 'Liquidar Agora'}
                            </BrutalButton>
                        </div>
                    </div>
                </div>

            )
            }

            {/* Professional Details Modal */}
            {
                showDetailsModal && detailsProfessional && (
                    <ProfessionalCommissionDetails
                        professionalId={detailsProfessional.professional_id}
                        professionalName={detailsProfessional.professional_name}
                        commissionRate={detailsProfessional.commission_rate}
                        onClose={() => {
                            setShowDetailsModal(false);
                            setDetailsProfessional(null);
                        }}
                        accentColor={accentColor}
                        currencySymbol={currencySymbol}
                    />
                )
            }

            {/* Payment History Modal */}
            {
                showHistoryModal && detailsProfessional && (
                    <CommissionPaymentHistory
                        professionalId={detailsProfessional.professional_id}
                        professionalName={detailsProfessional.professional_name}
                        onClose={() => {
                            setShowHistoryModal(false);
                            setDetailsProfessional(null);
                        }}
                        accentColor={accentColor}
                        currencySymbol={currencySymbol}
                    />
                )
            }
        </div >
    );
};
