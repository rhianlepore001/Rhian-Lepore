import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, Crown, Sparkles, Check, ImagePlus } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useToast } from '../../components/ui/Toast';
import {
    useMembershipPlans,
    useUpsertMembershipPlan,
    useDeleteMembershipPlan,
} from '../../hooks/useMemberships';
import {
    MembershipPlan, MembershipBadgeColor, MEMBERSHIP_PHOTO_BUCKET, MEMBERSHIP_PHOTO_MAX_BYTES,
    MEMBERSHIP_PHOTO_TYPES, uploadMembershipPlanPhoto,
} from '../../services/memberships';
import { deleteFile } from '../../lib/supabaseStorage';
import { MembershipPlanPhoto } from '../../components/membership/MembershipPlanPhoto';
import { Button, Modal, ConfirmModal, ErrorState } from '../../components/ui';
import { PlanCard } from '../../components/membership/PlanCard';
import { ClubOwnerNav } from '../../components/membership/ClubOwnerNav';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessCopy } from '../../hooks/useBusinessCopy';
import { useTenantLocale } from '../../hooks/useTenantLocale';
import { supabase } from '../../lib/supabase';
import { filterBookableServices } from '@/utils/filterBookableServices';

const BADGE_COLORS: { value: MembershipBadgeColor; label: string; icon: React.ReactNode; gradient: string }[] = [
    { value: 'gold', label: 'Ouro', icon: <Crown className="w-4 h-4" />, gradient: 'from-yellow-500/30 to-amber-600/10' },
    { value: 'silver', label: 'Prata', icon: <Sparkles className="w-4 h-4" />, gradient: 'from-slate-400/30 to-slate-600/10' },
    { value: 'bronze', label: 'Bronze', icon: <Sparkles className="w-4 h-4" />, gradient: 'from-orange-700/30 to-orange-900/10' },
];

interface PlanFormState {
    id?: string;
    name: string;
    description: string;
    photoPath?: string | null;
    priceReais: string;
    serviceIds: string[];
    usageLimit: string;
    badgeColor: MembershipBadgeColor;
    active: boolean;
}

const emptyForm: PlanFormState = {
    name: '',
    description: '',
    priceReais: '',
    serviceIds: [],
    usageLimit: '',
    badgeColor: 'gold',
    active: true,
};

export const MembershipPlansSettings: React.FC = () => {
    const { accent, colors, classes, isBeauty, font } = useBrutalTheme();
    const { showToast } = useToast();
    const { companyId } = useAuth();
    const {
        clubPlanNamePlaceholder,
        clubPlanDescriptionPlaceholder,
        clubPlansSubtitle,
    } = useBusinessCopy();
    const { currencySymbol } = useTenantLocale();
    const { data: plans, isLoading, isError, refetch } = useMembershipPlans();
    const upsertMutation = useUpsertMembershipPlan();
    const deleteMutation = useDeleteMembershipPlan();
    const [services, setServices] = useState<Array<{ id: string; name: string; price: number; duration_minutes: number }>>([]);

    React.useEffect(() => {
        if (!companyId) return;
        (async () => {
            const { data } = await supabase
                .from('services')
                .select('id, name, price, duration_minutes, active')
                .eq('user_id', companyId)
                .order('name');
            setServices(
                filterBookableServices(
                    (data ?? []) as Array<{ id: string; name: string; price: number; duration_minutes: number; active?: boolean }>,
                ),
            );
        })();
    }, [companyId]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<PlanFormState>(emptyForm);
    const [pendingDeletePlan, setPendingDeletePlan] = useState<MembershipPlan | null>(null);

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState('');
    const [removePhoto, setRemovePhoto] = useState(false);
    const [uploading, setUploading] = useState(false);
    const saving = uploading || upsertMutation.isPending;
    const saveInProgress = useRef(false);
    const uploadedPhoto = useRef<string | null>(null);
    const newPlanId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!photoFile) {
            setPhotoPreview(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    const discardUpload = () => {
        if (!uploadedPhoto.current) return;
        void deleteFile(MEMBERSHIP_PHOTO_BUCKET, uploadedPhoto.current).catch(() => undefined);
        uploadedPhoto.current = null;
    };

    const resetPhoto = () => {
        discardUpload();
        setPhotoFile(null);
        setPhotoError('');
        setRemovePhoto(false);
    };

    const closeForm = () => {
        if (saveInProgress.current) return;
        resetPhoto();
        setShowForm(false);
    };

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        if (!MEMBERSHIP_PHOTO_TYPES.split(',').includes(file.type) || !file.size || file.size > MEMBERSHIP_PHOTO_MAX_BYTES) {
            setPhotoError('Escolha uma foto JPG, PNG ou WebP de até 5 MB.');
            return;
        }
        discardUpload();
        setPhotoError('');
        setPhotoFile(file);
        setRemovePhoto(false);
    };

    const handleNew = () => {
        newPlanId.current = crypto.randomUUID();
        setForm(emptyForm);
        setShowForm(true);
    };

    const handleEdit = (plan: MembershipPlan) => {
        setForm({
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            photoPath: plan.photo_path,
            priceReais: (plan.price_cents / 100).toFixed(2).replace('.', ','),
            serviceIds: plan.service_ids,
            usageLimit: plan.usage_limit_per_month?.toString() ?? '',
            badgeColor: plan.badge_color,
            active: plan.active,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (saveInProgress.current || !companyId) return;
        if (!form.name.trim()) {
            showToast('Informe o nome do plano.', 'error');
            return;
        }
        const priceNumber = parseFloat(form.priceReais.replace(',', '.'));
        if (isNaN(priceNumber) || priceNumber < 0) {
            showToast('Preço inválido.', 'error');
            return;
        }
        const limit = form.usageLimit.trim() ? parseInt(form.usageLimit, 10) : null;
        if (form.usageLimit.trim() && (isNaN(limit!) || limit! < 1)) {
            showToast('Limite de uso inválido.', 'error');
            return;
        }
        saveInProgress.current = true;
        setUploading(true);
        try {
            if (photoFile && !uploadedPhoto.current) {
                try {
                    uploadedPhoto.current = await uploadMembershipPlanPhoto(companyId, photoFile);
                } catch {
                    setPhotoError('Não foi possível enviar a foto. Tente salvar novamente.');
                    return;
                }
            }

            const photoPath = photoFile ? uploadedPhoto.current : removePhoto ? null : undefined;
            await upsertMutation.mutateAsync({
                id: form.id ?? newPlanId.current,
                photo_path: photoPath,
                name: form.name.trim(),
                description: form.description.trim() || null,
                price_cents: Math.round(priceNumber * 100),
                service_ids: form.serviceIds,
                usage_limit_per_month: limit,
                badge_color: form.badgeColor,
                active: form.active,
            });
            showToast(form.id ? 'Plano atualizado!' : 'Plano criado!', 'success');
            uploadedPhoto.current = null;
            if (photoPath !== undefined && form.photoPath && form.photoPath !== photoPath) {
                void deleteFile(MEMBERSHIP_PHOTO_BUCKET, form.photoPath).catch(() => undefined);
            }
            resetPhoto();
            setShowForm(false);
            setForm(emptyForm);
        } catch {
            showToast('Não foi possível salvar o plano. Tente novamente.', 'error');
        } finally {
            saveInProgress.current = false;
            setUploading(false);
        }
    };

    const handleDelete = (plan: MembershipPlan) => {
        setPendingDeletePlan(plan);
    };

    const confirmDelete = async () => {
        if (!pendingDeletePlan) return;
        try {
            await deleteMutation.mutateAsync(pendingDeletePlan.id);
            if (pendingDeletePlan.photo_path) {
                void deleteFile(MEMBERSHIP_PHOTO_BUCKET, pendingDeletePlan.photo_path).catch(() => undefined);
            }
            showToast('Plano excluído.', 'success');
        } catch (err) {
            showToast('Não foi possível excluir o plano. Tente novamente.', 'error');
        } finally {
            setPendingDeletePlan(null);
        }
    };

    const toggleService = (id: string) => {
        setForm(f => ({
            ...f,
            serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter(s => s !== id) : [...f.serviceIds, id],
        }));
    };

    return (
        <SettingsLayout>
            <div className="w-full pb-20 md:pb-0 space-y-6">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl md:text-3xl ${font.heading} ${colors.text} uppercase mb-2`}>
                            Planos do Clube
                        </h1>
                        <p className={`${colors.textSecondary} text-sm`}>
                            {clubPlansSubtitle}
                        </p>
                    </div>
                    <Button variant="primary" onClick={handleNew} forceTheme={isBeauty ? 'beauty' : 'barber'}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Plano
                    </Button>
                </header>

                <ClubOwnerNav />

                {isLoading ? (
                    <div role="status" className={`${colors.textSecondary} p-8`}>Carregando planos…</div>
                ) : isError && !plans ? (
                    <ErrorState title="Não foi possível carregar os planos" onRetry={() => void refetch()} />
                ) : plans && plans.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                        {plans.map(plan => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                compact
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={`${colors.card} ${colors.border} border rounded-2xl p-12 text-center space-y-3`}>
                        <Users className="w-12 h-12 mx-auto text-[var(--color-text-muted)]" />
                        <p className={`${colors.text} text-lg font-bold uppercase`}>Nenhum plano ainda</p>
                        <p className={`${colors.textSecondary} text-sm`}>
                            Crie seu primeiro plano para começar a receber assinaturas.
                        </p>
                        <Button variant="primary" onClick={handleNew} forceTheme={isBeauty ? 'beauty' : 'barber'}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeiro Plano
                        </Button>
                    </div>
                )}

                <Modal
                    open={showForm}
                    onClose={closeForm}
                    title={form.id ? 'Editar plano' : 'Novo plano'}
                    size="lg"
                    preventClose={saving}
                    footer={
                        <div className="flex gap-3 w-full">
                            <Button variant="ghost" onClick={closeForm} disabled={saving} fullWidth forceTheme={isBeauty ? 'beauty' : 'barber'}>
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={handleSave} loading={saving} fullWidth forceTheme={isBeauty ? 'beauty' : 'barber'}>
                                Salvar
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                            <div>
                                <label htmlFor="club-plan-name" className={`${classes.label} block mb-1.5`}>Nome do plano</label>
                                <input
                                    type="text"
                                    id="club-plan-name"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder={clubPlanNamePlaceholder}
                                    className={classes.input}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label htmlFor="club-plan-description" className={`${classes.label} block mb-1.5`}>Descrição (opcional)</label>
                                <textarea
                                    id="club-plan-description"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={clubPlanDescriptionPlaceholder}
                                    className={classes.input}
                                    rows={2}
                                />
                            </div>

                            <fieldset disabled={saving} className="space-y-2">
                                <legend className={`${classes.label} mb-1.5`}>Foto do plano <span className={colors.textSecondary}>(opcional)</span></legend>
                                <p id="club-photo-help" className={`text-sm ${colors.textSecondary}`}>
                                    A foto aparece no catálogo público do Clube. Use uma imagem horizontal em JPG, PNG ou WebP de até 5 MB.
                                </p>
                                {(photoPreview || (form.photoPath && !removePhoto)) && (
                                    photoPreview ? (
                                        <img
                                            src={photoPreview}
                                            alt="Prévia da foto do plano"
                                            className="aspect-[2/1] w-full rounded-xl object-cover"
                                            onError={() => {
                                                setPhotoFile(null);
                                                setPhotoError('Não foi possível abrir esta foto. Escolha outro arquivo.');
                                            }}
                                        />
                                    ) : form.photoPath && (
                                        <MembershipPlanPhoto path={form.photoPath} className="aspect-[2/1] w-full rounded-xl" />
                                    )
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-theme-accent ${colors.border} ${colors.text}`}>
                                        <ImagePlus className="size-4" aria-hidden="true" />
                                        {photoFile || (form.photoPath && !removePhoto) ? 'Trocar foto' : 'Adicionar foto'}
                                        <input
                                            type="file"
                                            accept={MEMBERSHIP_PHOTO_TYPES}
                                            aria-describedby={photoError ? 'club-photo-help club-photo-error' : 'club-photo-help'}
                                            className="sr-only"
                                            onChange={handlePhotoChange}
                                        />
                                    </label>
                                    {(photoFile || (form.photoPath && !removePhoto)) && (
                                        <button
                                            type="button"
                                            className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${colors.textSecondary} hover:bg-theme-surface`}
                                            onClick={() => {
                                                discardUpload();
                                                setPhotoFile(null);
                                                setPhotoError('');
                                                setRemovePhoto(true);
                                            }}
                                        >
                                            Remover foto
                                        </button>
                                    )}
                                </div>
                                {photoError && <p id="club-photo-error" role="alert" className="text-sm text-[var(--color-danger)]">{photoError}</p>}
                            </fieldset>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="club-plan-price" className={`${classes.label} block mb-1.5`}>Preço mensal ({currencySymbol})</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        id="club-plan-price"
                                        value={form.priceReais}
                                        onChange={e => setForm(f => ({ ...f, priceReais: e.target.value }))}
                                        placeholder="90,00"
                                        className={classes.input}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="club-plan-limit" className={`${classes.label} block mb-1.5`}>Limite / mês (vazio = ilimitado)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        id="club-plan-limit"
                                        value={form.usageLimit}
                                        onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                                        placeholder="∞"
                                        className={classes.input}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`${classes.label} block mb-1.5`}>Cor do badge</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {BADGE_COLORS.map(b => (
                                        <button
                                            key={b.value}
                                            type="button"
                                            aria-pressed={form.badgeColor === b.value}
                                            onClick={() => setForm(f => ({ ...f, badgeColor: b.value }))}
                                            className={[
                                                'py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border',
                                                form.badgeColor === b.value
                                                    ? `${accent.bg} text-[var(--color-on-accent)] border-transparent ${accent.shadow}`
                                                    : `${colors.inputBg} ${colors.border} ${colors.textMuted} hover:text-theme-textSecondary`,
                                            ].join(' ')}
                                        >
                                            {b.icon}
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={`${classes.label} block mb-1.5`}>
                                    Serviços inclusos ({form.serviceIds.length} selecionado{form.serviceIds.length !== 1 ? 's' : ''})
                                </label>
                                {services.length === 0 ? (
                                    <p className={`${colors.textMuted} text-xs`}>
                                        Cadastre serviços em <a href="#/configuracoes/servicos" className={`${accent.text} underline`}>Configurações &gt; Serviços</a> primeiro.
                                    </p>
                                ) : (
                                    <div className={`max-h-40 overflow-y-auto ${colors.inputBg} ${colors.border} border rounded-xl p-2 space-y-1`}>
                                        {services.map(s => {
                                            const selected = form.serviceIds.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => toggleService(s.id)}
                                                    className={[
                                                        'w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 transition-colors',
                                                        selected ? `${accent.bgDim} ${colors.text}` : `${colors.textSecondary} hover:bg-[var(--color-card-hover)]`,
                                                    ].join(' ')}
                                                >
                                                    <span className={[
                                                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                                                        selected ? `${accent.bg} border-transparent` : `${colors.border} border`,
                                                    ].join(' ')}>
                                                        {selected && <Check className="w-3 h-3 text-[var(--color-bg)]" />}
                                                    </span>
                                                    <span className="flex-1">{s.name}</span>
                                                    <span className={`${colors.textMuted} text-xs`}>{s.duration_minutes}min</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <span className={`${colors.text} text-sm`}>Plano disponível para novos clientes</span>
                            </label>
                    </div>
                </Modal>

                <ConfirmModal
                    open={!!pendingDeletePlan}
                    title="Excluir plano"
                    message={
                        pendingDeletePlan
                            ? `Excluir o plano "${pendingDeletePlan.name}"? Assinantes existentes serão preservados.`
                            : ''
                    }
                    confirmLabel="Excluir"
                    variant="danger"
                    loading={deleteMutation.isPending}
                    onCancel={() => setPendingDeletePlan(null)}
                    onConfirm={() => void confirmDelete()}
                />
            </div>
        </SettingsLayout>
    );
};
