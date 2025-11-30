import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from './BrutalCard';
import { BrutalButton } from './BrutalButton';
import { User, DollarSign, Check, Loader2, Calendar } from 'lucide-react';

interface CommissionDue {
    professional_id: string;
    professional_name: string;
    total_due: number;
    total_records: number;
}

interface CommissionsManagementProps {
    accentColor: string;
    currencySymbol: string;
}

export const CommissionsManagement: React.FC<CommissionsManagementProps> = ({ accentColor, currencySymbol }) => {
    const { user } = useAuth();
    const [commissionsDue, setCommissionsDue] = useState<CommissionDue[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingProfessionalId, setPayingProfessionalId] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<CommissionDue | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [paymentEndDate, setPaymentEndDate] = useState('');

    useEffect(() => {
        fetchCommissionsDue();
    }, [user]);

    const fetchCommissionsDue = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_commissions_due', { p_user_id: user.id });
            if (error) throw error;
            setCommissionsDue(data || []);
        } catch (error) {
            console.error('Error fetching commissions due:', error);
        } finally {
            setLoading(false);
        }
    };

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
            fetchCommissionsDue(); // Refresh the list
        } catch (error) {
            console.error('Error paying commissions:', error);
            alert('Erro ao registrar pagamento de comissão.');
        } finally {
            setPayingProfessionalId(null);
        }
    };

    return (
        <div className="space-y-6">
            <BrutalCard title="Comissões a Pagar">
                <p className="text-neutral-400 text-sm mb-4">
                    Gerencie as comissões devidas aos seus profissionais. Registre os pagamentos para manter seu fluxo de caixa atualizado.
                </p>

                {loading ? (
                    <div className="text-center py-8 text-neutral-500">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                        Carregando comissões...
                    </div>
                ) : commissionsDue.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                        <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        Nenhuma comissão pendente no momento.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {commissionsDue.map(professional => (
                            <div key={professional.professional_id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <User className={`w-6 h-6 ${accentColor}`} />
                                    <div>
                                        <h4 className="text-white font-bold">{professional.professional_name}</h4>
                                        <p className="text-neutral-400 text-xs">{professional.total_records} serviços pendentes</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-lg font-bold ${accentColor}`}>
                                        {currencySymbol} {professional.total_due.toFixed(2)}
                                    </span>
                                    <BrutalButton
                                        variant="primary"
                                        size="sm"
                                        icon={payingProfessionalId === professional.professional_id ? <Loader2 className="animate-spin" /> : <DollarSign />}
                                        onClick={() => handleOpenPayModal(professional)}
                                        disabled={payingProfessionalId === professional.professional_id}
                                    >
                                        {payingProfessionalId === professional.professional_id ? 'Pagando...' : 'Pagar'}
                                    </BrutalButton>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </BrutalCard>

            {/* Pay Commission Modal */}
            {showPayModal && selectedProfessional && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-heading text-xl uppercase">
                                Pagar Comissão: {selectedProfessional.professional_name}
                            </h3>
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-white font-mono text-sm mb-2 block">Valor a Pagar ({currencySymbol})</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    step="0.01"
                                    className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white font-mono text-sm mb-2 block">Período Início</label>
                                    <input
                                        type="date"
                                        value={paymentStartDate}
                                        onChange={(e) => setPaymentStartDate(e.target.value)}
                                        className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-white font-mono text-sm mb-2 block">Período Fim</label>
                                    <input
                                        type="date"
                                        value={paymentEndDate}
                                        onChange={(e) => setPaymentEndDate(e.target.value)}
                                        className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
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
                                    {payingProfessionalId === selectedProfessional.professional_id ? 'Registrando...' : 'Registrar Pagamento'}
                                </BrutalButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};