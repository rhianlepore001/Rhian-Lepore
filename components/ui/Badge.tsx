import React from 'react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

type BadgeVariant = 'accent' | 'danger' | 'success' | 'warning' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  forceTheme?: ThemeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  children, variant = 'neutral', className = '', forceTheme,
}) => {
  const { classes } = useBrutalTheme({ override: forceTheme });

  const variantMap: Record<BadgeVariant, string> = {
    accent: classes.badgeAccent,
    danger: classes.badgeDanger,
    success: classes.badgeSuccess,
    warning: classes.badgeWarning,
    neutral: classes.badgeNeutral,
  };

  return (
    <span
      className={[
        'inline-flex items-center leading-none tracking-wide border',
        variantMap[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
};
