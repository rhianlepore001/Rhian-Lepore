
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

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
    member,
    onEdit,
    onDelete,
    accentColor
}) => {
    const isBeauty = accentColor === 'beauty-neon';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/20';
    const accentBorder = isBeauty ? 'border-beauty-neon/30' : 'border-accent-gold/30';

    return (
        <div className={`
            relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 group
            ${member.active ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-lg hover:shadow-xl' : 'bg-neutral-900/50 border-neutral-800/50 grayscale opacity-70'}
            ${member.is_owner ? `ring-2 ring-${accentColor}/30 shadow-[0_0_25px_rgba(0,0,0,0.4)]` : ''}
            active:scale-[0.98] md:active:scale-100
        `}>
            {/* Owner/Status Badges */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {member.is_owner && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${accentBg} ${accentText} text-[10px] font-bold uppercase border ${accentBorder} animate-pulse`}>
                        <Crown className="w-3 h-3" />
                        Dono
                    </div>
                )}
                {!member.active && (
                    <div className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20">
                        Inativo
                    </div>
                )}
            </div>

            <div className="flex items-center gap-5">
                {/* Avatar Section */}
                <div className="relative">
                    <div className={`
                        w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex-shrink-0 overflow-hidden bg-neutral-800 border-2 transition-all
                        ${member.active ? `border-${accentColor}/40 group-hover:border-${accentColor}` : 'border-neutral-700'}
                    `}>
                        {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                <User className="w-10 h-10" />
                            </div>
                        )}
                    </div>
                    {member.active && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black`}></div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-heading text-base md:text-xl font-bold truncate leading-tight ${member.active ? 'text-white' : 'text-neutral-500'}`}>
                        {member.name}
                    </h3>
                    <p className={`text-[10px] md:text-xs font-mono uppercase tracking-widest mb-2 ${accentText} opacity-80`}>
                        {member.role}
                    </p>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-neutral-500">
                            <Percent className={`w-3 h-3 ${accentText}`} />
                            <span className="text-[10px] md:text-xs font-mono">{member.commission_rate || 0}% Comis.</span>
                        </div>
                        {member.is_owner && (
                            <div className="flex items-center gap-1.5 text-neutral-500">
                                <Star className={`w-3 h-3 ${accentText} fill-current`} />
                                <span className="text-[10px] md:text-xs font-mono">Master</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover Actions */}
            <div className="mt-4 pt-3 border-t border-neutral-800/50 flex justify-end items-center gap-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(member);
                    }}
                    className={`
                        flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 
                        bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 
                        transition-all text-[11px] font-bold uppercase tracking-widest
                        border border-neutral-700 hover:border-neutral-600
                        active:bg-neutral-600
                    `}
                >
                    <Edit2 className={`w-3.5 h-3.5 ${accentText}`} />
                    Editar
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(member.id);
                    }}
                    className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 active:scale-90"
                    title="Excluir"
                >
                    <Trash2 className="w-4.5 h-4.5" />
                </button>
            </div>
        </div>
    );
};
