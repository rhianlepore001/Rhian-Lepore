import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Check, X, MessageCircle, Search, Crown, Calendar, ChevronRight, Zap } from 'lucide-react';
import { Card, Modal, Button, ConfirmModal, PageHeader } from '../components/ui';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import {
    useClientMemberships,
    useConfirmMembershipPayment,
    useCancelMembership,
    useMembershipStats,
    usePixPaymentByMembership,
    useSimulatePixPaid,
} from '../hooks/useMemberships';
import { MembershipBadge } from '../components/membership/MembershipBadge';
import { PixActions } from '../components/membership/PixActions';
import { MembershipStatus, MembershipWithPlan } from '../services/memberships';
import { buildWhatsAppLink, formatCurrency } from '../utils/formatters';

const TABS: { value: MembershipStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'overdue', label: 'Atrasados' },
    { value: 'cancelled', label: 'Cancelados' },
];

const STATUS_LABELS: Record<MembershipStatus, { label: string; color: string }> = {
    active: { label: 'Ativo', color: 'text-[var(--color-success)]' },
    pending: { label: 'Aguardando', color: 'text-[var(--color-warning)]' },
    overdue: { label: 'Atrasado', color: 'text-[var(--color-danger)]' },
    cancelled: { label: 'Cancelado', color: 'text-[var(--color-text-muted)]' },
};

export const MembersList: React.FC = () => {
    const { accent, colors, classes, isBeauty, font } = useBrutalTheme();
    const { showToast } = useToast();
    const { user, region, businessName } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState<MembershipStatus | 'all'>('all');
    const [search, setSearch] = useState('');
    const [confirming, setConfirming] = useState<MembershipWithPlan | null>(null);
    const [confirmMethod, setConfirmMethod] = useState<'pix' | 'cash' | 'card'>('pix');
    const [cancelling, setCancelling] = useState<MembershipWithPlan | null>(null);
    const statusFilter = tab === 'all' ? undefined : tab;
    const { data: memberships, isLoading } = useClientMemberships(statusFilter);
    const confirmMutation = useConfirmMembershipPayment();
    const cancelMutation = useCancelMembership();
    const { data: stats } = useMembershipStats();

    const filtered = useMemo(() => {
        if (!memberships) return [];
        if (!search.trim()) return memberships;
        const s = search.toLowerCase();
        return memberships.filter(m =>
            (m.client?.name || '').toLowerCase().includes(s) ||
            (m.client?.phone || '').includes(s) ||
            (m.plan?.name || '').toLowerCase().includes(s)
        );
    }, [memberships, search]);

    const openConfirm = (m: MembershipWithPlan) => {
        setConfirmMethod(m.payment_method === 'pix' ? 'pix' : 'cash');
        setConfirming(m);
    };

    const handleConfirm = async () => {
        if (!user || !confirming) return;
        try {
            await confirmMutation.mutateAsync({ membershipId: confirming.id, method: confirmMethod });
            showToast(`${confirming.client?.name} agora é assinante ativo!`, 'success');
            setConfirming(null);
        } catch {
            showToast('Não foi possível confirmar o pagamento. Tente novamente.', 'error');
        }
    };

    const handleCancel = async () => {
        if (!cancelling) return;
        try {
            await cancelMutation.mutateAsync(cancelling.id);
            showToast('Assinatura cancelada.', 'success');
            setCancelling(null);
        } catch {
            showToast('Não foi possível cancelar a assinatura. Tente novamente.', 'error');
        }
    };

    const handleWhatsApp = (m: MembershipWithPlan) => {
        const phone = m.client?.phone || '';
        if (!phone.replace(/\D/g, '')) return;
        const message = `Olá ${m.client?.name?.split(' ')[0]}! Tudo bem? Aqui é ${businessName ? `da ${businessName}` : 'do seu clube de assinatura'}. Sobre seu plano "${m.plan?.name}"...`;
        window.open(buildWhatsAppLink(phone, region, message), '_blank');
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 pb-24">
            <PageHeader
                title="Assinantes"
                subtitle="Gerencie os membros do clube de assinatura."
                action={
                    <Button variant="secondary" icon={<Users className="w-4 h-4" />} onClick={() => navigate('/configuracoes/clube')}>
                        Gerenciar planos
                    </Button>
                }
            />

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                        <p className={`text-xs ${colors.textMuted} uppercase tracking-widest`}>Ativos</p>
                        <p className="text-3xl font-bold text-[var(--color-success)] mt-1">{stats.totalActive}</p>
                    </Card>
                    <Card>
                        <p className={`text-xs ${colors.textMuted} uppercase tracking-widest`}>Pendentes</p>
                        <p className="text-3xl font-bold text-[var(--color-warning)] mt-1">{stats.totalPending}</p>
                    </Card>
                    <Card>
                        <p className={`text-xs ${colors.textMuted} uppercase tracking-widest`}>Atrasados</p>
                        <p className="text-3xl font-bold text-[var(--color-danger)] mt-1">{stats.totalOverdue}</p>
                    </Card>
                    <Card>
                        <p className={`text-xs ${colors.textMuted} uppercase tracking-widest`}>Receita/mês (MRR)</p>
                        <p className={`text-3xl font-bold ${colors.text} mt-1`}>
                            {formatCurrency(stats.monthlyRecurringRevenueCents / 100, region)}
                        </p>
                    </Card>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 flex-1">
                    {TABS.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setTab(t.value)}
                            className={[
                                'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                                tab === t.value
                                    ? `${accent.bg} text-[var(--color-bg)]`
                                    : `${colors.inputBg} ${colors.border} ${colors.textMuted} border hover:text-theme-textSecondary`,
                            ].join(' ')}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome, telefone ou plano..."
                        className={`pl-9 pr-3 py-2 ${classes.input} w-full md:w-72`}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className={`${colors.textSecondary} p-8 text-center`}>Carregando...</div>
            ) : filtered.length === 0 ? (
                <Card>
                    <div className="text-center py-12 space-y-3">
                        <Users className={`w-12 h-12 mx-auto ${colors.textMuted}`} />
                        <p className={`${colors.text} text-lg`}>Nenhum assinante {tab !== 'all' ? `com status "${TABS.find(t => t.value === tab)?.label}"` : ''}.</p>
                        <p className={`${colors.textMuted} text-sm`}>
                            {tab === 'all' ? 'Crie planos em Configurações e compartilhe o link do clube.' : 'Mude o filtro para ver outros.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(m => {
                        const status = STATUS_LABELS[m.status];
                        return (
                            <Card key={m.id} className="hover:bg-[var(--color-card-hover)] transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${accent.bgDim} ${accent.text}`}>
                                            {(m.client?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`${colors.text} font-bold truncate`}>{m.client?.name || 'Sem nome'}</p>
                                                <MembershipBadge color={m.plan?.badge_color || 'gold'} label={m.plan?.badge_color || 'clube'} />
                                            </div>
                                            <p className={`text-sm ${colors.textSecondary} truncate`}>
                                                {m.client?.phone || 'sem telefone'} · {m.plan?.name || 'Plano removido'}
                                            </p>
                                            {m.next_billing_at && m.status === 'active' && (
                                                <p className="text-xs text-[var(--color-success)] mt-0.5 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Vence em {new Date(m.next_billing_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col items-start md:items-end gap-2 md:gap-1">
                                        <p className={`${colors.text} font-bold`}>
                                            {formatCurrency((m.plan?.price_cents || 0) / 100, region)}
                                            <span className={`${colors.textMuted} text-xs font-normal`}>/mês</span>
                                        </p>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${status.color}`}>{status.label}</p>
                                    </div>

                                    <div className="flex gap-2 flex-shrink-0">
                                        {m.client?.phone && (
                                            <button
                                                type="button"
                                                onClick={() => handleWhatsApp(m)}
                                                className={`p-2.5 rounded-xl ${colors.inputBg} ${colors.border} ${colors.textMuted} hover:text-theme-text border transition-colors`}
                                                aria-label="Enviar WhatsApp"
                                                title="WhatsApp"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {m.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => openConfirm(m)}
                                                disabled={confirmMutation.isPending}
                                                className="px-3 py-2 rounded-xl bg-[var(--color-success-bg)] text-[var(--color-success)] hover:bg-[var(--color-success)]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Confirmar
                                            </button>
                                        )}
                                        {(m.status === 'active' || m.status === 'overdue') && (
                                            <button
                                                type="button"
                                                onClick={() => setCancelling(m)}
                                                disabled={cancelMutation.isPending}
                                                className="px-3 py-2 rounded-xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {m.status === 'pending' && m.payment_method === 'pix' && (
                                    <PixActions membershipId={m.id} />
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <Modal
                open={!!confirming}
                onClose={() => setConfirming(null)}
                title="Confirmar pagamento"
                size="sm"
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="ghost" onClick={() => setConfirming(null)} disabled={confirmMutation.isPending}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleConfirm} loading={confirmMutation.isPending}>
                            Confirmar pagamento
                        </Button>
                    </div>
                }
            >
                {confirming && (
                    <div className="space-y-4">
                        <p className={`text-sm ${colors.textSecondary}`}>
                            {formatCurrency((confirming.plan?.price_cents || 0) / 100, region)} do plano{' '}
                            <span className={colors.text}>&quot;{confirming.plan?.name}&quot;</span> para{' '}
                            <span className={colors.text}>{confirming.client?.name}</span>.
                        </p>
                        <div>
                            <p className={`${classes.label} mb-2`}>Como o pagamento foi recebido?</p>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { value: 'pix', label: 'Pix' },
                                    { value: 'cash', label: 'Dinheiro' },
                                    { value: 'card', label: 'Cartão' },
                                ] as const).map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setConfirmMethod(value)}
                                        className={[
                                            'py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all',
                                            confirmMethod === value
                                                ? `${accent.bgDim} ${accent.border} ${accent.text}`
                                                : `${colors.inputBg} ${colors.border} ${colors.textMuted}`,
                                        ].join(' ')}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmModal
                open={!!cancelling}
                title="Cancelar assinatura"
                message={`Cancelar a assinatura de ${cancelling?.client?.name || 'este cliente'}? Ele perde os benefícios do plano imediatamente.`}
                confirmLabel="Cancelar assinatura"
                cancelLabel="Voltar"
                variant="danger"
                loading={cancelMutation.isPending}
                onConfirm={handleCancel}
                onCancel={() => setCancelling(null)}
            />
        </div>
    );
};
