import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const state: { role: string; settings: Record<string, unknown> | null } = { role: 'owner', settings: null };
const mutateAsync = vi.fn();
const showToast = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock('../../hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: state.settings, isLoading: false }),
  useUpdateStaffAppointmentEditScope: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ colors: { text: '', textMuted: '', textSecondary: '', border: '' }, accent: { text: '', border: '', bgDim: '' } }),
}));
vi.mock('../../components/ui', () => ({
  Card: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => <div><h4>{title}</h4>{children}</div>,
  useToast: () => ({ showToast }),
}));

import { StaffAppointmentPermissionSection } from '../../components/settings/StaffAppointmentPermissionSection';

const radio = (v: string) => screen.getByDisplayValue(v) as HTMLInputElement;

describe('Configurações › Equipe — permissão de edição de agendamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.role = 'owner';
    state.settings = { user_id: 'owner-1', staff_appointment_edit_scope: 'none' };
    mutateAsync.mockResolvedValue('saved');
  });

  it('dono vê as três opções em pt-BR, com "Não podem editar" marcado por padrão', () => {
    render(<StaffAppointmentPermissionSection />);
    expect(screen.getByText('Permissões da equipe')).toBeInTheDocument();
    expect(screen.getByText('Não podem editar')).toBeInTheDocument();
    expect(screen.getByText('Só os próprios')).toBeInTheDocument();
    expect(screen.getByText('Todos os agendamentos')).toBeInTheDocument();
    expect(radio('none').checked).toBe(true);
    expect(screen.getByText(/Criar agendamentos, "Confirmar e cobrar" e marcar "Faltou"/)).toBeInTheDocument();
  });

  it('valor salvo é refletido', () => {
    state.settings = { user_id: 'owner-1', staff_appointment_edit_scope: 'own' };
    render(<StaffAppointmentPermissionSection />);
    expect(radio('own').checked).toBe(true);
  });

  it('trocar salva e confirma', async () => {
    render(<StaffAppointmentPermissionSection />);
    fireEvent.click(radio('all'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('all'));
    expect(showToast).toHaveBeenCalledWith('Permissão da equipe atualizada.', 'success');
    expect(radio('all').checked).toBe(true);
  });

  it('erro ao salvar volta para a opção anterior', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('boom'));
    render(<StaffAppointmentPermissionSection />);
    fireEvent.click(radio('own'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível salvar a permissão. Tente novamente.', 'error'));
    expect(radio('none').checked).toBe(true);
  });

  it('banco antigo (sem coluna): opções travadas no padrão com aviso', () => {
    state.settings = { user_id: 'owner-1' };
    render(<StaffAppointmentPermissionSection />);
    expect(radio('none').checked).toBe(true);
    expect(radio('all').disabled).toBe(true);
    expect(screen.getByTestId('staff-edit-scope-pending')).toBeInTheDocument();
    fireEvent.click(radio('all'));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('colaborador não vê a seção', () => {
    state.role = 'staff';
    const { container } = render(<StaffAppointmentPermissionSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
