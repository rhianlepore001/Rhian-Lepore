import React from 'react';
import { Pencil, User } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import type { CommissionPaymentFrequency } from '../utils/commissionSchedule';

interface TeamMember {
    id: string;
    name: string;
    role: string;
    photo_url: string | null;
    active: boolean;
    is_owner?: boolean;
    commission_rate?: number | null;
    commission_payment_frequency?: CommissionPaymentFrequency | string | null;
    commission_payment_day?: number | null;
}

export interface CommissionDraft {
    rate: number;
}

interface TeamMemberCardProps {
    member: TeamMember;
    onEdit: (member: TeamMember) => void;
    /** Colaborador com ciclo de acerto próprio (exceção à regra do negócio). */
    hasOwnCycle?: boolean;
}

const formatRate = (rate: number) =>
    `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(rate)}%`;

/**
 * Linha compacta da equipe (~64 px): avatar 40 px, nome, cargo e % de comissão.
 * Tudo que é edição (dados, comissão, bloqueios, exclusão) fica no drawer "Editar".
 */
export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member, onEdit, hasOwnCycle = false }) => {
    const { colors, radius, accent } = useBrutalTheme();
    const rate = member.commission_rate ?? 0;

    return (
        <li
            data-testid="team-member-row"
            className={`flex items-center gap-3 min-h-[64px] px-3 py-2.5 md:px-4 ${radius.card} border ${colors.border} ${colors.card}`}
        >
            <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full ${colors.surface} border ${colors.border}`}>
                {member.photo_url ? (
                    <img src={member.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                    <span className={`flex h-full w-full items-center justify-center ${colors.textMuted}`} aria-hidden="true">
                        <User className="h-5 w-5" />
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className={`flex items-center gap-2 text-[15px] font-semibold leading-5 ${member.active ? colors.text : colors.textMuted}`}>
                    <span className="truncate">{member.name}</span>
                    {member.is_owner && !/\bdono\b/i.test(member.role ?? '') && (
                        <span className={`shrink-0 rounded-md ${accent.bgDim} ${accent.text} px-1.5 py-px text-xs font-semibold leading-4`}>
                            Dono
                        </span>
                    )}
                    {!member.active && (
                        <span className="shrink-0 rounded-md bg-[var(--color-danger-bg)] px-1.5 py-px text-xs font-semibold leading-4 text-[var(--color-danger)]">
                            Inativo
                        </span>
                    )}
                </p>
                <p className={`mt-0.5 truncate text-[13px] leading-5 ${colors.textSecondary}`}>
                    {member.role ? <span>{member.role}</span> : member.is_owner && <span>Dono</span>}
                    {!member.is_owner && (
                        <>
                            {member.role && <span aria-hidden="true"> · </span>}
                            <span className="tabular-nums">{formatRate(rate)} de comissão</span>
                            {hasOwnCycle && <span> · ciclo próprio</span>}
                        </>
                    )}
                </p>
            </div>

            <button
                type="button"
                onClick={() => onEdit(member)}
                aria-label={`Editar ${member.name}`}
                className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border ${colors.border} px-3 text-sm font-medium ${colors.text} transition-colors hover:bg-[var(--color-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]`}
            >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Editar</span>
            </button>
        </li>
    );
};
