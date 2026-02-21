import React from 'react';
import { Screw } from './Screw';
import { useAuth } from '../contexts/AuthContext';

interface BrutalCardProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  accent?: boolean;
  glow?: boolean;
  forceTheme?: 'beauty' | 'barber';
  style?: React.CSSProperties;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  id,
  children,
  className = '',
  title,
  action,
  noPadding = false,
  accent = false,
  glow = false,
  forceTheme,
  style
}) => {
  const { userType } = useAuth();
  const isBeauty = forceTheme ? forceTheme === 'beauty' : userType === 'beauty';

  // ===========================================
  // BRUTALISMO (Barbearias): Bordas retas, sombras pesadas, visual industrial
  // BEAUTY (Salões): Bordas arredondadas, efeitos neon roxo, visual premium
  // ===========================================

  const getContainerClass = () => {
    if (isBeauty) {
      // Estilo Beauty - Pro Max Glass
      const baseBeauty = 'relative bg-gradient-beauty backdrop-blur-2xl border border-white/10 rounded-[28px] transition-all duration-300 overflow-hidden select-none touch-none shadow-promax-glass active:scale-[0.98] active:animate-haptic-click';
      const accentBeauty = accent ? 'border-beauty-neon/40 shadow-neon bg-beauty-neon/5' : '';
      const glowBeauty = glow ? 'shadow-neon-strong ring-1 ring-beauty-neon/30' : '';

      return `${baseBeauty} ${accentBeauty} ${glowBeauty} ${className}`;
    } else {
      // Estilo Barber Premium - Industrial Depth Pro Max
      const baseBrutal = 'relative bg-gradient-brutal backdrop-blur-2xl border border-white/15 rounded-[28px] transition-all duration-300 select-none touch-none shadow-promax-glass overflow-hidden active:scale-[0.98] active:animate-haptic-click';
      const accentBrutal = accent ? 'border-accent-gold/60 shadow-gold bg-accent-gold/5' : '';
      const glowBrutal = glow ? 'shadow-promax-depth ring-1 ring-accent-gold/30' : '';

      return `${baseBrutal} ${accentBrutal} ${glowBrutal} ${className}`;
    }
  };

  const getHeaderClass = () => {
    if (isBeauty) {
      return 'flex justify-between items-center px-5 py-4 md:px-6 md:py-5 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent';
    } else {
      return 'flex justify-between items-center px-4 py-3 md:px-6 md:py-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent';
    }
  };

  const getTitleClass = () => {
    if (isBeauty) {
      return 'font-heading text-lg md:text-xl text-white tracking-normal';
    } else {
      return 'font-heading text-lg md:text-xl text-text-primary uppercase tracking-wider';
    }
  };

  return (
    <div
      className={getContainerClass()}
      style={{
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        ...style
      }}
      tabIndex={-1} // Remove do fluxo de tabulação para evitar foco acidental
    >
      {/* Decorative Screws (Only for Barber/Brutalismo) */}
      {!isBeauty && (
        <>
          <Screw className="top-2 left-2" />
          <Screw className="top-2 right-2" />
          <Screw className="bottom-2 left-2" />
          <Screw className="bottom-2 right-2" />
        </>
      )}

      {/* Glass & Noise Overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-promax opacity-10 pointer-events-none" />

      {/* Header Area if title exists */}
      {(title || action) && (
        <div className={getHeaderClass()}>
          {title && (
            typeof title === 'string'
              ? <h3 className={getTitleClass()}>{title}</h3>
              : <div className={getTitleClass()}>{title}</div>
          )}
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Content */}
      <div className={`${noPadding ? '' : 'p-4 md:p-6'} text-text-secondary relative z-10`}>
        {children}
      </div>
    </div>
  );
};