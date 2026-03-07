import React from 'react';
import { BrutalCard } from '../BrutalCard';
import { BrutalButton } from '../BrutalButton';
import { LucideIcon, Zap, ArrowRight, TrendingUp, Star } from 'lucide-react';

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
    const typeColors = {
        emergency: 'border-red-500 bg-red-500/5',
        'high-value': 'border-accent-gold bg-accent-gold/5',
        strategy: 'border-blue-500 bg-blue-500/5'
    };

    const badgeColors = {
        emergency: 'bg-red-500 text-white',
        'high-value': 'bg-accent-gold text-black',
        strategy: 'bg-blue-500 text-white'
    };

    return (
        <BrutalCard className={`relative border-l-4 ${typeColors[type]} transition-all hover:translate-x-1`}>
            {badge && (
                <span className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${badgeColors[type]}`}>
                    {badge}
                </span>
            )}

            <div className="flex gap-4">
                <div className={`p-3 h-fit rounded-lg ${type === 'emergency' ? 'bg-red-500/10' : 'bg-white/5'}`}>
                    <Icon className={`w-6 h-6 ${type === 'emergency' ? 'text-red-500' : 'text-white'}`} />
                </div>

                <div className="flex-1">
                    <h4 className="text-white font-bold font-heading mb-1">{title}</h4>
                    <p className="text-text-secondary text-xs mb-3 leading-relaxed">{description}</p>

                    {impact && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-green-500 mb-4">
                            <TrendingUp className="w-3 h-3" />
                            <span>Impacto: {impact}</span>
                        </div>
                    )}

                    <BrutalButton
                        variant={type === 'emergency' ? 'primary' : 'outline'}
                        size="sm"
                        className="w-full text-[10px] h-8"
                        onClick={onAction}
                        icon={<ArrowRight className="w-3 h-3" />}
                    >
                        {actionLabel}
                    </BrutalButton>
                </div>
            </div>
        </BrutalCard>
    );
};
