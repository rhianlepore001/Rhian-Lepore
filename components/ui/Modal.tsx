import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import FocusTrap from 'focus-trap-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import { useOptionalUI } from '../../contexts/UIContext';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Linha secundária no header, abaixo do título (ex.: período da conta). */
  subtitle?: string;
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
  /** Substitui o wrapper padrão do corpo (padding + scroll). Use p-0 + flex para shells tipo wizard. */
  bodyClassName?: string;
  /** Quando sem `title`, aponta aria-labelledby para um heading interno (ex.: wizard). */
  labelledById?: string;
  forceTheme?: ThemeVariant;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-[560px]',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  // size=full ocupa a viewport inteira (modais cheios tipo Checkout/Commission — DS Lock §3.4)
  full: 'max-w-none w-screen h-[100dvh] md:max-w-none md:w-screen md:h-[100dvh] rounded-none',
};

/** Pilha global de modais abertos (topo = último). */
const openModalStack: symbol[] = [];

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'lg',
  footer,
  preventClose = false,
  closeOnOverlay = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = '',
  bodyClassName,
  labelledById,
  forceTheme,
}) => {
  const { classes, colors } = useBrutalTheme({ override: forceTheme });
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const reactId = useId();
  const titleDomId = title ? `ui-modal-title-${reactId.replace(/:/g, '')}` : labelledById;
  const setModalOpen = useOptionalUI()?.setModalOpen;

  const allowEsc = !preventClose && closeOnEsc;
  const allowOverlay = !preventClose && closeOnOverlay;

  // Últimas props em ref: o efeito de abertura não reexecuta a cada render (onClose inline)
  // e a posição do modal na pilha fica estável.
  const escRef = useRef({ onClose, allowEsc });
  escRef.current = { onClose, allowEsc };
  const setModalOpenRef = useRef(setModalOpen);
  setModalOpenRef.current = setModalOpen;

  useEffect(() => {
    if (!open) return undefined;
    const token = Symbol('modal');
    openModalStack.push(token);
    document.body.style.overflow = 'hidden';
    setModalOpenRef.current?.(true);

    // O retorno de foco fica com o FocusTrap (returnFocusOnDeactivate).
    // Modais empilhados (ex.: drawer do colaborador → "Bloquear agenda"): ESC fecha só o do topo.
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || openModalStack[openModalStack.length - 1] !== token) return;
      if (escRef.current.allowEsc) escRef.current.onClose();
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      const idx = openModalStack.indexOf(token);
      if (idx >= 0) openModalStack.splice(idx, 1);
      if (openModalStack.length === 0) {
        document.body.style.overflow = '';
        setModalOpenRef.current?.(false);
      }
    };
  }, [open]);

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
          initialFocus: () => titleRef.current ?? false,
          fallbackFocus: '[data-ui-modal-dialog]',
        }}
      >
        <div
          data-ui-modal-dialog
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleDomId}
          tabIndex={-1}
          className={[
            'relative w-full',
            SIZE_MAP[size],
            classes.modalContainer,
            isFull
              ? 'flex flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)]'
              : 'max-h-[92dvh] md:max-h-[90vh] flex flex-col max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl max-md:motion-safe:animate-slide-up max-md:pb-[var(--safe-bottom)]',
            'focus:outline-none',
            className,
          ].filter(Boolean).join(' ')}
        >
          {(title || showCloseButton) && (
            <div className={`${classes.modalHeader} shrink-0`}>
              <div className="min-w-0 flex-1 pr-2">
                {title && (
                  <h2
                    ref={titleRef}
                    id={titleDomId}
                    tabIndex={-1}
                    className={`text-base md:text-lg font-bold tracking-tight ${colors.text} outline-none truncate`}
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className={`mt-0.5 text-sm ${colors.textMuted}`}>{subtitle}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={[
                    'shrink-0 h-11 w-11 min-h-[44px] min-w-[44px] p-0 rounded-lg transition-colors duration-150',
                    colors.textMuted,
                    'hover:bg-[var(--color-card-hover)]',
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

          <div className={bodyClassName ?? 'flex-1 overflow-y-auto p-5 md:p-6'}>
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
