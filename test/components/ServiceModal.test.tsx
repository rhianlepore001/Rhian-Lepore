import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ServiceModal } from '../../components/ServiceModal';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fictional-user' }, companyId: 'fictional-company' }) }));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    isBeauty: false,
    accent: { text: 'text-accent', bg: 'bg-accent', bgDim: 'bg-accent-dim', border: 'border-accent' },
    colors: {
      text: 'text-main',
      textMuted: 'text-muted',
      textSecondary: 'text-secondary',
      inputBg: 'bg-input',
      border: 'border-x',
      divider: 'divide-x',
      card: 'card',
    },
    classes: {
      modalOverlay: 'overlay',
      modalContainer: 'container',
      modalHeader: 'header',
      label: 'label',
      input: 'input',
      buttonPrimary: 'btn-primary',
      buttonSecondary: 'btn-secondary',
    },
    font: { heading: 'font-heading', label: 'font-label' },
  }),
}));

vi.mock('../../hooks/useTenantLocale', () => ({
  useTenantLocale: () => ({ currencySymbol: 'R$' }),
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../hooks/useServiceSettings', () => ({
  useSaveService: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadServiceImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateServiceCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ServiceModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('não renderiza a seção de Upsells (Sugestões)', () => {
    render(
      <ServiceModal
        companyId="co-1"
        categories={[{ id: 'cat-1', name: 'Geral', display_order: 0, user_id: 'co-1' }]}
        allServices={[]}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: /Novo Serviço/i })).toBeInTheDocument();
    expect(screen.queryByText(/Upsells/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sugestões\)/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('service-modal-close')).toHaveAttribute('aria-label', 'Fechar');
  });

  it('mostra título Editar Serviço sem sticky sobre o formulário (header não sticky)', () => {
    render(
      <ServiceModal
        companyId="co-1"
        service={{
          id: 'svc-1',
          name: 'Corte',
          description: '',
          price: 40,
          duration_minutes: 30,
          category_id: 'cat-1',
          image_url: null,
          active: true,
          user_id: 'co-1',
        }}
        categories={[{ id: 'cat-1', name: 'Geral', display_order: 0, user_id: 'co-1' }]}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const title = screen.getByRole('heading', { name: /Editar Serviço/i });
    expect(title).toBeInTheDocument();
    const header = title.parentElement;
    expect(header?.className ?? '').not.toMatch(/sticky/);
  });

  it('Esc fecha o modal de serviço', () => {
    const onClose = vi.fn();
    render(
      <ServiceModal
        companyId="co-1"
        categories={[{ id: 'cat-1', name: 'Geral', display_order: 0, user_id: 'co-1' }]}
        allServices={[]}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('outras teclas não fecham o modal e Esc não fecha depois de desmontar', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <ServiceModal
        companyId="co-1"
        categories={[{ id: 'cat-1', name: 'Geral', display_order: 0, user_id: 'co-1' }]}
        allServices={[]}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
