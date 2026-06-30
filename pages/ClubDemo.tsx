import React, { useState, useEffect, useMemo } from 'react';
import { Check, Crown, Copy, MessageCircle, Store, ArrowRight, Users, Calendar, CreditCard, Search, Plus, X, Save, Sparkles } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

const MOCK_PLANS = [
    { id: 'p1', name: 'Corte Ilimitado', description: 'Cortes de cabelo quantas vezes quiser no mês.', price_cents: 9000, badge_color: 'gold', service_ids: ['s1'], usage_limit_per_month: null, active: true },
    { id: 'p2', name: 'Combo VIP', description: 'Corte + Barba + Sobrancelha ilimitados.', price_cents: 13000, badge_color: 'silver', service_ids: ['s1', 's2', 's3'], usage_limit_per_month: null, active: true },
    { id: 'p3', name: 'Acabamento', description: 'Apenas acabamento/pezinho, 2x por mês.', price_cents: 4500, badge_color: 'bronze', service_ids: ['s4'], usage_limit_per_month: 2, active: true },
];

const MOCK_PIX = {
    pix_key_type: 'cpf' as const,
    pix_key_value: '52998224725',
    pix_holder_name: 'Barbearia Silva',
    pix_merchant_city: 'SAO PAULO',
};

type MemberStatus = 'active' | 'pending' | 'overdue' | 'cancelled';

const MOCK_MEMBERS: Array<{ id: string; name: string; phone: string; plan: typeof MOCK_PLANS[0]; status: MemberStatus; next_billing_at: string | null }> = [
    { id: 'm1', name: 'João Pereira', phone: '11987654321', plan: MOCK_PLANS[0], status: 'active', next_billing_at: '2026-07-28' },
    { id: 'm2', name: 'Lucas Mendes', phone: '11912345678', plan: MOCK_PLANS[1], status: 'active', next_billing_at: '2026-07-15' },
    { id: 'm3', name: 'Pedro Costa', phone: '11955554444', plan: MOCK_PLANS[0], status: 'pending', next_billing_at: null },
    { id: 'm4', name: 'Carlos Silva', phone: '11933332222', plan: MOCK_PLANS[2], status: 'overdue', next_billing_at: '2026-06-20' },
];

type Tab = 'plans' | 'pix' | 'members' | 'join' | 'pix-display';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'plans', label: 'Planos', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'pix', label: 'Configurar Pix', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'members', label: 'Assinantes', icon: <Users className="w-4 h-4" /> },
    { value: 'join', label: 'Cliente contrata', icon: <Crown className="w-4 h-4" /> },
    { value: 'pix-display', label: 'Cliente vê QR Pix', icon: <Copy className="w-4 h-4" /> },
];

const BADGE_STYLES: Record<string, { gradient: string; ring: string; iconBg: string; label: string; icon: React.ReactNode }> = {
    gold: { gradient: 'from-yellow-500/30 to-amber-600/10', ring: 'ring-yellow-500/40', iconBg: 'from-yellow-500/30 to-amber-600/10', label: 'Ouro', icon: <Crown className="w-5 h-5" /> },
    silver: { gradient: 'from-slate-400/30 to-slate-600/10', ring: 'ring-slate-400/40', iconBg: 'from-slate-400/30 to-slate-600/10', label: 'Prata', icon: <Sparkles className="w-5 h-5" /> },
    bronze: { gradient: 'from-orange-700/30 to-orange-900/10', ring: 'ring-orange-700/40', iconBg: 'from-orange-700/30 to-orange-900/10', label: 'Bronze', icon: <Sparkles className="w-5 h-5" /> },
};

export const ClubDemo: React.FC = () => {
    const [tab, setTab] = useState<Tab>('plans');
    const [members, setMembers] = useState(MOCK_MEMBERS);
    const [pixKey, setPixKey] = useState(MOCK_PIX.pix_key_value);
    const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'phone' | 'email' | 'random'>('cpf');
    const [joinStep, setJoinStep] = useState<'choose' | 'pay'>('choose');
    const [selectedPlan, setSelectedPlan] = useState<typeof MOCK_PLANS[0] | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'in_person'>('pix');
    const [showForm, setShowForm] = useState(false);
    const { showToast } = useToast();

    const stats = useMemo(() => {
        const active = members.filter(m => m.status === 'active').length;
        const pending = members.filter(m => m.status === 'pending').length;
        const overdue = members.filter(m => m.status === 'overdue').length;
        const mrr = members.filter(m => m.status === 'active').reduce((s, m) => s + m.plan.price_cents, 0);
        return { active, pending, overdue, mrr };
    }, [members]);

    const confirmMember = (id: string) => {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'active' as const, next_billing_at: '2026-07-30' } : m));
        showToast('Membro ativado!', 'success');
    };

    const cancelMember = (id: string) => {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'cancelled' as const } : m));
        showToast('Assinatura cancelada.', 'success');
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-heading text-white uppercase tracking-tight flex items-center gap-3">
                            <Crown className="w-7 h-7 text-yellow-400" />
                            Clube de Assinatura
                        </h1>
                        <p className="text-neutral-400 text-sm mt-1">
                            Demo visual do Sprint D — todas as telas renderizadas com dados mock para revisão.
                        </p>
                    </div>
                    <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
                        feature/sprint-d-clube-mvp1
                    </span>
                </header>

                <div className="flex flex-wrap gap-2">
                    {TABS.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setTab(t.value)}
                            className={[
                                'px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all',
                                tab === t.value
                                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                                    : 'bg-white/5 text-neutral-400 hover:bg-white/10',
                            ].join(' ')}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'plans' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-heading text-white uppercase">Planos do Clube</h2>
                            <button
                                type="button"
                                onClick={() => setShowForm(true)}
                                className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-bold uppercase text-sm flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Novo Plano
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {MOCK_PLANS.map(plan => (
                                <PlanCardMock key={plan.id} plan={plan} onSelect={() => showToast('Demo: clique em contratar (mobile)', 'info')} />
                            ))}
                        </div>
                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
                                <div className="absolute inset-0 bg-black/80" onClick={() => setShowForm(false)} />
                                <div className="relative w-full max-w-lg bg-[#1C1C1C] border border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-heading text-white uppercase">Novo Plano</h3>
                                        <button type="button" onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
                                    </div>
                                    <Field label="Nome" placeholder="Corte Ilimitado" />
                                    <Field label="Descrição" placeholder="Cortes de cabelo quantas vezes quiser" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Preço (R$)" placeholder="90,00" />
                                        <Field label="Limite/mês" placeholder="vazio = ilimitado" />
                                    </div>
                                    <ColorPicker />
                                    <ServicePicker />
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-neutral-400 font-bold uppercase text-sm">Cancelar</button>
                                        <button type="button" onClick={() => { setShowForm(false); showToast('Plano criado (demo)', 'success'); }} className="flex-1 py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-bold uppercase text-sm">Salvar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'pix' && (
                    <div className="max-w-2xl space-y-4">
                        <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl p-6 space-y-5">
                            <h2 className="text-lg font-heading text-white uppercase">Seu Pix</h2>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1.5">Tipo de chave</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {(['cpf', 'cnpj', 'phone', 'email', 'random'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setPixKeyType(t)}
                                            className={[
                                                'py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all',
                                                pixKeyType === t
                                                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                                                    : 'bg-white/5 text-neutral-500 border border-white/10',
                                            ].join(' ')}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Field label={`${pixKeyType.toUpperCase()}`} value={pixKey} onChange={setPixKey} placeholder={pixKeyType === 'cpf' ? '000.000.000-00' : pixKeyType === 'phone' ? '(11) 98765-4321' : 'voce@email.com'} />
                            <Field label="Nome do recebedor" value={MOCK_PIX.pix_holder_name} onChange={() => {}} placeholder="João Silva" />
                            <Field label="Cidade" value={MOCK_PIX.pix_merchant_city} onChange={() => {}} placeholder="SAO PAULO" />
                            <button
                                type="button"
                                onClick={() => showToast('Pix salvo (demo)', 'success')}
                                className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-bold uppercase text-sm flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Salvar Pix
                            </button>
                        </div>
                    </div>
                )}

                {tab === 'members' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard label="Ativos" value={stats.active} color="text-green-400" />
                            <StatCard label="Pendentes" value={stats.pending} color="text-amber-400" />
                            <StatCard label="Atrasados" value={stats.overdue} color="text-red-400" />
                            <StatCard label="MRR" value={`R$ ${(stats.mrr / 100).toFixed(2).replace('.', ',')}`} color="text-white" />
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 md:items-center">
                            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 flex-1">
                                {(['all', 'active', 'pending', 'overdue', 'cancelled'] as const).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap bg-white/5 text-neutral-400 border border-white/10"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                <input type="text" placeholder="Buscar..." className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm w-full md:w-72 text-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {members.map(m => (
                                <MemberRow key={m.id} member={m} onConfirm={() => confirmMember(m.id)} onCancel={() => cancelMember(m.id)} />
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'join' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {joinStep === 'choose' && (
                            <>
                                <h2 className="text-2xl font-heading text-white uppercase tracking-tight flex items-center gap-3">
                                    <Crown className="w-6 h-6 text-yellow-400" /> Clube de Assinatura
                                </h2>
                                <p className="text-neutral-400 text-sm -mt-3">Vantagens exclusivas todo mês, pagando menos por cada serviço.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {MOCK_PLANS.map(plan => (
                                        <PlanCardMock key={plan.id} plan={plan} onSelect={(p) => { setSelectedPlan(p); setJoinStep('pay'); }} actionLabel="Quero assinar" />
                                    ))}
                                </div>
                            </>
                        )}
                        {joinStep === 'pay' && selectedPlan && (
                            <div className="space-y-4">
                                <button type="button" onClick={() => setJoinStep('choose')} className="text-sm text-neutral-400 hover:text-white">← Escolher outro plano</button>
                                <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-xl font-heading text-white uppercase">{selectedPlan.name}</h3>
                                    <p className="text-neutral-400 text-sm">Mensalidade: R$ {(selectedPlan.price_cents / 100).toFixed(2).replace('.', ',')}</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Seu nome" placeholder="João Silva" />
                                        <Field label="Seu WhatsApp" placeholder="(11) 98765-4321" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-neutral-400 mb-2">Como prefere pagar?</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('pix')}
                                                className={[
                                                    'p-4 rounded-xl border-2 text-left',
                                                    paymentMethod === 'pix' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 bg-white/5',
                                                ].join(' ')}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MessageCircle className="w-5 h-5 text-[var(--color-accent)]" />
                                                    <span className="text-white uppercase text-sm font-bold">Pix agora</span>
                                                </div>
                                                <p className="text-xs text-neutral-400">Paga e confirmação em segundos.</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('in_person')}
                                                className={[
                                                    'p-4 rounded-xl border-2 text-left',
                                                    paymentMethod === 'in_person' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 bg-white/5',
                                                ].join(' ')}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Store className="w-5 h-5 text-[var(--color-accent)]" />
                                                    <span className="text-white uppercase text-sm font-bold">No balcão</span>
                                                </div>
                                                <p className="text-xs text-neutral-400">Dinheiro ou cartão na próxima visita.</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setTab('pix-display'); setJoinStep('choose'); }}
                                    className="w-full py-4 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                                >
                                    Ver QR Code <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'pix-display' && (
                    <div className="max-w-md mx-auto">
                        <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Copy className="w-5 h-5 text-[var(--color-accent)]" />
                                <h3 className="text-white uppercase tracking-wide font-bold">Pagar com Pix</h3>
                            </div>
                            <p className="text-neutral-300 text-sm">Escaneie o QR Code ou copie o código. A confirmação chega em segundos.</p>
                            <div className="flex justify-center bg-white p-4 rounded-xl">
                                <div className="w-64 h-64 grid grid-cols-16 gap-px" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
                                    {Array.from({ length: 16 * 16 }).map((_, i) => (
                                        <div key={i} className={((i * 17) % 3 === 0 || (i * 31) % 5 === 0) ? 'bg-black' : 'bg-white'} />
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => showToast('Código Pix copiado!', 'success')}
                                className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2"
                            >
                                <Copy className="w-4 h-4" /> Copiar código Pix
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Field: React.FC<{ label: string; value?: string; onChange?: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm text-neutral-400 mb-1.5">{label}</label>
        <input
            type="text"
            value={value}
            onChange={e => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[var(--color-accent)]"
        />
    </div>
);

const ColorPicker: React.FC = () => (
    <div>
        <label className="block text-sm text-neutral-400 mb-1.5">Cor do badge</label>
        <div className="grid grid-cols-3 gap-2">
            {['gold', 'silver', 'bronze'].map(c => (
                <button key={c} type="button" className={`py-3 rounded-xl text-xs font-bold uppercase border ${c === 'gold' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-white/5 text-neutral-500 border-white/10'}`}>
                    {c}
                </button>
            ))}
        </div>
    </div>
);

const ServicePicker: React.FC = () => (
    <div>
        <label className="block text-sm text-neutral-400 mb-1.5">Serviços inclusos (1 selecionado)</label>
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 space-y-1">
            {['Corte Masculino', 'Barba', 'Combo Corte + Barba', 'Acabamento/Pezinho', 'Sobrancelha'].map((s, i) => (
                <button key={s} type="button" className={`w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 ${i === 0 ? 'bg-[var(--color-accent)]/10 text-white' : 'text-neutral-400'}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${i === 0 ? 'bg-[var(--color-accent)] border-transparent' : 'border-white/20'}`}>
                        {i === 0 && <Check className="w-3 h-3 text-black" />}
                    </span>
                    <span className="flex-1">{s}</span>
                </button>
            ))}
        </div>
    </div>
);

const StatCard: React.FC<{ label: string; value: number | string; color: string }> = ({ label, value, color }) => (
    <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl p-4">
        <p className="text-xs text-neutral-500 uppercase tracking-widest">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
);

const PlanCardMock: React.FC<{ plan: typeof MOCK_PLANS[0]; onSelect: (p: any) => void; actionLabel?: string }> = ({ plan, onSelect, actionLabel = 'Quero este plano' }) => {
    const style = BADGE_STYLES[plan.badge_color];
    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-[#1C1C1C] border-white/10 ring-1 ${style.ring}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} pointer-events-none`} />
            <div className="relative p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${style.iconBg} text-white`}>{style.icon}</div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Disponível
                    </span>
                </div>
                <div>
                    <h3 className="text-xl font-heading text-white uppercase tracking-tight">{plan.name}</h3>
                    <p className="text-neutral-400 text-sm mt-1.5 leading-relaxed">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-heading text-white">R$ {(plan.price_cents / 100).toFixed(2).replace('.', ',')}</span>
                    <span className="text-neutral-500 text-sm">/mês</span>
                </div>
                {plan.usage_limit_per_month ? (
                    <p className="text-neutral-500 text-xs">Limite: {plan.usage_limit_per_month} uso{plan.usage_limit_per_month > 1 ? 's' : ''} por mês</p>
                ) : (
                    <p className="text-[var(--color-accent)] text-xs font-bold uppercase tracking-wide">✨ Uso ilimitado</p>
                )}
                <button
                    type="button"
                    onClick={() => onSelect(plan)}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold uppercase tracking-wide text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
                >
                    <Check className="w-4 h-4 inline mr-1.5" />{actionLabel}
                </button>
            </div>
        </div>
    );
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativo', color: 'text-green-400' },
    pending: { label: 'Aguardando', color: 'text-amber-400' },
    overdue: { label: 'Atrasado', color: 'text-red-400' },
    cancelled: { label: 'Cancelado', color: 'text-neutral-500' },
};

const MemberRow: React.FC<{ member: typeof MOCK_MEMBERS[0]; onConfirm: () => void; onCancel: () => void }> = ({ member, onConfirm, onCancel }) => {
    const status = STATUS_STYLES[member.status];
    return (
        <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold truncate">{member.name}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider px-2 py-0.5 text-[10px] ${member.plan.badge_color === 'gold' ? 'bg-yellow-500/20 text-yellow-300' : member.plan.badge_color === 'silver' ? 'bg-slate-400/20 text-slate-200' : 'bg-orange-700/20 text-orange-300'}`}>
                                {member.plan.badge_color}
                            </span>
                        </div>
                        <p className="text-sm text-neutral-400 truncate">{member.phone} · {member.plan.name}</p>
                        {member.next_billing_at && member.status === 'active' && (
                            <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Vence em {new Date(member.next_billing_at).toLocaleDateString('pt-BR')}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-row md:flex-col items-start md:items-end gap-2 md:gap-1">
                    <p className="text-white font-bold">
                        R$ {(member.plan.price_cents / 100).toFixed(2).replace('.', ',')}<span className="text-neutral-500 text-xs font-normal">/mês</span>
                    </p>
                    <p className={`text-xs font-bold uppercase tracking-wider ${status.color}`}>{status.label}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button type="button" className="p-2.5 rounded-xl bg-white/5 text-neutral-500 border border-white/10">
                        <MessageCircle className="w-4 h-4" />
                    </button>
                    {member.status === 'pending' && (
                        <button type="button" onClick={onConfirm} className="px-3 py-2 rounded-xl bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                    )}
                    {(member.status === 'active' || member.status === 'overdue') && (
                        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
