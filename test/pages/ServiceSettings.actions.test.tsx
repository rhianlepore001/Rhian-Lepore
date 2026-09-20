import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceSettings } from '../../pages/settings/ServiceSettings';

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
  useToast: () => ({ showToast: vi.fn() }),
  Modal: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/SettingsLayout', () => ({
  SettingsLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../components/ServiceModal', () => ({
  ServiceModal: () => null,
}));

vi.mock('../../components/Modal', () => ({
  Modal: ({ children }: any) => <div>{children}</div>,
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
  useCreateServiceCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteServiceCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteService: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetServiceActive: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('ServiceSettings actions', () => {
  it('mostra Excluir serviço sem depender de hover (mobile)', () => {
    render(<ServiceSettings />);

    const del = screen.getByRole('button', { name: /Excluir serviço Corte/i });
    expect(del).toBeVisible();

    const actions = screen.getByTestId('service-row-actions');
    expect(actions.className).not.toMatch(/opacity-0/);
    expect(actions.className).not.toMatch(/group-hover:opacity-100/);
    expect(screen.getByRole('button', { name: /Desativar serviço Corte/i })).toBeVisible();
  });
});
