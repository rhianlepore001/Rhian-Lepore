import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, MessageCircle, Store, ArrowRight, Crown, Zap } from 'lucide-react';
import { useActiveMembershipPlans, useBusinessPixConfig, useCreateMembershipRequest, useCreatePixPayment } from '../hooks/useMemberships';
import { useBusinessProfileBySlug } from '../hooks/usePublicBooking';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useToast } from '../components/ui/Toast';
import { PlanCard } from '../components/membership/PlanCard';
import { PixDisplay } from '../components/membership/PixDisplay';
import { MembershipPlan } from '../services/memberships';
import { generatePixPayload } from '../lib/pix-generator';
import { generatePixTxid } from '../lib/pix-txid';
import { supabase } from '../lib/supabase';

export const JoinClub: React.FC = () => {
    const [searchParams] = useSearchParams();
    const slug = searchParams.get('slug') || '';
    const { colors, classes, accent, font } = useBrutalTheme();
    const { showToast } = useToast();

    const { data: businessProfile, isLoading: profileLoading } = useBusinessProfileBySlug(slug);
    const businessId = (businessProfile as { id?: string } | null)?.id ?? null;
    const { data: plans, isLoading: plansLoading } = useActiveMembershipPlans();
    const { data: pixConfig, isLoading: pixLoading } = useBusinessPixConfig();
    const createMembership = useCreateMembershipRequest();
    const createPix = useCreatePixPayment();

    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [step, setStep] = useState<'choose' | 'pay' | 'confirmation'>('choose');
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'in_person'>('pix');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [pixBrCode, setPixBrCode] = useState<string | null>(null);

    const merchantName = pixConfig?.pix_holder_name || '';
    const merchantCity = pixConfig?.pix_merchant_city || 'SAO PAULO';
    const pixReady = !!(pixConfig?.pix_key_value && pixConfig?.pix_key_type);

    const handleSelectPlan = (plan: MembershipPlan) => {
        setSelectedPlan(plan);
        setStep('pay');
    };

    const handleSubmit = async () => {
        if (!selectedPlan || !businessId) {
            showToast('Link inválido.', 'error');
            return;
        }
        if (!clientName.trim() || !clientPhone.trim()) {
            showToast('Preencha nome e WhatsApp.', 'error');
            return;
        }
        if (clientPhone.replace(/\D/g, '').length < 10) {
            showToast('WhatsApp inválido.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const phone = clientPhone.replace(/\D/g, '');

            // Resolve client_id (existing or new)
            let clientId: string | null = null;
            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', businessId)
                .eq('phone', phone)
                .maybeSingle();
            if (existing) {
                clientId = existing.id;
            } else {
                const { data: newClient, error: createErr } = await supabase
                    .from('clients')
                    .insert({
                        user_id: businessId,
                        name: clientName.trim(),
                        phone,
                    })
                    .select('id')
                    .single();
                if (createErr) throw createErr;
                clientId = newClient.id;
            }

            // Create pending membership (via hook)
            const ms = await createMembership.mutateAsync({
                client_id: clientId,
                plan_id: selectedPlan.id,
                payment_method: paymentMethod,
            });

            // Sprint D+1: Se escolheu Pix e barbeiro tem chave configurada, gera pix_payment
            if (paymentMethod === 'pix' && pixReady) {
                const txid = generatePixTxid('AGX');
                const brCode = generatePixPayload({
                    pixKey: pixConfig!.pix_key_value!,
                    pixKeyType: pixConfig!.pix_key_type!,
                    merchantName,
                    merchantCity,
                    amountCents: selectedPlan.price_cents,
                    txid,
                });
                const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                await createPix.mutateAsync({
                    membership_id: ms.id,
                    amount_cents: selectedPlan.price_cents,
                    br_code: brCode,
                    txid,
                    expires_at: expiresAt,
                });
                setPixBrCode(brCode);
            }

            setStep('confirmation');
            showToast(
                paymentMethod === 'pix'
                    ? 'Solicitação criada! Pague o Pix para ativar.'
                    : 'Solicitação criada! Pague no balcão na próxima visita.',
                'success'
            );
        } catch (err) {
            showToast('Erro: ' + (err as Error).message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!slug) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-black">
                <div className="text-center max-w-md">
                    <p className="text-white text-lg">Link inválido. Solicite o link correto ao estabelecimento.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 bg-[var(--color-bg)]">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/30 to-amber-600/10">
                        <Crown className="w-6 h-6 text-yellow-300" />
                    </div>
                    <div>
                        <h1 className={`text-2xl md:text-3xl ${font.heading} text-white uppercase tracking-tight`}>
                            Clube de Assinatura
                        </h1>
                        <p className="text-neutral-400 text-sm">Vantagens exclusivas todo mês, pagando menos por cada serviço.</p>
                    </div>
                </header>

                {step === 'choose' && (
                    <>
                        {plansLoading || profileLoading ? (
                            <div className="text-neutral-400 p-8 text-center">Carregando planos...</div>
                        ) : plans && plans.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {plans.map(plan => (
                                    <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        onSelect={handleSelectPlan}
                                        actionLabel="Quero assinar"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 space-y-2">
                                <p className="text-white text-lg">Nenhum plano disponível no momento.</p>
                                <p className="text-neutral-500 text-sm">Volte mais tarde ou fale com o estabelecimento.</p>
                            </div>
                        )}
                    </>
                )}

                {step === 'pay' && selectedPlan && (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setStep('choose')}
                            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            ← Escolher outro plano
                        </button>

                        <div className={`${colors.card} ${colors.border} border rounded-2xl p-6`}>
                            <h2 className={`text-xl ${font.heading} text-white uppercase mb-1`}>
                                {selectedPlan.name}
                            </h2>
                            <p className="text-neutral-400 text-sm mb-4">
                                Mensalidade: R$ {(selectedPlan.price_cents / 100).toFixed(2).replace('.', ',')}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`${classes.label} block mb-1.5`}>Seu nome</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        placeholder="João Silva"
                                        className={classes.input}
                                    />
                                </div>
                                <div>
                                    <label className={`${classes.label} block mb-1.5`}>Seu WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        placeholder="(11) 98765-4321"
                                        className={classes.input}
                                    />
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className={`${classes.label} block mb-2`}>Como prefere pagar?</label>
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageCircle className="w-5 h-5 text-[var(--color-accent)]" />
                                            <span className={`${font.heading} text-white uppercase text-sm`}>Pix agora</span>
                                        </div>
                                        <p className="text-xs text-neutral-400">
                                            {pixReady ? 'Paga e confirmação em segundos.' : 'Pix ainda não configurado.'}
                                        </p>
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <Store className="w-5 h-5 text-[var(--color-accent)]" />
                                            <span className={`${font.heading} text-white uppercase text-sm`}>No balcão</span>
                                        </div>
                                        <p className="text-xs text-neutral-400">Dinheiro ou cartão na próxima visita.</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {paymentMethod === 'pix' && pixReady ? (
                            <PixDisplay
                                pixKey={pixConfig!.pix_key_value!}
                                pixKeyType={pixConfig!.pix_key_type!}
                                merchantName={merchantName}
                                merchantCity={merchantCity}
                                amountCents={selectedPlan.price_cents}
                                description="Escaneie o QR Code ou copie o código. A confirmação chega em segundos."
                            />
                        ) : paymentMethod === 'pix' && !pixReady && !pixLoading ? (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200 text-sm">
                                O estabelecimento ainda não configurou o Pix. Escolha pagar no balcão ou aguarde.
                            </div>
                        ) : null}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting || !clientName.trim() || !clientPhone.trim()}
                                className={[
                                    'flex-1 py-4 rounded-xl font-bold uppercase tracking-wide',
                                    'bg-[var(--color-accent)] text-[var(--color-bg)]',
                                    'active:scale-95 transition-transform',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                    'flex items-center justify-center gap-2',
                                ].join(' ')}
                            >
                                {submitting ? 'Enviando...' : 'Confirmar solicitação'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'confirmation' && selectedPlan && (
                    <div className="space-y-4">
                        <div className={`${colors.card} ${colors.border} border rounded-2xl p-8 text-center space-y-4`}>
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className={`text-2xl ${font.heading} text-white uppercase`}>
                                Solicitação enviada!
                            </h2>
                            <p className="text-neutral-300 text-base max-w-md mx-auto">
                                {paymentMethod === 'pix' ? (
                                    <>Escaneie o QR Code abaixo. Seu plano será ativado em segundos após o pagamento.</>
                                ) : (
                                    <>Na próxima visita, pague no balcão. Seu plano será ativado após a confirmação.</>
                                )}
                            </p>
                        </div>
                        {paymentMethod === 'pix' && pixBrCode && pixConfig?.pix_key_value && (
                            <PixDisplay
                                pixKey={pixConfig.pix_key_value}
                                pixKeyType={pixConfig.pix_key_type!}
                                merchantName={merchantName}
                                merchantCity={merchantCity}
                                amountCents={selectedPlan.price_cents}
                                description="Pague o valor com seu app. A confirmação chega em segundos."
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
