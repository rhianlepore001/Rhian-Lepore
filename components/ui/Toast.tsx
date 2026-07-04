import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

export interface ShowToastOptions {
  type?: ToastType;
  durationMs?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  /**
   * Disparar toast. Aceita assinatura legada (string, type, ms) e a nova baseada em opções.
   */
  showToast: (
    message: string,
    typeOrOptions?: ToastType | ShowToastOptions,
    durationMs?: number
  ) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

const ToastView: React.FC<{ toast: ToastItem; onDismiss: (id: number) => void }> = ({
  toast,
  onDismiss,
}) => {
  const { colors, status, accent: accentTheme, radius } = useBrutalTheme();

  const accentByType: Record<ToastType, { text: string; border: string }> = {
    success: { text: status.success, border: status.successBorder },
    error: { text: status.danger, border: status.dangerBorder },
    warning: { text: status.warning, border: status.warningBorder },
    info: { text: status.success, border: status.successBorder },
  };

  const Icon = ICONS[toast.type];
  const accent = accentByType[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={[
        'pointer-events-auto flex items-start gap-3 w-full max-w-sm p-4 border',
        colors.card,
        accent.border,
        radius.card,
        'shadow-promax-glass',
      ].join(' ')}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${accent.text}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <span className={`block text-sm leading-relaxed ${colors.text}`}>{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className={[
              'mt-2 inline-flex items-center text-xs font-semibold',
              accentTheme.text,
              'underline-offset-4 hover:underline',
              'min-h-[36px]',
            ].join(' ')}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className={`shrink-0 -mr-1 -mt-1 p-2 rounded-lg ${colors.textMuted} hover:text-theme-text transition-opacity min-h-[36px] min-w-[36px] inline-flex items-center justify-center`}
        aria-label="Fechar"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      typeOrOptions: ToastType | ShowToastOptions = 'error',
      durationMsLegacy?: number
    ) => {
      const options: ShowToastOptions | null =
        typeof typeOrOptions === 'object' && typeOrOptions !== null ? typeOrOptions : null;
      const type: ToastType = options ? options.type ?? 'error' : (typeOrOptions as ToastType);
      const defaultDuration = type === 'error' ? 6000 : 4000;
      const durationMs = options
        ? options.durationMs ?? defaultDuration
        : durationMsLegacy ?? defaultDuration;
      const action = options?.action;

      const id = ++idRef.current;
      setToasts(prev => [...prev, { id, message, type, action }]);
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed bottom-0 right-0 left-0 sm:left-auto flex flex-col items-center sm:items-end gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none"
            style={{ zIndex: 'var(--z-toast)' }}
            aria-live="polite"
          >
            {toasts.map(toast => (
              <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }
  return ctx;
}
