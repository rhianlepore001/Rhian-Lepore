import { Card, Button, useToast } from '../../components/ui';
import React, { useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useSubscription } from '../../hooks/useSubscription';
import { mapError } from '../../utils/mapError';


import { Check, Zap, Calendar, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getPlanPricing, regionToPlanCurrency, type AgendixPlanId } from '../../utils/planPricing';
import { planCardState } from '../../utils/planCardState';
import { useCurrentPlan } from '../../hooks/useCurrentPlan';

export const SubscriptionSettings: React.FC = () => {
    const { businessName, region } = useAuth();
    const { subscriptionStatus, trialDaysRemaining, isSubscriptionActive, isTrial } = useSubscription();
    const { isBeauty, colors, accent, radius, status } = useBrutalTheme();
    const currency = regionToPlanCurrency(region);
    const [loading, setLoading] = useState<string | null>(null);
    const { showToast } = useToast();

    const pricing = getPlanPricing(currency);
    const currentPlan = useCurrentPlan();
    const hasCurrentPlan = subscriptionStatus === 'active' && currentPlan !== null;

    const plans: Array<{ id: AgendixPlanId; name: string; price: string; period: string; description: string; features: string[]; recommended: boolean }> = [
        {
            id: 'solo',
            name: 'Plano Solo',
            price: pricing.solo.price,
            period: '/mês',
            description: 'Ideal para profissionais autônomos.',
            features: [
                'Agenda Ilimitada',
                'Gestão de Clientes',
                'Página de Agendamento Online',
                'Relatórios Básicos',
                'Suporte via WhatsApp'
            ],
            recommended: !isBeauty,
        },
        {
            id: 'team',
            name: 'Plano Equipe',
            price: pricing.team.price,
            period: '/mês',
            description: 'Para estabelecimentos com equipe.',
            features: [
                'Tudo do Plano Solo',
                'Múltiplos Profissionais',
                'Gestão de Comissões',
                'Relatórios Avançados',
                'Clube de Assinatura',
                'Prioridade no Suporte'
            ],
            recommended: isBeauty,
        }
    ];

    const handleSubscribe = async (planId: string) => {
        if (loading !== null) return;
        try {
            setLoading(planId);

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    // O servidor resolve o preço Stripe pelos secrets STRIPE_PRICE_<PLANO>_<MOEDA>.
                    // Não enviamos priceId: os VITE_STRIPE_PRICE_* do front não são a fonte da verdade.
                    planId,
                    currency,
                    successUrl: `${window.location.origin}/#/?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.href}`,
                    mode: 'subscription'
                }
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                showToast('Não foi possível iniciar o pagamento. Tente novamente.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast(mapError(error, 'Não foi possível iniciar o pagamento.').message, 'error');
        } finally {
            setLoading(null);
        }
    };

    return (
        <SettingsLayout>
            <div className="w-full pb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-12">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-heading ${colors.text} uppercase mb-2`}>
                            Plano AgendiX
                        </h1>
                        <p className={`text-sm md:text-base ${colors.textSecondary}`}>
                            Este é o plano do sistema AgendiX — não o clube de assinatura dos seus clientes.
                        </p>
                    </div>


                </div>

                {/* Status Atual */}
                <div className={`p-6 mb-8 transition-all ${colors.card} border ${colors.border} ${radius.card}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full ${accent.bgDim} ${accent.text}`}>
                                <Zap className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className={`${colors.text} font-bold text-lg uppercase tracking-tight`}>Status da Conta</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 ${radius.badge} text-xs font-bold uppercase border ${isSubscriptionActive ? `${status.successBg} ${status.success} ${status.successBorder}` : `${status.dangerBg} ${status.danger} ${status.dangerBorder}`
                                        }`}>
                                        {subscriptionStatus === 'trial' ? 'Período de Teste' :
                                            subscriptionStatus === 'active' ? 'Assinatura Ativa' : 'Expirado'}
                                    </span>
                                    {isTrial && (
                                        <span className={`${colors.textSecondary} text-xs flex items-center gap-1`}>
                                            <Calendar className="w-3 h-3" /> {trialDaysRemaining} dias restantes
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`${colors.textSecondary} text-sm font-mono`}>
                            Estabelecimento: <span className={`${colors.text}`}>{businessName}</span>
                        </div>
                    </div>
                </div>

                {/* Planos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map((plan) => {
                        const card = planCardState(plan.id, { status: subscriptionStatus, currentPlan });
                        // Com plano atual conhecido, o destaque passa a ser dele (e não o "Recomendado").
                        const highlighted = hasCurrentPlan ? card.isCurrent : plan.recommended;
                        const primaryAction = hasCurrentPlan ? !card.isCurrent : plan.recommended;
                        const headingId = `plano-${plan.id}-titulo`;
                        return (
                        <Card
                            key={plan.id}
                            forceTheme={isBeauty ? 'beauty' : 'barber'}
                            className={`flex flex-col h-full relative overflow-hidden ${highlighted ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
                        >
                            <section
                                aria-labelledby={headingId}
                                aria-current={card.isCurrent ? 'true' : undefined}
                                className="flex flex-col h-full"
                            >
                            {!hasCurrentPlan && plan.recommended && (
                                <div className="absolute top-4 right-[-35px] rotate-45 px-10 py-1 text-xs font-black uppercase tracking-tighter bg-theme-accent text-[var(--color-on-accent)]">
                                    Recomendado
                                </div>
                            )}

                            {card.isCurrent && (
                                <span
                                    data-current-plan-badge
                                    className={`self-start inline-flex items-center gap-1.5 mb-4 px-3 py-1 ${radius.badge} text-xs font-bold uppercase tracking-wide bg-theme-accent text-[var(--color-on-accent)]`}
                                >
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                    Seu plano atual
                                </span>
                            )}

                            <div className="mb-6">
                                <h4 id={headingId} className={`text-xl font-heading ${colors.text} uppercase mb-1`}>{plan.name}</h4>
                                <p className={`${colors.textSecondary} text-sm`}>{plan.description}</p>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-4xl font-black ${colors.text}`}>{plan.price}</span>
                                    <span className={`${colors.textMuted} text-sm`}>{plan.period}</span>
                                </div>
                                <div className={`text-xs ${colors.textMuted} mt-1 font-mono`}>
                                    {currency === 'EUR' ? 'Cobrança em Euro' : 'Cobrança em Reais'}
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-theme-accent" />
                                        <span className={`${colors.textSecondary} text-sm`}>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                forceTheme={isBeauty ? 'beauty' : 'barber'}
                                variant={primaryAction ? 'primary' : 'ghost'}
                                onClick={card.canCheckout ? () => handleSubscribe(plan.id) : undefined}
                                // O botão que está carregando não usa `disabled` (que apaga para 50%):
                                // fica com opacidade total e aria-busy; cliques repetidos são ignorados.
                                className={`w-full ${loading === plan.id ? 'cursor-wait ring-1 ring-[var(--color-accent)]' : ''}`}
                                disabled={!card.canCheckout || (loading !== null && loading !== plan.id)}
                                aria-busy={loading === plan.id}
                            >
                                {loading === plan.id ? (
                                    <span className="inline-flex items-center gap-2 text-theme-accent">
                                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                        <span>Abrindo pagamento…</span>
                                    </span>
                                ) : (
                                    card.label
                                )}
                            </Button>
                            </section>
                        </Card>
                        );
                    })}
                </div>

                {/* Footer Info */}
                <div className={`mt-12 text-center ${colors.textMuted}`}>
                    <div className="flex items-center justify-center gap-6 mb-4">
                        <div className="flex items-center gap-2 text-xs uppercase font-mono">
                            <ShieldCheck className="w-4 h-4" /> Pagamento Seguro via Stripe
                        </div>
                        <div className="flex items-center gap-2 text-xs uppercase font-mono">
                            <CreditCard className="w-4 h-4" /> Cancele a qualquer momento
                        </div>
                    </div>
                </div>
            </div>
        </SettingsLayout>
    );
};

