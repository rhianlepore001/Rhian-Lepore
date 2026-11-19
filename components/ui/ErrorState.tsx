import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  forceTheme?: ThemeVariant;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Algo deu errado',
  message = 'Ocorreu um erro inesperado. Tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
  className = '',
  forceTheme,
}) => {
  const { colors, status } = useBrutalTheme({ override: forceTheme });

  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 py-8 sm:px-6 sm:py-10 ${className}`}
      role="alert"
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${status.dangerBg} mb-3`}>
        <AlertTriangle className={`w-5 h-5 ${status.danger}`} aria-hidden="true" />
      </div>
      <p className={`text-base font-semibold ${colors.text}`}>{title}</p>
      <p className={`mt-1.5 text-sm ${colors.textSecondary} max-w-[38ch] leading-relaxed text-pretty`}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={[
            'mt-4 inline-flex min-h-12 items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl',
            'border transition-colors duration-150',
            `${colors.text} ${colors.border} ${colors.card}`,
            'hover:bg-[var(--color-card-hover)]',
          ].join(' ')}
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
};
