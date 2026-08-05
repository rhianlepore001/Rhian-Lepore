import React, { useState } from 'react';
import { Edit2, Trash2, User, Crown, Percent, Check, Loader2 } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { Button } from './ui/Button';
import {
    type CommissionPaymentFrequency,
    defaultPaymentDay,
    normalizePaymentFrequency,
    paymentDayOptions,
    scheduleSummary,
} from '../utils/commissionSchedule';

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
    frequency: CommissionPaymentFrequency;
    day: number;
}

interface TeamMemberCardProps {
    member: TeamMember;
    onEdit: (member: TeamMember) => void;
    onDelete: (id: string) => void;
    onSaveCommission?: (memberId: string, draft: CommissionDraft) => Promise<void>;
    /** @deprecated tema vem do useBrutalTheme; mantido por compat de API */
    accentColor?: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
    member,
    onEdit,
    onDelete,
    onSaveCommission,
}) => {
    const { colors, accent, radius, shadow, status } = useBrutalTheme();
    const [editingCommission, setEditingCommission] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rate, setRate] = useState(String(member.commission_rate ?? 0));
    const [frequency, setFrequency] = useState<CommissionPaymentFrequency>(
        normalizePaymentFrequency(member.commission_payment_frequency),
    );
    const [day, setDay] = useState(
        member.commission_payment_day ?? defaultPaymentDay(normalizePaymentFrequency(member.commission_payment_frequency)),
    );

    const openCommissionEditor = () => {
        const freq = normalizePaymentFrequency(member.commission_payment_frequency);
        setRate(String(member.commission_rate ?? 0));
        setFrequency(freq);
        setDay(member.commission_payment_day ?? defaultPaymentDay(freq));
        setEditingCommission(true);
    };

    const handleFrequencyChange = (next: CommissionPaymentFrequency) => {
        setFrequency(next);
        setDay(defaultPaymentDay(next));
    };

    const handleSaveCommission = async () => {
        if (!onSaveCommission) return;
        const parsed = parseFloat(rate);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return;
        setSaving(true);
        try {
            await onSaveCommission(member.id, { rate: parsed, frequency, day });
            setEditingCommission(false);
        } finally {
            setSaving(false);
        }
    };

    const commissionRate = member.commission_rate ?? 0;
    const schedule = scheduleSummary(member.commission_payment_frequency, member.commission_payment_day);
    const dayOptions = paymentDayOptions(frequency);

    return (
        <div className={`
            relative p-4 md:p-5 ${radius.card} border transition-all duration-300 group
            ${member.active
                ? `${colors.card} ${colors.border} hover:border-[var(--color-border-strong)] ${shadow.card} ${shadow.cardHover}`
                : `${colors.card} ${colors.border} grayscale opacity-70`}
            ${member.is_owner ? `ring-2 ${accent.ring}` : ''}
            active:scale-[0.98] md:active:scale-100
        `}>
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

            <div className="flex items-center gap-4 md:gap-5">
                <div className="relative shrink-0">
                    <div className={`
                        w-14 h-14 md:w-20 md:h-20 ${radius.avatar} overflow-hidden ${colors.surface} border transition-all
                        ${member.active
                            ? `${accent.borderDim} group-hover:border-[var(--color-accent-border)]`
                            : `${colors.border} ring-2 ring-[var(--color-danger-border)]`}
                    `}>
                        {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${colors.textMuted}`}>
                                <User className="w-8 h-8 md:w-10 md:h-10" />
                            </div>
                        )}
                    </div>
                    {member.active && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-card)]" />
                    )}
                </div>

                <div className="flex-1 min-w-0 pr-16 sm:pr-20">
                    <h3 className={`font-heading text-base md:text-xl font-bold truncate leading-tight ${member.active ? colors.text : colors.textMuted}`}>
                        {member.name}
                    </h3>
                    <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${accent.text} opacity-80`}>
                        {member.role}
                    </p>

                    {!member.is_owner && !editingCommission && (
                        <div className="space-y-0.5">
                            <p className={`text-lg font-bold font-mono tabular-nums ${accent.text}`}>
                                {commissionRate}% de comissão
                            </p>
                            <p className={`text-xs uppercase tracking-wide font-mono ${colors.textMuted}`}>
                                {schedule}
                            </p>
                        </div>
                    )}
                    {member.is_owner && (
                        <p className={`text-xs ${colors.textMuted}`}>
                            Dono não entra na fila de repasse de comissões.
                        </p>
                    )}
                </div>
            </div>

            {!member.is_owner && editingCommission && (
                <div className={`mt-4 space-y-3 p-3 rounded-xl border ${accent.border} ${colors.surface}`}>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="relative col-span-2 sm:col-span-1">
                            <label className={`text-xs mb-1 block ${colors.textMuted}`}>Comissão</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className={`w-full px-3 py-2.5 min-h-[44px] rounded-lg ${colors.text} font-mono text-center outline-none bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:border-theme-accent`}
                                autoFocus
                            />
                            <span className={`absolute right-3 bottom-2.5 ${colors.textMuted} font-mono pointer-events-none`}>%</span>
                        </div>
                        <div>
                            <label className={`text-xs mb-1 block ${colors.textMuted}`}>Frequência</label>
                            <select
                                value={frequency}
                                onChange={(e) => handleFrequencyChange(e.target.value as CommissionPaymentFrequency)}
                                className={`w-full min-h-[44px] px-2 py-2 rounded-lg ${colors.inputBg} ${colors.text} text-xs border ${colors.border} outline-none uppercase font-mono`}
                            >
                                <option value="weekly">Semanal</option>
                                <option value="biweekly">Quinzenal</option>
                                <option value="monthly">Mensal</option>
                            </select>
                        </div>
                        <div>
                            <label className={`text-xs mb-1 block ${colors.textMuted}`}>Dia do acerto</label>
                            <select
                                value={day}
                                onChange={(e) => setDay(parseInt(e.target.value, 10))}
                                className={`w-full min-h-[44px] px-2 py-2 rounded-lg ${colors.inputBg} ${colors.text} text-xs border ${colors.border} outline-none uppercase font-mono`}
                            >
                                {dayOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 min-h-[44px]"
                            onClick={() => void handleSaveCommission()}
                            disabled={saving}
                            icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        >
                            {saving ? 'Salvando' : 'Salvar'}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 min-h-[44px]"
                            onClick={() => setEditingCommission(false)}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            <div className={`mt-4 pt-3 border-t ${colors.divider} flex flex-wrap justify-end items-center gap-2`}>
                {!member.is_owner && onSaveCommission && !editingCommission && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            openCommissionEditor();
                        }}
                        className={`
                            flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px]
                            ${accent.bgDim} ${accent.text} ${radius.button}
                            transition-all text-xs font-bold uppercase tracking-widest
                            border ${accent.borderDim}
                        `}
                    >
                        <Percent className="w-3.5 h-3.5" />
                        Comissão
                    </button>
                )}
                <button
                    type="button"
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
                    type="button"
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
