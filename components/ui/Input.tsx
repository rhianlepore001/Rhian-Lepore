import React, { useId } from 'react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  forceTheme?: ThemeVariant;
}

const SIZE_MAP = {
  sm: 'h-9 text-xs px-3',
  md: 'h-11 text-sm px-4',
  lg: 'h-[52px] text-base px-4',
} as const;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconRight,
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
          {icon && (
            <span
              className={[
                'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
                '[&>svg]:w-4 [&>svg]:h-4',
                colors.textMuted,
              ].join(' ')}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <input
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
              'w-full',
              radius.input,
              SIZE_MAP[size],
              colors.text,
              colors.inputBg,
              `border ${hasError ? 'border-[var(--color-danger)]' : colors.inputBorder}`,
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:border-[var(--color-input-focus)] focus:ring-1 focus:ring-[var(--color-input-focus)]',
              'transition-colors duration-200',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
              icon ? 'pl-10' : '',
              iconRight ? 'pr-10' : '',
              hasError ? 'bg-[var(--color-danger-bg)]' : '',
              className,
            ].filter(Boolean).join(' ')}
            {...props}
          />
          {iconRight && (
            <span
              className={[
                'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none',
                '[&>svg]:w-4 [&>svg]:h-4',
                colors.textMuted,
              ].join(' ')}
              aria-hidden="true"
            >
              {iconRight}
            </span>
          )}
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

Input.displayName = 'Input';
