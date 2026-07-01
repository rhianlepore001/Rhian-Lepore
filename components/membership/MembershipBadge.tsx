import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { MembershipBadgeColor } from '../../services/memberships';

interface MembershipBadgeProps {
    color?: MembershipBadgeColor;
    label?: string;
    size?: 'sm' | 'md';
    className?: string;
}

const COLORS: Record<MembershipBadgeColor, { bg: string; text: string; icon: React.ReactNode }> = {
    gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', icon: <Crown className="w-3 h-3" /> },
    silver: { bg: 'bg-slate-400/20', text: 'text-slate-200', icon: <Sparkles className="w-3 h-3" /> },
    bronze: { bg: 'bg-orange-700/20', text: 'text-orange-300', icon: <Sparkles className="w-3 h-3" /> },
};

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({
    color = 'gold',
    label = 'Clube',
    size = 'sm',
    className = '',
}) => {
    const style = COLORS[color] ?? COLORS.gold;
    const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
    return (
        <span
            className={[
                'inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider',
                style.bg,
                style.text,
                padding,
                className,
            ].join(' ')}
        >
            {style.icon}
            {label}
        </span>
    );
};
