import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { LucideIcon, ArrowRight, TrendingUp } from 'lucide-react';

interface OpportunityCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    badge?: string;
    impact?: string;
    actionLabel: string;
    onAction: () => void;
    type?: 'emergency' | 'high-value' | 'strategy';
}

const TYPE_BADGE_VARIANT: Record<NonNullable<OpportunityCardProps['type']>, 'danger' | 'accent' | 'neutral'> = {
    'emergency': 'danger',
    'high-value': 'accent',
    'strategy': 'neutral',
};

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
    title,
    description,
    icon: Icon,
    badge,
    impact,
    actionLabel,
    onAction,
    type = 'strategy'
}) => {
    const { colors, font, accent, status } = useBrutalTheme();

    const typeBorderClass = type === 'emergency' ? status.dangerBorder : type === 'high-value' ? accent.border : colors.border;
    const iconWrapClass = type === 'emergency' ? status.dangerBg : 'bg-[var(--color-card-hover)]';
    const iconColorClass = type === 'emergency' ? status.danger : colors.text;
    const btnVariant = type === 'emergency' ? 'primary' : 'outline';

    return (
        <Card
            variant="outlined"
            className={`relative border-2 ${typeBorderClass} transition-all hover:translate-x-1`}
        >
            {badge && (
                <Badge
                    variant={TYPE_BADGE_VARIANT[type]}
                    className="absolute top-0 right-0 rounded-none rounded-bl-lg text-xs font-mono font-bold uppercase"
                >
                    {badge}
                </Badge>
            )}

            <div className="flex gap-4">
                <div className={`p-3 h-fit rounded-lg ${iconWrapClass}`}>
                    <Icon className={`w-6 h-6 ${iconColorClass}`} />
                </div>

                <div className="flex-1">
                    <h4 className={`${colors.text} font-bold ${font.heading} mb-1`}>{title}</h4>
                    <p className={`${colors.textSecondary} text-xs mb-3 leading-relaxed`}>{description}</p>

                    {impact && (
                        <div className={`flex items-center gap-1.5 text-xs ${font.mono} ${status.success} mb-4`}>
                            <TrendingUp className="w-3 h-3" />
                            <span>Impacto: {impact}</span>
                        </div>
                    )}

                    <Button
                        variant={btnVariant}
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={onAction}
                        icon={<ArrowRight className="w-3 h-3" />}
                    >
                        {actionLabel}
                    </Button>
                </div>
            </div>
        </Card>
    );
};
