import React from 'react';
import { Screw } from './Screw';
import { useAuth } from '../contexts/AuthContext';

interface BrutalCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  accent?: boolean;
  glow?: boolean;
  forceTheme?: 'beauty' | 'barber';
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  className = '',
  title,
  action,
  noPadding = false,
  accent = false,
  glow = false,
  forceTheme
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
      const baseBeauty = 'relative bg-gradient-to-br from-beauty-card/90 to-beauty-dark/80 backdrop-blur-xl border border-beauty-neon/20 rounded-2xl transition-all duration-300';
      const hoverBeauty = 'hover:border-beauty-neon/40 hover:shadow-neon';
      const accentBeauty = accent ? 'border-beauty-neon/50 shadow-neon' : '';
      const glowBeauty = glow ? 'shadow-[0_0_30px_rgba(167,139,250,0.3)]' : 'shadow-soft';

      return `${baseBeauty} ${hoverBeauty} ${accentBeauty} ${glowBeauty} ${className}`;
    } else {
      // Estilo Brutalismo - Industrial, robusto, bordas retas
      const baseBrutal = 'relative bg-brutal-card border-4 border-brutal-border transition-all duration-200';
      const hoverBrutal = 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000000]';
      const accentBrutal = accent ? 'border-accent-gold bg-gradient-to-br from-brutal-card to-neutral-900' : '';
      const glowBrutal = glow ? 'shadow-[4px_4px_0px_0px_#C29B40]' : 'shadow-heavy';

      return `${baseBrutal} ${hoverBrutal} ${accentBrutal} ${glowBrutal} ${className}`;
    }
  };

  const getHeaderClass = () => {
    if (isBeauty) {
      return 'flex justify-between items-center px-5 py-4 md:px-6 md:py-5 border-b border-beauty-neon/10 bg-gradient-to-r from-beauty-neon/5 to-transparent';
    } else {
      return 'flex justify-between items-center px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 border-b-2 border-brutal-border border-dashed mx-2 mb-2 bg-gradient-to-r from-neutral-900/50 to-transparent';
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
    <div className={getContainerClass()}>
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