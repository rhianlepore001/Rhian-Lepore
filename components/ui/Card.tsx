import React from 'react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

type CardVariant = 'default' | 'accent' | 'glow';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  title?: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  forceTheme?: ThemeVariant;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  title,
  action,
  noPadding = false,
  className = '',
  id,
  style,
  forceTheme,
}) => {
  const { classes, colors } = useBrutalTheme({ override: forceTheme });

  const variantMap: Record<CardVariant, string> = {
    default: classes.card,
    accent: classes.cardAccent,
    glow: classes.cardGlow,
  };

  return (
    <div
      id={id}
      className={[variantMap[variant], className].filter(Boolean).join(' ')}
      style={style}
    >
      {(title || action) && (
        <div
          className={[
            'flex items-center justify-between',
            'px-5 py-4 md:px-6 md:py-5',
            `border-b ${colors.divider}`,
          ].join(' ')}
        >
          {title && (
            <div className="flex-1 min-w-0">
              {typeof title === 'string' ? (
                <h3 className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>
                  {title}
                </h3>
              ) : (
                title
              )}
            </div>
          )}
          {action && <div className="ml-3 shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5 md:p-6'}>
        {children}
      </div>
    </div>
  );
};
