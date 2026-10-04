import React, { useState } from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { MetricAccount } from '../../utils/staffPerformanceAccount';
import { MetricAccountModal } from './MetricAccountModal';

interface MetricCardProps {
    account: MetricAccount;
}

export const MetricCard: React.FC<MetricCardProps> = ({ account }) => {
    const { colors, font, radius, accent } = useBrutalTheme();
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                data-testid={`metric-${account.id}`}
                data-span={account.span}
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
                className={[
                    'w-full text-left min-w-0 flex flex-col',
                    'p-4 md:p-5',
                    `border ${colors.border} ${radius.card} ${colors.card}`,
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-input-focus)]',
                    colors.surfaceHover,
                ].join(' ')}
            >
                <span className={`text-[13px] md:text-sm leading-snug ${colors.textSecondary}`}>
                    {account.label}
                </span>
                <span
                    className={`mt-2 tabular-nums font-semibold tracking-tight text-[28px] md:text-[32px] leading-none ${font.mono} ${colors.text}`}
                >
                    {account.value}
                </span>
                {account.hint && (
                    <span className={`mt-2 text-[13px] leading-snug ${colors.textMuted}`}>{account.hint}</span>
                )}
                <span className={`mt-3 text-[13px] ${accent.text}`}>Ver a conta</span>
            </button>
            {open && <MetricAccountModal account={account} onClose={() => setOpen(false)} />}
        </>
    );
};
