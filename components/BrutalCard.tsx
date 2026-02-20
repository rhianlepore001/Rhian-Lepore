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
      // Estilo Beauty - Elegante, moderno, bordas arredondadas
      const baseBeauty = 'relative bg-gradient-to-br from-beauty-card/90 to-beauty-dark/80 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-300 overflow-hidden select-none touch-none outline-none focus:outline-none';
      const accentBeauty = accent ? 'border-beauty-neon/40 shadow-[0_0_20px_rgba(167,139,250,0.15)]' : '';
      const glowBeauty = glow ? 'shadow-[0_0_15px_rgba(167,139,250,0.1)]' : 'shadow-sm';

      return `${baseBeauty} ${accentBeauty} ${glowBeauty} ${className}`;
    } else {
      // Estilo Industrial Premium - Robusto mas sofisticado
      const baseBrutal = 'relative bg-brutal-card/95 backdrop-blur-md border border-white/10 rounded-xl transition-all duration-300 select-none touch-none outline-none focus:outline-none overflow-hidden';
      const accentBrutal = accent ? 'border-accent-gold/50 bg-gradient-to-br from-brutal-card to-neutral-900 shadow-[0_0_20px_rgba(194,155,64,0.1)]' : '';
      const glowBrutal = glow ? 'shadow-[0_0_15px_rgba(194,155,64,0.1)]' : 'shadow-md';

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

      {/* Beauty Gradient Overlay */}
      {isBeauty && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-beauty-neon/5 via-transparent to-beauty-acid/5 pointer-events-none" />
      )}

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