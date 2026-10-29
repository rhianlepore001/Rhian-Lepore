import React from 'react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_STEP = 5;
const BASE_MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP).padStart(2, '0'));
const FALLBACK = { hour: '09', minute: '00' };

export function parseTime24(value: string | null | undefined): { hour: string; minute: string } {
    const match = /^(\d{2}):(\d{2})$/.exec(value ?? '');
    if (!match) return FALLBACK;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return FALLBACK;
    return { hour: match[1], minute: match[2] };
}

export function buildMinuteOptions(current: string): string[] {
    if (BASE_MINUTES.includes(current)) return BASE_MINUTES;
    return [...BASE_MINUTES, current].sort();
}

interface TimeSelect24Props {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    disabled?: boolean;
}

export const TimeSelect24: React.FC<TimeSelect24Props> = ({ value, onChange, ariaLabel, disabled }) => {
    const { classes, colors } = useBrutalTheme();
    const { hour, minute } = parseTime24(value);
    const minutes = buildMinuteOptions(minute);

    const selectClass = `min-w-0 flex-1 !px-2 !py-2.5 text-sm text-center tabular-nums ${classes.input}`;

    return (
        <div className="flex min-w-0 flex-1 items-center gap-1">
            <select
                aria-label={`${ariaLabel} (hora)`}
                value={hour}
                disabled={disabled}
                onChange={(e) => onChange(`${e.target.value}:${minute}`)}
                className={selectClass}
            >
                {HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
            <span aria-hidden="true" className={colors.textMuted}>:</span>
            <select
                aria-label={`${ariaLabel} (minuto)`}
                value={minute}
                disabled={disabled}
                onChange={(e) => onChange(`${hour}:${e.target.value}`)}
                className={selectClass}
            >
                {minutes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    );
};
