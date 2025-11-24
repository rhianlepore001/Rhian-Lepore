import React from 'react';
import { Edit2, Trash2, User } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    role: string;
    photo_url: string | null;
    active: boolean;
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
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center gap-4 group hover:border-neutral-700 transition-colors">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-full flex-shrink-0 overflow-hidden bg-neutral-800 border-2 ${member.active ? `border-${accentColor}` : 'border-neutral-700 grayscale'}`}>
                {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                        <User className="w-8 h-8" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-lg truncate ${member.active ? 'text-white' : 'text-neutral-500'}`}>
                    {member.name}
                </h3>
                <p className="text-sm text-neutral-400 truncate">
                    {member.role}
                </p>
                {!member.active && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-neutral-800 text-neutral-500 rounded-full">
                        Inativo
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(member)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Editar"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(member.id)}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
