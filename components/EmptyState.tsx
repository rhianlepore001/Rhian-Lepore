import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { BrutalButton } from './BrutalButton';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  message,
  ctaLabel,
  onCta,
  className = '',
  subtitle,
}) => {
  const { colors, font, accent } = useBrutalTheme();

  return (
    <div className={`flex flex-col items-center justify-center text-center py-10 px-6 animate-in fade-in zoom-in-95 duration-500 ${className}`}>
      <div className={`p-4 rounded-2xl ${accent.bgDim} mb-4`}>
        <Icon className={`w-7 h-7 ${accent.text} opacity-70`} />
      </div>
      <p className={`text-sm font-semibold ${colors.text} ${font.body} mb-1.5 max-w-[32ch]`}>
        {message}
      </p>
      {subtitle && (
        <p className={`text-xs ${colors.textMuted} ${font.body} mb-4 max-w-[28ch] leading-relaxed`}>
          {subtitle}
        </p>
      )}
      {ctaLabel && onCta && (
        <BrutalButton size="sm" onClick={onCta} className="mt-2">
          {ctaLabel}
        </BrutalButton>
      )}
    </div>
  );
};
