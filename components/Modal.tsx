import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BrutalButton } from './BrutalButton';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    footer?: React.ReactNode;
    preventClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    footer,
    preventClose = false
}) => {
    const { userType } = useAuth();
    const isBeauty = userType === 'beauty';

    // Fecha ao pressionar ESC
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && !preventClose) {
            onClose();
        }
    }, [onClose, preventClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    // Tamanhos do modal
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
        full: 'max-w-4xl'
    };

    // Estilos do container do modal
    const getModalStyles = () => {
        if (isBeauty) {
            return `
        bg-gradient-to-br from-beauty-card to-beauty-dark
        border border-beauty-neon/30
        rounded-2xl
        shadow-[0_0_20px_rgba(167,139,250,0.15)]
      `;
        } else {
            return `
        bg-brutal-card
        border-4 border-brutal-border
        shadow-[8px_8px_0px_0px_#000000]
      `;
        }
    };

    // Estilos do header
    const getHeaderStyles = () => {
        if (isBeauty) {
            return 'border-b border-beauty-neon/20 bg-gradient-to-r from-beauty-neon/10 to-transparent px-6 py-4';
        } else {
            return 'border-b-2 border-black border-dashed px-6 py-4 bg-neutral-900/50';
        }
    };

    // Estilos do botão de fechar
    const getCloseButtonStyles = () => {
        if (isBeauty) {
            return 'text-beauty-neon/60 hover:text-beauty-neon hover:bg-beauty-neon/10 rounded-full p-1.5 transition-all';
        } else {
            return 'text-neutral-500 hover:text-white hover:bg-neutral-800 p-1 transition-colors';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={`
          absolute inset-0 
          ${isBeauty ? 'bg-beauty-dark/80' : 'bg-black/85'}
          transition-opacity duration-300
        `}
                onClick={() => !preventClose && onClose()}
            />

            {/* Modal */}
            <div
                className={`
          relative w-full ${sizeClasses[size]}
          ${getModalStyles()}
          transform transition-all duration-300
          animate-in fade-in zoom-in-95
          max-h-[90vh] flex flex-col
        `.replace(/\s+/g, ' ').trim()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className={`flex items-center justify-between ${getHeaderStyles()}`}>
                        {title && (
                            <h3 className={`
                font-heading text-lg md:text-xl
                ${isBeauty ? 'text-white' : 'text-white uppercase tracking-wider'}
              `}>
                                {title}
                            </h3>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className={getCloseButtonStyles()}
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className={`
          flex-1 overflow-y-auto p-6
          ${isBeauty ? 'scrollbar-thin scrollbar-thumb-beauty-neon/20' : ''}
        `}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className={`
            px-6 py-4
            ${isBeauty
                            ? 'border-t border-beauty-neon/20 bg-gradient-to-r from-transparent to-beauty-neon/5'
                            : 'border-t-2 border-black border-dashed bg-neutral-900/50'
                        }
          `}>
                        {footer}
                    </div>
                )}

                {/* Decorative elements for Brutalist */}
                {!isBeauty && (
                    <>
                        <div className="absolute top-2 left-2 w-2 h-2 bg-neutral-600 rounded-full" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-neutral-600 rounded-full" />
                        <div className="absolute bottom-2 left-2 w-2 h-2 bg-neutral-600 rounded-full" />
                        <div className="absolute bottom-2 right-2 w-2 h-2 bg-neutral-600 rounded-full" />
                    </>
                )}

                {/* Gradient overlay for Beauty */}
                {isBeauty && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-beauty-neon/5 via-transparent to-beauty-acid/5 pointer-events-none" />
                )}
            </div>
        </div>
    );
};

// ===========================================
// COMPONENTES AUXILIARES PARA O MODAL
// ===========================================

interface ModalFooterProps {
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right' | 'between';
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
    children,
    align = 'right'
}) => {
    const alignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        between: 'justify-between'
    };

    return (
        <div className={`flex items-center gap-3 ${alignClasses[align]}`}>
            {children}
        </div>
    );
};

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'primary',
    loading = false
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <ModalFooter align="right">
                    <BrutalButton variant="ghost" onClick={onClose} disabled={loading}>
                        {cancelText}
                    </BrutalButton>
                    <BrutalButton
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </BrutalButton>
                </ModalFooter>
            }
        >
            <p className="text-text-secondary">{message}</p>
        </Modal>
    );
};
