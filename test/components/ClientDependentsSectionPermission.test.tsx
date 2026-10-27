import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const state = {
  role: 'owner' as string | null,
  settings: { staff_can_edit_clients: false } as Record<string, unknown> | undefined,
  isError: false,
  isLoading: false,
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock('@/hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings, isError: state.isError, isLoading: state.isLoading }),
}));
vi.mock('@/hooks/useClientDependents', () => ({
  useClientDependents: () => ({
    dependents: [{ id: 'dep-ficticio-1', user_id: 'salao-ficticio', client_id: 'titular-ficticio', name: 'Dependente Fictício', nickname: null, notes: null, is_active: true, source: 'manual', created_at: '2030-01-01T00:00:00Z' }],
    loading: false, error: '', reload: vi.fn(),
  }),
}));
vi.mock('@/services/clientDependents', () => ({ createDependent: vi.fn(), updateDependent: vi.fn() }));
vi.mock('@/components/ui', () => ({
  Card: ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => <div>{action}{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
}));
import { ClientDependentsSection } from '@/components/ClientDependentsSection';

const renderSection = () => render(<ClientDependentsSection companyId="salao-ficticio" clientId="titular-ficticio" />);

describe('permissão de editar e arquivar dependentes', () => {
  beforeEach(() => {
    state.role = 'owner'; state.settings = { staff_can_edit_clients: false }; state.isError = false; state.isLoading = false;
  });
  it('dono edita mesmo com a chave desligada', () => {
    renderSection();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
  it('equipe com a chave ligada edita', () => {
    state.role = 'staff'; state.settings = { staff_can_edit_clients: true };
    renderSection();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
  it('equipe com a chave desligada só vê e cadastra', () => {
    state.role = 'staff';
    renderSection();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });
  it('equipe não edita enquanto os ajustes carregam ou falham', () => {
    state.role = 'staff'; state.settings = { staff_can_edit_clients: true }; state.isLoading = true;
    const { unmount } = renderSection();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    unmount(); state.isLoading = false; state.isError = true;
    renderSection();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });
  it('sem sessão (anon) ou outro papel não edita nem com a chave ligada', () => {
    state.settings = { staff_can_edit_clients: true };
    for (const role of [null, 'client']) {
      state.role = role;
      const { unmount } = renderSection();
      expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
      unmount();
    }
  });
});
