import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, X, Crown, Sparkles, Check } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useToast } from '../../components/ui/Toast';
import {
    useMembershipPlans,
    useUpsertMembershipPlan,
    useDeleteMembershipPlan,
} from '../../hooks/useMemberships';
import { MembershipPlan, MembershipBadgeColor } from '../../services/memberships';
import { Button, Modal } from '../../components/ui';
import { PlanCard } from '../../components/membership/PlanCard';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const BADGE_COLORS: { value: MembershipBadgeColor; label: string; icon: React.ReactNode; gradient: string }[] = [
    { value: 'gold', label: 'Ouro', icon: <Crown className="w-4 h-4" />, gradient: 'from-yellow-500/30 to-amber-600/10' },
    { value: 'silver', label: 'Prata', icon: <Sparkles className="w-4 h-4" />, gradient: 'from-slate-400/30 to-slate-600/10' },
    { value: 'bronze', label: 'Bronze', icon: <Sparkles className="w-4 h-4" />, gradient: 'from-orange-700/30 to-orange-900/10' },
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
    const { accent, colors, classes, isBeauty, font } = useBrutalTheme();
    const { showToast } = useToast();
    const { companyId } = useAuth();
    const { data: plans, isLoading } = useMembershipPlans();
    const upsertMutation = useUpsertMembershipPlan();
    const deleteMutation = useDeleteMembershipPlan();
    const [services, setServices] = useState<Array<{ id: string; name: string; price: number; duration_minutes: number }>>([]);

    React.useEffect(() => {
        if (!companyId) return;
        (async () => {
            const { data } = await supabase
                .from('services')
                .select('id, name, price, duration_minutes')
                .eq('user_id', companyId)
                .order('name');
            setServices((data ?? []) as Array<{ id: string; name: string; price: number; duration_minutes: number }>);
        })();
    }, [companyId]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<PlanFormState>(emptyForm);

    const handleNew = () => {
        setForm(emptyForm);
        setShowForm(true);
    };

    const handleEdit = (plan: MembershipPlan) => {
        setForm({
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            priceReais: (plan.price_cents / 100).toFixed(2).replace('.', ','),
            serviceIds: plan.service_ids,
            usageLimit: plan.usage_limit_per_month?.toString() ?? '',
            badgeColor: plan.badge_color,
            active: plan.active,
        });
        setShowForm(true);
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
            setShowForm(false);
            setForm(emptyForm);
        } catch (err) {
            showToast('Erro: ' + (err as Error).message, 'error');
        }
    };

    const handleDelete = async (plan: MembershipPlan) => {
        if (!confirm(`Excluir o plano "${plan.name}"? Assinantes existentes serão preservados.`)) return;
        try {
            await deleteMutation.mutateAsync(plan.id);
            showToast('Plano excluído.', 'success');
        } catch (err) {
            showToast('Erro: ' + (err as Error).message, 'error');
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
            <div className="max-w-5xl pb-20 md:pb-0 space-y-6">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl md:text-3xl ${font.heading} ${colors.text} uppercase mb-2`}>
                            Planos do Clube
                        </h1>
                        <p className={`${colors.textSecondary} text-sm`}>
                            Crie os planos que seus clientes podem assinar (corte ilimitado, combo, etc).
                        </p>
                    </div>
                    <Button variant="primary" onClick={handleNew} forceTheme={isBeauty ? 'beauty' : 'barber'}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Plano
                    </Button>
                </header>

                {!isBeauty && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <a href="#/configuracoes/clube/pix" className={`${accent.text} underline`}>← Configurar Pix</a>
                    </div>
                )}

                {isLoading ? (
                    <div className={`${colors.textSecondary} p-8`}>Carregando planos...</div>
                ) : plans && plans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plans.map(plan => (
                            <div key={plan.id} className="relative group">
                                <PlanCard plan={plan} compact />
                                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(plan)}
                                        className="p-2 rounded-lg bg-[var(--color-bg)]/60 hover:bg-[var(--color-bg)]/80 text-[var(--color-text)] backdrop-blur-sm transition-colors"
                                        aria-label="Editar plano"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(plan)}
                                        className="p-2 rounded-lg bg-[var(--color-danger)]/60 hover:bg-[var(--color-danger-bg)] text-[var(--color-text)] backdrop-blur-sm transition-colors"
                                        aria-label="Excluir plano"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
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
                    onClose={() => setShowForm(false)}
                    title={form.id ? 'Editar plano' : 'Novo plano'}
                    size="lg"
                    preventClose={upsertMutation.isPending}
                    footer={
                        <div className="flex gap-3 w-full">
                            <Button variant="ghost" onClick={() => setShowForm(false)} fullWidth forceTheme={isBeauty ? 'beauty' : 'barber'}>
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={handleSave} loading={upsertMutation.isPending} fullWidth forceTheme={isBeauty ? 'beauty' : 'barber'}>
                                Salvar
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                            <div>
                                <label className={`${classes.label} block mb-1.5`}>Nome do plano</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Corte Ilimitado"
                                    className={classes.input}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className={`${classes.label} block mb-1.5`}>Descrição (opcional)</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Cortes de cabelo ilimitados durante o mês."
                                    className={classes.input}
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`${classes.label} block mb-1.5`}>Preço mensal (R$)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.priceReais}
                                        onChange={e => setForm(f => ({ ...f, priceReais: e.target.value }))}
                                        placeholder="90,00"
                                        className={classes.input}
                                    />
                                </div>
                                <div>
                                    <label className={`${classes.label} block mb-1.5`}>Limite / mês (vazio = ilimitado)</label>
                                    <input
                                        type="number"
                                        min="1"
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
                                            onClick={() => setForm(f => ({ ...f, badgeColor: b.value }))}
                                            className={[
                                                'py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border',
                                                form.badgeColor === b.value
                                                    ? `${accent.bg} text-[var(--color-bg)] border-transparent ${accent.shadow}`
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
            </div>
        </SettingsLayout>
    );
};
