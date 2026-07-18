
import React from 'react';
import { Edit2, Trash2, User, Star, Crown, Percent } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    role: string;
    photo_url: string | null;
    active: boolean;
    is_owner?: boolean;
    commission_rate?: number;
}

interface TeamMemberCardProps {
    member: TeamMember;
    onEdit: (member: TeamMember) => void;
    onDelete: (id: string) => void;
    accentColor: string;
}

// Mapeamento estático — Tailwind não compila classes interpoladas dinamicamente
const accentClasses = {
    'beauty-neon': {
        ring: 'ring-beauty-neon/30',
        border: 'border-beauty-neon/40',
        borderHover: 'group-hover:border-beauty-neon',
        text: 'text-beauty-neon',
        bg: 'bg-beauty-neon/20',
        badgeBorder: 'border-beauty-neon/30',
    },
    default: {
        ring: 'ring-accent-gold/30',
        border: 'border-accent-gold/40',
        borderHover: 'group-hover:border-accent-gold',
        text: 'text-accent-gold',
        bg: 'bg-accent-gold/20',
        badgeBorder: 'border-accent-gold/30',
    },
};

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
    member,
    onEdit,
    onDelete,
    accentColor
}) => {
    const accent = accentColor === 'beauty-neon' ? accentClasses['beauty-neon'] : accentClasses.default;

    return (
        <div className={`
            relative p-4 md:p-5 rounded-2xl border transition-all duration-300 group
            ${member.active
                ? `bg-theme-card border-[var(--color-divider)] hover:border-[var(--color-input-border)] shadow-promax-glass hover:shadow-promax-depth`
                : 'bg-theme-card/50 border-[var(--color-divider)] grayscale opacity-70'}
            ${member.is_owner ? `ring-2 ${accent.ring} shadow-[0_0_25px_rgba(0,0,0,0.4)]` : ''}
            active:scale-[0.98] md:active:scale-100
        `}>
            {/* Owner/Status Badges */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {member.is_owner && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${accent.bg} ${accent.text} text-xs font-bold uppercase border ${accent.badgeBorder} animate-pulse`}>
                        <Crown className="w-3 h-3" />
                        Dono
                    </div>
                )}
                {!member.active && (
                    <div className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold uppercase border border-red-500/20">
                        Inativo
                    </div>
                )}
            </div>

            <div className="flex items-center gap-5">
                {/* Avatar Section */}
                <div className="relative">
                    <div className={`
                        w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex-shrink-0 overflow-hidden bg-theme-surface border transition-all
                        ${member.active
                            ? `${accent.border} ${accent.borderHover} ring-2 ring-emerald-400/60 ring-offset-1 ring-offset-[var(--color-card)]`
                            : 'border-[var(--color-divider)] ring-2 ring-red-500/30 ring-offset-1 ring-offset-[var(--color-card)]'}
                    `}>
                        {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                                <User className="w-10 h-10" />
                            </div>
                        )}
                    </div>
                    {member.active && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[var(--color-bg)]"></div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-heading text-base md:text-xl font-bold truncate leading-tight ${member.active ? 'text-theme-text' : 'text-[var(--color-text-muted)]'}`}>
                        {member.name}
                    </h3>
                    <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${accent.text} opacity-80`}>
                        {member.role}
                    </p>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <Percent className={`w-3 h-3 ${accent.text}`} />
                                <span className={`text-lg font-bold font-mono ${accent.text}`}>
                                    {member.commission_rate || 0}%
                                </span>
                            </div>
                            <span className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
                                comissão
                            </span>
                        </div>
                        {member.is_owner && (
                            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                <Star className={`w-3 h-3 ${accent.text} fill-current`} />
                                <span className="text-xs font-mono">Master</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-[var(--color-divider)] flex justify-end items-center gap-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(member);
                    }}
                    className={`
                        flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5
                        bg-theme-surface text-theme-text rounded-xl hover:bg-[var(--color-card-hover)]
                        transition-all text-xs font-bold uppercase tracking-widest
                        border border-[var(--color-divider)] hover:border-[var(--color-input-border)]
                        active:bg-theme-surface
                    `}
                >
                    <Edit2 className={`w-3.5 h-3.5 ${accent.text}`} />
                    Editar
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(member.id);
                    }}
                    className="p-2.5 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 active:scale-90"
                    title="Excluir"
                    aria-label={`Excluir membro ${member.name}`}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
