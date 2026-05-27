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
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
      role="alert"
    >
      <div className={`p-3.5 rounded-2xl ${status.dangerBg} mb-4`}>
        <AlertTriangle className={`w-6 h-6 ${status.danger}`} aria-hidden="true" />
      </div>
      <p className={`text-sm font-semibold ${colors.text} mb-1`}>{title}</p>
      <p className={`text-xs ${colors.textMuted} mb-4 max-w-[32ch] leading-relaxed`}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={[
            'inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl',
            'border transition-colors duration-150',
            `${status.danger} ${status.dangerBorder} ${status.dangerBg}`,
            'hover:brightness-110',
          ].join(' ')}
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
};
