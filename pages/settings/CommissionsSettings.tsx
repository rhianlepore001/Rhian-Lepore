import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useTeamMembers } from '../../hooks/useTeam';
import { useBusinessSettings } from '../../hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { SettingsLayout } from '../../components/SettingsLayout';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import {
    DollarSign, Calendar, Users, Percent, AlertCircle, Loader2, Check, CreditCard
} from 'lucide-react';

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
    const { user, companyId } = useAuth();
    const { data: rawMembers, isLoading: membersLoading } = useTeamMembers();
    const { data: settingsData } = useBusinessSettings();
    const queryClient = useQueryClient();
    const { accent, colors, classes, isBeauty } = useBrutalTheme();

    const teamMembers: TeamMember[] = (rawMembers ?? []).filter(m => m.active).map(m => ({
        id: m.id,
        name: m.name,
        photo_url: m.photo_url ?? undefined,
        commission_rate: m.commission_rate ?? m.commission_percent ?? 0,
        active: m.active,
        commission_payment_frequency: 'monthly' as const,
        commission_payment_day: 5,
    }));

    const [settlementDay, setSettlementDay] = useState<number | string>(5);
    const [saving, setSaving] = useState(false);
    const [editingMember, setEditingMember] = useState<string | null>(null);
    const [tempRates, setTempRates] = useState<Record<string, string>>({});

    const [machineFeeEnabled, setMachineFeeEnabled] = useState(false);
    const [debitFeePercent, setDebitFeePercent] = useState<string>('0');
    const [creditFeePercent, setCreditFeePercent] = useState<string>('0');
    const [savingMachineFee, setSavingMachineFee] = useState(false);

    const [editedMembers, setEditedMembers] = useState<Record<string, TeamMember>>({});

    useEffect(() => {
        const rates: Record<string, string> = {};
        const edited: Record<string, TeamMember> = {};
        teamMembers.forEach(member => {
            rates[member.id] = member.commission_rate?.toString() || '0';
            edited[member.id] = member;
        });
        setTempRates(rates);
        setEditedMembers(edited);
    }, [rawMembers]);

    const getMemberDisplay = (id: string): TeamMember => {
        return editedMembers[id] ?? teamMembers.find(m => m.id === id) ?? teamMembers.find(m => m.id === id)!;
    };

    useEffect(() => {
        if (settingsData) {
            setSettlementDay(settingsData.commission_settlement_day_of_month ?? 5);
            setMachineFeeEnabled(settingsData.machine_fee_enabled ?? false);
            setDebitFeePercent(String(settingsData.debit_fee_percent ?? 0));
            setCreditFeePercent(String(settingsData.credit_fee_percent ?? 0));
        }
    }, [settingsData]);

    const handleSaveSettlementDay = async () => {
        if (!user) return;
        setSaving(true);

        let day = typeof settlementDay === 'string' ? parseInt(settlementDay) : settlementDay;
        if (isNaN(day) || day < 1 || day > 31) {
            day = 5;
            setSettlementDay(5);
        }

        try {
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    user_id: companyId,
                    commission_settlement_day_of_month: day,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            alert('Dia de acerto salvo com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['settings', companyId, 'business'] });
        } catch (error) {
            console.error('Error saving settlement day:', error);
            alert('Erro ao salvar dia de acerto.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCommissionRate = async (memberId: string) => {
        setSaving(true);

        try {
            const rate = parseFloat(tempRates[memberId] || '0');

            if (isNaN(rate) || rate < 0 || rate > 100) {
                alert('A taxa deve ser entre 0% e 100%');
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
                .eq('user_id', companyId!);

            if (error) throw error;

            const { error: recalculateError } = await supabase.rpc('recalculate_pending_commissions', {
                p_professional_id: memberId,
                p_new_rate: rate
            });

            if (recalculateError) {
                console.error('Error recalculating commissions:', recalculateError);
            }

            setEditingMember(null);
            queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
            alert('Taxa de comissão atualizada!');
        } catch (error) {
            console.error('Error saving commission rate:', error);
            alert('Erro ao salvar taxa de comissão.');
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

    const handleSaveMachineFee = async () => {
        if (!user) return;

        const debit = parseFloat(debitFeePercent);
        const credit = parseFloat(creditFeePercent);

        if (isNaN(debit) || debit < 0 || debit > 100) {
            alert('Taxa débito deve ser entre 0% e 100%');
            return;
        }
        if (isNaN(credit) || credit < 0 || credit > 100) {
            alert('Taxa crédito deve ser entre 0% e 100%');
            return;
        }

        setSavingMachineFee(true);
        try {
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    user_id: companyId,
                    machine_fee_enabled: machineFeeEnabled,
                    debit_fee_percent: debit,
                    credit_fee_percent: credit,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (error) throw error;
            alert('Configurações de taxa salvas com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['settings', companyId, 'business'] });
        } catch (error) {
            console.error('Erro ao salvar taxa maquininha:', error);
            alert('Erro ao salvar configurações de taxa.');
        } finally {
            setSavingMachineFee(false);
        }
    };

    if (membersLoading && !settingsData) {
        return (
            <SettingsLayout>
                <div className="flex items-center justify-center py-12">
                    <div className={`text-lg ${accent.text}`}>Carregando configurações...</div>
                </div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout>
            <div className="space-y-6">
                <Card className={`border ${accent.border}`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 ${accent.bg} bg-opacity-10 rounded-lg`}>
                            <DollarSign className={`w-8 h-8 ${accent.text}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className={`${colors.text} font-heading text-xl uppercase mb-2`}>
                                Gestão de Comissões
                            </h3>
                            <p className={`${colors.textMuted} text-sm leading-relaxed`}>
                                Configure as taxas de comissão para cada profissional e defina o dia mensal para acerto de contas.
                                As comissões são calculadas automaticamente quando você marca um agendamento como concluído.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card title="Dia de Acerto Mensal">
                    <div className="space-y-4">
                        <p className={`${colors.textMuted} text-sm`}>
                            Escolha o dia do mês em que você faz o acerto de comissões com sua equipe.
                            Você receberá um alerta no dashboard 2 dias antes.
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 max-w-xs">
                                <label className={classes.label}>
                                    Dia do Mês (1-31)
                                </label>
                                <div className="relative">
                                    <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={settlementDay}
                                        onChange={(e) => setSettlementDay(e.target.value)}
                                        className={`${classes.input} pl-12 text-lg`}
                                    />
                                </div>
                                <p className={`${colors.textMuted} text-xs mt-1 font-mono`}>
                                    Próximo acerto: Dia {settlementDay} deste mês
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleSaveSettlementDay}
                                disabled={saving}
                                className="mt-6"
                            >
                                {saving ? 'Salvando...' : 'Salvar Dia'}
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Taxas de Comissão por Profissional">
                    {teamMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className={`w-12 h-12 ${colors.textMuted} mx-auto mb-3`} />
                            <p className={colors.textMuted}>
                                Nenhum profissional ativo encontrado. Adicione membros da equipe primeiro.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className={`${colors.textMuted} text-sm mb-4`}>
                                Defina a porcentagem de comissão que cada profissional recebe sobre os serviços realizados.
                            </p>

                            {teamMembers.map((member) => {
                                const isEditing = editingMember === member.id;
                                const displayMember = getMemberDisplay(member.id);
                                const currentRate = displayMember.commission_rate || 0;

                                return (
                                    <div
                                        key={member.id}
                                        className={`
                                            transition-all p-4 rounded-xl border
                                            ${isBeauty
                                                ? 'bg-beauty-dark/40 border-beauty-neon/20 hover:border-beauty-neon/50'
                                                : `${colors.inputBg} ${isEditing ? accent.border : colors.border} hover:border-white/10`
                                            }
                                        `}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 flex-1">
                                                {member.photo_url ? (
                                                    <img
                                                        src={member.photo_url}
                                                        alt={member.name}
                                                        className={`w-12 h-12 rounded-full object-cover border-2 ${colors.border}`}
                                                    />
                                                ) : (
                                                    <div className={`w-12 h-12 rounded-full ${colors.inputBg} border-2 ${colors.border} flex items-center justify-center`}>
                                                        <Users className={`w-6 h-6 ${colors.textMuted}`} />
                                                    </div>
                                                )}

                                                <div className="flex-1">
                                                    <h4 className={`${colors.text} font-bold text-lg`}>{member.name}</h4>
                                                    {!isEditing && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Percent className={`w-4 h-4 ${accent.text}`} />
                                                            <span className={`font-mono font-bold ${accent.text}`}>
                                                                {currentRate}% de comissão
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

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
                                                                className={`w-24 px-3 py-2 rounded-lg ${colors.text} font-mono text-center outline-none transition-all
                                                                    ${isBeauty
                                                                        ? 'bg-beauty-dark/60 border border-beauty-neon/50 focus:border-beauty-neon focus:shadow-neon'
                                                                        : `bg-black border-2 ${accent.border}`
                                                                    }
                                                                `}
                                                                autoFocus
                                                            />
                                                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${colors.textMuted} font-mono`}>
                                                                %
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                            <select
                                                                value={member.commission_payment_frequency || 'monthly'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value as 'weekly' | 'monthly';
                                                                    setEditedMembers(prev => ({
                                                                        ...prev,
                                                                        [member.id]: { ...prev[member.id], commission_payment_frequency: val, commission_payment_day: val === 'weekly' ? 1 : 5 }
                                                                    }));
                                                                }}
                                                                className={`${colors.inputBg} ${colors.text} text-xs p-2 rounded border ${colors.border} outline-none uppercase font-mono`}
                                                            >
                                                                <option value="monthly">Mensal</option>
                                                                <option value="weekly">Semanal</option>
                                                            </select>
                                                            <select
                                                                value={member.commission_payment_day || 5}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    setEditedMembers(prev => ({
                                                                        ...prev,
                                                                        [member.id]: { ...prev[member.id], commission_payment_day: val }
                                                                    }));
                                                                }}
                                                                className={`${colors.inputBg} ${colors.text} text-xs p-2 rounded border ${colors.border} outline-none uppercase font-mono`}
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
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleSaveCommissionRate(member.id)}
                                                            disabled={saving}
                                                            className="flex-1"
                                                            icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        >
                                                            {saving ? 'Salvando' : 'Salvar'}
                                                        </Button>

                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => handleCancelEdit(member.id)}
                                                            disabled={saving}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className={`text-xs uppercase font-mono ${colors.textMuted} whitespace-nowrap ${colors.inputBg} px-2 py-1 rounded`}>
                                                        {member.commission_payment_frequency === 'weekly' ? 'Semanal' : 'Mensal'} •
                                                        {member.commission_payment_frequency === 'weekly'
                                                            ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][member.commission_payment_day || 0]
                                                            : ` Dia ${member.commission_payment_day || 5}`
                                                        }
                                                    </div>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setEditingMember(member.id)}
                                                    >
                                                        Editar Perfil @ Comissões
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                <Card title="Taxa de Maquininha">
                    <div className="space-y-4">
                        <p className={`${colors.textMuted} text-sm`}>
                            Configure se a taxa de maquininha é repassada ao colaborador no cálculo da comissão.
                            Quando ativado, a comissão é calculada sobre o valor líquido (valor — taxa).
                        </p>

                        <div className={`
                            flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border
                            ${machineFeeEnabled
                                ? `${accent.bgDim} ${accent.borderDim}`
                                : `${colors.inputBg} ${colors.border}`
                            }
                        `}>
                            <SettingsSwitch
                                checked={machineFeeEnabled}
                                onChange={setMachineFeeEnabled}
                                ariaLabel="Repassar taxa ao colaborador?"
                            />
                            <div>
                                <span className={`${colors.text} font-bold block`}>Repassar taxa ao colaborador?</span>
                                <span className={`${colors.textMuted} text-xs`}>
                                    {machineFeeEnabled ? 'Ativado — comissão calculada sobre valor líquido' : 'Desativado — comissão sobre valor bruto'}
                                </span>
                            </div>
                        </div>

                        <div className={`grid grid-cols-2 gap-4 transition-opacity ${machineFeeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div>
                                <label className={classes.label}>
                                    Taxa Débito (%)
                                </label>
                                <div className="relative">
                                    <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.textMuted}`} />
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={debitFeePercent}
                                        onChange={e => setDebitFeePercent(e.target.value)}
                                        disabled={!machineFeeEnabled}
                                        className={`${classes.input} pl-10`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={classes.label}>
                                    Taxa Crédito (%)
                                </label>
                                <div className="relative">
                                    <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.textMuted}`} />
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={creditFeePercent}
                                        onChange={e => setCreditFeePercent(e.target.value)}
                                        disabled={!machineFeeEnabled}
                                        className={`${classes.input} pl-10`}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            onClick={handleSaveMachineFee}
                            disabled={savingMachineFee}
                            icon={savingMachineFee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        >
                            {savingMachineFee ? 'Salvando...' : 'Salvar Taxa'}
                        </Button>
                    </div>
                </Card>

                <Card className={`${colors.inputBg} ${colors.border}`}>
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className={`text-sm ${colors.textMuted} space-y-2`}>
                            <p className={`font-bold ${colors.text}`}>Como funciona:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Configure a taxa de comissão (%) para cada profissional</li>
                                <li>Quando você marca um agendamento como &quot;Concluído&quot;, a comissão é calculada automaticamente</li>
                                <li>Veja todas as comissões pendentes na aba &quot;Comissões&quot; do Financeiro</li>
                                <li>Registre os pagamentos para manter suas entradas e saídas atualizadas</li>
                            </ul>
                        </div>
                    </div>
                </Card>
            </div>
        </SettingsLayout>
    );
};
