import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { X } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { BrutalButton } from './BrutalButton';
import { useUI } from '../contexts/UIContext';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    footer?: React.ReactNode;
    preventClose?: boolean;
    forceTheme?: 'beauty' | 'barber';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    footer,
    preventClose = false,
    forceTheme
}) => {
    const { classes, accent, colors } = useBrutalTheme({ override: forceTheme });
    const { setModalOpen } = useUI();

    // Fecha ao pressionar ESC
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && !preventClose) {
            onClose();
        }
    }, [onClose, preventClose]);

    useEffect(() => {
        if (isOpen) {
            setModalOpen(true);
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            setModalOpen(false);
        }

        return () => {
            setModalOpen(false);
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape, setModalOpen]);

    if (!isOpen) return null;

    // Tamanhos do modal
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
        full: 'max-w-4xl'
    };

    const modalContent = (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 md:p-4">
            {/* Backdrop */}
            <div
                className={`
          absolute inset-0 
          ${classes.modalOverlay}
          transition-opacity duration-300
        `}
                onClick={() => !preventClose && onClose()}
            />

            {/* Modal */}
            <FocusTrap active={isOpen}>
                <div
                    className={`
          relative w-full ${sizeClasses[size]}
          ${classes.modalContainer}
          max-h-[calc(100vh-1.5rem)] md:max-h-[90vh] flex flex-col
        `.replace(/\s+/g, ' ').trim()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={title ? 'modal-title' : undefined}
                >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className={classes.modalHeader}>
                        {title && (
                            <h3 id="modal-title" className={`
                font-heading text-lg md:text-xl
                ${colors.text}
              `}>
                                {title}
                            </h3>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className={`${accent.text}/60 hover:${accent.text} hover:${accent.bgDim} rounded-full p-1.5 transition-all hover:rotate-90 transition-transform duration-200`}
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className={`
          flex-1 overflow-y-auto p-5 md:p-6
        `}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className={`
            px-6 py-4 border-t ${colors.divider}
          `}>
                        {footer}
                    </div>
                )}
                </div>
            </FocusTrap>
        </div>
    );

    return createPortal(modalContent, document.body);
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
            <ConfirmModalContent message={message} />
        </Modal>
    );
};

const ConfirmModalContent: React.FC<{ message: string }> = ({ message }) => {
    const { colors } = useBrutalTheme();
    return <p className={colors.textSecondary}>{message}</p>;
};
