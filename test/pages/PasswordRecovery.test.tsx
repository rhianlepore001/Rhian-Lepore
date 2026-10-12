import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { __setPendingRecoveryCallback } from '@/utils/authRecoveryLink';

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  setSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/login" element={<div>tela de login</div>} />
        <Route path="/" element={<div>painel</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  __setPendingRecoveryCallback(null);
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
  localStorage.clear();
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  auth.setSession.mockResolvedValue({ data: {}, error: null });
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
});

describe('ForgotPassword', () => {
  it('valida o e-mail antes de chamar o Supabase', async () => {
    renderAt('/forgot-password');
    await userEvent.type(screen.getByLabelText('E-mail'), 'sem-arroba');
    await userEvent.click(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText(/Digite um e-mail válido/)).toBeInTheDocument();
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('envia com redirect para o domínio atual e mostra confirmação neutra', async () => {
    renderAt('/forgot-password');
    await userEvent.type(screen.getByLabelText('E-mail'), 'dono@exemplo.com');
    await userEvent.click(screen.getByTestId('forgot-submit'));
    await screen.findByTestId('forgot-sent');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('dono@exemplo.com', {
      redirectTo: `${window.location.origin}/?fluxo=nova-senha`,
    });
    expect(screen.getByText('dono@exemplo.com')).toBeInTheDocument();
    expect(screen.getByTestId('forgot-resend')).toBeDisabled();
    expect(screen.getByTestId('forgot-resend')).toHaveTextContent(/Reenviar em 1:00/);
    expect(document.body.textContent).not.toMatch(/barbearia|salão|estúdio/i);
  });

  it('mostra mensagem clara no limite de envio', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { status: 429, message: 'email rate limit exceeded' } });
    renderAt('/forgot-password');
    await userEvent.type(screen.getByLabelText('E-mail'), 'dono@exemplo.com');
    await userEvent.click(screen.getByTestId('forgot-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Aguarde um minuto/);
  });

  it('aplica o modo de cor salvo (claro)', () => {
    localStorage.setItem('agendix_color_mode', 'light');
    renderAt('/forgot-password');
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('barber');
  });
});

describe('UpdatePassword', () => {
  it('link expirado: explica e oferece novo link', async () => {
    __setPendingRecoveryCallback({ kind: 'error', reason: 'expired', code: 'otp_expired' });
    renderAt('/update-password');
    const box = await screen.findByTestId('recovery-invalid');
    expect(box).toHaveTextContent('Este link expirou');
    await userEvent.click(screen.getByTestId('recovery-request-new'));
    expect(await screen.findByTestId('forgot-password-page')).toBeInTheDocument();
  });

  it('sem link e sem sessão: estado "missing"', async () => {
    renderAt('/update-password');
    expect(await screen.findByTestId('recovery-invalid')).toHaveAttribute('data-reason', 'missing');
  });

  it('valida regras, confirmação e salva com sucesso → painel', async () => {
    __setPendingRecoveryCallback({ kind: 'implicit', accessToken: 'A', refreshToken: 'R' });
    renderAt('/update-password');
    await screen.findByTestId('update-password-form');
    expect(auth.setSession).toHaveBeenCalledTimes(1);

    const pwd = screen.getByLabelText('Nova senha');
    await userEvent.type(pwd, 'fraca');
    await userEvent.click(screen.getByTestId('update-password-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent('A senha precisa de 8 caracteres e uma letra maiúscula.');
    expect(auth.updateUser).not.toHaveBeenCalled();

    await userEvent.clear(pwd);
    await userEvent.type(pwd, 'Nova@Senha1');
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'strong');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'Nova@Senha2');
    await userEvent.click(screen.getByTestId('update-password-submit'));
    expect(await screen.findByText('As senhas não são iguais.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Confirmar nova senha'));
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'Nova@Senha1');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(pwd).toHaveAttribute('type', 'text');

    vi.useFakeTimers({ shouldAdvanceTime: true });
    await userEvent.click(screen.getByTestId('update-password-submit'));
    expect(await screen.findByTestId('recovery-success')).toBeInTheDocument();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'Nova@Senha1' });
    await act(async () => {
      vi.advanceTimersByTime(2600);
    });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText('painel')).toBeInTheDocument());
  });

  it('aceita senha só com o mínimo (sem número/símbolo) e trata weak_password do servidor', async () => {
    __setPendingRecoveryCallback({ kind: 'implicit', accessToken: 'A', refreshToken: 'R' });
    auth.updateUser.mockResolvedValue({ data: {}, error: { code: 'weak_password', status: 422, message: 'Password should contain at least one character of each: 0123456789', reasons: ['characters'] } });
    renderAt('/update-password');
    await screen.findByTestId('update-password-form');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'Barbearia');
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'weak');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'Barbearia');
    await userEvent.click(screen.getByTestId('update-password-submit'));
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'Barbearia' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Senha fraca: o servidor pediu/);
  });

  it('sessão caiu ao salvar → tela de link expirado', async () => {
    __setPendingRecoveryCallback({ kind: 'implicit', accessToken: 'A', refreshToken: 'R' });
    auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'Auth session missing!' } });
    renderAt('/update-password');
    await screen.findByTestId('update-password-form');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'Nova@Senha1');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'Nova@Senha1');
    await userEvent.click(screen.getByTestId('update-password-submit'));
    expect(await screen.findByTestId('recovery-invalid')).toHaveAttribute('data-reason', 'expired');
  });
});
