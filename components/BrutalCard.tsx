import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';

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
  const { isMobile } = useUI();
  const location = useLocation();
  const isBeauty = forceTheme ? forceTheme === 'beauty' : userType === 'beauty';
  const isSettings = location.pathname.startsWith('/configuracoes');

  // ===========================================
  // BRUTALISMO (Barbearias): Moderno industrial com glass nas settings
  // BEAUTY (Salões): Bordas suaves, efeitos neon roxo, visual premium
  // ===========================================

  const getContainerClass = () => {
    const blurClass = isMobile ? 'backdrop-blur-md' : 'backdrop-blur-2xl';

    if (isBeauty) {
      const shadowClass = isMobile ? 'shadow-lite-glass' : 'shadow-promax-glass';
      const transitionClass = isMobile ? 'transition-[transform,opacity]' : 'transition-all';
      const baseBeauty = `relative bg-gradient-beauty ${blurClass} border border-white/10 rounded-2xl ${transitionClass} duration-500 overflow-hidden select-none touch-pan-y ${shadowClass}`;
      const accentBeauty = accent ? 'border-beauty-neon/40 shadow-neon bg-beauty-neon/5' : '';
      const glowBeauty = glow ? 'shadow-neon-strong ring-1 ring-beauty-neon/30' : '';

      return `${baseBeauty} ${accentBeauty} ${glowBeauty} ${className}`;
    } else {
      const shadowClass = isMobile ? 'shadow-lite-gold' : 'shadow-promax-glass';
      const transitionClass = isMobile ? 'transition-[transform,opacity]' : 'transition-all';
      // Glass mode automático nas rotas de configurações
      const bg = isSettings
        ? 'bg-brutal-card/30 backdrop-blur-2xl'
        : `bg-gradient-brutal ${blurClass}`;
      const baseBrutal = `relative ${bg} border border-white/10 rounded-2xl ${transitionClass} duration-500 select-none touch-pan-y ${shadowClass} overflow-hidden`;
      const accentBrutal = accent ? 'border-accent-gold/60 shadow-gold bg-accent-gold/5' : '';
      const glowBrutal = glow ? 'shadow-promax-depth ring-1 ring-accent-gold/30' : '';

      return `${baseBrutal} ${accentBrutal} ${glowBrutal} ${className}`;
    }
  };

  const getHeaderClass = () => {
    return 'flex justify-between items-center px-6 py-5 md:px-8 md:py-6 border-b border-white/5 bg-white/[0.02]';
  };

  const getTitleClass = () => {
    if (isBeauty) {
      return 'font-heading text-lg md:text-xl text-white tracking-tight font-bold';
    } else {
      return 'font-heading text-lg md:text-xl text-text-primary tracking-tight font-bold';
    }
  };

  return (
    <div
      id={id}
      className={getContainerClass()}
      style={{
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...style
      }}
      tabIndex={-1}
    >
      {/* Camadas de Craft: Destaque interno, Noise e Gradiente Suave */}
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-transparent pointer-events-none" />

      {/* Área do Cabeçalho */}
      {(title || action) && (
        <div className={getHeaderClass()}>
          {title && (
            <div className="flex-1">
              {typeof title === 'string'
                ? <h3 className={getTitleClass()}>{title}</h3>
                : <div className={getTitleClass()}>{title}</div>
              }
            </div>
          )}
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}

      {/* Conteúdo com padding padronizado */}
      <div className={`${noPadding ? '' : 'p-6 md:p-8'} text-text-secondary relative z-10`}>
        {children}
      </div>
    </div>
  );
};