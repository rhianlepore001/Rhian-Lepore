import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  forceTheme?: ThemeVariant;
}

const SIZE_MAP = {
  sm: 'h-9 text-xs px-3 pr-8',
  md: 'h-11 text-sm px-4 pr-9',
  lg: 'h-[52px] text-base px-4 pr-10',
} as const;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      size = 'md',
      fullWidth = true,
      className = '',
      id: idProp,
      disabled,
      forceTheme,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const { colors, radius, classes, font } = useBrutalTheme({ override: forceTheme });

    const hasError = Boolean(error);

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={id}
            className={[classes.label, 'block mb-1.5'].join(' ')}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              [hasError ? errorId : '', hint ? hintId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={[
              'w-full appearance-none cursor-pointer',
              radius.input,
              SIZE_MAP[size],
              colors.text,
              colors.inputBg,
              `border ${hasError ? 'border-[var(--color-danger)]' : colors.inputBorder}`,
              'focus:outline-none focus:border-[var(--color-input-focus)] focus:ring-1 focus:ring-[var(--color-input-focus)]',
              'transition-colors duration-200',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
              hasError ? 'bg-[var(--color-danger-bg)]' : '',
              className,
            ].filter(Boolean).join(' ')}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={[
              'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
              colors.textMuted,
            ].join(' ')}
            aria-hidden="true"
          />
        </div>
        {hasError && (
          <p
            id={errorId}
            role="alert"
            className={`mt-1.5 text-xs text-[var(--color-danger)] ${font.body}`}
          >
            {error}
          </p>
        )}
        {hint && !hasError && (
          <p
            id={hintId}
            className={`mt-1.5 text-xs ${colors.textMuted}`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
