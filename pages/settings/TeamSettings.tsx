import React, { useEffect, useState } from 'react';
import { Card, Button, ConfirmModal, useToast } from '../../components/ui';
import { SettingsLayout } from '../../components/SettingsLayout';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import {
    Plus, Users, ShieldCheck, UserCheck, Calendar, CreditCard, Check, Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useTeamMembers, useDeleteTeamMember } from '../../hooks/useTeam';
import { useBusinessSettings } from '../../hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { TeamMemberCard, type CommissionDraft } from '../../components/TeamMemberCard';
import { TeamMemberForm } from '../../components/TeamMemberForm';
import { supabase } from '../../lib/supabase';

export const TeamSettings: React.FC = () => {
    const { companyId } = useAuth();
    const { accent, colors, classes } = useBrutalTheme();
    const queryClient = useQueryClient();
    const { data: members = [], isLoading: loading } = useTeamMembers();
    const { data: settingsData } = useBusinessSettings();
    const deleteMemberMutation = useDeleteTeamMember();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const { showToast } = useToast();

    const [settlementDay, setSettlementDay] = useState<number | string>(5);
    const [savingSettlement, setSavingSettlement] = useState(false);
    const [machineFeeEnabled, setMachineFeeEnabled] = useState(false);
    const [debitFeePercent, setDebitFeePercent] = useState('0');
    const [creditFeePercent, setCreditFeePercent] = useState('0');
    const [savingMachineFee, setSavingMachineFee] = useState(false);

    useEffect(() => {
        if (!settingsData) return;
        setSettlementDay(settingsData.commission_settlement_day_of_month ?? 5);
        setMachineFeeEnabled(settingsData.machine_fee_enabled ?? false);
        setDebitFeePercent(String(settingsData.debit_fee_percent ?? 0));
        setCreditFeePercent(String(settingsData.credit_fee_percent ?? 0));
    }, [settingsData]);

    const cardMembers = members.map(m => ({
        ...m,
        photo_url: m.photo_url ?? null,
        commission_rate: m.commission_rate ?? m.commission_percent ?? 0,
    }));

    const handleDelete = (id: string) => {
        setPendingDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            await deleteMemberMutation.mutateAsync(pendingDeleteId);
            showToast('Profissional excluído.', 'success');
        } catch {
            showToast('Não foi possível excluir o profissional. Tente de novo.', 'error');
        } finally {
            setPendingDeleteId(null);
        }
    };

    const handleSaveCommission = async (memberId: string, draft: CommissionDraft) => {
        if (!companyId) return;
        try {
            const { error } = await supabase
                .from('team_members')
                .update({
                    commission_rate: draft.rate,
                    commission_percent: draft.rate,
                    commission_payment_frequency: draft.frequency,
                    commission_payment_day: draft.day,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', memberId)
                .eq('user_id', companyId);
            if (error) throw error;

            const { error: recalculateError } = await supabase.rpc('recalculate_pending_commissions', {
                p_professional_id: memberId,
                p_new_rate: draft.rate,
            });
            if (recalculateError) {
                console.error('Error recalculating commissions:', recalculateError);
                showToast('Taxa salva, mas houve erro ao recalcular comissões pendentes.', 'warning');
            } else {
                showToast('Comissão atualizada!', 'success');
            }
            queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
        } catch (error) {
            console.error('Error saving commission:', error);
            showToast('Não foi possível salvar a comissão. Tente de novo.', 'error');
            throw error;
        }
    };

    const handleSaveSettlementDay = async () => {
        if (!companyId) return;
        setSavingSettlement(true);
        let day = typeof settlementDay === 'string' ? parseInt(settlementDay, 10) : settlementDay;
        if (Number.isNaN(day) || day < 1 || day > 31) {
            day = 5;
            setSettlementDay(5);
        }
        try {
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    user_id: companyId,
                    commission_settlement_day_of_month: day,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            if (error) throw error;
            showToast('Dia de lembrete salvo!', 'success');
            queryClient.invalidateQueries({ queryKey: ['settings', companyId, 'business'] });
        } catch (error) {
            console.error('Error saving settlement day:', error);
            showToast('Não foi possível salvar o dia de acerto. Tente de novo.', 'error');
        } finally {
            setSavingSettlement(false);
        }
    };

    const handleSaveMachineFee = async () => {
        if (!companyId) return;
        const debit = parseFloat(debitFeePercent);
        const credit = parseFloat(creditFeePercent);
        if (Number.isNaN(debit) || debit < 0 || debit > 100) {
            showToast('A taxa de débito deve ser entre 0% e 100%.', 'warning');
            return;
        }
        if (Number.isNaN(credit) || credit < 0 || credit > 100) {
            showToast('A taxa de crédito deve ser entre 0% e 100%.', 'warning');
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
            showToast('Taxas da maquininha salvas!', 'success');
            queryClient.invalidateQueries({ queryKey: ['settings', companyId, 'business'] });
        } catch (error) {
            console.error('Erro ao salvar taxa maquininha:', error);
            showToast('Não foi possível salvar as taxas da maquininha. Tente de novo.', 'error');
        } finally {
            setSavingMachineFee(false);
        }
    };

    const owners = cardMembers.filter(m => m.is_owner);
    const staff = cardMembers.filter(m => !m.is_owner);

    return (
        <SettingsLayout>
            <div className="w-full space-y-8 pb-20">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <p className={`text-sm ${colors.textMuted} max-w-xl`}>
                        Cadastre a equipe, defina a comissão de cada colaborador e escolha a frequência de acerto — tudo no mesmo lugar.
                    </p>
                    <Button
                        id="btn-add-team-member"
                        className="shrink-0 self-start sm:self-auto"
                        icon={<Plus className="w-5 h-5" />}
                        onClick={() => {
                            setEditingMember(null);
                            setIsModalOpen(true);
                        }}
                    >
                        Adicionar profissional
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className={`animate-spin h-10 w-10 border-4 border-t-transparent ${accent.border} rounded-full`} />
                    </div>
                ) : cardMembers.length === 0 ? (
                    <Card className="p-12 text-center border-dashed">
                        <div className={`w-20 h-20 ${colors.inputBg} rounded-2xl flex items-center justify-center mx-auto mb-6 border ${colors.border}`}>
                            <UserCheck className="w-10 h-10 text-[var(--color-text-muted)]" />
                        </div>
                        <h3 className={`text-2xl font-heading ${colors.text} uppercase mb-3`}>
                            Comece sua equipe
                        </h3>
                        <p className={`${colors.textMuted} mb-8 max-w-sm mx-auto font-medium`}>
                            Você ainda não cadastrou nenhum profissional. Adicione a si mesmo ou seus colaboradores.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className={`px-8 py-4 ${colors.inputBg} hover:bg-white/[0.08] ${colors.text} font-heading uppercase text-sm tracking-widest rounded-2xl transition-all border ${colors.border}`}
                        >
                            Cadastrar primeiro perfil
                        </button>
                    </Card>
                ) : (
                    <div className="space-y-12">
                        {owners.length > 0 && (
                            <section className="space-y-4">
                                <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1`}>
                                    <ShieldCheck className={`w-4 h-4 ${accent.text}`} />
                                    Proprietários
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {owners.map(member => (
                                        <TeamMemberCard
                                            key={member.id}
                                            member={member}
                                            onEdit={(m) => {
                                                setEditingMember(m);
                                                setIsModalOpen(true);
                                            }}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {staff.length > 0 && (
                            <section className="space-y-4">
                                <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1 border-t ${colors.divider} pt-8`}>
                                    <Users className="w-4 h-4" />
                                    Colaboradores e comissões
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {staff.map(member => (
                                        <TeamMemberCard
                                            key={member.id}
                                            member={member}
                                            onEdit={(m) => {
                                                setEditingMember(m);
                                                setIsModalOpen(true);
                                            }}
                                            onDelete={handleDelete}
                                            onSaveCommission={handleSaveCommission}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                <section className="space-y-4 border-t border-[var(--color-divider)] pt-8">
                    <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1`}>
                        <Calendar className={`w-4 h-4 ${accent.text}`} />
                        Lembrete e taxas
                    </div>

                    <Card title="Lembrete de acerto">
                        <div className="space-y-4">
                            <p className={`${colors.textMuted} text-sm`}>
                                Dia em que o dashboard avisa sobre o acerto. A frequência de cada colaborador (semanal, quinzenal ou mensal) fica no card da equipe.
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                <div className="flex-1 w-full sm:max-w-xs min-w-0">
                                    <label className={classes.label}>Dia do mês (1–31)</label>
                                    <div className="relative">
                                        <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={settlementDay}
                                            onChange={(e) => setSettlementDay(e.target.value)}
                                            className={`${classes.input} pl-12 text-lg min-h-[44px]`}
                                        />
                                    </div>
                                    <p className={`${colors.textMuted} text-xs mt-1`}>
                                        Alerta no dashboard 2 dias antes do dia {settlementDay}
                                    </p>
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={() => void handleSaveSettlementDay()}
                                    disabled={savingSettlement}
                                    className="w-full sm:w-auto shrink-0 min-h-[44px]"
                                >
                                    {savingSettlement ? 'Salvando...' : 'Salvar lembrete'}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card title="Taxa de maquininha">
                        <div className="space-y-4">
                            <p className={`${colors.textMuted} text-sm`}>
                                Quando ativado, a comissão é calculada sobre o valor líquido (após a taxa).
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
                                        {machineFeeEnabled
                                            ? 'Ativado — comissão sobre valor líquido'
                                            : 'Desativado — comissão sobre valor bruto'}
                                    </span>
                                </div>
                            </div>
                            <div className={`grid grid-cols-2 gap-4 transition-opacity ${machineFeeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                <div>
                                    <label className={classes.label}>Taxa débito (%)</label>
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
                                            className={`${classes.input} pl-10 min-h-[44px]`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={classes.label}>Taxa crédito (%)</label>
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
                                            className={`${classes.input} pl-10 min-h-[44px]`}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                onClick={() => void handleSaveMachineFee()}
                                disabled={savingMachineFee}
                                className="min-h-[44px]"
                                icon={savingMachineFee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            >
                                {savingMachineFee ? 'Salvando...' : 'Salvar taxas'}
                            </Button>
                        </div>
                    </Card>

                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${colors.border} ${colors.inputBg}`}>
                        <AlertCircle className="w-5 h-5 text-[var(--color-info)] flex-shrink-0 mt-0.5" />
                        <div className={`text-sm ${colors.textMuted} space-y-1`}>
                            <p className={`font-bold ${colors.text}`}>Como funciona</p>
                            <p>Defina a % e a frequência no card do colaborador. Ao concluir um atendimento, a comissão entra automaticamente. O pagamento fica em Financeiro → Comissões.</p>
                        </div>
                    </div>
                </section>

                <ConfirmModal
                    open={!!pendingDeleteId}
                    title="Excluir profissional"
                    message="Tem certeza que deseja excluir este profissional?"
                    confirmLabel="Excluir"
                    variant="danger"
                    loading={deleteMemberMutation.isPending}
                    onCancel={() => setPendingDeleteId(null)}
                    onConfirm={() => void confirmDelete()}
                />

                {isModalOpen && (
                    <TeamMemberForm
                        initialData={editingMember}
                        onClose={() => setIsModalOpen(false)}
                        onSave={() => {
                            queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
                        }}
                    />
                )}
            </div>
        </SettingsLayout>
    );
};
