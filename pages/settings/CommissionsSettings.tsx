import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import { SettingsLayout } from '../../components/SettingsLayout';
import { DollarSign, Calendar, Users, TrendingUp, Percent, AlertCircle, Loader2, Check } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    photo_url?: string;
    commission_rate: number | null;
    active: boolean;
    commission_payment_frequency?: 'weekly' | 'monthly';
    commission_payment_day?: number;
}

export const CommissionsSettings: React.FC = () => {
    const { user, userType } = useAuth();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [settlementDay, setSettlementDay] = useState<number | string>(5);
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
                .select('id, name, photo_url, commission_rate, active, commission_payment_frequency, commission_payment_day')
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

        let day = typeof settlementDay === 'string' ? parseInt(settlementDay) : settlementDay;
        if (isNaN(day) || day < 1 || day > 31) {
            day = 5; // Default fallback
            setSettlementDay(5);
        }

        try {
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    user_id: user.id,
                    commission_settlement_day_of_month: day,
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

            const member = teamMembers.find(m => m.id === memberId);
            const { error } = await supabase
                .from('team_members')
                .update({
                    commission_rate: rate,
                    commission_payment_frequency: member?.commission_payment_frequency || 'monthly',
                    commission_payment_day: member?.commission_payment_day || 5,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memberId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Recalculate pending commissions in finance_records
            const { error: recalculateError } = await supabase.rpc('recalculate_pending_commissions', {
                p_professional_id: memberId,
                p_new_rate: rate
            });

            if (recalculateError) {
                console.error('Error recalculating commissions:', recalculateError);
                // We don't block the user as the rate was updated, but log it
            }

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
            <SettingsLayout>
                <div className="flex items-center justify-center py-12">
                    <div className={`text-lg ${accentText}`}>Carregando configurações...</div>
                </div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout>
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
                                        onChange={(e) => setSettlementDay(e.target.value)}
                                        className={`w-full pl-12 pr-4 py-3 rounded-lg text-white font-mono text-lg outline-none transition-all
                                            ${isBeauty
                                                ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon focus:shadow-neon'
                                                : `bg-neutral-900 border-2 border-neutral-700 focus:border-${accentColor}`}
                                        `}
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
                                        className={`transition-all p-4 rounded-lg
                                            ${isBeauty
                                                ? 'bg-beauty-dark/40 border border-beauty-neon/20 hover:border-beauty-neon/50'
                                                : `bg-neutral-900 border-2 ${isEditing ? `border-${accentColor}` : 'border-neutral-800 hover:border-neutral-700'}`}
                                        `}
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
                                                <div className="flex flex-col gap-4 w-full md:w-auto">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.5"
                                                                value={tempRates[member.id]}
                                                                onChange={(e) => setTempRates(prev => ({
                                                                    ...prev,
                                                                    [member.id]: e.target.value
                                                                }))}
                                                                className={`w-24 px-3 py-2 rounded-lg text-white font-mono text-center outline-none transition-all
                                                                    ${isBeauty
                                                                        ? 'bg-beauty-dark/60 border border-beauty-neon/50 focus:border-beauty-neon focus:shadow-neon'
                                                                        : `bg-black border-2 border-${accentColor}`}
                                                                `}
                                                                autoFocus
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">
                                                                %
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                            <select
                                                                value={member.commission_payment_frequency || 'monthly'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value as 'weekly' | 'monthly';
                                                                    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, commission_payment_frequency: val, commission_payment_day: val === 'weekly' ? 1 : 5 } : m));
                                                                }}
                                                                className="bg-neutral-800 text-white text-[10px] p-2 rounded border border-neutral-700 outline-none uppercase font-mono"
                                                            >
                                                                <option value="monthly">Mensal</option>
                                                                <option value="weekly">Semanal</option>
                                                            </select>
                                                            <select
                                                                value={member.commission_payment_day || 5}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, commission_payment_day: val } : m));
                                                                }}
                                                                className="bg-neutral-800 text-white text-[10px] p-2 rounded border border-neutral-700 outline-none uppercase font-mono"
                                                            >
                                                                {member.commission_payment_frequency === 'weekly' ? (
                                                                    <>
                                                                        <option value={1}>Segunda</option>
                                                                        <option value={2}>Terça</option>
                                                                        <option value={3}>Quarta</option>
                                                                        <option value={4}>Quinta</option>
                                                                        <option value={5}>Sexta</option>
                                                                        <option value={6}>Sábado</option>
                                                                        <option value={0}>Domingo</option>
                                                                    </>
                                                                ) : (
                                                                    Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                                        <option key={day} value={day}>Dia {day}</option>
                                                                    ))
                                                                )}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <BrutalButton
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleSaveCommissionRate(member.id)}
                                                            disabled={saving}
                                                            className="flex-1"
                                                            icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        >
                                                            {saving ? 'Salvando' : 'Salvar'}
                                                        </BrutalButton>

                                                        <BrutalButton
                                                            variant="secondary"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => handleCancelEdit(member.id)}
                                                            disabled={saving}
                                                        >
                                                            Cancelar
                                                        </BrutalButton>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="text-[9px] uppercase font-mono text-neutral-500 whitespace-nowrap bg-white/5 px-2 py-1 rounded">
                                                        {member.commission_payment_frequency === 'weekly' ? 'Semanal' : 'Mensal'} •
                                                        {member.commission_payment_frequency === 'weekly'
                                                            ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][member.commission_payment_day || 0]
                                                            : ` Dia ${member.commission_payment_day || 5}`
                                                        }
                                                    </div>
                                                    <BrutalButton
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setEditingMember(member.id)}
                                                    >
                                                        Editar Perfil @ Comissões
                                                    </BrutalButton>
                                                </div>
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
                                <li>Quando você marca um agendamento como &quot;Concluído&quot;, a comissão é calculada automaticamente</li>
                                <li>Veja todas as comissões pendentes na aba &quot;Comissões&quot; do Financeiro</li>
                                <li>Registre os pagamentos para manter seu fluxo de caixa atualizado</li>
                            </ul>
                        </div>
                    </div>
                </BrutalCard>
            </div>
        </SettingsLayout>
    );
};
