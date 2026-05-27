import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
  forceTheme?: ThemeVariant;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  closeOnOverlay = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = '',
  forceTheme,
}) => {
  const { classes, colors } = useBrutalTheme({ override: forceTheme });
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        onClose();
      }
    },
    [onClose, closeOnEsc]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
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

  const content = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 md:p-4">
      <div
        className={`absolute inset-0 ${classes.modalOverlay}`}
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'ui-modal-title' : undefined}
        tabIndex={-1}
        className={[
          'relative w-full',
          SIZE_MAP[size],
          classes.modalContainer,
          'max-h-[calc(100vh-1.5rem)] md:max-h-[90vh] flex flex-col',
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
                ].join(' ')}
                aria-label="Fechar"
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
    </div>
  );

  return createPortal(content, document.body);
};
