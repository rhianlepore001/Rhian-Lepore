import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import FocusTrap from 'focus-trap-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  /** quando true, ignora ESC e clique no overlay (modais críticos como checkout) */
  preventClose?: boolean;
  /** @deprecated use `preventClose` para travar overlay + ESC juntos */
  closeOnOverlay?: boolean;
  /** @deprecated use `preventClose` para travar overlay + ESC juntos */
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
  forceTheme?: ThemeVariant;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-[560px]',
  xl: 'max-w-2xl',
  // size=full ocupa a viewport inteira (modais cheios tipo Checkout/Commission — DS Lock §3.4)
  full: 'max-w-none w-screen h-[100dvh] md:max-w-none md:w-screen md:h-[100dvh] rounded-none',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'lg',
  footer,
  preventClose = false,
  closeOnOverlay = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = '',
  forceTheme,
}) => {
  const { classes, colors } = useBrutalTheme({ override: forceTheme });
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const allowEsc = !preventClose && closeOnEsc;
  const allowOverlay = !preventClose && closeOnOverlay;

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowEsc) {
        onClose();
      }
    },
    [onClose, allowEsc]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      if (!open && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const isFull = size === 'full';

  const content = (
    <div
      className={`fixed inset-0 flex justify-center ${isFull ? 'items-stretch' : 'items-end md:items-center p-0 md:p-4'}`}
      style={{ zIndex: 'var(--z-modal)' }}
    >
      <div
        className={`absolute inset-0 ${classes.modalOverlay}`}
        onClick={allowOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      <FocusTrap
        active={open}
        focusTrapOptions={{
          escapeDeactivates: false,
          allowOutsideClick: true,
          initialFocus: false,
          fallbackFocus: '[data-ui-modal-dialog]',
        }}
      >
        <div
          data-ui-modal-dialog
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'ui-modal-title' : undefined}
          tabIndex={-1}
          className={[
            'relative w-full',
            SIZE_MAP[size],
            classes.modalContainer,
            isFull
              ? 'flex flex-col'
              : 'max-h-[92dvh] md:max-h-[90vh] flex flex-col max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl max-md:animate-slide-up',
            'focus:outline-none',
            className,
          ].filter(Boolean).join(' ')}
        >
          {(title || showCloseButton) && (
            <div className={`${classes.modalHeader} shrink-0`}>
              {title && (
                <h2
                  id="ui-modal-title"
                  className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={[
                    'p-1.5 rounded-lg transition-colors duration-150',
                    colors.textMuted,
                    'hover:bg-[var(--color-card-hover)]',
                    'min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]',
                    'inline-flex items-center justify-center',
                  ].join(' ')}
                  aria-label="Fechar"
                  disabled={preventClose}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            {children}
          </div>

          {footer && (
            <div className={`px-5 py-4 md:px-6 border-t ${colors.divider} shrink-0`}>
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>
  );

  return createPortal(content, document.body);
};
