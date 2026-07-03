import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Check, X, MessageCircle, Search, Crown, Calendar, ChevronRight, Zap } from 'lucide-react';
import { Card } from '../components/ui';
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
import { formatCurrency } from '../utils/formatters';

const TABS: { value: MembershipStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'overdue', label: 'Atrasados' },
    { value: 'cancelled', label: 'Cancelados' },
];

const STATUS_LABELS: Record<MembershipStatus, { label: string; color: string }> = {
    active: { label: 'Ativo', color: 'text-green-400' },
    pending: { label: 'Aguardando', color: 'text-amber-400' },
    overdue: { label: 'Atrasado', color: 'text-red-400' },
    cancelled: { label: 'Cancelado', color: 'text-neutral-500' },
};

export const MembersList: React.FC = () => {
    const { accent, colors, classes, isBeauty, font } = useBrutalTheme();
    const { showToast } = useToast();
    const { user, region } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState<MembershipStatus | 'all'>('all');
    const [search, setSearch] = useState('');
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

    const handleConfirm = async (m: MembershipWithPlan) => {
        if (!user) return;
        if (!window.confirm(`Confirmar ${formatCurrency((m.plan?.price_cents || 0) / 100, region)} do plano "${m.plan?.name}" para ${m.client?.name}?`)) return;
        try {
            await confirmMutation.mutateAsync({ membershipId: m.id, method: 'pix' });
            showToast(`${m.client?.name} agora é assinante ativo!`, 'success');
        } catch (err) {
            showToast('Erro: ' + (err as Error).message, 'error');
        }
    };

    const handleCancel = async (m: MembershipWithPlan) => {
        if (!window.confirm(`Cancelar a assinatura de ${m.client?.name}?`)) return;
        try {
            await cancelMutation.mutateAsync(m.id);
            showToast('Assinatura cancelada.', 'success');
        } catch (err) {
            showToast('Erro: ' + (err as Error).message, 'error');
        }
    };

    const handleWhatsApp = (m: MembershipWithPlan) => {
        const phone = (m.client?.phone || '').replace(/\D/g, '');
        if (!phone) return;
        const text = encodeURIComponent(
            `Olá ${m.client?.name?.split(' ')[0]}! Tudo bem? Aqui é da barbearia. Sobre seu plano "${m.plan?.name}"...`
        );
        window.open(`https://wa.me/55${phone}?text=${text}`, '_blank');
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 pb-24">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className={`text-3xl md:text-4xl ${font.heading} text-white uppercase tracking-tighter flex items-center gap-3`}>
                        <Crown className="w-8 h-8 text-yellow-400" />
                        Assinantes
                    </h1>
                    <p className="text-neutral-400 text-sm mt-1">
                        Gerencie os membros do clube de assinatura.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/configuracoes/clube')}
                    className={`px-4 py-2 rounded-xl ${colors.card} ${colors.border} ${colors.text} border text-sm font-bold uppercase tracking-wider hover:bg-white/5`}
                >
                    <Users className="w-4 h-4 inline mr-2" />
                    Gerenciar Planos
                </button>
            </header>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest">Ativos</p>
                        <p className="text-3xl font-bold text-green-400 mt-1">{stats.totalActive}</p>
                    </Card>
                    <Card>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest">Pendentes</p>
                        <p className="text-3xl font-bold text-amber-400 mt-1">{stats.totalPending}</p>
                    </Card>
                    <Card>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest">Atrasados</p>
                        <p className="text-3xl font-bold text-red-400 mt-1">{stats.totalOverdue}</p>
                    </Card>
                    <Card>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest">MRR</p>
                        <p className="text-3xl font-bold text-white mt-1">
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
                                    : `${colors.inputBg} ${colors.border} ${colors.textMuted} border hover:${colors.textSecondary}`,
                            ].join(' ')}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
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
                <div className="text-neutral-400 p-8 text-center">Carregando...</div>
            ) : filtered.length === 0 ? (
                <Card>
                    <div className="text-center py-12 space-y-3">
                        <Users className="w-12 h-12 mx-auto text-neutral-600" />
                        <p className="text-white text-lg">Nenhum assinante {tab !== 'all' ? `com status "${TABS.find(t => t.value === tab)?.label}"` : ''}.</p>
                        <p className="text-neutral-500 text-sm">
                            {tab === 'all' ? 'Crie planos em Configurações e compartilhe o link do clube.' : 'Mude o filtro para ver outros.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(m => {
                        const status = STATUS_LABELS[m.status];
                        return (
                            <Card key={m.id} className="hover:bg-white/5 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${accent.bgDim} ${accent.text}`}>
                                            {(m.client?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-white font-bold truncate">{m.client?.name || 'Sem nome'}</p>
                                                <MembershipBadge color={m.plan?.badge_color || 'gold'} label={m.plan?.badge_color || 'clube'} />
                                            </div>
                                            <p className="text-sm text-neutral-400 truncate">
                                                {m.client?.phone || 'sem telefone'} · {m.plan?.name || 'Plano removido'}
                                            </p>
                                            {m.next_billing_at && m.status === 'active' && (
                                                <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Vence em {new Date(m.next_billing_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col items-start md:items-end gap-2 md:gap-1">
                                        <p className="text-white font-bold">
                                            {formatCurrency((m.plan?.price_cents || 0) / 100, region)}
                                            <span className="text-neutral-500 text-xs font-normal">/mês</span>
                                        </p>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${status.color}`}>{status.label}</p>
                                    </div>

                                    <div className="flex gap-2 flex-shrink-0">
                                        {m.client?.phone && (
                                            <button
                                                type="button"
                                                onClick={() => handleWhatsApp(m)}
                                                className={`p-2.5 rounded-xl ${colors.inputBg} ${colors.border} ${colors.textMuted} hover:${colors.text} border transition-colors`}
                                                aria-label="Enviar WhatsApp"
                                                title="WhatsApp"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {m.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => handleConfirm(m)}
                                                disabled={confirmMutation.isPending}
                                                className="px-3 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Confirmar
                                            </button>
                                        )}
                                        {(m.status === 'active' || m.status === 'overdue') && (
                                            <button
                                                type="button"
                                                onClick={() => handleCancel(m)}
                                                disabled={cancelMutation.isPending}
                                                className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
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
        </div>
    );
};
