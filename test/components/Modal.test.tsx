import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Modal } from '../../components/Modal';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber' }),
}));

vi.mock('../../contexts/UIContext', () => ({
    useUI: () => ({ setModalOpen: () => {} }),
}));

vi.mock('focus-trap-react', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderModal = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('Modal Component', () => {
    it('nao renderiza quando isOpen=false', () => {
        renderModal(
            <Modal isOpen={false} onClose={vi.fn()} title="Modal Fechado">
                <p>Conteudo</p>
            </Modal>
        );

        expect(screen.queryByText('Modal Fechado')).not.toBeInTheDocument();
        expect(screen.queryByText('Conteudo')).not.toBeInTheDocument();
    });

    it('renderiza titulo e conteudo quando isOpen=true', () => {
        renderModal(
            <Modal isOpen={true} onClose={vi.fn()} title="Meu Modal">
                <p>Conteudo do modal</p>
            </Modal>
        );

        expect(screen.getByText('Meu Modal')).toBeInTheDocument();
        expect(screen.getByText('Conteudo do modal')).toBeInTheDocument();
    });

    it('tem role dialog e aria-modal true', () => {
        renderModal(
            <Modal isOpen={true} onClose={vi.fn()} title="ARIA Test">
                <div>Content</div>
            </Modal>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('tem aria-labelledby apontando para o titulo', () => {
        renderModal(
            <Modal isOpen={true} onClose={vi.fn()} title="Titulo Acessivel">
                <div>Content</div>
            </Modal>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
        expect(screen.getByText('Titulo Acessivel')).toHaveAttribute('id', 'modal-title');
    });

    it('chama onClose ao clicar no botao fechar', async () => {
        const onClose = vi.fn();

        renderModal(
            <Modal isOpen={true} onClose={onClose} title="Fechar Test">
                <div>Content</div>
            </Modal>
        );

        await userEvent.click(screen.getByRole('button', { name: /fechar/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao pressionar ESC', () => {
        const onClose = vi.fn();

        renderModal(
            <Modal isOpen={true} onClose={onClose} title="ESC Test">
                <div>Content</div>
            </Modal>
        );

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('nao fecha com ESC quando preventClose=true', () => {
        const onClose = vi.fn();

        renderModal(
            <Modal isOpen={true} onClose={onClose} title="No ESC" preventClose>
                <div>Content</div>
            </Modal>
        );

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });

    it('nao exibe botao fechar quando showCloseButton=false', () => {
        renderModal(
            <Modal isOpen={true} onClose={vi.fn()} title="Sem Fechar" showCloseButton={false}>
                <div>Content</div>
            </Modal>
        );

        expect(screen.queryByRole('button', { name: /fechar/i })).not.toBeInTheDocument();
    });

    it('renderiza footer quando fornecido', () => {
        renderModal(
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
