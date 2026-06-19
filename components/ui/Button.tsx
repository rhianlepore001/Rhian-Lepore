import React from 'react';
import { Loader2 } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  forceTheme?: ThemeVariant;
}

// Touch target mínimo 44px no mobile em todos os tamanhos (WCAG 2.5.8, DS Lock §1.3).
// Desktop pode comprimir o sm para reduzir densidade de cliques.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-2.5 min-h-[44px] md:min-h-[36px] md:h-9 md:py-1.5 gap-1.5',
  md: 'text-sm px-5 py-2.5 h-11 min-h-[44px] gap-2',
  lg: 'text-base px-6 py-3 h-[52px] min-h-[52px] gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  forceTheme,
  type = 'button',
  ...props
}) => {
  const { classes, radius } = useBrutalTheme({ override: forceTheme });

  const variantMap: Record<ButtonVariant, string> = {
    primary: classes.buttonPrimary,
    secondary: classes.buttonSecondary,
    danger: classes.buttonDanger,
    ghost: classes.buttonGhost,
    success: classes.buttonSuccess,
    outline: classes.buttonOutline,
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={[
        'relative inline-flex items-center justify-center font-semibold select-none',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        radius.button,
        variantMap[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 pointer-events-none' : 'active:scale-[0.97]',
        className,
      ].filter(Boolean).join(' ')}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      )}
      {!loading && icon && (
        <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">
          {icon}
        </span>
      )}
      {children && <span className="truncate">{children}</span>}
      {iconRight && (
        <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">
          {iconRight}
        </span>
      )}
    </button>
  );
};
