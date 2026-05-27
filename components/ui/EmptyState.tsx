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
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon, title, description, action, className = '', forceTheme,
}) => {
  const { colors, accent } = useBrutalTheme({ override: forceTheme });

  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div className={`p-3.5 rounded-2xl ${accent.bgDim} mb-4`}>
        <Icon className={`w-6 h-6 ${accent.text} opacity-70`} aria-hidden="true" />
      </div>
      <p className={`text-sm font-semibold ${colors.text} mb-1 max-w-[32ch]`}>{title}</p>
      {description && (
        <p className={`text-xs ${colors.textMuted} mb-4 max-w-[28ch] leading-relaxed`}>{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
