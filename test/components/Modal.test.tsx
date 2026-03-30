import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../../components/Modal';
import React from 'react';

// Mock dos contextos necessários
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber' }),
}));

vi.mock('../../contexts/UIContext', () => ({
    useUI: () => ({ setModalOpen: () => {} }),
}));

// Mock do FocusTrap para ambiente jsdom (sem DOM navegável completo)
vi.mock('focus-trap-react', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Modal Component', () => {
    it('não renderiza quando isOpen=false', () => {
        render(
            <Modal isOpen={false} onClose={vi.fn()} title="Modal Fechado">
                <p>Conteúdo</p>
            </Modal>
        );
        expect(screen.queryByText('Modal Fechado')).not.toBeInTheDocument();
        expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
    });

    it('renderiza título e conteúdo quando isOpen=true', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="Meu Modal">
                <p>Conteúdo do modal</p>
            </Modal>
        );
        expect(screen.getByText('Meu Modal')).toBeInTheDocument();
        expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();
    });

    it('tem role="dialog" e aria-modal="true" (WCAG 2.1 AA)', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="ARIA Test">
                <div>Content</div>
            </Modal>
        );
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('tem aria-labelledby apontando para o título', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="Título Acessível">
                <div>Content</div>
            </Modal>
        );
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
        expect(screen.getByText('Título Acessível')).toHaveAttribute('id', 'modal-title');
    });

    it('chama onClose ao clicar no botão fechar', async () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={onClose} title="Fechar Test">
                <div>Content</div>
            </Modal>
        );
        const closeButton = screen.getByRole('button', { name: /fechar/i });
        await userEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao pressionar ESC', () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={onClose} title="ESC Test">
                <div>Content</div>
            </Modal>
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('não fecha com ESC quando preventClose=true', () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={onClose} title="No ESC" preventClose>
                <div>Content</div>
            </Modal>
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });

    it('não exibe botão fechar quando showCloseButton=false', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="Sem Fechar" showCloseButton={false}>
                <div>Content</div>
            </Modal>
        );
        expect(screen.queryByRole('button', { name: /fechar/i })).not.toBeInTheDocument();
    });

    it('renderiza footer quando fornecido', () => {
        render(
            <Modal
                isOpen={true}
                onClose={vi.fn()}
                title="Com Footer"
                footer={<button>Confirmar</button>}
            >
                <div>Content</div>
            </Modal>
        );
        expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    });
});
