import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileModal } from '../../components/ProfileModal';

const mock = vi.hoisted(() => ({
  auth: {
    user: { id: 'staff-id', email: 'staff@example.test', app_metadata: { provider: 'email' } },
    fullName: 'Marina Silva',
    businessName: 'Studio Fictício',
    region: 'BR',
    role: 'staff',
    userType: 'beauty',
    changePassword: vi.fn(),
  },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => mock.auth }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('focus-trap-react', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));

function renderProfile() {
  render(<MemoryRouter><ProfileModal onClose={vi.fn()} /></MemoryRouter>);
}
function openPasswordForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
}
function fillForm() {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'AtualFicticia!1' } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'NovaFicticia!2' } });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: 'NovaFicticia!2' } });
}

beforeEach(() => {
  mock.auth.role = 'staff';
  mock.auth.user.app_metadata.provider = 'email';
  mock.auth.changePassword.mockReset().mockResolvedValue(null);
});

describe('senha em Meu Perfil', () => {
  it.each(['owner', 'staff'])('oferece a troca de senha no perfil para %s', role => {
    mock.auth.role = role;
    renderProfile();
    openPasswordForm();
    expect(screen.getByRole('dialog', { name: 'Alterar senha' })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha atual')).toHaveFocus();
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirme a nova senha')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('mostra o sucesso e informa como ficam as demais sessões', async () => {
    renderProfile();
    openPasswordForm();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Senha alterada'));
    expect(screen.getByRole('status')).toHaveTextContent('outros dispositivos');
    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument();
    expect(mock.auth.changePassword).toHaveBeenCalledWith({
      currentPassword: 'AtualFicticia!1', newPassword: 'NovaFicticia!2', confirmation: 'NovaFicticia!2',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao perfil' }));
    expect(screen.getByRole('button', { name: 'Alterar senha' })).toHaveFocus();
  });

  it('indica o campo da senha atual, limpa o valor e devolve o foco', async () => {
    mock.auth.changePassword.mockResolvedValueOnce({ field: 'currentPassword', message: 'Confira a senha atual.' });
    renderProfile();
    openPasswordForm();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira a senha atual.');
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(screen.getByLabelText('Senha atual')).toHaveFocus();
    expect(screen.getByLabelText('Senha atual')).toHaveAccessibleDescription('Confira a senha atual.');
  });

  it('apresenta o campo de verificação em duas etapas e confirma com o código informado', async () => {
    mock.auth.changePassword.mockResolvedValueOnce({
      message: 'Informe o código do seu aplicativo autenticador.',
      mfaOptions: [{ value: 'totp-id', label: 'Aplicativo autenticador' }],
    });
    renderProfile();
    openPasswordForm();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    const code = await screen.findByLabelText('Código de verificação');
    expect(code).toHaveFocus();
    expect(code).toHaveAttribute('aria-invalid', 'false');
    expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    fireEvent.change(code, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Senha alterada'));
    expect(mock.auth.changePassword).toHaveBeenLastCalledWith(expect.any(Object), { code: '123456', factorId: 'totp-id' });
  });

  it('deixa o formulário fora do perfil de uma conta que só usa login social', () => {
    mock.auth.user.app_metadata.provider = 'google';
    renderProfile();
    expect(screen.queryByRole('button', { name: 'Alterar senha' })).not.toBeInTheDocument();
    expect(screen.getByText(/provedor que você usa para entrar/i)).toBeInTheDocument();
  });
});
