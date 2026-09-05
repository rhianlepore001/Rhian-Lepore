import React, { useState } from 'react';
import { Plus, Users, Check, ChevronLeft } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useToast } from '../../components/ui/Toast';
import {
    useMembershipPlans,
    useUpsertMembershipPlan,
    useDeleteMembershipPlan,
} from '../../hooks/useMemberships';
import { MembershipPlan, MembershipBadgeColor } from '../../services/memberships';
import { Button, ConfirmModal, EmptyState, ErrorState, PageHeader } from '../../components/ui';
import { PlanCard } from '../../components/membership/PlanCard';
import { ClubOwnerNav } from '../../components/membership/ClubOwnerNav';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessCopy } from '../../hooks/useBusinessCopy';
import { useTenantLocale } from '../../hooks/useTenantLocale';
import { useServices } from '../../hooks/useServiceSettings';

const BADGE_COLORS: { value: MembershipBadgeColor; label: string }[] = [
    { value: 'gold', label: 'Ouro' },
    { value: 'silver', label: 'Prata' },
    { value: 'bronze', label: 'Bronze' },
];

interface PlanFormState {
    id?: string;
    name: string;
    description: string;
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
    const { accent, colors, classes, isBeauty } = useBrutalTheme();
    const { showToast } = useToast();
    const { companyId } = useAuth();
    const {
        clubPlanNamePlaceholder,
        clubPlanDescriptionPlaceholder,
        clubPlansSubtitle,
    } = useBusinessCopy();
    const { currencySymbol } = useTenantLocale();
    const { data: plans, isLoading, isError, refetch } = useMembershipPlans();
    const { data: catalogServices = [] } = useServices(companyId);
    const upsertMutation = useUpsertMembershipPlan();
    const deleteMutation = useDeleteMembershipPlan();
    const theme = isBeauty ? 'beauty' : 'barber';

    const [view, setView] = useState<'list' | 'form'>('list');
    const [form, setForm] = useState<PlanFormState>(emptyForm);
    const [pendingDeletePlan, setPendingDeletePlan] = useState<MembershipPlan | null>(null);

    const handleNew = () => {
        setForm(emptyForm);
        setView('form');
    };

    const handleEdit = (plan: MembershipPlan) => {
        setForm({
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            priceReais: (plan.price_cents / 100).toFixed(2).replace('.', ','),
            serviceIds: Array.isArray(plan.service_ids) ? plan.service_ids : [],
            usageLimit: plan.usage_limit_per_month?.toString() ?? '',
            badgeColor: plan.badge_color,
            active: plan.active,
        });
        setView('form');
    };

    const handleBack = () => {
        if (upsertMutation.isPending) return;
        setView('list');
        setForm(emptyForm);
    };

    const handleSave = async () => {
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
        try {
            await upsertMutation.mutateAsync({
                id: form.id,
                name: form.name.trim(),
                description: form.description.trim() || null,
                price_cents: Math.round(priceNumber * 100),
                service_ids: form.serviceIds,
                usage_limit_per_month: limit,
                badge_color: form.badgeColor,
                active: form.active,
            });
            showToast(form.id ? 'Plano atualizado!' : 'Plano criado!', 'success');
            setView('list');
            setForm(emptyForm);
        } catch {
            showToast('Não foi possível salvar o plano. Tente novamente.', 'error');
        }
    };

    const handleDelete = (plan: MembershipPlan) => {
        setPendingDeletePlan(plan);
    };

    const confirmDelete = async () => {
        if (!pendingDeletePlan) return;
        try {
            await deleteMutation.mutateAsync(pendingDeletePlan.id);
            showToast('Plano excluído.', 'success');
        } catch {
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
            <div className="w-full pb-20 md:pb-0 space-y-6 min-w-0">
                {view === 'list' ? (
                    <>
                        <PageHeader
                            title="Planos do Clube"
                            subtitle={clubPlansSubtitle}
                            forceTheme={theme}
                            action={
                                <Button variant="primary" onClick={handleNew} forceTheme={theme} icon={<Plus />}>
                                    Novo plano
                                </Button>
                            }
                        />

                        <ClubOwnerNav />

                        {isLoading ? (
                            <div className={`${colors.textSecondary} p-8`}>Carregando planos...</div>
                        ) : isError ? (
                            <ErrorState
                                title="Não foi possível carregar os planos"
                                message="Verifique a conexão e tente de novo. Os planos já criados não foram apagados."
                                onRetry={() => { void refetch(); }}
                                forceTheme={theme}
                            />
                        ) : plans && plans.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2" data-testid="club-plans-list">
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
                            <EmptyState
                                icon={Users}
                                title="Nenhum plano ainda"
                                description="Crie seu primeiro plano para começar a receber assinaturas."
                                bordered
                                forceTheme={theme}
                                action={
                                    <Button variant="primary" onClick={handleNew} forceTheme={theme} icon={<Plus />}>
                                        Criar primeiro plano
                                    </Button>
                                }
                            />
                        )}
                    </>
                ) : (
                    <div className="space-y-6 min-w-0" data-testid="club-plan-form">
                        <div className="space-y-3">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                disabled={upsertMutation.isPending}
                                forceTheme={theme}
                                icon={<ChevronLeft />}
                            >
                                Voltar
                            </Button>
                            <h1 className={`text-2xl font-bold tracking-tight ${colors.text} leading-tight`}>
                                {form.id ? 'Editar plano' : 'Novo plano'}
                            </h1>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={`${classes.label} block mb-1.5`} htmlFor="club-plan-name">Nome do plano</label>
                                <input
                                    id="club-plan-name"
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder={clubPlanNamePlaceholder}
                                    className={classes.input}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className={`${classes.label} block mb-1.5`} htmlFor="club-plan-description">Descrição (opcional)</label>
                                <textarea
                                    id="club-plan-description"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={clubPlanDescriptionPlaceholder}
                                    className={classes.input}
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={`${classes.label} block mb-1.5`} htmlFor="club-plan-price">Preço mensal ({currencySymbol})</label>
                                    <input
                                        id="club-plan-price"
                                        type="text"
                                        inputMode="decimal"
                                        value={form.priceReais}
                                        onChange={e => setForm(f => ({ ...f, priceReais: e.target.value }))}
                                        placeholder="90,00"
                                        className={classes.input}
                                    />
                                </div>
                                <div>
                                    <label className={`${classes.label} block mb-1.5`} htmlFor="club-plan-limit">Limite / mês (vazio = ilimitado)</label>
                                    <input
                                        id="club-plan-limit"
                                        type="number"
                                        min="1"
                                        value={form.usageLimit}
                                        onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                                        placeholder="Ilimitado"
                                        className={classes.input}
                                    />
                                </div>
                            </div>

                            <div>
                                <p className={`${classes.label} block mb-1.5`}>Destaque</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {BADGE_COLORS.map(b => (
                                        <button
                                            key={b.value}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, badgeColor: b.value }))}
                                            className={[
                                                'py-3 px-2 min-h-[44px] rounded-xl text-xs font-semibold transition-colors border',
                                                form.badgeColor === b.value
                                                    ? `${accent.bg} text-[var(--color-on-accent)] border-transparent`
                                                    : `${colors.inputBg} ${colors.border} ${colors.textMuted}`,
                                            ].join(' ')}
                                        >
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className={`${classes.label} block mb-1.5`}>
                                    Serviços inclusos ({form.serviceIds.length} selecionado{form.serviceIds.length !== 1 ? 's' : ''})
                                </p>
                                {catalogServices.length === 0 ? (
                                    <p className={`${colors.textMuted} text-xs`}>
                                        Cadastre serviços em <a href="#/configuracoes/servicos" className={`${accent.text} underline`}>Ajustes &gt; Serviços</a> primeiro.
                                    </p>
                                ) : (
                                    <div className={`max-h-52 overflow-y-auto ${colors.inputBg} ${colors.border} border rounded-xl p-2 space-y-1`}>
                                        {catalogServices.map(s => {
                                            const selected = form.serviceIds.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => toggleService(s.id)}
                                                    className={[
                                                        'w-full text-left p-2 min-h-[44px] rounded-lg text-sm flex items-center gap-2',
                                                        selected ? `${accent.bgDim} ${colors.text}` : `${colors.textSecondary}`,
                                                    ].join(' ')}
                                                >
                                                    <span className={[
                                                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                                                        selected ? `${accent.bg} border-transparent` : `${colors.border} border`,
                                                    ].join(' ')}>
                                                        {selected && <Check className="w-3 h-3 text-[var(--color-on-accent)]" />}
                                                    </span>
                                                    <span className="flex-1 min-w-0 break-words">{s.name}</span>
                                                    <span className={`${colors.textMuted} text-xs shrink-0`}>{s.duration_minutes}min</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <span className={`${colors.text} text-sm`}>Plano disponível para novos clientes</span>
                            </label>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-3">
                            <Button variant="ghost" onClick={handleBack} fullWidth forceTheme={theme} disabled={upsertMutation.isPending}>
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={handleSave} loading={upsertMutation.isPending} fullWidth forceTheme={theme}>
                                Salvar
                            </Button>
                        </div>
                    </div>
                )}

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
