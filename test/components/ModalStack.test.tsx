import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../components/ui/Modal';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));
const setModalOpen = vi.fn();
vi.mock('../../contexts/UIContext', () => ({ useOptionalUI: () => ({ setModalOpen }) }));
vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// PR-E: o drawer do colaborador abre "Bloquear agenda" por cima. ESC fecha só o de cima
// e fechar o de cima não destrava o scroll nem esconde o estado de modal aberto.
describe('Modal empilhado', () => {
  it('ESC fecha só o modal do topo e o body continua travado', () => {
    const closeBottom = vi.fn();
    const closeTop = vi.fn();
    const { rerender } = render(
      <>
        <Modal open onClose={closeBottom} title="Drawer"><p>a</p></Modal>
        <Modal open onClose={closeTop} title="Bloqueio"><p>b</p></Modal>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();

    setModalOpen.mockClear();
    rerender(
      <>
        <Modal open onClose={closeBottom} title="Drawer"><p>a</p></Modal>
        <Modal open={false} onClose={closeTop} title="Bloqueio"><p>b</p></Modal>
      </>,
    );
    expect(screen.getByText('Drawer')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(setModalOpen).not.toHaveBeenCalledWith(false);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeBottom).toHaveBeenCalledTimes(1);
  });
});
