import React from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import { Check, Sparkles, CreditCard, Calendar, ShieldCheck, Zap } from 'lucide-react';

export const SubscriptionSettings: React.FC = () => {
    const { userType, businessName } = useAuth();
    const { subscriptionStatus, trialDaysRemaining, isSubscriptionActive, isTrial } = useSubscription();

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    const plans = [
        {
            id: 'solo',
            name: 'Plano Solo',
            price: 'R$ 34,90',
            period: '/mês',
            description: 'Ideal para profissionais autônomos.',
            features: [
                'Agenda Ilimitada',
                'Gestão de Clientes',
                'Página de Agendamento Online',
                'Relatórios Básicos',
                'Suporte via WhatsApp'
            ],
            recommended: !isBeauty
        },
        {
            id: 'team',
            name: 'Plano Equipe',
            price: 'R$ 59,90',
            period: '/mês',
            description: 'Para estabelecimentos com equipe.',
            features: [
                'Tudo do Plano Solo',
                'Múltiplos Profissionais',
                'Gestão de Comissões',
                'Relatórios Avançados',
                'Marketing com IA',
                'Prioridade no Suporte'
            ],
            recommended: isBeauty
        }
    ];

    const handleSubscribe = (planId: string) => {
        // No futuro, aqui redirecionamos para o Stripe/Mercado Pago
        alert(`Redirecionando para o pagamento do ${planId}... (Simulado)`);
        window.open('https://buy.stripe.com/mock_link', '_blank');
    };

    return (
        <SettingsLayout>
            <div className="max-w-4xl pb-20">
                <div className="mb-8 md:mb-12">
                    <h1 className="text-2xl md:text-3xl font-heading text-white uppercase mb-2">
                        Assinatura e Planos
                    </h1>
                    <p className="text-sm md:text-base text-neutral-400">
                        Gerencie seu plano e garanta o crescimento do seu negócio
                    </p>
                </div>

                {/* Status Atual */}
                <div className={`p-6 mb-8 transition-all ${isBeauty ? 'bg-beauty-dark/30 border border-beauty-neon/20 rounded-xl' : 'bg-neutral-900 border-2 border-neutral-800 rounded-lg'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon' : 'bg-accent-gold/10 text-accent-gold'}`}>
                                <Zap className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg uppercase tracking-tight">Status da Conta</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isSubscriptionActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {subscriptionStatus === 'trial' ? 'Período de Teste' :
                                            subscriptionStatus === 'active' ? 'Assinatura Ativa' : 'Expirado'}
                                    </span>
                                    {isTrial && (
                                        <span className="text-neutral-400 text-xs flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {trialDaysRemaining} dias restantes
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-neutral-400 text-sm font-mono">
                            Estabelecimento: <span className="text-white">{businessName}</span>
                        </div>
                    </div>
                </div>

                {/* Planos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map((plan) => (
                        <BrutalCard
                            key={plan.id}
                            forceTheme={isBeauty ? 'beauty' : 'barber'}
                            className={`flex flex-col h-full relative overflow-hidden ${plan.recommended ? 'ring-2 ring-' + accentColor : ''}`}
                        >
                            {plan.recommended && (
                                <div className={`absolute top-4 right-[-35px] rotate-45 px-10 py-1 text-[10px] font-black uppercase tracking-tighter ${isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black'}`}>
                                    Recomendado
                                </div>
                            )}

                            <div className="mb-6">
                                <h4 className="text-xl font-heading text-white uppercase mb-1">{plan.name}</h4>
                                <p className="text-neutral-400 text-sm">{plan.description}</p>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-white">{plan.price}</span>
                                    <span className="text-neutral-500 text-sm">{plan.period}</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />
                                        <span className="text-neutral-300 text-sm">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <BrutalButton
                                forceTheme={isBeauty ? 'beauty' : 'barber'}
                                variant={plan.recommended ? 'primary' : 'ghost'}
                                onClick={() => handleSubscribe(plan.id)}
                                className="w-full"
                            >
                                {isTrial ? 'Começar Assinatura' : 'Alterar Plano'}
                            </BrutalButton>
                        </BrutalCard>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center text-neutral-500">
                    <div className="flex items-center justify-center gap-6 mb-4">
                        <div className="flex items-center gap-2 text-xs uppercase font-mono">
                            <ShieldCheck className="w-4 h-4" /> Pagamento Seguro
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
