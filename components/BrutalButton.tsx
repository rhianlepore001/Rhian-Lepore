import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
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
  const { userType } = useAuth();
  const isBeauty = forceTheme ? forceTheme === 'beauty' : userType === 'beauty';

  // ===========================================
  // BRUTALISMO: Sombras pesadas, bordas retas, movimento industrial
  // BEAUTY: Gradientes suaves, bordas arredondadas, efeitos neon
  // ===========================================

  const getBaseStyles = () => {
    if (isBeauty) {
      return `
        font-sans font-semibold tracking-wide 
        transition-all duration-300 ease-out
        flex items-center justify-center gap-2 
        rounded-xl border
        transform hover:scale-[1.02] active:scale-[0.98] active:animate-haptic-click
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
      `;
    } else {
      return `
        font-mono font-bold uppercase tracking-tight 
        border-2 border-black 
        transition-all duration-150
        flex items-center justify-center gap-2 
        transform active:translate-y-1 active:translate-x-1 active:shadow-none active:animate-haptic-click
        hover:translate-x-[-2px] hover:translate-y-[-2px]
        disabled:opacity-70 disabled:grayscale disabled:cursor-not-allowed
        disabled:hover:translate-x-0 disabled:hover:translate-y-0
      `;
    }
  };

  const getVariantStyles = () => {
    const variants = {
      primary: isBeauty
        ? 'bg-gradient-to-r from-beauty-neon to-beauty-acid text-white font-bold hover:shadow-neon border-white/10'
        : 'bg-gradient-to-r from-accent-gold to-accent-goldHover text-black hover:opacity-90 shadow-sm border-white/10',

      secondary: isBeauty
        ? 'bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-sm'
        : 'bg-white/5 text-text-primary hover:bg-white/10 shadow-sm border-white/10',

      danger: isBeauty
        ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 hover:bg-red-500/30 border-red-500/20'
        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20',

      ghost: isBeauty
        ? 'bg-transparent border-transparent text-beauty-neon hover:bg-white/5'
        : 'bg-transparent border-transparent text-accent-gold hover:bg-white/5',

      success: isBeauty
        ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-white/5'
        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-white/5'
    };
    return variants[variant];
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: 'text-xs px-3 py-1.5 h-8 min-w-[80px]',
      md: 'text-sm px-5 py-2.5 h-11 min-w-[120px]',
      lg: 'text-base px-7 py-3.5 h-14 min-w-[160px]'
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
        ${getBaseStyles()}
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      disabled={disabled || loading}
      {...props}
    >
      {renderIcon()}
      {children}
    </button>
  );
};
