import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = 'Confirmar',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    closeOnOverlay={!loading}
    closeOnEsc={!loading}
    footer={
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
        <Button variant="ghost" size="md" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="md"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    }
  >
    <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-line">{message}</p>
  </Modal>
);
