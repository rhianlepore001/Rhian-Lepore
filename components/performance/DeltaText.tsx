import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { Delta } from '../../utils/staffPerformanceView';

interface DeltaTextProps {
    delta: Delta | null;
    /** "vs agosto" — some quando a mesma referência já aparece no cabeçalho do bloco. */
    against?: string | null;
    className?: string;
}

/** R3.15 / R7.11: cor só para sentido, sempre com rótulo em texto. */
export const DeltaText: React.FC<DeltaTextProps> = ({ delta, against, className = '' }) => {
    const { colors, status } = useBrutalTheme();
    if (!delta) return null;
    const tone = delta.tone === 'good' ? status.success : delta.tone === 'bad' ? status.danger : colors.textMuted;
    const showLabel = delta.label === 'melhor' || delta.label === 'pior';
    return (
        <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 text-xs leading-snug tabular-nums ${className}`}>
            <span className={`${tone} font-medium whitespace-nowrap`}>{delta.text}</span>
            {showLabel && <span className={`${tone} whitespace-nowrap`}>{delta.label}</span>}
            {against && <span className={`${colors.textMuted} whitespace-nowrap`}>{against}</span>}
        </span>
    );
};
