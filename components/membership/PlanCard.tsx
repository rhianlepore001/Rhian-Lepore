import React from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
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
    onEdit?: (plan: MembershipPlan) => void;
    onDelete?: (plan: MembershipPlan) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
    plan,
    onSelect,
    actionLabel = 'Quero este plano',
    compact = false,
    className = '',
    region = 'BR',
    onEdit,
    onDelete,
}) => {
    const { accent, colors, font, radius } = useBrutalTheme();
    const hasOwnerActions = Boolean(onEdit || onDelete);

    return (
        <article
            data-testid={`plan-card-${plan.id}`}
            className={[
                'border min-w-0',
                radius.card,
                colors.card,
                colors.border,
                className,
            ].join(' ')}
        >
            <div className={compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}>
                <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                        <h3 className={`text-sm font-semibold leading-snug break-words ${font.heading} ${colors.text}`}>
                            {plan.name}
                        </h3>
                        {plan.description ? (
                            <p className={`${colors.textSecondary} text-xs mt-0.5 leading-snug break-words`}>
                                {plan.description}
                            </p>
                        ) : null}
                    </div>
                    {hasOwnerActions && (
                        <div className="flex items-center gap-1 shrink-0">
                            {onEdit && (
                                <button
                                    type="button"
                                    onClick={() => onEdit(plan)}
                                    className={`p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`}
                                    aria-label={`Editar plano ${plan.name}`}
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(plan)}
                                    className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                                    aria-label={`Excluir plano ${plan.name}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-base font-bold leading-none ${colors.text}`}>
                        {formatCurrency(plan.price_cents / 100, region)}
                        <span className={`${colors.textMuted} text-xs font-medium ml-1`}>/mês</span>
                    </p>
                    <p className={`${colors.textMuted} text-xs shrink-0`}>
                        {plan.usage_limit_per_month
                            ? `${plan.usage_limit_per_month} uso${plan.usage_limit_per_month > 1 ? 's' : ''}/mês`
                            : 'Ilimitado'}
                    </p>
                </div>

                {onSelect && (
                    <button
                        type="button"
                        onClick={() => onSelect(plan)}
                        className={[
                            'w-full py-2.5 px-3 min-h-[44px] font-semibold text-sm',
                            radius.button,
                            accent.bg,
                            'text-[var(--color-on-accent)]',
                        ].join(' ')}
                    >
                        <Check className="w-4 h-4 inline mr-1.5" aria-hidden />
                        {actionLabel}
                    </button>
                )}
            </div>
        </article>
    );
};
