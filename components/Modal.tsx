/**
 * @deprecated Casca de compatibilidade sobre `components/ui/Modal` (DS v1.1).
 * Novos usos devem importar `Modal`/`ConfirmModal` de `@/components/ui`.
 * Mantém a API antiga (`isOpen`, `confirmText`, variant `warning`) delegando
 * tudo para os componentes canônicos — um único casco de modal no app.
 */
import React from 'react';
import { Modal as UiModal } from './ui/Modal';
import { ConfirmModal as UiConfirmModal } from './ui/ConfirmModal';

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

export const Modal: React.FC<ModalProps> = ({ isOpen, size = 'md', ...rest }) => (
    // Legado `full` era max-w-4xl (não fullscreen); `xl` é o equivalente mais próximo.
    <UiModal open={isOpen} size={size === 'full' ? 'xl' : size} {...rest} />
);

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
}) => (
    <UiConfirmModal
        open={isOpen}
        onCancel={onClose}
        onConfirm={onConfirm}
        title={title}
        message={message}
        confirmLabel={confirmText}
        cancelLabel={cancelText}
        variant={variant === 'danger' ? 'danger' : 'default'}
        loading={loading}
    />
);
