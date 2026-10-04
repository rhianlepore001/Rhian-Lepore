import React, { useEffect, useState } from 'react';
import { Card, Button, ConfirmModal, useToast } from '../../components/ui';
import { SettingsLayout } from '../../components/SettingsLayout';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import {
    Plus, Users, ShieldCheck, UserCheck, Calendar, CreditCard, Check, Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessCopy } from '../../hooks/useBusinessCopy';
import { useTeamMembers, useDeleteTeamMember } from '../../hooks/useTeam';
import { useBusinessSettings } from '../../hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { TeamMemberCard, type CommissionDraft } from '../../components/TeamMemberCard';
import { TeamMemberForm } from '../../components/TeamMemberForm';
import { StaffAppointmentPermissionSection } from '../../components/settings/StaffAppointmentPermissionSection';
import { TeamMemberBlocksSection } from '../../components/agenda/TeamMemberBlocksSection';
import { AgendaBlockForm } from '../../components/agenda/AgendaBlockForm';
import { CommissionScheduleEditor } from '../../components/settings/CommissionScheduleEditor';
import {
    useUpcomingAgendaBlocks,
    useCreateAgendaBlock,
    useDeleteAgendaBlock,
} from '../../hooks/useAgendaBlocks';
import { supabase } from '../../lib/supabase';
import { mapError, formatUserFacingError } from '../../utils/mapError';
import { resolveBusinessTimezone, getTodayInTimeZone } from '../../utils/businessTimezone';
import { isAgendaBlockConflictResult, type AgendaBlock, type AgendaBlockConflict } from '../../types/agendaBlocks';
import { messageForAgendaBlockResultCode } from '../../utils/agendaBlockPermission';
import {
    defaultScheduleDraft,
    formatLegacyFrequencyResetNotice,
    scheduleDraftSummary,
    scheduleRowToDraft,
    type CommissionScheduleDraft,
    validateScheduleDraft,
} from '../../utils/commissionSchedule';
import {
    dismissCommissionScheduleNotice,
    fetchCommissionSchedules,
    saveCommissionSchedule,
    type CommissionSchedulesPayload,
} from '../../services/commissionSchedule';

export const TeamSettings: React.FC = () => {
    const { companyId, region } = useAuth();
    const { remainder } = useBusinessCopy();
    const { accent, colors, classes } = useBrutalTheme();
    const queryClient = useQueryClient();
    const { data: members = [], isLoading: loading } = useTeamMembers();
    const { data: settingsData } = useBusinessSettings();
    const deleteMemberMutation = useDeleteTeamMember();
    const { data: upcomingBlocks = [] } = useUpcomingAgendaBlocks();
    const createBlock = useCreateAgendaBlock();
    const deleteBlock = useDeleteAgendaBlock();
    const shopTimeZone = resolveBusinessTimezone({ timezone: settingsData?.timezone, region });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [blockFormMemberId, setBlockFormMemberId] = useState<string | null>(null);
    const [blockConflicts, setBlockConflicts] = useState<AgendaBlockConflict[] | undefined>();
    const [unlockTarget, setUnlockTarget] = useState<AgendaBlock | null>(null);
    const { showToast } = useToast();

    const [scheduleDraft, setScheduleDraft] = useState<CommissionScheduleDraft>(defaultScheduleDraft);
    const [schedulePayload, setSchedulePayload] = useState<CommissionSchedulesPayload | null>(null);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [scheduleNotice, setScheduleNotice] = useState(false);
    const [machineFeeEnabled, setMachineFeeEnabled] = useState(false);
    const [debitFeePercent, setDebitFeePercent] = useState('0');
    const [creditFeePercent, setCreditFeePercent] = useState('0');
    const [savingMachineFee, setSavingMachineFee] = useState(false);

    useEffect(() => {
        if (!settingsData) return;
        setMachineFeeEnabled(settingsData.machine_fee_enabled ?? false);
        setDebitFeePercent(String(settingsData.debit_fee_percent ?? 0));
        setCreditFeePercent(String(settingsData.credit_fee_percent ?? 0));
    }, [settingsData]);

    useEffect(() => {
        if (!companyId) return;
        void fetchCommissionSchedules()
            .then((payload) => {
                setSchedulePayload(payload);
                setScheduleDraft(scheduleRowToDraft(payload.business));
                setScheduleNotice(payload.notice);
            })
            .catch(() => {
                setScheduleDraft(defaultScheduleDraft());
            });
    }, [companyId]);

    const cardMembers = members.map(m => ({
        ...m,
        photo_url: m.photo_url ?? null,
        commission_rate: m.commission_rate ?? m.commission_percent ?? 0,
    }));

    const handleDelete = (id: string) => {
        const member = cardMembers.find((item) => item.id === id);
        if (member?.is_owner) {
            showToast('O perfil do dono não pode ser excluído.', 'warning');
            return;
        }
        setPendingDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            await deleteMemberMutation.mutateAsync(pendingDeleteId);
            showToast('Profissional excluído.', 'success');
        } catch (error) {
            const message = error instanceof Error && error.message === 'OWNER_OR_MISSING_TEAM_MEMBER'
                ? 'Não foi possível excluir este profissional. O dono não pode ser removido.'
                : formatUserFacingError(mapError(error, 'Não foi possível excluir o profissional. Tente de novo.'));
            showToast(message, 'error');
        } finally {
            setPendingDeleteId(null);
        }
    };

    const blocksForMember = (memberId: string) =>
        upcomingBlocks.filter((b) => b.professional_id === memberId);

    const todayStr = () => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const handleCreateBlock = async (input: {
        professionalId: string;
        startsAt: string;
        endsAt: string;
        acknowledgeConflicts: boolean;
        confirmedConflictIds?: string[];
    }) => {
        try {
            const result = await createBlock.mutateAsync(input);
            if (isAgendaBlockConflictResult(result)) {
                setBlockConflicts(result.items);
                if (result.code === 'block_conflicts_changed') {
                    showToast(result.message ?? messageForAgendaBlockResultCode(result.code), 'error');
                }
                return;
            }
            if (result.success === false) {
                showToast(result.message ?? messageForAgendaBlockResultCode(result.code), 'error');
                return;
            }
            setBlockFormMemberId(null);
            setBlockConflicts(undefined);
            showToast('Agenda bloqueada.', 'success');
        } catch (error) {
            showToast(formatUserFacingError(mapError(error, 'Não foi possível bloquear a agenda.')), 'error');
        }
    };

    const confirmUnlock = async () => {
        if (!unlockTarget) return;
        try {
            await deleteBlock.mutateAsync(unlockTarget.id);
            showToast('Agenda desbloqueada.', 'success');
        } catch (error) {
            showToast(formatUserFacingError(mapError(error, 'Não foi possível desbloquear.')), 'error');
        } finally {
            setUnlockTarget(null);
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

    const handleSaveSchedule = async () => {
        const invalid = validateScheduleDraft(scheduleDraft);
        if (invalid) {
            showToast(invalid, 'warning');
            return;
        }
        setSavingSchedule(true);
        try {
            await saveCommissionSchedule({
                frequency: scheduleDraft.frequency,
                closeDays: scheduleDraft.closeDays,
                payOffsetDays: scheduleDraft.payOffsetDays,
                reminderOffsets: scheduleDraft.reminderOffsets,
            });
            const payload = await fetchCommissionSchedules();
            setSchedulePayload(payload);
            setScheduleDraft(scheduleRowToDraft(payload.business));
            showToast('Pagamento da comissão salvo.', 'success');
            queryClient.invalidateQueries({ queryKey: ['settings', companyId, 'business'] });
        } catch (error) {
            showToast(formatUserFacingError(mapError(error, 'Não foi possível salvar o pagamento da comissão.')), 'error');
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleDismissScheduleNotice = async () => {
        try {
            await dismissCommissionScheduleNotice();
            setScheduleNotice(false);
        } catch {
            setScheduleNotice(false);
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
    const exceptionByPro = new Map(
        (schedulePayload?.exceptions ?? []).map((row) => [row.professional_id, row.schedule]),
    );
    const businessSummary = scheduleDraftSummary(scheduleDraft);
    const ruleOfBusiness = remainder.article === 'a' ? `da ${remainder.noun}` : `do ${remainder.noun}`;
    const scheduleFromIso = schedulePayload?.today ?? getTodayInTimeZone(shopTimeZone);

    const memberScheduleLabel = (memberId: string) => {
        const exception = exceptionByPro.get(memberId);
        if (exception && (exception.close_days?.length ?? 0) > 0) {
            return `Exceção · ${scheduleDraftSummary(scheduleRowToDraft(exception))}`;
        }
        return businessSummary;
    };

    return (
        <SettingsLayout>
            <div className="w-full space-y-8 pb-20">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className={`text-xl md:text-2xl font-heading font-bold ${colors.text} tracking-tight`}>
                            Equipe e comissões
                        </h2>
                        <p className={`text-sm mt-1 ${colors.textSecondary} max-w-lg`}>
                            Cadastre colaboradores e configure comissão e o ciclo de acerto.
                        </p>
                    </div>
                    <Button
                        id="btn-add-team-member"
                        className="shrink-0 self-start sm:self-auto min-h-[44px]"
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
                                        >
                                            <TeamMemberBlocksSection
                                                memberName={member.name}
                                                blocks={blocksForMember(member.id)}
                                                timeZone={shopTimeZone}
                                                onCreate={() => {
                                                    setBlockConflicts(undefined);
                                                    setBlockFormMemberId(member.id);
                                                }}
                                                onUnlock={setUnlockTarget}
                                            />
                                        </TeamMemberCard>
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
                                            scheduleLabel={memberScheduleLabel(member.id)}
                                        >
                                            <TeamMemberBlocksSection
                                                memberName={member.name}
                                                blocks={blocksForMember(member.id)}
                                                timeZone={shopTimeZone}
                                                onCreate={() => {
                                                    setBlockConflicts(undefined);
                                                    setBlockFormMemberId(member.id);
                                                }}
                                                onUnlock={setUnlockTarget}
                                            />
                                        </TeamMemberCard>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                <StaffAppointmentPermissionSection />

                <section className="space-y-4 border-t border-[var(--color-divider)] pt-8">
                    <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1`}>
                        <Calendar className={`w-4 h-4 ${accent.text}`} />
                        Pagamento da comissão
                    </div>

                    {scheduleNotice && (
                        <div
                            data-testid="commission-schedule-notice"
                            role="status"
                            className={`p-4 rounded-xl border ${accent.borderDim} ${accent.bgDim}`}
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle className={`w-5 h-5 ${accent.text} flex-shrink-0 mt-0.5`} aria-hidden="true" />
                                <p className={`text-sm leading-relaxed ${colors.text} flex-1 min-w-0`}>
                                    {formatLegacyFrequencyResetNotice(ruleOfBusiness)}
                                </p>
                            </div>
                            <div className="mt-3 sm:pl-8">
                                <Button
                                    variant="secondary"
                                    onClick={() => void handleDismissScheduleNotice()}
                                    className="w-full sm:w-auto min-h-[44px]"
                                >
                                    Entendi
                                </Button>
                            </div>
                        </div>
                    )}

                    <Card title="Regra do negócio">
                        <div className="space-y-6">
                            <p className={`${colors.textMuted} text-sm leading-relaxed`}>
                                Uma regra para {remainder.withArticle}. Se alguém precisar de outra, crie uma exceção no perfil do colaborador.
                            </p>
                            <CommissionScheduleEditor
                                draft={scheduleDraft}
                                onChange={setScheduleDraft}
                                fromIso={scheduleFromIso}
                                currentEnd={schedulePayload?.current_end}
                                saved={schedulePayload ? scheduleRowToDraft(schedulePayload.business) : undefined}
                            />
                            <Button
                                variant="primary"
                                data-testid="commission-schedule-save"
                                onClick={() => void handleSaveSchedule()}
                                disabled={savingSchedule}
                                className="w-full sm:w-auto min-h-[44px]"
                                icon={savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            >
                                {savingSchedule ? 'Salvando...' : 'Salvar pagamento'}
                            </Button>
                        </div>
                    </Card>
                </section>

                <section className="space-y-4 border-t border-[var(--color-divider)] pt-8">
                    <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1`}>
                        <CreditCard className={`w-4 h-4 ${accent.text}`} />
                        Taxas
                    </div>

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
                            <p>Defina a % no card do colaborador. O ciclo de acerto fica acima, em Pagamento da comissão. Ao concluir um atendimento, a comissão entra automaticamente. O pagamento fica em Financeiro → Pagamentos.</p>
                        </div>
                    </div>
                </section>

                <ConfirmModal
                    open={!!pendingDeleteId}
                    title="Excluir profissional"
                    message="Excluir este profissional também remove o acesso dele ao sistema. O e-mail fica livre para um novo convite."
                    confirmLabel="Excluir"
                    variant="danger"
                    loading={deleteMemberMutation.isPending}
                    onCancel={() => setPendingDeleteId(null)}
                    onConfirm={() => void confirmDelete()}
                />

                <ConfirmModal
                    open={!!unlockTarget}
                    title="Desbloquear agenda"
                    message="Quem tiver permissão volta a poder marcar neste período."
                    confirmLabel="Desbloquear"
                    variant="danger"
                    loading={deleteBlock.isPending}
                    onCancel={() => setUnlockTarget(null)}
                    onConfirm={() => void confirmUnlock()}
                />

                <AgendaBlockForm
                    open={!!blockFormMemberId}
                    onClose={() => {
                        setBlockFormMemberId(null);
                        setBlockConflicts(undefined);
                    }}
                    members={cardMembers.map((m) => ({ id: m.id, name: m.name }))}
                    showProfessionalSelect={false}
                    professionalId={blockFormMemberId ?? ''}
                    initialDate={todayStr()}
                    timeZone={shopTimeZone}
                    submitting={createBlock.isPending}
                    conflicts={blockConflicts}
                    onSubmit={handleCreateBlock}
                />

                {isModalOpen && (
                    <TeamMemberForm
                        initialData={editingMember}
                        onClose={() => setIsModalOpen(false)}
                        onSave={() => {
                            queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
                            void fetchCommissionSchedules()
                                .then((payload) => {
                                    setSchedulePayload(payload);
                                    setScheduleDraft(scheduleRowToDraft(payload.business));
                                    setScheduleNotice(payload.notice);
                                })
                                .catch(() => undefined);
                        }}
                    />
                )}
            </div>
        </SettingsLayout>
    );
};
