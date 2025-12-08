import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import { DollarSign, Calendar, Users, TrendingUp, Percent, AlertCircle } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    photo_url?: string;
    commission_rate: number | null;
    active: boolean;
}

export const CommissionsSettings: React.FC = () => {
    const { user, userType } = useAuth();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [settlementDay, setSettlementDay] = useState<number>(5);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingMember, setEditingMember] = useState<string | null>(null);
    const [tempRates, setTempRates] = useState<Record<string, string>>({});

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const accentBorder = isBeauty ? 'border-beauty-neon' : 'border-accent-gold';

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Fetch team members
            const { data: membersData, error: membersError } = await supabase
                .from('team_members')
                .select('id, name, photo_url, commission_rate, active')
                .eq('user_id', user.id)
                .eq('active', true)
                .order('name');

            if (membersError) throw membersError;
            setTeamMembers(membersData || []);

            // Initialize temp rates
            const rates: Record<string, string> = {};
            membersData?.forEach(member => {
                rates[member.id] = member.commission_rate?.toString() || '0';
            });
            setTempRates(rates);

            // Fetch business settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('business_settings')
                .select('commission_settlement_day_of_month')
                .eq('user_id', user.id)
                .single();

            if (!settingsError && settingsData?.commission_settlement_day_of_month) {
                setSettlementDay(settingsData.commission_settlement_day_of_month);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettlementDay = async () => {
        if (!user) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    user_id: user.id,
                    commission_settlement_day_of_month: settlementDay,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;
            alert('✅ Dia de acerto salvo com sucesso!');
        } catch (error) {
            console.error('Error saving settlement day:', error);
            alert('❌ Erro ao salvar dia de acerto.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCommissionRate = async (memberId: string) => {
        setSaving(true);

        try {
            const rate = parseFloat(tempRates[memberId] || '0');

            if (isNaN(rate) || rate < 0 || rate > 100) {
                alert('⚠️ A taxa deve ser entre 0% e 100%');
                return;
            }

            const { error } = await supabase
                .from('team_members')
                .update({
                    commission_rate: rate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memberId);

            if (error) throw error;

            // Update local state
            setTeamMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, commission_rate: rate } : m
            ));

            setEditingMember(null);
            alert('✅ Taxa de comissão atualizada!');
        } catch (error) {
            console.error('Error saving commission rate:', error);
            alert('❌ Erro ao salvar taxa de comissão.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = (memberId: string) => {
        const member = teamMembers.find(m => m.id === memberId);
        if (member) {
            setTempRates(prev => ({
                ...prev,
                [memberId]: member.commission_rate?.toString() || '0'
            }));
        }
        setEditingMember(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className={`text-lg ${accentText}`}>Carregando configurações...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Info */}
            <BrutalCard className={`border-l-4 ${accentBorder}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 ${accentBg} bg-opacity-10 rounded-lg`}>
                        <DollarSign className={`w-8 h-8 ${accentText}`} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-heading text-xl uppercase mb-2">
                            Gestão de Comissões
                        </h3>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                            Configure as taxas de comissão para cada profissional e defina o dia mensal para acerto de contas.
                            As comissões são calculadas automaticamente quando você marca um agendamento como concluído.
                        </p>
                    </div>
                </div>
            </BrutalCard>

            {/* Settlement Day Configuration */}
            <BrutalCard title="📅 Dia de Acerto Mensal">
                <div className="space-y-4">
                    <p className="text-neutral-400 text-sm">
                        Escolha o dia do mês em que você faz o acerto de comissões com sua equipe.
                        Você receberá um alerta no dashboard 2 dias antes.
                    </p>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xs">
                            <label className="block text-white font-mono text-sm mb-2">
                                Dia do Mês (1-31)
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={settlementDay}
                                    onChange={(e) => setSettlementDay(parseInt(e.target.value) || 1)}
                                    className={`w-full pl-12 pr-4 py-3 bg-neutral-900 border-2 border-neutral-700 rounded-lg text-white font-mono text-lg focus:outline-none focus:border-${accentColor} transition-colors`}
                                />
                            </div>
                            <p className="text-neutral-500 text-xs mt-1 font-mono">
                                Próximo acerto: Dia {settlementDay} deste mês
                            </p>
                        </div>

                        <BrutalButton
                            variant="primary"
                            onClick={handleSaveSettlementDay}
                            disabled={saving}
                            className="mt-6"
                        >
                            {saving ? 'Salvando...' : 'Salvar Dia'}
                        </BrutalButton>
                    </div>
                </div>
            </BrutalCard>

            {/* Team Members Commission Rates */}
            <BrutalCard title="👥 Taxas de Comissão por Profissional">
                {teamMembers.length === 0 ? (
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                        <p className="text-neutral-400">
                            Nenhum profissional ativo encontrado. Adicione membros da equipe primeiro.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-neutral-400 text-sm mb-4">
                            Defina a porcentagem de comissão que cada profissional recebe sobre os serviços realizados.
                        </p>

                        {teamMembers.map((member) => {
                            const isEditing = editingMember === member.id;
                            const currentRate = member.commission_rate || 0;

                            return (
                                <div
                                    key={member.id}
                                    className={`bg-neutral-900 border-2 rounded-lg p-4 transition-all ${isEditing
                                        ? `border-${accentColor}`
                                        : 'border-neutral-800 hover:border-neutral-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        {/* Professional Info */}
                                        <div className="flex items-center gap-3 flex-1">
                                            {member.photo_url ? (
                                                <img
                                                    src={member.photo_url}
                                                    alt={member.name}
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-neutral-700"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
                                                    <Users className="w-6 h-6 text-neutral-500" />
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <h4 className="text-white font-bold text-lg">{member.name}</h4>
                                                {!isEditing && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Percent className={`w-4 h-4 ${accentText}`} />
                                                        <span className={`font-mono font-bold ${accentText}`}>
                                                            {currentRate}% de comissão
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Edit Controls */}
                                        {isEditing ? (
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                        value={tempRates[member.id] || '0'}
                                                        onChange={(e) => setTempRates(prev => ({
                                                            ...prev,
                                                            [member.id]: e.target.value
                                                        }))}
                                                        className={`w-24 px-3 py-2 bg-black border-2 border-${accentColor} rounded-lg text-white font-mono text-center focus:outline-none`}
                                                        autoFocus
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">
                                                        %
                                                    </span>
                                                </div>

                                                <BrutalButton
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleSaveCommissionRate(member.id)}
                                                    disabled={saving}
                                                >
                                                    Salvar
                                                </BrutalButton>

                                                <BrutalButton
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleCancelEdit(member.id)}
                                                    disabled={saving}
                                                >
                                                    Cancelar
                                                </BrutalButton>
                                            </div>
                                        ) : (
                                            <BrutalButton
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setEditingMember(member.id)}
                                            >
                                                Editar Taxa
                                            </BrutalButton>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </BrutalCard>

            {/* Help Card */}
            <BrutalCard className="bg-neutral-900/50 border-neutral-800">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-neutral-400 space-y-2">
                        <p className="font-bold text-white">💡 Como funciona:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Configure a taxa de comissão (%) para cada profissional</li>
                            <li>Quando você marca um agendamento como "Concluído", a comissão é calculada automaticamente</li>
                            <li>Veja todas as comissões pendentes na aba "Comissões" do Financeiro</li>
                            <li>Registre os pagamentos para manter seu fluxo de caixa atualizado</li>
                        </ul>
                    </div>
                </div>
            </BrutalCard>
        </div>
    );
};
