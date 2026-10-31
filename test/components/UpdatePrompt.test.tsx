import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { UpdatePrompt } from '../../components/UpdatePrompt';
import type { UpdateManager, UpdateSnapshot } from '../../lib/appUpdate';

function fakeManager(initial: UpdateSnapshot) {
  let snap = initial;
  const listeners = new Set<() => void>();
  const manager: UpdateManager = {
    start: vi.fn(),
    stop: vi.fn(),
    checkNow: vi.fn(async () => undefined),
    apply: vi.fn(async () => undefined),
    dismiss: vi.fn(),
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot: () => snap,
  };
  return {
    manager,
    set(next: UpdateSnapshot) {
      snap = next;
      listeners.forEach((l) => l());
    },
  };
}

describe('UpdatePrompt', () => {
  it('não aparece sem versão nova e liga/desliga a checagem', () => {
    const { manager } = fakeManager({ visible: false, applying: false });
    const { container, unmount } = render(<UpdatePrompt manager={manager} />);
    expect(container).toBeEmptyDOMElement();
    expect(manager.start).toHaveBeenCalledTimes(1);
    unmount();
    expect(manager.stop).toHaveBeenCalledTimes(1);
  });

  it('mostra o aviso em pt-BR, sem termos técnicos nem tipo de negócio', () => {
    const { manager } = fakeManager({ visible: true, applying: false });
    render(<UpdatePrompt manager={manager} />);
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Nova versão disponível');
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeEnabled();
    const text = region.textContent ?? '';
    expect(text).not.toMatch(/service ?worker|cache|pwa|deploy|build|vers[aã]o do app|barbearia|sal[aã]o|beleza/i);
  });

  it('usa só tokens do design system (segue tema e modo), sem cor fixa', () => {
    const { manager } = fakeManager({ visible: true, applying: false });
    const { container } = render(<UpdatePrompt manager={manager} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--color-card)');
    expect(html).toContain('var(--color-accent)');
    expect(html).toContain('var(--color-on-accent)');
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
  });

  it('Atualizar chama apply; Agora não chama dismiss', () => {
    const { manager } = fakeManager({ visible: true, applying: false });
    render(<UpdatePrompt manager={manager} />);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(manager.apply).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(manager.dismiss).toHaveBeenCalledTimes(1);
  });

  it('enquanto atualiza, mostra "Atualizando…" e trava os botões', () => {
    const { manager } = fakeManager({ visible: true, applying: true });
    render(<UpdatePrompt manager={manager} />);
    expect(screen.getByRole('button', { name: 'Atualizando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeDisabled();
  });

  it('reage quando a versão nova chega depois', () => {
    const h = fakeManager({ visible: false, applying: false });
    render(<UpdatePrompt manager={h.manager} />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => h.set({ visible: true, applying: false }));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('avisa para salvar quando há formulário em preenchimento — e não recarrega sozinho', () => {
    const h = fakeManager({ visible: false, applying: false });
    render(
      <form>
        <input aria-label="Nome" />
        <UpdatePrompt manager={h.manager} />
      </form>,
    );
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    act(() => h.set({ visible: true, applying: false }));
    expect(screen.getByRole('status')).toHaveTextContent('Termine e salve o que está preenchendo');
    expect(h.manager.apply).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana');
  });
});
