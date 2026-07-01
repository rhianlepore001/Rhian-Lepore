/**
 * ClubDemo — Fluxo end-to-end do Clube de Assinatura sem precisar de login.
 * Sprint D+1: 5 passos cobrindo contratação → pagamento → confirmação → agendamento grátis.
 *
 * Sem Supabase: usa fixtures locais pra demonstrar o fluxo visual.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, Crown, Sparkles, Store, MessageCircle, Zap, User, Calendar } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { PlanCard } from '../components/membership/PlanCard';
import { PixDisplay } from '../components/membership/PixDisplay';
import { MembershipBadge } from '../components/membership/MembershipBadge';
import { generatePixPayload } from '../lib/pix-generator';
import { generatePixTxid } from '../lib/pix-txid';
import { MembershipPlan, PixKeyType } from '../services/memberships';

const FIXTURE_PLANS: MembershipPlan[] = [
    {
        id: 'plan-gold',
        user_id: 'demo',
        name: 'Gold',
        description: 'Cortes e barba ilimitados. Para quem vive aqui.',
        price_cents: 14900,
        service_ids: ['svc-corte', 'svc-barba', 'svc-sobrancelha'],
        usage_limit_per_month: null,
        badge_color: 'gold',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'plan-silver',
        user_id: 'demo',
        name: 'Silver',
        description: '4 cortes por mês + 2 barbas.',
        price_cents: 8900,
        service_ids: ['svc-corte', 'svc-barba'],
        usage_limit_per_month: 4,
        badge_color: 'silver',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'plan-bronze',
        user_id: 'demo',
        name: 'Bronze',
        description: '2 cortes por mês.',
        price_cents: 5500,
        service_ids: ['svc-corte'],
        usage_limit_per_month: 2,
        badge_color: 'bronze',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const FIXTURE_PIX: { pixKey: string; pixKeyType: PixKeyType; holder: string; city: string } = {
    pixKey: '11999998888',
    pixKeyType: 'phone',
    holder: 'BARBEARIA DEMO',
    city: 'SAO PAULO',
};

const FIXTURE_SERVICES = [
    { id: 'svc-corte', name: 'Corte Masculino', price: 50 },
    { id: 'svc-barba', name: 'Barba', price: 35 },
    { id: 'svc-sobrancelha', name: 'Sobrancelha', price: 25 },
    { id: 'svc-pigmentacao', name: 'Pigmentação', price: 80 },
];

type Step = 'plan' | 'pay' | 'pix' | 'active' | 'checkout';

export const ClubDemo: React.FC = () => {
    const navigate = useNavigate();
    const { colors, accent, font, status } = useBrutalTheme();

    const [step, setStep] = useState<Step>('plan');
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'in_person'>('pix');
    const [clientName, setClientName] = useState('João Demo');
    const [clientPhone, setClientPhone] = useState('(11) 99999-8888');
    const [pixBrCode, setPixBrCode] = useState<string | null>(null);
    const [pixTxid, setPixTxid] = useState<string | null>(null);
    const [checkoutService, setCheckoutService] = useState<typeof FIXTURE_SERVICES[number] | null>(null);

    const brCodePayload = useMemo(() => {
        if (!selectedPlan) return null;
        const txid = generatePixTxid('DEMO');
        const code = generatePixPayload({
            pixKey: FIXTURE_PIX.pixKey,
            pixKeyType: FIXTURE_PIX.pixKeyType,
            merchantName: FIXTURE_PIX.holder,
            merchantCity: FIXTURE_PIX.city,
            amountCents: selectedPlan.price_cents,
            txid,
        });
        return { code, txid };
    }, [selectedPlan]);

    const handleSelectPlan = (plan: MembershipPlan) => {
        setSelectedPlan(plan);
        setStep('pay');
    };

    const handleConfirmContract = () => {
        if (paymentMethod === 'pix' && brCodePayload) {
            setPixBrCode(brCodePayload.code);
            setPixTxid(brCodePayload.txid);
            setStep('pix');
        } else {
            setStep('active');
        }
    };

    const handleSimulatePayment = () => {
        setStep('active');
    };

    const handleSchedule = (svc: typeof FIXTURE_SERVICES[number]) => {
        setCheckoutService(svc);
        setStep('checkout');
    };

    const discount = useMemo(() => {
        if (!selectedPlan || !checkoutService) return null;
        const covered = selectedPlan.service_ids.includes(checkoutService.id);
        return {
            covered,
            finalPrice: covered ? 0 : checkoutService.price,
        };
    }, [selectedPlan, checkoutService]);

    return (
        <div className="min-h-screen bg-[var(--color-bg)] p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/30 to-amber-600/10">
                            <Crown className="w-6 h-6 text-yellow-300" />
                        </div>
                        <div>
                            <h1 className={`text-xl md:text-2xl ${font.heading} text-white uppercase tracking-tight`}>
                                Clube — Demo
                            </h1>
                            <p className="text-neutral-400 text-xs md:text-sm">
                                Fluxo end-to-end sem login
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className={`px-3 py-2 rounded-xl ${colors.card} ${colors.border} ${colors.text} border text-xs font-bold uppercase tracking-wider`}
                    >
                        ← Voltar
                    </button>
                </header>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                        { id: 'plan', label: '1. Plano' },
                        { id: 'pay', label: '2. Dados' },
                        { id: 'pix', label: '3. Pix' },
                        { id: 'active', label: '4. Ativo' },
                        { id: 'checkout', label: '5. Checkout' },
                    ].map((s) => {
                        const idx = ['plan', 'pay', 'pix', 'active', 'checkout'].indexOf(step);
                        const stepIdx = ['plan', 'pay', 'pix', 'active', 'checkout'].indexOf(s.id);
                        const active = stepIdx === idx;
                        const passed = stepIdx < idx;
                        return (
                            <span
                                key={s.id}
                                className={[
                                    'text-[10px] md:text-xs whitespace-nowrap px-2.5 py-1 rounded-full font-bold uppercase tracking-wider',
                                    active
                                        ? `${accent.bg} text-[var(--color-bg)]`
                                        : passed
                                        ? `${status.successBg} ${status.success} border ${status.successBorder}`
                                        : `${colors.inputBg} ${colors.textMuted} ${colors.border} border`,
                                ].join(' ')}
                            >
                                {s.label}
                            </span>
                        );
                    })}
                </div>

                {step === 'plan' && (
                    <div className="space-y-4">
                        <p className="text-neutral-300 text-sm">
                            Escolha o plano ideal pra você. Cancelamento a qualquer momento.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {FIXTURE_PLANS.map(plan => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    onSelect={handleSelectPlan}
                                    actionLabel="Quero este"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {step === 'pay' && selectedPlan && (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setStep('plan')}
                            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> Trocar plano
                        </button>

                        <div className={`${colors.card} ${colors.border} border rounded-2xl p-6 space-y-4`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className={`text-lg ${font.heading} text-white uppercase`}>
                                        {selectedPlan.name}
                                    </h2>
                                    <p className="text-neutral-400 text-sm">
                                        R$ {(selectedPlan.price_cents / 100).toFixed(2).replace('.', ',')} / mês
                                    </p>
                                </div>
                                <MembershipBadge color={selectedPlan.badge_color} label={selectedPlan.badge_color} size="md" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className={`${font.mono} text-xs ${colors.textSecondary} uppercase tracking-wider block mb-1`}>Nome</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        className={`w-full px-3 py-2.5 rounded-xl ${colors.inputBg} ${colors.border} border ${colors.text}`}
                                    />
                                </div>
                                <div>
                                    <label className={`${font.mono} text-xs ${colors.textSecondary} uppercase tracking-wider block mb-1`}>WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        className={`w-full px-3 py-2.5 rounded-xl ${colors.inputBg} ${colors.border} border ${colors.text}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <p className={`${font.mono} text-xs ${colors.textSecondary} uppercase tracking-wider mb-2`}>Como prefere pagar?</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('pix')}
                                        className={[
                                            'p-4 rounded-xl border-2 transition-all text-left',
                                            paymentMethod === 'pix'
                                                ? `${accent.bgDim} ${accent.border}`
                                                : `${colors.inputBg} ${colors.border}`,
                                        ].join(' ')}
                                    >
                                        <Zap className="w-5 h-5 text-yellow-400 mb-1" />
                                        <span className={`${font.heading} text-white uppercase text-sm block`}>Pix agora</span>
                                        <p className="text-xs text-neutral-400">Ativação em segundos.</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('in_person')}
                                        className={[
                                            'p-4 rounded-xl border-2 transition-all text-left',
                                            paymentMethod === 'in_person'
                                                ? `${accent.bgDim} ${accent.border}`
                                                : `${colors.inputBg} ${colors.border}`,
                                        ].join(' ')}
                                    >
                                        <Store className="w-5 h-5 text-blue-400 mb-1" />
                                        <span className={`${font.heading} text-white uppercase text-sm block`}>No balcão</span>
                                        <p className="text-xs text-neutral-400">Dinheiro ou cartão.</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleConfirmContract}
                            disabled={!clientName.trim() || !clientPhone.trim()}
                            className={[
                                'w-full py-4 rounded-xl font-bold uppercase tracking-wide',
                                'bg-[var(--color-accent)] text-[var(--color-bg)]',
                                'active:scale-95 transition-transform',
                                'disabled:opacity-50 flex items-center justify-center gap-2',
                            ].join(' ')}
                        >
                            Continuar <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {step === 'pix' && selectedPlan && pixBrCode && (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setStep('pay')}
                            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </button>
                        <PixDisplay
                            pixKey={FIXTURE_PIX.pixKey}
                            pixKeyType={FIXTURE_PIX.pixKeyType}
                            merchantName={FIXTURE_PIX.holder}
                            merchantCity={FIXTURE_PIX.city}
                            amountCents={selectedPlan.price_cents}
                            description="Escaneie o QR ou copie o código. A confirmação chega em segundos."
                        />
                        {pixTxid && (
                            <p className={`text-[10px] ${colors.textMuted} text-center font-mono`}>
                                TXID: {pixTxid}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleSimulatePayment}
                            data-testid="simulate-pix-confirm"
                            className={[
                                'w-full py-4 rounded-xl font-bold uppercase tracking-wide',
                                'bg-yellow-500 text-black',
                                'active:scale-95 transition-transform',
                                'flex items-center justify-center gap-2',
                            ].join(' ')}
                        >
                            <Zap className="w-4 h-4" />
                            Simular Pix Recebido
                        </button>
                    </div>
                )}

                {step === 'active' && selectedPlan && (
                    <div className="space-y-4">
                        <div
                            data-testid="active-banner"
                            className="relative overflow-hidden rounded-2xl p-6 border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/5"
                        >
                            <div className="absolute -right-4 -top-4 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative space-y-3 text-center">
                                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Check className="w-8 h-8 text-green-400" />
                                </div>
                                <h2 className={`text-2xl ${font.heading} text-yellow-100 uppercase`}>
                                    Bem-vindo ao Clube {selectedPlan.name}!
                                </h2>
                                <p className="text-yellow-100/80 text-sm max-w-md mx-auto">
                                    Sua assinatura está ativa. Agende um serviço agora e veja o desconto na hora.
                                </p>
                            </div>
                        </div>

                        <div className={`${colors.card} ${colors.border} border rounded-2xl p-5`}>
                            <h3 className={`${font.heading} text-white uppercase text-sm tracking-wide mb-3`}>
                                Agendar um serviço
                            </h3>
                            <p className="text-neutral-400 text-xs mb-4">
                                Selecione um serviço. Os cobertos pelo plano saem de graça.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {FIXTURE_SERVICES.map(svc => {
                                    const covered = selectedPlan.service_ids.includes(svc.id);
                                    return (
                                        <button
                                            key={svc.id}
                                            type="button"
                                            onClick={() => handleSchedule(svc)}
                                            data-testid={`schedule-${svc.id}`}
                                            className={[
                                                'flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                                                covered
                                                    ? 'border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10'
                                                    : `${colors.border} ${colors.inputBg} hover:brightness-110`,
                                            ].join(' ')}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {covered ? (
                                                    <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                                                ) : (
                                                    <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                                                )}
                                                <span className={`${colors.text} text-sm font-medium truncate`}>{svc.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {covered ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-300 bg-yellow-500/15 px-2 py-0.5 rounded-md">
                                                        Grátis
                                                    </span>
                                                ) : (
                                                    <span className={`${font.mono} text-xs ${colors.textSecondary}`}>
                                                        R$ {svc.price.toFixed(2).replace('.', ',')}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'checkout' && selectedPlan && checkoutService && discount && (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setStep('active')}
                            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </button>

                        <div
                            data-testid="checkout-banner"
                            className={[
                                'relative overflow-hidden rounded-2xl p-5 border-2',
                                discount.covered
                                    ? 'border-yellow-500/60 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/5'
                                    : 'border-[var(--color-border)] bg-theme-card',
                            ].join(' ')}
                        >
                            <div className="flex items-start gap-3">
                                <Crown className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm ${font.heading} text-yellow-100 uppercase tracking-wide`}>
                                            Clube {selectedPlan.name}
                                        </span>
                                        <MembershipBadge color={selectedPlan.badge_color} />
                                    </div>
                                    {discount.covered ? (
                                        <p className="text-sm text-yellow-100/80 mt-1.5">
                                            Atendimento incluso. Você não paga nada.
                                        </p>
                                    ) : (
                                        <p className="text-sm text-yellow-100/80 mt-1.5">
                                            Plano não cobre este serviço.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={`${colors.card} ${colors.border} border rounded-2xl p-5 space-y-3`}>
                            <h3 className={`${font.heading} text-white uppercase text-sm tracking-wide`}>
                                Resumo do atendimento
                            </h3>
                            <div className="flex items-center justify-between text-sm">
                                <span className={colors.textSecondary}>{checkoutService.name}</span>
                                <span className={colors.text}>
                                    {discount.covered ? (
                                        <span className="line-through text-neutral-500">R$ {checkoutService.price.toFixed(2).replace('.', ',')}</span>
                                    ) : (
                                        `R$ ${checkoutService.price.toFixed(2).replace('.', ',')}`
                                    )}
                                </span>
                            </div>
                            {discount.covered && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-400">Desconto Clube</span>
                                    <span className="text-green-400 font-bold">− R$ {checkoutService.price.toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            <div className={`h-px ${colors.divider}`} />
                            <div className="flex items-center justify-between">
                                <span className={`${font.heading} text-white uppercase`}>Total</span>
                                <span
                                    data-testid="checkout-final-price"
                                    className={`${font.heading} text-2xl font-black tabular-nums ${discount.covered ? 'text-green-400' : 'text-white'}`}
                                >
                                    R$ {discount.finalPrice.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setStep('plan')}
                            data-testid="finish-checkout"
                            className={[
                                'w-full py-4 rounded-xl font-bold uppercase tracking-wide',
                                'bg-[var(--color-accent)] text-[var(--color-bg)]',
                                'active:scale-95 transition-transform',
                                'flex items-center justify-center gap-2',
                            ].join(' ')}
                        >
                            {discount.covered ? 'Concluir atendimento' : 'Ir para pagamento'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <footer className="text-center text-[10px] text-neutral-600 pt-8 pb-2">
                    Demo Club Sprint D+1 — sem dados reais, sem cobrança.
                </footer>
            </div>
        </div>
    );
};
