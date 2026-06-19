import React from 'react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /**
   * Slot da ação primária. Deve conter no máximo UM CTA primário (Impeccable §1.6).
   * Layout: à direita no desktop, full-width no mobile (DS Lock §4.2).
   */
  action?: React.ReactNode;
  /** Slot opcional para chips/filtros à esquerda, entre subtítulo e CTA */
  meta?: React.ReactNode;
  className?: string;
  forceTheme?: ThemeVariant;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  meta,
  className = '',
  forceTheme,
}) => {
  const { colors, font } = useBrutalTheme({ override: forceTheme });

  return (
    <header
      className={[
        'w-full flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6',
        'pb-4 md:pb-5',
        className,
      ].join(' ')}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h1
          className={[
            font.heading,
            'text-2xl md:text-3xl font-bold tracking-tight',
            colors.text,
            'truncate',
          ].join(' ')}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={`text-sm ${colors.textSecondary} truncate`}>{subtitle}</p>
        )}
        {meta && <div className="mt-2 flex flex-wrap gap-2">{meta}</div>}
      </div>
      {action && (
        <div className="flex w-full md:w-auto items-center md:justify-end gap-2 [&>*]:w-full md:[&>*]:w-auto">
          {action}
        </div>
      )}
    </header>
  );
};
