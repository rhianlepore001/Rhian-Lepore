import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const BrutalButton: React.FC<BrutalButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const { userType } = useAuth();
  const isBeauty = userType === 'beauty';

  const primaryStyle = isBeauty
    ? "bg-beauty-neon text-neutral-900 font-bold hover:bg-beauty-neonHover shadow-soft border-beauty-neon/20"
    : "bg-accent-gold text-black hover:bg-accent-goldHover shadow-heavy border-black";

  const ghostStyle = isBeauty
    ? "bg-transparent border-transparent text-beauty-neon hover:bg-white/5 shadow-none"
    : "bg-transparent border-transparent text-accent-gold hover:bg-neutral-900 hover:border-neutral-800 shadow-none";

  const baseStyles = isBeauty
    ? "font-sans font-semibold tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 rounded-xl border disabled:opacity-50 disabled:grayscale-[0.2] disabled:cursor-not-allowed"
    : "font-mono font-bold uppercase tracking-tight border-2 border-black transition-all active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale disabled:cursor-not-allowed";

  const variants = {
    primary: primaryStyle,
    secondary: isBeauty
      ? "bg-white/10 text-white hover:bg-white/20 border-white/5 backdrop-blur-sm"
      : "bg-brutal-surface text-text-primary hover:bg-neutral-700 shadow-heavy",
    danger: isBeauty
      ? "bg-red-500/20 text-red-200 hover:bg-red-500/30 border-red-500/20"
      : "bg-red-900 text-white hover:bg-red-800 shadow-heavy border-red-950",
    ghost: ghostStyle
  };

  const sizes = {
    sm: "text-xs px-3 py-1 h-8",
    md: "text-sm px-6 py-3 h-12",
    lg: "text-base px-8 py-4 h-14"
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, {
        className: `${iconSizes[size]} ${(icon as any).props?.className || ''}`
      });
    }
    return icon;
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {renderIcon()}
      {children}
    </button>
  );
};
