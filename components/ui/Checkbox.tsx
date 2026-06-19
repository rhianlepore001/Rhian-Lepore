import React, { useId } from 'react';
import { Check } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  forceTheme?: ThemeVariant;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id: idProp, disabled, forceTheme, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = `${id}-error`;
    const { colors, radius, accent } = useBrutalTheme({ override: forceTheme });
    const hasError = Boolean(error);

    return (
      <div className={className}>
        <label
          htmlFor={id}
          className={[
            'inline-flex items-start gap-3 cursor-pointer select-none',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <span className="relative flex shrink-0 mt-0.5">
            <input
              ref={ref}
              id={id}
              type="checkbox"
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              className="peer sr-only"
              {...props}
            />
            <span
              aria-hidden="true"
              className={[
                'flex h-5 w-5 items-center justify-center border-2 transition-all duration-150 ease-out',
                radius.badge,
                hasError ? 'border-[var(--color-danger)]' : colors.inputBorder,
                'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-bg)]',
                'peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent)]',
                'peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100',
                'peer-disabled:opacity-50',
              ].join(' ')}
            >
              <Check
                className="h-3.5 w-3.5 text-black opacity-0 scale-75 transition-all duration-150 ease-out"
                strokeWidth={3}
              />
            </span>
          </span>
          {label && (
            <span className={`text-sm ${hasError ? 'text-[var(--color-danger)]' : colors.text}`}>
              {label}
            </span>
          )}
        </label>
        {hasError && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
