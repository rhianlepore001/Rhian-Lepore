import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

describe('Modal Component', () => {
  it('não renderiza o conteúdo quando open=false', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <div data-testid="modal-content">Conteúdo do Modal</div>
      </Modal>
    );

    expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza o conteúdo através de portal quando open=true', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Título do Modal">
        <div data-testid="modal-content">Conteúdo do Modal</div>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Título do Modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-content')).toBeInTheDocument();
  });

  it('chama onClose ao pressionar a tecla Escape se closeOnEsc for true', async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal open={true} onClose={onClose} closeOnEsc={true}>
        <div>Conteúdo</div>
      </Modal>
    );

    // Dispara a tecla Escape
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('não chama onClose ao pressionar a tecla Escape se closeOnEsc for false', async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal open={true} onClose={onClose} closeOnEsc={false}>
        <div>Conteúdo</div>
      </Modal>
    );

    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    unmount();
  });

  it('chama onClose ao clicar no overlay se closeOnOverlay for true', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} closeOnOverlay={true}>
        <div>Conteúdo</div>
      </Modal>
    );

    // O overlay é a div com classe ou com onClick. Como é um elemento irmão da div do dialog
    // que tem aria-hidden="true", podemos buscá-lo pelo seletor ou simplesmente clicando nele
    // No Modal.tsx:
    // <div className={`absolute inset-0 ${classes.modalOverlay}`} onClick={closeOnOverlay ? onClose : undefined} aria-hidden="true" />
    // O dialog tem role="dialog". Podemos buscar o overlay por classe ou através do DOM.
    const dialog = screen.getByRole('dialog');
    const overlay = dialog.previousSibling as HTMLElement;
    expect(overlay).toBeInTheDocument();

    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não chama onClose ao clicar no overlay se closeOnOverlay for false', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} closeOnOverlay={false}>
        <div>Conteúdo</div>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    const overlay = dialog.previousSibling as HTMLElement;
    expect(overlay).toBeInTheDocument();

    await userEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('chama onClose ao clicar no botão de fechar', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} showCloseButton={true}>
        <div>Conteúdo</div>
      </Modal>
    );

    const closeBtn = screen.getByRole('button', { name: 'Fechar' });
    expect(closeBtn).toBeInTheDocument();

    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
