import { Card, Button, useToast } from '../../components/ui';
import React, { useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useSubscription } from '../../hooks/useSubscription';
import { mapError } from '../../utils/mapError';
import {
    AGENDIX_PLAN_COMPARISON,
    AGENDIX_PLAN_COPY,
    AGENDIX_PLANS,
    getPlanCta,
    type AgendixCurrency,
    type AgendixPlanId,
} from '../../constants/agendixPlans';

import { Check, Zap, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const SubscriptionSettings: React.FC = () => {
    const { businessName, region, user } = useAuth();
    const {
        subscriptionStatus,
        subscriptionPlan,
        trialDaysRemaining,
        isSubscriptionActive,
        isTrial,
    } = useSubscription();
    const { isBeauty, colors, accent, radius, status } = useBrutalTheme();
    const currency: AgendixCurrency = region === 'PT' ? 'EUR' : 'BRL';
    const [loading, setLoading] = useState<AgendixPlanId | null>(null);
    const { showToast } = useToast();

    const planIds: AgendixPlanId[] = ['solo', 'equipe'];

    const handleSubscribe = async (planId: AgendixPlanId, priceId: string) => {
        try {
            setLoading(planId);

            if (user?.id) {
                await supabase
                    .from('profiles')
                    .update({ subscription_plan: planId })
                    .eq('id', user.id);
            }

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    priceId,
                    planId,
                    successUrl: `${window.location.origin}/#/?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.href}`,
                    mode: 'subscription',
                },
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
                            {AGENDIX_PLAN_COPY.pageTitle}
                        </h1>
                        <p className={`text-sm md:text-base ${colors.textSecondary}`}>
                            {AGENDIX_PLAN_COPY.pageSubtitle}
                        </p>
                        <p className={`text-xs md:text-sm mt-2 ${colors.textMuted}`}>
                            {AGENDIX_PLAN_COPY.pageHint}
                        </p>
                    </div>
                </div>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {planIds.map((planId) => {
                        const plan = AGENDIX_PLANS[planId];
                        const price = plan.pricing[currency];
                        const cta = getPlanCta(planId, {
                            isTrial,
                            isSubscriptionActive,
                            currentPlan: subscriptionPlan,
                        });
                        const isEquipe = planId === 'equipe';

                        return (
                            <Card
                                key={plan.id}
                                forceTheme={isBeauty ? 'beauty' : 'barber'}
                                className="flex flex-col h-full relative overflow-hidden"
                            >
                                <div className="mb-6">
                                    <h4 className={`text-xl font-heading ${colors.text} uppercase mb-1`}>{plan.name}</h4>
                                    <p className={`${colors.textSecondary} text-sm`}>{plan.audience}</p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-4xl font-black ${colors.text}`}>{price.label}</span>
                                        <span className={`${colors.textMuted} text-sm`}>/mês</span>
                                    </div>
                                    <div className={`text-xs ${colors.textMuted} mt-1`}>
                                        {currency === 'EUR' ? 'Cobrança em euro' : 'Cobrança em reais'}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-theme-accent" />
                                            <span className={`${colors.textSecondary} text-sm`}>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    forceTheme={isBeauty ? 'beauty' : 'barber'}
                                    variant={isEquipe ? 'primary' : 'ghost'}
                                    onClick={() => handleSubscribe(plan.id, price.priceId)}
                                    className="w-full"
                                    disabled={cta.disabled || loading !== null}
                                >
                                    {loading === plan.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                    ) : (
                                        cta.label
                                    )}
                                </Button>
                            </Card>
                        );
                    })}
                </div>

                <div className={`mt-10 overflow-x-auto border ${colors.border} ${radius.card}`}>
                    <table className="w-full min-w-[28rem] text-sm">
                        <caption className={`text-left px-4 py-3 ${colors.textSecondary}`}>
                            Comparativo dos planos
                        </caption>
                        <thead>
                            <tr className={`${colors.card} border-b ${colors.border}`}>
                                <th className={`text-left font-semibold px-4 py-3 ${colors.text}`}>Benefício</th>
                                <th className={`text-left font-semibold px-4 py-3 ${colors.text}`}>Solo</th>
                                <th className={`text-left font-semibold px-4 py-3 ${colors.text}`}>Equipe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {AGENDIX_PLAN_COMPARISON.map((row) => (
                                <tr key={row.label} className={`border-t ${colors.divider}`}>
                                    <td className={`px-4 py-3 ${colors.text}`}>{row.label}</td>
                                    <td className={`px-4 py-3 ${colors.textSecondary}`}>{row.solo}</td>
                                    <td className={`px-4 py-3 ${colors.textSecondary}`}>{row.equipe}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={`mt-12 text-center ${colors.textMuted}`}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-3">
                        <div className="flex items-center gap-2 text-xs uppercase font-mono">
                            <CreditCard className="w-4 h-4" /> Pagamento seguro
                        </div>
                        <div className="flex items-center gap-2 text-xs uppercase font-mono">
                            {AGENDIX_PLAN_COPY.footer}
                        </div>
                    </div>
                    <p className="text-xs max-w-lg mx-auto">
                        {AGENDIX_PLAN_COPY.footerHint}
                    </p>
                </div>
            </div>
        </SettingsLayout>
    );
};
