import React from 'react';
import { Check, Crown, Sparkles } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { MembershipPlan } from '../../services/memberships';
import { formatCurrency, Region } from '../../utils/formatters';

interface PlanCardProps {
    plan: MembershipPlan;
    onSelect?: (plan: MembershipPlan) => void;
    actionLabel?: string;
    compact?: boolean;
    className?: string;
    region?: Region;
}

const BADGE_STYLES: Record<string, { gradient: string; icon: React.ReactNode; ring: string }> = {
    gold: {
        gradient: 'from-yellow-500/30 to-amber-600/10',
        icon: <Crown className="w-5 h-5" />,
        ring: 'ring-yellow-500/40',
    },
    silver: {
        gradient: 'from-slate-400/30 to-slate-600/10',
        icon: <Sparkles className="w-5 h-5" />,
        ring: 'ring-slate-400/40',
    },
    bronze: {
        gradient: 'from-orange-700/30 to-orange-900/10',
        icon: <Sparkles className="w-5 h-5" />,
        ring: 'ring-orange-700/40',
    },
};

export const PlanCard: React.FC<PlanCardProps> = ({
    plan,
    onSelect,
    actionLabel = 'Quero este plano',
    compact = false,
    className = '',
    region = 'BR',
}) => {
    const { accent, colors, font } = useBrutalTheme();
    const style = BADGE_STYLES[plan.badge_color] ?? BADGE_STYLES.gold;

    return (
        <div
            className={[
                'relative overflow-hidden rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]',
                colors.card,
                colors.border,
                style.ring,
                'ring-1',
                className,
            ].join(' ')}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} pointer-events-none`} />

            <div className="relative p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${style.gradient} text-white`}>
                        {style.icon}
                    </div>
                    {!compact && plan.active && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Disponível
                        </span>
                    )}
                </div>

                <div>
                    <h3 className={`text-xl ${font.heading} text-white uppercase tracking-tight`}>{plan.name}</h3>
                    {plan.description && (
                        <p className={`${colors.textSecondary} text-sm mt-1.5 leading-relaxed`}>{plan.description}</p>
                    )}
                </div>

                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl ${font.heading} text-white`}>
                        {formatCurrency(plan.price_cents / 100, region)}
                    </span>
                    <span className={`${colors.textMuted} text-sm`}>/mês</span>
                </div>

                {plan.usage_limit_per_month ? (
                    <p className={`${colors.textMuted} text-xs`}>
                        Limite: {plan.usage_limit_per_month} uso{plan.usage_limit_per_month > 1 ? 's' : ''} por mês
                    </p>
                ) : (
                    <p className={`${accent.text} text-xs font-bold uppercase tracking-wide`}>
                        ✨ Uso ilimitado
                    </p>
                )}

                {onSelect && (
                    <button
                        type="button"
                        onClick={() => onSelect(plan)}
                        className={[
                            'w-full mt-2 py-3 px-4 rounded-xl font-bold uppercase tracking-wide text-sm',
                            'transition-all active:scale-95',
                            colors.text,
                            'bg-white/5 hover:bg-white/10',
                            colors.border,
                            'border',
                        ].join(' ')}
                    >
                        <Check className="w-4 h-4 inline mr-1.5" />
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
};
