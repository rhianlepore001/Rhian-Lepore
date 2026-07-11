
import React from 'react';
import { Edit2, Trash2, User, Star, Crown, Percent } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

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
    /** @deprecated tema vem do useBrutalTheme; mantido por compat de API */
    accentColor?: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
    member,
    onEdit,
    onDelete,
}) => {
    const { colors, accent, radius, shadow, status } = useBrutalTheme();

    return (
        <div className={`
            relative p-4 md:p-5 ${radius.card} border transition-all duration-300 group
            ${member.active
                ? `${colors.card} ${colors.border} hover:border-[var(--color-border-strong)] ${shadow.card} ${shadow.cardHover}`
                : `${colors.card} ${colors.border} grayscale opacity-70`}
            ${member.is_owner ? `ring-2 ${accent.ring}` : ''}
            active:scale-[0.98] md:active:scale-100
        `}>
            {/* Owner/Status Badges */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {member.is_owner && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 ${radius.badge} ${accent.bgDim} ${accent.text} text-xs font-bold uppercase border ${accent.borderDim}`}>
                        <Crown className="w-3 h-3" />
                        Dono
                    </div>
                )}
                {!member.active && (
                    <div className={`px-2 py-0.5 ${radius.badge} ${status.dangerBg} ${status.danger} text-xs font-bold uppercase border ${status.dangerBorder}`}>
                        Inativo
                    </div>
                )}
            </div>

            <div className="flex items-center gap-5">
                {/* Avatar Section */}
                <div className="relative">
                    <div className={`
                        w-14 h-14 md:w-20 md:h-20 ${radius.avatar} flex-shrink-0 overflow-hidden ${colors.surface} border transition-all
                        ${member.active
                            ? `${accent.borderDim} group-hover:border-[var(--color-accent-border)]`
                            : `${colors.border} ring-2 ring-[var(--color-danger-border)]`}
                    `}>
                        {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${colors.textMuted}`}>
                                <User className="w-10 h-10" />
                            </div>
                        )}
                    </div>
                    {member.active && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-card)]`}></div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-heading text-base md:text-xl font-bold truncate leading-tight ${member.active ? colors.text : colors.textMuted}`}>
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
                            <span className={`text-xs uppercase tracking-widest ${colors.textMuted}`}>
                                comissão
                            </span>
                        </div>
                        {member.is_owner && (
                            <div className={`flex items-center gap-1.5 ${colors.textMuted}`}>
                                <Star className={`w-3 h-3 ${accent.text} fill-current`} />
                                <span className="text-xs font-mono">Master</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className={`mt-4 pt-3 border-t ${colors.divider} flex justify-end items-center gap-3`}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(member);
                    }}
                    className={`
                        flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px]
                        bg-[var(--color-card-hover)] ${colors.text} ${radius.button} hover:bg-[var(--color-divider)]
                        transition-all text-xs font-bold uppercase tracking-widest
                        border ${colors.border} hover:border-[var(--color-border-strong)]
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
                    className={`p-2.5 min-h-[44px] min-w-[44px] ${colors.textMuted} hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] ${radius.button} transition-all border border-transparent hover:border-[var(--color-danger-border)] active:scale-90`}
                    title="Excluir"
                    aria-label={`Excluir membro ${member.name}`}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
