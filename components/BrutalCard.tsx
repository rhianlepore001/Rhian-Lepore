import React from 'react';
import { useLocation } from 'react-router-dom';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface BrutalCardProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  accent?: boolean;
  glow?: boolean;
  animate?: boolean;
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
  accent: accentProp = false,
  glow: glowProp = false,
  animate = false,
  forceTheme,
  style
}) => {
  const { classes, accent, colors } = useBrutalTheme({ override: forceTheme });
  const location = useLocation();
  const isSettings = location.pathname.startsWith('/configuracoes');

  const containerClass = glowProp
    ? `${classes.cardGlow} ${className}`
    : accentProp
      ? `${classes.cardAccent} ${className}`
      : `${classes.card} ${className}`;
  const animationClass = animate ? 'animate-in fade-in zoom-in-[99%] duration-300' : '';

  const headerClass = `flex justify-between items-center px-6 py-5 md:px-8 md:py-6 border-b ${colors.divider} bg-white/[0.02]`;
  const titleClass = `font-heading text-lg md:text-xl ${colors.text} tracking-tight font-bold`;
  const contentClass = `${noPadding ? '' : 'p-6 md:p-8'} ${colors.textSecondary} relative z-10`;

  return (
    <div
      id={id}
      className={`${containerClass} ${animationClass}`.trim()}
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
        <div className={headerClass}>
          {title && (
            <div className="flex-1">
              {typeof title === 'string'
                ? <h3 className={titleClass}>{title}</h3>
                : <div className={titleClass}>{title}</div>
              }
            </div>
          )}
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}

      {/* Conteúdo com padding padronizado */}
      <div className={contentClass}>
        {children}
      </div>
    </div>
  );
};
