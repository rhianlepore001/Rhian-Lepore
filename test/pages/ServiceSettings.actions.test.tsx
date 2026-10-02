import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServiceSettings } from '../../pages/settings/ServiceSettings';

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  createCategoryMutateAsync: vi.fn().mockResolvedValue(undefined),
  updateCategoryMutateAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    companyId: 'co-1',
    user: { id: 'co-1' },
    region: 'BR',
  }),
}));

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    accent: { text: 'text-accent', bg: 'bg-accent', bgHover: 'hover:bg-accent' },
    colors: {
      text: 'text-main',
      textMuted: 'text-muted',
      textSecondary: 'text-secondary',
      inputBg: 'bg-input',
      border: 'border-x',
      divider: 'divide-x',
    },
    classes: { buttonPrimary: 'btn-primary', input: 'input' },
  }),
}));

vi.mock('../../components/ui', () => ({
  Card: ({ children, title, action }: any) => (
    <div>
      <div>{title}</div>
      <div>{action}</div>
      {children}
    </div>
  ),
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ConfirmModal: () => null,
  useToast: () => ({ showToast: mocks.showToast }),
  Modal: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/ServiceModal', () => ({
  ServiceModal: () => null,
}));

vi.mock('../../components/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: any) =>
    isOpen ? (
      <div data-testid="category-modal">
        {title ? <h2>{title}</h2> : null}
        {children}
        {footer}
      </div>
    ) : null,
}));

vi.mock('../../hooks/useServiceSettings', () => ({
  useServiceSettings: () => ({
    categories: [{ id: 'cat-1', name: 'Cabelo', display_order: 0, user_id: 'co-1' }],
    services: [
      {
        id: 'svc-1',
        name: 'Corte',
        description: '',
        price: 50,
        duration_minutes: 75,
        category_id: 'cat-1',
        image_url: null,
        active: true,
        user_id: 'co-1',
      },
    ],
    loading: false,
    refetch: vi.fn(),
  }),
  useCreateServiceCategory: () => ({ mutateAsync: mocks.createCategoryMutateAsync, isPending: false }),
  useUpdateServiceCategory: () => ({ mutateAsync: mocks.updateCategoryMutateAsync, isPending: false }),
  useDeleteServiceCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteService: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetServiceActive: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('ServiceSettings actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCategoryMutateAsync.mockResolvedValue(undefined);
    mocks.updateCategoryMutateAsync.mockResolvedValue(undefined);
  });

  it('mostra Excluir serviço sem depender de hover (mobile)', () => {
    render(<ServiceSettings />);

    const del = screen.getByRole('button', { name: /Excluir serviço Corte/i });
    expect(del).toBeVisible();

    const actions = screen.getByTestId('service-row-actions');
    expect(actions.className).not.toMatch(/opacity-0/);
    expect(actions.className).not.toMatch(/group-hover:opacity-100/);
    expect(screen.getByRole('button', { name: /Desativar serviço Corte/i })).toBeVisible();
  });

  it('exibe botão de renomear categoria', () => {
    render(<ServiceSettings />);
    expect(screen.getByTestId('category-rename-cat-1')).toBeVisible();
    expect(screen.getByRole('button', { name: /Renomear categoria Cabelo/i })).toBeVisible();
  });

  it('renomear abre modal com nome atual e salvar chama updateCategory', async () => {
    render(<ServiceSettings />);

    fireEvent.click(screen.getByTestId('category-rename-cat-1'));

    expect(screen.getByRole('heading', { name: 'Renomear Categoria' })).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Nome da categoria' }) as HTMLInputElement;
    expect(input.value).toBe('Cabelo');

    fireEvent.change(input, { target: { value: 'Novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mocks.updateCategoryMutateAsync).toHaveBeenCalledWith({
        companyId: 'co-1',
        categoryId: 'cat-1',
        name: 'Novo',
      }),
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Categoria renomeada com sucesso!', 'success');
    expect(mocks.createCategoryMutateAsync).not.toHaveBeenCalled();
  });

  it('salvar renomear sem mudar o nome não chama mutateAsync', async () => {
    render(<ServiceSettings />);

    fireEvent.click(screen.getByTestId('category-rename-cat-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByTestId('category-modal')).not.toBeInTheDocument());
    expect(mocks.updateCategoryMutateAsync).not.toHaveBeenCalled();
  });

  it('Salvar fica desabilitado com input vazio no modal de renomear', () => {
    render(<ServiceSettings />);

    fireEvent.click(screen.getByTestId('category-rename-cat-1'));
    const input = screen.getByRole('textbox', { name: 'Nome da categoria' });
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('botão Categoria abre Nova Categoria vazia e createCategory ao salvar', async () => {
    render(<ServiceSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Categoria' }));

    expect(screen.getByRole('heading', { name: 'Nova Categoria' })).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Nome da categoria' }) as HTMLInputElement;
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: 'Barba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mocks.createCategoryMutateAsync).toHaveBeenCalledWith({
        companyId: 'co-1',
        name: 'Barba',
        displayOrder: 1,
      }),
    );
    expect(mocks.updateCategoryMutateAsync).not.toHaveBeenCalled();
  });

  it('Enter no input salva o renome', async () => {
    render(<ServiceSettings />);

    fireEvent.click(screen.getByTestId('category-rename-cat-1'));
    const input = screen.getByRole('textbox', { name: 'Nome da categoria' });
    fireEvent.change(input, { target: { value: 'Cabelo e Barba' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(mocks.updateCategoryMutateAsync).toHaveBeenCalledWith({
        companyId: 'co-1',
        categoryId: 'cat-1',
        name: 'Cabelo e Barba',
      }),
    );
  });

  it('erro ao renomear mostra toast e mantém o modal aberto', async () => {
    mocks.updateCategoryMutateAsync.mockRejectedValueOnce(new Error('falha'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ServiceSettings />);

    fireEvent.click(screen.getByTestId('category-rename-cat-1'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome da categoria' }), { target: { value: 'Novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(screen.getByRole('heading', { name: 'Renomear Categoria' })).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
