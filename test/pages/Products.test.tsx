import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Product } from '@/types/catalog';

const COMPANY_ID = '22222222-2222-4222-8222-222222222222';

const mocks = vi.hoisted(() => ({
  products: [] as Product[],
  createMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
  sellMutateAsync: vi.fn(),
  uploadProductImage: vi.fn(),
  deleteProductImage: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ companyId: COMPANY_ID, role: 'owner' }),
}));

vi.mock('@/hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: {
      card: 'bg-card',
      border: 'border-theme',
      surface: 'bg-surface',
      divider: 'border-divider',
      text: 'text-main',
      textSecondary: 'text-sec',
      textMuted: 'text-muted',
    },
    classes: { label: 'label', input: 'input' },
  }),
}));

vi.mock('@/hooks/useTenantLocale', () => ({
  useTenantLocale: () => ({
    currencySymbol: 'R$',
    formatMoney: (value: number) => `R$ ${value.toFixed(2)}`,
  }),
}));

vi.mock('@/hooks/useCatalog', () => ({
  useProducts: () => ({
    data: mocks.products,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateProduct: () => ({
    mutateAsync: mocks.createMutateAsync,
    isPending: false,
  }),
  useUpdateProduct: () => ({
    mutateAsync: mocks.updateMutateAsync,
    isPending: false,
  }),
  useSellProduct: () => ({
    mutateAsync: mocks.sellMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/services/catalog', () => ({
  uploadProductImage: (...args: unknown[]) => mocks.uploadProductImage(...args),
  deleteProductImage: (...args: unknown[]) => mocks.deleteProductImage(...args),
}));

vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick, disabled, type = 'button', ...rest }: any) => (
    <button type={type} onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyState: ({ title, action }: any) => <div><p>{title}</p>{action}</div>,
  ErrorState: ({ title }: any) => <div>{title}</div>,
  Input: ({ label, value, onChange, error, ...rest }: any) => (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={onChange} {...rest} />
      {error && <span>{error}</span>}
    </label>
  ),
  Modal: ({ open, title, children, footer }: any) => (
    open ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null
  ),
  PageHeader: ({ title, action }: any) => <header><h1>{title}</h1>{action}</header>,
  Select: ({ options, value, onChange, ...rest }: any) => (
    <select value={value} onChange={onChange} {...rest}>
      {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  ),
  SkeletonCard: () => <div />,
  Table: ({ data, columns }: any) => (
    <table>
      <tbody>
        {data.map((row: any) => (
          <tr key={row.id}>
            {columns.map((col: any) => <td key={col.key}>{col.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  useToast: () => ({ showToast: mocks.showToast }),
}));

import { Products } from '@/pages/Products';

const existingProduct: Product = {
  id: '11111111-1111-4111-8111-111111111111',
  company_id: COMPANY_ID,
  name: 'Pomada Matte',
  description: 'Fixação média.',
  image_url: `https://example.supabase.co/storage/v1/object/public/product_images/${COMPANY_ID}/antiga.webp`,
  sale_price: 55,
  cost_price: 25,
  stock_quantity: 8,
  min_stock_quantity: 2,
  commission_percent: 10,
  show_in_public: true,
  is_active: true,
};

describe('Products — foto e descrição do produto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.products = [existingProduct];
    mocks.createMutateAsync.mockResolvedValue(existingProduct);
    mocks.updateMutateAsync.mockResolvedValue(existingProduct);
    mocks.uploadProductImage.mockResolvedValue(
      `https://example.supabase.co/storage/v1/object/public/product_images/${COMPANY_ID}/nova.webp`,
    );
    mocks.deleteProductImage.mockResolvedValue(undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:preview-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it('permite cadastrar produto com foto e descrição', async () => {
    render(<Products />);

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    const fileInput = screen.getByLabelText('Foto do produto');
    const file = new File([new Uint8Array(100)], 'oleo.webp', { type: 'image/webp' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByRole('button', { name: 'Trocar foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Óleo para Barba' } });
    fireEvent.change(screen.getByLabelText('Descrição (opcional)'), { target: { value: 'Hidrata e dá brilho, 30ml.' } });
    fireEvent.change(screen.getByLabelText('Preço de venda'), { target: { value: '49' } });
    fireEvent.change(screen.getByLabelText('Custo'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Estoque'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Estoque mínimo'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(mocks.uploadProductImage).toHaveBeenCalledWith(COMPANY_ID, file);
      expect(mocks.createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        companyId: COMPANY_ID,
        name: 'Óleo para Barba',
        description: 'Hidrata e dá brilho, 30ml.',
        imageUrl: `https://example.supabase.co/storage/v1/object/public/product_images/${COMPANY_ID}/nova.webp`,
      }));
    });
  });

  it('permite remover a foto ao editar produto e remove o arquivo antigo do Storage', async () => {
    render(<Products />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    expect(screen.getByRole('button', { name: 'Trocar foto' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(mocks.updateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        productId: existingProduct.id,
        imageUrl: null,
      }));
      expect(mocks.deleteProductImage).toHaveBeenCalledWith(COMPANY_ID, existingProduct.image_url);
    });
  });

  it('mostra erro se o usuário escolher arquivo com formato inválido', () => {
    render(<Products />);
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    const fileInput = screen.getByLabelText('Foto do produto');
    const invalidFile = new File(['abc'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/JPG, PNG ou WebP/);
  });
});
