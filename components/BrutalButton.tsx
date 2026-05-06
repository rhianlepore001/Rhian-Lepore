import React from 'react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  forceTheme?: 'beauty' | 'barber';
}

export const BrutalButton: React.FC<BrutalButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  forceTheme,
  ...props
}) => {
  const { classes } = useBrutalTheme({ override: forceTheme });

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return classes.buttonPrimary;
      case 'secondary':
        return classes.buttonSecondary;
      case 'danger':
        return classes.buttonDanger;
      case 'ghost':
        return classes.buttonGhost;
      case 'success':
        return classes.buttonSuccess;
      case 'outline':
        return classes.buttonOutline;
      default:
        return classes.buttonPrimary;
    }
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: 'text-xs px-4 py-2 h-9 min-w-[80px]',
      md: 'text-sm px-6 py-3 h-12 min-w-[120px]',
      lg: 'text-base px-8 py-4 h-15 min-w-[160px]'
    };
    return sizes[size];
  };

  const getIconSize = () => {
    const sizes = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };
    return sizes[size];
  };

  const renderIcon = () => {
    if (loading) {
      return (
        <svg className={`${getIconSize()} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, {
        className: `${getIconSize()} ${(icon as any).props?.className || ''}`
      });
    }
    return icon;
  };

  return (
    <button
      className={`
        relative overflow-hidden font-sans font-bold flex items-center justify-center gap-2 rounded-2xl border transition-all duration-300 select-none touch-none
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      disabled={disabled || loading}
      {...props}
    >
      {/* Camadas de Craft: Noise e Inner Glow */}
      <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.1] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />

      <span className="relative z-10 flex items-center gap-2">
        {renderIcon()}
        {children}
      </span>
    </button>
  );
};
