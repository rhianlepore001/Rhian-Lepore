' dentro de um elemento de texto.">
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from './BrutalCard';
import { BrutalButton } from './BrutalButton';
import { User, DollarSign, Check, Loader2, X, Calendar, ChevronLeft, ChevronRight, Percent, History, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MonthYearSelector } from './MonthYearSelector';

interface CommissionDue {
    professional_id: string;
    professional_name: string;
    photo_url: string | null;
    commission_rate: number;
    total_due: number;
    total_pending_records: number;
}

interface CommissionRecord {
    id: string;
    appointment_id: string;
    revenue: number;
    commission_rate: number;
    commission_value: number;
    commission_paid: boolean;
    created_at: string;
    service_name: string;
    client_name: string;
}

interface ProfessionalDetails {
    summary: {
        total_revenue: number;
        total_commission_earned: number;
        total_commission_paid: number;
        total_commission_due: number;
    };
    records: CommissionRecord[];
}

interface CommissionsManagementProps {
    accentColor: string;
    currencySymbol: string;
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const CommissionsManagement: React.FC<CommissionsManagementProps> = ({ accentColor, currencySymbol }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState<CommissionDue[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingProfessionalId, setPayingProfessionalId] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<CommissionDue | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [paymentEndDate, setPaymentEndDate] = useState('');

    // State for detailed view
    const [activeProfessionalId, setActiveProfessionalId] = useState<string | null>(null);
    const [professionalDetails, setProfessionalDetails] = useState<ProfessionalDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Month/Year selection for details view
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const isBeauty = accentColor === 'beauty-neon';

    // --- Fetching Data ---

    useEffect(() => {
        fetchCommissionsDue();
    }, [user]);

    useEffect(() => {
        if (activeProfessionalId) {
            fetchProfessionalDetails(activeProfessionalId, selectedMonth, selectedYear);
        }
    }, [activeProfessionalId, selectedMonth, selectedYear]);

    const fetchCommissionsDue = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch all active team members with their commission rate
            const { data: teamMembersData, error: teamError } = await supabase
                .from('team_members')
                .select('id, name, photo_url, commission_rate')
                .eq('user_id', user.id)
                .eq('active', true)
                .order('name');

            if (teamError) throw teamError;

            // 2. Fetch commissions due (RPC)
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_commissions_due', { p_user_id: user.id });

            if (rpcError) console.error('Error fetching RPC data:', rpcError);

            // 3. Merge data
            const mergedData: CommissionDue[] = (teamMembersData || []).map(member => {
                const commissionRecord = (rpcData || []).find((r: any) => r.professional_id === member.id);

                return {
                    professional_id: member.id,
                    professional_name: member.name,
                    photo_url: member.photo_url,
                    commission_rate: (member.commission_rate * 100) || 0, // Convert to percentage
                    total_due: commissionRecord?.total_due || 0,
                    total_pending_records: commissionRecord?.total_records || 0
                };
            });

            setTeamMembers(mergedData);
        } catch (error) {
            console.error('Error fetching commissions due:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfessionalDetails = async (professionalId: string, month: number, year: number) => {
        if (!user) return;
        setDetailsLoading(true);

        try {
            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0);

            const startDateParam = startOfMonth.toISOString().split('T')[0];
            const endDateParam = endOfMonth.toISOString().split('T')[0];

            const { data, error } = await supabase.rpc('get_professional_commission_details', {
                p_user_id: user.id,
                p_professional_id: professionalId,
                p_start_date: startDateParam,
                p_end_date: endDateParam
            });

            if (error) throw error;
            setProfessionalDetails(data);

        } catch (error) {
            console.error('Error fetching professional details:', error);
            setProfessionalDetails(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    // --- Handlers ---

    const handleOpenPayModal = (professional: CommissionDue) => {
        setSelectedProfessional(professional);
        setPaymentAmount(professional.total_due.toFixed(2));
        
        // Set default dates for the current month
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setPaymentStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        setPaymentEndDate(lastDayOfMonth.toISOString().split('T')[0]);
        
        setShowPayModal(true);
    };

    const handlePayCommissions = async () => {
        if (!user || !selectedProfessional || !paymentAmount || !paymentStartDate || !paymentEndDate) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

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

            alert(`Comissão de ${selectedProfessional.professional_name} paga com sucesso!`);
            setShowPayModal(false);
            setSelectedProfessional(null);
            fetchCommissionsDue(); // Refresh the main list
            if (activeProfessionalId) {
                fetchProfessionalDetails(activeProfessionalId, selectedMonth, selectedYear); // Refresh details if open
            }
        } catch (error: any) {
            console.error('Error paying commissions:', error);
            alert(`Erro ao registrar pagamento de comissão: ${error.message || JSON.stringify(error)}`);
        } finally {
            setPayingProfessionalId(null);
        }
    };

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month);
        setSelectedYear(year);
    };

    // --- Render Functions ---

    const renderProfessionalCard = (professional: CommissionDue) => {
        const isActive = activeProfessionalId === professional.professional_id;
        const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
        const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

        return (
            <div
                key={professional.professional_id}
                className={`bg-[#111] border-2 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all cursor-pointer
                    ${isActive ? `border-${accentColor}` : 'border-neutral-800 hover:border-neutral-700'}
                `}
                onClick={() => setActiveProfessionalId(isActive ? null : professional.professional_id)}
            >
                {/* Professional Info */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {professional.photo_url ? (
                        <img
                            src={professional.photo_url}
                            alt={professional.professional_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-neutral-700"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-neutral-500" />
                        </div>
                    )}

                    <div>
                        <h4 className="text-white font-bold text-lg leading-tight">{professional.professional_name}</h4>
                        <p className="text-neutral-400 text-xs font-mono mt-1 flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            <span className={accentText}>{professional.commission_rate.toFixed(1)}%</span> de Comissão
                        </p>
                    </div>
                </div>

                {/* Due Amount & Actions */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right mr-2">
                        <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">A Pagar:</p>
                        <span className={`text-xl font-bold font-mono ${professional.total_due > 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                            {currencySymbol} {professional.total_due.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <BrutalButton
                            variant="secondary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate('/configuracoes/comissoes'); }}
                        >
                            Config
                        </BrutalButton>

                        <BrutalButton
                            variant="primary"
                            size="sm"
                            icon={payingProfessionalId === professional.professional_id ? <Loader2 className="animate-spin" /> : <DollarSign />}
                            onClick={(e) => { e.stopPropagation(); handleOpenPayModal(professional); }}
                            disabled={payingProfessionalId === professional.professional_id || professional.total_due <= 0}
                            className={professional.total_due <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {payingProfessionalId === professional.professional_id ? '...' : 'Pagar'}
                        </BrutalButton>
                    </div>
                </div>
            </div>
        );
    };

    const renderDetailsView = () => {
        if (!activeProfessionalId) return null;

        const professional = teamMembers.find(m => m.professional_id === activeProfessionalId);
        if (!professional) return null;

        const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

        return (
            <BrutalCard title={`Detalhes de Ganhos - ${professional.professional_name}`} className="mt-6">
                <div className="space-y-6">
                    <MonthYearSelector
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        onChange={handleMonthChange}
                        accentColor={accentColor}
                    />

                    {detailsLoading ? (
                        <div className="text-center py-12 text-neutral-500">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                            Carregando detalhes de {MONTH_NAMES[selectedMonth]}...
                        </div>
                    ) : professionalDetails ? (
                        <>
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
                                    <p className="text-xs font-mono text-neutral-500 uppercase">Receita Total</p>
                                    <p className="text-lg font-bold text-white">{currencySymbol} {professionalDetails.summary.total_revenue.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
                                    <p className="text-xs font-mono text-neutral-500 uppercase">Comissão Ganhada</p>
                                    <p className={`text-lg font-bold ${accentText}`}>{currencySymbol} {professionalDetails.summary.total_commission_earned.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
                                    <p className="text-xs font-mono text-neutral-500 uppercase">Comissão Paga</p>
                                    <p className="text-lg font-bold text-green-500">{currencySymbol} {professionalDetails.summary.total_commission_paid.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
                                    <p className="text-xs font-mono text-neutral-500 uppercase">A Receber</p>
                                    <p className="text-lg font-bold text-red-500">{currencySymbol} {professionalDetails.summary.total_commission_due.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Detailed Records */}
                            <h4 className="text-white font-heading text-lg uppercase border-b border-neutral-800 pb-2">
                                Serviços Detalhados
                            </h4>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {professionalDetails.records.length === 0 ? (
                                    <div className="text-center py-8 text-neutral-500">
                                        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        Nenhum serviço registrado neste período.
                                    </div>
                                ) : (
                                    professionalDetails.records.map(record => (
                                        <div key={record.id} className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-bold text-sm">{record.service_name}</p>
                                                <p className="text-neutral-400 text-xs">Cliente: {record.client_name}</p>
                                                <p className="text-neutral-500 text-xs font-mono">
                                                    {new Date(record.created_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-mono text-neutral-500">Comissão ({record.commission_rate.toFixed(1)}%)</p>
                                                <p className={`text-lg font-bold ${accentText}`}>
                                                    {currencySymbol} {record.commission_value.toFixed(2)}
                                                </p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${record.commission_paid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {record.commission_paid ? 'PAGO' : 'PENDENTE'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-neutral-500">
                            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            Selecione um período para ver os detalhes.
                        </div>
                    )}
                </div>
            </BrutalCard>
        );
    };

    // --- Main Component Render ---

    return (
        <div className="space-y-6">
            <BrutalCard title="Comissões a Pagar">
                <p className="text-neutral-400 text-sm mb-6">
                    Clique em um profissional para ver o histórico detalhado de ganhos por mês.
                </p>

                {loading ? (
                    <div className="text-center py-12 text-neutral-500">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                        Carregando profissionais...
                    </div>
                ) : teamMembers.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500 bg-neutral-900/50 rounded-lg border border-neutral-800">
                        <User className="w-10 h-10 mx-auto mb-3 text-neutral-600" />
                        <p className="text-lg font-medium text-white">Nenhum profissional ativo</p>
                        <p className="text-sm">{'Adicione membros da equipe em Configurações > Equipe.'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {teamMembers.map(renderProfessionalCard)}
                    </div>
                )}
            </BrutalCard>

            {/* Detailed View */}
            {renderDetailsView()}

            {/* Pay Commission Modal */}
            {showPayModal && selectedProfessional && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-heading text-xl uppercase flex items-center gap-2">
                                <DollarSign className={`w-6 h-6 ${accentColor}`} />
                                Registrar Pagamento
                            </h3>
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-neutral-800 rounded-full"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mb-6 p-3 bg-black/30 rounded-lg border border-neutral-800">
                            {selectedProfessional.photo_url ? (
                                <img
                                    src={selectedProfessional.photo_url}
                                    alt={selectedProfessional.professional_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                                    <User className="w-5 h-5 text-neutral-500" />
                                </div>
                            )}
                            <div>
                                <p className="text-white font-bold">{selectedProfessional.professional_name}</p>
                                <p className="text-xs text-neutral-400">Total pendente: {currencySymbol} {selectedProfessional.total_due.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-neutral-400 font-mono text-xs uppercase mb-2 block">Valor Pago ({currencySymbol})</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    step="0.01"
                                    className={`w-full p-3 bg-black border border-neutral-700 rounded-lg text-white font-mono text-lg focus:outline-none focus:border-${accentColor} transition-colors`}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-neutral-400 font-mono text-xs uppercase mb-2 block">Período de Referência (Início)</label>
                                    <input
                                        type="date"
                                        value={paymentStartDate}
                                        onChange={(e) => setPaymentStartDate(e.target.value)}
                                        className={`w-full p-3 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-${accentColor} transition-colors`}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-neutral-400 font-mono text-xs uppercase mb-2 block">Período de Referência (Fim)</label>
                                    <input
                                        type="date"
                                        value={paymentEndDate}
                                        onChange={(e) => setPaymentEndDate(e.target.value)}
                                        className={`w-full p-3 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-${accentColor} transition-colors`}
                                        required
                                    />
                                </div>
                            </div>
                            <p className="text-neutral-500 text-xs pt-1">
                                *Este pagamento marcará todas as comissões pendentes entre as datas selecionadas como pagas e registrará uma despesa.
                            </p>

                            <div className="flex gap-3 pt-6">
                                <BrutalButton
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowPayModal(false)}
                                >
                                    Cancelar
                                </BrutalButton>
                                <BrutalButton
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handlePayCommissions}
                                    disabled={payingProfessionalId === selectedProfessional.professional_id}
                                >
                                    {payingProfessionalId === selectedProfessional.professional_id ? 'Registrando...' : 'Confirmar Pagamento'}
                                </BrutalButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};