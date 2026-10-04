import React, { useEffect, useState, useRef } from 'react';
import { Upload, User, Check, Link as LinkIcon, CheckCircle2, Share2, Copy, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useBusinessCopy } from '../hooks/useBusinessCopy';
import { useCopyInviteLink } from '../hooks/useCopyInviteLink';
import { mapError } from '../utils/mapError';
import { generateSlug } from '../services/team';
import { SettingsSwitch } from './SettingsSwitch';
import { CommissionScheduleEditor } from './settings/CommissionScheduleEditor';
import {
    defaultScheduleDraft,
    scheduleRowToDraft,
    type CommissionScheduleDraft,
    draftsEqual,
    scheduleDraftSummary,
    validateScheduleDraft,
} from '../utils/commissionSchedule';
import { fetchCommissionSchedules, saveCommissionSchedule } from '../services/commissionSchedule';

interface TeamMemberFormProps {
    initialData?: any;
    onClose: () => void;
    onSave: () => void;
    /** @deprecated Tema vem de useBrutalTheme() / data-theme — prop ignorada */
    accentColor?: string;
    isOwnerForm?: boolean;
    /** Exclusão fica dentro do drawer (PR-E). Só para colaborador já salvo, nunca o dono. */
    onDelete?: (id: string) => void;
    /** Bloqueios de agenda do colaborador (seção própria do drawer). */
    blocksSlot?: React.ReactNode;
}

const DrawerSection: React.FC<{ title: string; description?: string; children: React.ReactNode; first?: boolean; testId?: string }> = ({
    title, description, children, first = false, testId,
}) => {
    const { colors } = useBrutalTheme();
    return (
        <section data-testid={testId} className={first ? 'space-y-4' : `space-y-4 border-t ${colors.divider} pt-6`}>
            <div>
                <h3 className={`text-[15px] font-semibold leading-6 ${colors.text}`}>{title}</h3>
                {description && <p className={`mt-0.5 text-sm ${colors.textSecondary}`}>{description}</p>}
            </div>
            {children}
        </section>
    );
};

type FormStep = 'form' | 'invite';

export const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
    initialData,
    onClose,
    onSave,
    isOwnerForm = false,
    onDelete,
    blocksSlot,
}) => {
    const { user, fullName, avatarUrl, businessName } = useAuth();
    const { showToast } = useToast();
    const { colors, accent, font } = useBrutalTheme();
    const { rolePlaceholder, specialtiesPlaceholder } = useBusinessCopy();

    const [step, setStep] = useState<FormStep>('form');
    const [createdMemberId, setCreatedMemberId] = useState<string | null>(
        initialData?.id && !initialData?.staff_user_id ? initialData.id : null
    );
    const [name, setName] = useState(initialData?.name || (isOwnerForm ? (fullName || businessName || '') : ''));
    const [role, setRole] = useState(initialData?.role || (isOwnerForm ? 'Dono / Profissional' : ''));
    const [bio, setBio] = useState(initialData?.bio || '');
    const [isOwner, setIsOwner] = useState(initialData?.is_owner || (isOwnerForm ? true : false));
    const [active, setActive] = useState(initialData?.active ?? true);
    const [specialties, setSpecialties] = useState(
        Array.isArray(initialData?.specialties)
            ? initialData.specialties.join(', ')
            : (initialData?.specialties || '')
    );
    const [cpf, setCpf] = useState(initialData?.cpf || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo_url || null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [useBusinessDefault, setUseBusinessDefault] = useState(true);
    const [scheduleDraft, setScheduleDraft] = useState<CommissionScheduleDraft>(defaultScheduleDraft);
    const [savedSchedule, setSavedSchedule] = useState<CommissionScheduleDraft>(defaultScheduleDraft);
    const [scheduleFromIso, setScheduleFromIso] = useState(() => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const [scheduleCurrentEnd, setScheduleCurrentEnd] = useState<string | null>(null);
    const [scheduleReady, setScheduleReady] = useState(false);
    const [hadException, setHadException] = useState(false);
    const [businessDraft, setBusinessDraft] = useState<CommissionScheduleDraft | null>(null);
    const showSchedule = Boolean(initialData?.id) && !isOwner && !isOwnerForm;
    const showCommission = !isOwner && !isOwnerForm;
    const savedRate = Number(initialData?.commission_rate ?? initialData?.commission_percent ?? 0) || 0;
    const [commissionRate, setCommissionRate] = useState(String(savedRate));

    useEffect(() => {
        if (!showSchedule) return;
        void fetchCommissionSchedules()
            .then((payload) => {
                setScheduleFromIso(payload.today);
                const business = scheduleRowToDraft(payload.business);
                setBusinessDraft(business);
                const exception = payload.exceptions.find((row) => row.professional_id === initialData.id);
                const hasCustom = Boolean(exception && (exception.schedule.close_days?.length ?? 0) > 0);
                setScheduleCurrentEnd((hasCustom ? exception?.current_end : null) ?? payload.current_end);
                setHadException(hasCustom);
                setUseBusinessDefault(!hasCustom);
                const draft = hasCustom ? scheduleRowToDraft(exception!.schedule) : business;
                setScheduleDraft(draft);
                setSavedSchedule(hasCustom ? draft : business);
                setScheduleReady(true);
            })
            .catch(() => setScheduleReady(true));
    }, [showSchedule, initialData?.id]);

    const inviteMemberId = createdMemberId || (initialData?.staff_user_id ? null : initialData?.id) || null;
    const { inviteLink, copied: copiedInviteLink, copy: copyInviteLink, share: shareInviteLink } = useCopyInviteLink({
        recipientName: name.trim() || undefined,
        memberId: inviteMemberId,
    });

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.size > 10 * 1024 * 1024) {
                showToast('A imagem deve ter no máximo 10MB.', 'error');
                return;
            }

            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleFillWithOwner = () => {
        setName(fullName || businessName || '');
        setRole('Dono / Profissional');
        setPhotoPreview(avatarUrl || null);
        setIsOwner(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            if (showSchedule && !useBusinessDefault) {
                const invalid = validateScheduleDraft(scheduleDraft);
                if (invalid) {
                    showToast(invalid, 'warning');
                    setLoading(false);
                    return;
                }
            }

            const parsedRate = parseFloat(commissionRate.replace(',', '.'));
            if (showCommission && (Number.isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100)) {
                showToast('A comissão deve ser entre 0% e 100%.', 'warning');
                setLoading(false);
                return;
            }
            const rateChanged = showCommission && parsedRate !== savedRate;

            let photoUrl = photoPreview;

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('team_photos')
                    .upload(fileName, photoFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw new Error('Erro ao fazer upload da foto: ' + uploadError.message);
                }

                const { data } = supabase.storage.from('team_photos').getPublicUrl(fileName);
                if (data) {
                    photoUrl = data.publicUrl;
                }
            }

            const generatedSlug = `${generateSlug(name)}-${Date.now().toString(36)}`;
            const existingSlug = typeof initialData?.slug === 'string' ? initialData.slug.trim() : '';
            const teamMemberData: Record<string, unknown> = {
                user_id: user.id,
                name: name.trim(),
                role: role.trim(),
                slug: existingSlug || generatedSlug,
                bio: bio.trim(),
                active,
                photo_url: photoUrl,
                is_owner: isOwner,
                specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
                cpf: cpf.trim() || null
            };

            // Comissão (%) é editada aqui no drawer. Em edição só grava se mudou;
            // em criação parte do valor informado (padrão 0).
            if (!initialData?.id) {
                const initialRate = showCommission ? parsedRate : 0;
                teamMemberData.commission_rate = initialRate;
                teamMemberData.commission_percent = initialRate;
            } else if (rateChanged) {
                teamMemberData.commission_rate = parsedRate;
                teamMemberData.commission_percent = parsedRate;
            }

            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from('team_members')
                    .update(teamMemberData)
                    .eq('id', initialData.id)
                    .eq('user_id', user.id);
                if (updateError) throw updateError;

                if (rateChanged) {
                    // Mesma regra de antes: comissões ainda não pagas passam a usar a nova %.
                    const { error: recalculateError } = await supabase.rpc('recalculate_pending_commissions', {
                        p_professional_id: initialData.id,
                        p_new_rate: parsedRate,
                    });
                    if (recalculateError) {
                        console.error('Error recalculating commissions:', recalculateError);
                        showToast('Comissão salva, mas não foi possível recalcular as pendentes.', 'warning');
                    }
                }

                // Só grava quando a regra do colaborador mudou de fato (editar telefone não cria versão nova).
                const scheduleChanged = showSchedule && scheduleReady && (
                    hadException === useBusinessDefault
                    || (!useBusinessDefault && !draftsEqual(scheduleDraft, savedSchedule))
                );
                if (scheduleChanged) {
                    await saveCommissionSchedule({
                        professionalId: initialData.id,
                        frequency: scheduleDraft.frequency,
                        closeDays: scheduleDraft.closeDays,
                        payOffsetDays: scheduleDraft.payOffsetDays,
                        reminderOffsets: scheduleDraft.reminderOffsets,
                        useBusinessDefault,
                    });
                }

                window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'team' } }));
                onSave();

                if (!isOwner && !initialData.staff_user_id) {
                    setCreatedMemberId(initialData.id);
                    setStep('invite');
                } else {
                    onClose();
                }
            } else {
                const { data: inserted, error: insertError } = await supabase
                    .from('team_members')
                    .insert(teamMemberData)
                    .select('id')
                    .single();
                if (insertError) throw insertError;

                window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'team' } }));
                onSave();

                if (!isOwner && inserted?.id) {
                    setCreatedMemberId(inserted.id);
                    setStep('invite');
                } else {
                    onClose();
                }
            }
        } catch (error: unknown) {
            console.error('Error saving team member:', error);
            showToast(mapError(error, 'Não foi possível salvar o profissional. Tente de novo.').message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = `w-full p-3 rounded-lg ${colors.text} transition-all outline-none ${colors.inputBg} ${colors.inputBorder} border focus:border-[var(--color-input-focus)]`;
    const labelClass = `text-[13px] font-medium mb-1.5 block ${colors.textSecondary}`;

    if (step === 'invite') {
        const firstName = name.trim().split(/\s+/)[0] || 'o profissional';
        return (
            <Modal
                open
                onClose={onClose}
                title="Convite pronto"
                size="md"
            >
                <div className="space-y-5">
                    <div className={`p-4 rounded-xl border ${colors.border} ${colors.surface} space-y-2`}>
                        <p className={`text-base ${colors.text} font-semibold`}>
                            {name.trim() || 'Profissional'}
                        </p>
                        <p className={`text-sm ${colors.textSecondary} leading-relaxed`}>
                            Tudo certo com {firstName}. Envie o link abaixo para concluir
                            o acesso e começar a usar a agenda.
                        </p>
                        <p className={`text-xs ${colors.textMuted} leading-relaxed`}>
                            O nome fica como você cadastrou. No link, {firstName} preenche
                            só e-mail, data de nascimento e senha.
                        </p>
                    </div>

                    <div
                        data-testid="invite-link"
                        className={`p-3 rounded-lg border border-dashed ${colors.border} break-all text-xs ${font.mono} ${colors.textSecondary}`}
                    >
                        {inviteLink || 'Gerando link…'}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                            type="button"
                            variant="primary"
                            fullWidth
                            onClick={() => void copyInviteLink()}
                            icon={copiedInviteLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        >
                            {copiedInviteLink ? 'Link copiado' : 'Copiar link'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            fullWidth
                            onClick={() => void shareInviteLink()}
                            icon={<Share2 className="w-4 h-4" />}
                        >
                            Enviar
                        </Button>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        fullWidth
                        onClick={onClose}
                        data-testid="invite-modal-close"
                    >
                        Fechar
                    </Button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={initialData ? 'Editar profissional' : 'Novo profissional'}
            size={showSchedule ? 'lg' : 'md'}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {!initialData && (
                    <button
                        type="button"
                        onClick={handleFillWithOwner}
                        className={`w-full min-h-[44px] py-2 px-4 border border-dashed rounded-lg transition-all text-sm font-medium ${accent.borderDim} ${accent.text} hover:bg-[var(--color-accent-dim)]`}
                    >
                        Sou eu quem atende (usar meu perfil)
                    </button>
                )}
                {initialData?.id && !initialData?.staff_user_id && !initialData?.is_owner && (
                    <div className={`p-4 rounded-lg border ${colors.border} ${colors.surface} flex flex-col gap-2`}>
                        <p className={`text-sm ${colors.textSecondary}`}>
                            Este profissional ainda não entrou no sistema. Envie o convite:
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setCreatedMemberId(initialData.id);
                                setStep('invite');
                            }}
                            className={`w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${colors.card} hover:bg-[var(--color-card-hover)] ${colors.text} ${colors.border} border`}
                        >
                            <LinkIcon className="w-4 h-4" />
                            <span>Abrir convite</span>
                        </button>
                    </div>
                )}

                <DrawerSection title="Dados" first testId="team-member-section-dados">
                    <div className="flex justify-center">
                        <div
                            className={`relative w-20 h-20 rounded-full border-2 border-dashed ${photoPreview ? 'border-transparent' : colors.border} flex items-center justify-center cursor-pointer hover:border-current overflow-hidden group transition-colors ${accent.text} ${colors.surface}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <User className={`w-8 h-8 ${colors.textMuted}`} />
                            )}

                            <div className="absolute inset-0 bg-[var(--color-bg)]/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="w-6 h-6 text-[var(--color-text)]" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handlePhotoChange}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isOwner"
                                checked={isOwner}
                                onChange={e => setIsOwner(e.target.checked)}
                                className={`rounded ${colors.inputBg} ${colors.inputBorder} border focus:ring-0 ${accent.text}`}
                            />
                            <label htmlFor="isOwner" className={`text-sm cursor-pointer ${colors.text}`}>
                                É o Dono
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={active}
                                onChange={e => setActive(e.target.checked)}
                                className={`rounded ${colors.inputBg} ${colors.inputBorder} border focus:ring-0 ${accent.text}`}
                            />
                            <label htmlFor="active" className={`text-sm cursor-pointer ${colors.text}`}>
                                Ativo
                            </label>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="team-member-name" className={labelClass}>Nome</label>
                        <input
                            id="team-member-name"
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={inputClass}
                            placeholder="Ex: João Silva"
                        />
                    </div>
                    <div>
                        <label htmlFor="team-member-role" className={labelClass}>Cargo</label>
                        <input
                            id="team-member-role"
                            type="text"
                            required
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className={inputClass}
                            placeholder={rolePlaceholder}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>CPF (opcional)</label>
                        <input
                            type="text"
                            value={cpf}
                            onChange={e => setCpf(e.target.value)}
                            className={inputClass}
                            placeholder="000.000.000-00"
                            maxLength={14}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Bio (opcional)</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            className={`${inputClass} resize-none`}
                            placeholder="Breve descrição..."
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Especialidades (separadas por vírgula)</label>
                        <input
                            type="text"
                            value={specialties}
                            onChange={e => setSpecialties(e.target.value)}
                            className={inputClass}
                            placeholder={specialtiesPlaceholder}
                        />
                    </div>
                </DrawerSection>

                {showCommission && (
                    <DrawerSection title="Comissão" testId="team-member-section-comissao">
                        <div>
                            <label htmlFor="team-member-commission" className={labelClass}>Comissão (%)</label>
                            <div className="relative max-w-[200px]">
                                <input
                                    id="team-member-commission"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={commissionRate}
                                    onChange={e => setCommissionRate(e.target.value)}
                                    className={`${inputClass} pr-9 tabular-nums`}
                                    aria-describedby="team-member-commission-help"
                                />
                                <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm ${colors.textMuted}`} aria-hidden="true">%</span>
                            </div>
                            <p id="team-member-commission-help" className={`mt-1.5 text-xs ${colors.textMuted}`}>
                                {initialData?.id
                                    ? 'Vale para os atendimentos ainda não pagos e os próximos.'
                                    : 'Pode ajustar depois. Vale para os atendimentos a partir de agora.'}
                            </p>
                        </div>
                        {showSchedule && scheduleReady && (
                            <div
                                data-testid="collaborator-schedule-exception"
                                className={`space-y-6 p-4 rounded-xl border ${colors.border} ${colors.surface}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className={`text-[13px] font-medium ${colors.textSecondary}`}>Ciclo de acerto</p>
                                        <label htmlFor="use-business-schedule" className={`mt-1 block text-sm font-semibold ${colors.text} cursor-pointer`}>
                                            Usar regra do negócio
                                        </label>
                                        <p className={`mt-1 text-xs leading-relaxed ${colors.textSecondary}`}>
                                            {useBusinessDefault
                                                ? `Segue a regra de todos${businessDraft ? `: ${scheduleDraftSummary(businessDraft)}` : ''}.`
                                                : 'Desligado: este colaborador tem um ciclo próprio, que vale a partir do próximo fechamento dele.'}
                                        </p>
                                    </div>
                                    <SettingsSwitch
                                        id="use-business-schedule"
                                        checked={useBusinessDefault}
                                        onChange={setUseBusinessDefault}
                                        ariaLabel="Usar regra do negócio"
                                    />
                                </div>
                                {!useBusinessDefault && (
                                    <CommissionScheduleEditor
                                        draft={scheduleDraft}
                                        onChange={setScheduleDraft}
                                        fromIso={scheduleFromIso}
                                        currentEnd={scheduleCurrentEnd}
                                        saved={savedSchedule}
                                    />
                                )}
                            </div>
                        )}
                    </DrawerSection>
                )}

                {initialData?.id && blocksSlot && (
                    <DrawerSection
                        title="Bloqueios de agenda"
                        description="Períodos em que ninguém pode marcar com este profissional."
                        testId="team-member-section-bloqueios"
                    >
                        {blocksSlot}
                    </DrawerSection>
                )}

                <div className="space-y-3 pt-2">
                    <Button
                        type="submit"
                        disabled={loading}
                        variant="primary"
                        fullWidth
                        loading={loading}
                        icon={!loading ? <Check className="w-5 h-5" /> : undefined}
                    >
                        {loading ? 'Salvando...' : (initialData ? 'Salvar alterações' : 'Criar e convidar')}
                    </Button>
                    {initialData?.id && !initialData?.is_owner && onDelete && (
                        <Button
                            type="button"
                            variant="ghost"
                            fullWidth
                            onClick={() => onDelete(initialData.id)}
                            className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                            icon={<Trash2 className="w-4 h-4" />}
                        >
                            Excluir profissional
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
};
