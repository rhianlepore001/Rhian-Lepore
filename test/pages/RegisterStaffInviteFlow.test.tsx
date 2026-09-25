/**
 * Convite de colaborador ponta a ponta (AuthProvider real + tela Register),
 * Supabase mockado. Reproduz o caso real de 24/09 (TALES FURTADO, Moderna
 * Barbearia): e-mail já tinha conta antiga e a senha não batia → a tela
 * mostrava "Não foi possível criar a conta. (#unknown)".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Register } from '@/pages/Register';
import { supabase } from '@/lib/supabase';

const COMPANY = '6d16babf-0000-4000-8000-000000000001';
const MEMBER = '8c00405e-0000-4000-8000-000000000002';

type RpcResult = { data: unknown; error: unknown };
let rpcHandlers: Record<string, (args: unknown) => RpcResult | Promise<RpcResult>> = {};

const auth = supabase.auth as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

function renderInvite() {
  return render(
    <MemoryRouter initialEntries={[`/register?company=${COMPANY}&member=${MEMBER}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/staff-onboarding" element={<p>ONBOARDING DO COLABORADOR</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillAndSubmit(email: string) {
  await screen.findByLabelText(/e-mail \(gmail\)/i);
  await userEvent.clear(screen.getByLabelText(/e-mail \(gmail\)/i));
  await userEvent.type(screen.getByLabelText(/e-mail \(gmail\)/i), email);
  const date = screen.getByLabelText(/data de nascimento/i) as HTMLInputElement;
  if (!date.value) await userEvent.type(date, '1993-09-17');
  const pwd = screen.getByLabelText('Senha') as HTMLInputElement;
  if (!pwd.value) {
    await userEvent.type(pwd, 'Senha@2026');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'Senha@2026');
  }
  await userEvent.click(screen.getByRole('button', { name: /criar minha conta/i }));
}

const userAlreadyExists = { code: 'user_already_exists', status: 422, name: 'AuthApiError', message: 'User already registered' };
const invalidCredentials = { code: 'invalid_credentials', status: 400, name: 'AuthApiError', message: 'Invalid login credentials' };
const session = (id: string, email: string) => ({ user: { id, email, identities: [{ id }] }, access_token: 't' });

describe('Convite de colaborador — cadastro confiável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    rpcHandlers = {
      get_team_member_for_invite: () => ({
        data: [{ id: MEMBER, name: 'TALES FURTADO', role: 'Barbeiro', staff_user_id: null, business_name: 'Moderna Barbearia', user_type: 'barber' }],
        error: null,
      }),
    };
    rpc.mockImplementation((name: string, args: unknown) =>
      Promise.resolve(rpcHandlers[name] ? rpcHandlers[name](args) : { data: null, error: null }),
    );
  });

  it('AC3/AC4: e-mail de conta antiga + senha diferente → mensagem clara, sem #unknown, com caminho de recuperação', async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: userAlreadyExists });
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: invalidCredentials });

    renderInvite();
    await fillAndSubmit('talesfurtado3@gmail.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/já tem uma conta no AgendiX/);
    expect(alert).toHaveTextContent(/use outro e-mail/);
    expect(alert).not.toHaveTextContent('#unknown');
    expect(screen.getByTestId('signup-error-action')).toHaveAttribute('href', '/forgot-password');
    expect(rpc).not.toHaveBeenCalledWith('log_signup_error', expect.anything());
  }, 15000);

  it('AC3: e-mail de conta de dono (senha certa) → explica que precisa de outro e-mail e não tenta purgar', async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: userAlreadyExists });
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'owner-old', email: 'talesfurtado17@gmail.com' }, session: session('owner-old', 'talesfurtado17@gmail.com') }, error: null });
    rpcHandlers.complete_staff_invite = () => ({ data: null, error: { code: 'P0001', message: 'owner_cannot_claim_staff_invite' } });

    renderInvite();
    await fillAndSubmit('talesfurtado17@gmail.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/conta de dono de negócio/);
    expect(alert).not.toHaveTextContent('Faça login');
    expect(rpc).not.toHaveBeenCalledWith('release_staff_email_for_reinvite', expect.anything());
    expect(auth.signOut).toHaveBeenCalled();
  }, 15000);

  it.each([
    ['muitas tentativas', { code: 'over_request_rate_limit', status: 429, name: 'AuthApiError', message: 'Request rate limit reached' }, /Aguarde 5 minutos/],
    ['sem conexão (iOS "Load failed")', { name: 'AuthRetryableFetchError', status: 0, message: 'Load failed' }, /Sem conexão/],
    ['senha fraca do Auth', { code: 'weak_password', status: 422, name: 'AuthWeakPasswordError', message: 'Password should contain...' }, /Senha fraca/],
  ])('AC3: %s → mensagem acionável', async (_label, error, expected) => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error });

    renderInvite();
    await fillAndSubmit('novo.colab@gmail.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(expected);
    expect(alert).not.toHaveTextContent('#unknown');
  }, 15000);

  it('AC3: convite já usado / inválido → pede novo convite', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'staff-new', identities: [{ id: 'i' }] }, session: session('staff-new', 'novo.colab@gmail.com') }, error: null });
    rpcHandlers.complete_staff_invite = () => ({ data: null, error: { code: 'P0001', message: 'invalid_invite' } });

    renderInvite();
    await fillAndSubmit('novo.colab@gmail.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/não é mais válido/);
    expect(alert).toHaveTextContent(/novo link/);
  }, 15000);

  it('AC3: erro realmente inesperado → mostra referência e registra com detalhes (sem e-mail completo)', async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'unexpected_failure', status: 500, name: 'AuthApiError', message: 'Database error saving new user' } });
    rpcHandlers.log_signup_error = () => ({ data: 'log-1', error: null });

    renderInvite();
    await fillAndSubmit('novo.colab@gmail.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Não foi possível criar a conta/);
    const ref = alert.textContent?.match(/Ref\. ([A-Z0-9]{6})/)?.[1];
    expect(ref).toBeTruthy();

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('log_signup_error', expect.anything()));
    const [, payload] = rpc.mock.calls.find((c) => c[0] === 'log_signup_error')!;
    expect(payload.p_details).toMatchObject({
      ref,
      flow: 'staff_invite',
      email: 'no***@gmail.com',
      company_id: COMPANY,
      member_id: MEMBER,
      error_code: 'unexpected_failure',
      error_status: 500,
      error_message: 'Database error saving new user',
    });
  }, 15000);

  it('AC2: conta criada mas vínculo falhou → novo toque só conclui o vínculo (sem 2º signUp, sem duplicar)', async () => {
    const email = 'novo.colab@gmail.com';
    auth.signUp.mockResolvedValue({ data: { user: { id: 'staff-new', identities: [{ id: 'i' }] }, session: session('staff-new', email) }, error: null });
    let claimCalls = 0;
    rpcHandlers.complete_staff_invite = () => {
      claimCalls += 1;
      return claimCalls === 1
        ? { data: null, error: { name: 'TypeError', message: 'TypeError: Load failed' } }
        : { data: MEMBER, error: null };
    };

    renderInvite();
    await fillAndSubmit(email);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão/);

    // Sessão da 1ª tentativa continua ativa.
    auth.getSession.mockResolvedValue({ data: { session: session('staff-new', email) }, error: null });
    await userEvent.click(screen.getByRole('button', { name: /criar minha conta/i }));

    expect(await screen.findByText('ONBOARDING DO COLABORADOR')).toBeInTheDocument();
    expect(auth.signUp).toHaveBeenCalledTimes(1);
    expect(claimCalls).toBe(2);
    expect(rpc).not.toHaveBeenCalledWith('release_staff_email_for_reinvite', expect.anything());
  }, 15000);
});

describe('Convite — e-mail existente e login com falha que não é senha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    rpcHandlers = {
      get_team_member_for_invite: () => ({
        data: [{ id: MEMBER, name: 'TALES FURTADO', role: 'Barbeiro', staff_user_id: null, business_name: 'Moderna Barbearia', user_type: 'barber' }],
        error: null,
      }),
    };
    rpc.mockImplementation((name: string, args: unknown) =>
      Promise.resolve(rpcHandlers[name] ? rpcHandlers[name](args) : { data: null, error: null }),
    );
  });

  it('limite de tentativas no login não vira "senha errada"', async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: userAlreadyExists });
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'over_request_rate_limit', status: 429, name: 'AuthApiError', message: 'Request rate limit reached' } });

    renderInvite();
    await fillAndSubmit('talesfurtado3@gmail.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Aguarde 5 minutos/);
    expect(alert).not.toHaveTextContent(/senha dessa conta/);
  }, 15000);
});
