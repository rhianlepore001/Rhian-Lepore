import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  forceTheme?: ThemeVariant;
  /** Envelopa com borda tracejada — para vazios que ocupam o lugar de uma lista/grid. */
  bordered?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon, title, description, action, className = '', forceTheme, bordered = false,
}) => {
  const { colors, accent, radius } = useBrutalTheme({ override: forceTheme });

  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 py-8 sm:px-6 sm:py-10 ${
        bordered ? `${radius.card} border border-dashed border-[var(--color-border-strong)]` : ''
      } ${className}`}
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center ${radius.button} ${accent.bgDim} mb-3`}>
        <Icon className={`w-5 h-5 ${accent.text}`} aria-hidden="true" />
      </div>
      <p className={`text-base font-semibold ${colors.text} max-w-[32ch] text-balance`}>{title}</p>
      {description && (
        <p className={`mt-1.5 text-sm ${colors.textSecondary} max-w-[38ch] leading-relaxed text-pretty`}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
