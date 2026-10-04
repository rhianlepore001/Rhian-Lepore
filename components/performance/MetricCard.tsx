import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { MetricAccount } from '../../utils/staffPerformanceAccount';
import { MetricAccountModal } from './MetricAccountModal';

interface MetricCardProps {
    account: MetricAccount;
    fluidValue?: boolean;
    onValueOverflow?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ account, fluidValue = false, onValueOverflow }) => {
    const { colors, font, radius, accent } = useBrutalTheme();
    const [open, setOpen] = useState(false);
    const valueRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        if (!onValueOverflow) return;
        const el = valueRef.current;
        if (!el) return;
        if (el.scrollWidth > el.clientWidth + 1) onValueOverflow();
    }, [account.value, fluidValue, onValueOverflow]);

    return (
        <>
            <button
                type="button"
                data-testid={`metric-${account.id}`}
                data-span={account.span}
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
                className={[
                    '@container w-full h-full text-left min-w-0 flex flex-col',
                    'p-4 md:p-5',
                    `border ${colors.border} ${radius.card} ${colors.card}`,
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-input-focus)]',
                    'transition-colors duration-150',
                    'hover:bg-[var(--color-card-hover)] active:bg-[var(--color-card-hover)]',
                ].join(' ')}
            >
                <span className={`text-[13px] md:text-sm leading-snug ${colors.textSecondary}`}>
                    {account.label}
                </span>
                <span
                    ref={valueRef}
                    data-metric-value
                    className={[
                        'mt-2 tabular-nums font-semibold tracking-tight leading-none whitespace-nowrap',
                        font.mono,
                        colors.text,
                        fluidValue
                            ? 'text-[clamp(1.375rem,16cqi,1.75rem)] md:text-[2rem]'
                            : 'text-[28px] md:text-[32px]',
                    ].join(' ')}
                >
                    {account.value}
                </span>
                {account.hint && (
                    <span className={`mt-2 text-[13px] leading-snug whitespace-nowrap overflow-hidden text-ellipsis ${colors.textMuted}`}>
                        {account.hint}
                    </span>
                )}
                <span className={`mt-auto pt-3 inline-flex items-center gap-1 text-[13px] ${accent.text}`}>
                    Ver a conta
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
            </button>
            {open && <MetricAccountModal account={account} onClose={() => setOpen(false)} />}
        </>
    );
};
