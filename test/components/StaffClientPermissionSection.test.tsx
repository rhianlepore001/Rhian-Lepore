import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const state = { role: 'owner', settings: {} as Record<string, unknown> };
const mutateAsync = vi.fn();
const showToast = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => state }));
vi.mock('@/hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings }),
  useUpdateStaffCanEditClients: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useToast: () => ({ showToast }),
}));
import { StaffClientPermissionSection } from '@/components/settings/StaffClientPermissionSection';

describe('chave do gestor para editar clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks(); state.role = 'owner'; state.settings = { staff_can_edit_clients: false };
    mutateAsync.mockResolvedValue('saved');
  });
  it('inicia desligada e salva ao ligar', async () => {
    render(<StaffClientPermissionSection />);
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(true));
    expect(showToast).toHaveBeenCalledWith('Permissão da equipe atualizada.', 'success');
  });
  it('salva ao desligar', async () => {
    state.settings = { staff_can_edit_clients: true };
    render(<StaffClientPermissionSection />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(false));
  });
  it('mantém o valor salvo quando a gravação falha', async () => {
    mutateAsync.mockRejectedValue(new Error('offline'));
    render(<StaffClientPermissionSection />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Não foi possível'), 'error'));
    expect(screen.getByRole('switch')).not.toBeChecked();
  });
  it('bloqueia antes da migration', () => {
    state.settings = {};
    render(<StaffClientPermissionSection />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
  it('não aparece para colaborador', () => {
    state.role = 'staff';
    const { container } = render(<StaffClientPermissionSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
