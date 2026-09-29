import React from 'react';
import { User } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import { formatCycleLabel } from '../../utils/commissionCycle';

export interface PaidPayment {
    id: string;
    professional_name: string;
    photo_url: string | null;
    start_date: string;
    end_date: string;
    amount: number;
    paid_at: string;
}

export const PaidPaymentsList: React.FC<{ items: PaidPayment[]; theme: ThemeVariant; formatMoney: (v: number) => string }> = ({ items, theme, formatMoney }) => {
    const { colors, font, radius } = useBrutalTheme({ override: theme });
    return (
        <ul className={`border ${colors.border} ${radius.card} ${colors.card} divide-y divide-[var(--color-divider)]`}>
            {items.map((p) => (
                <li key={p.id} data-testid={`paid-row-${p.id}`} className="flex items-center gap-3 px-4 py-3.5 lg:px-5">
                    {p.photo_url ? (
                        <img src={p.photo_url} alt="" className={`w-10 h-10 shrink-0 object-cover ${radius.avatar} border ${colors.border}`} />
                    ) : (
                        <span className={`w-10 h-10 shrink-0 flex items-center justify-center ${radius.avatar} ${colors.surface} border ${colors.border}`}>
                            <User className={`w-5 h-5 ${colors.textMuted}`} aria-hidden="true" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className={`font-semibold ${colors.text} leading-tight break-words`}>{p.professional_name}</p>
                        <p className={`mt-0.5 text-xs ${font.mono} tabular-nums ${colors.textMuted}`}>{formatCycleLabel(p.start_date, p.end_date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className={`${font.mono} font-bold tabular-nums whitespace-nowrap ${colors.text}`}>{formatMoney(p.amount)}</p>
                        <p className={`mt-0.5 text-xs ${colors.textMuted}`}>Pago em {new Date(p.paid_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
};
