/**
 * Convite com token (invite hardening): a tela de cadastro lê &invite=, repassa
 * o token para a validação, a metadata do signUp e o vínculo; sem token ou com
 * token inválido mostra que o convite foi atualizado.
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
const TOKEN = 'c'.repeat(64);
const STALE = 'Este convite foi atualizado. Peça ao gestor um novo link.';

const auth = supabase.auth as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
type RpcResult = { data: unknown; error: unknown };
let rpcHandlers: Record<string, (args: unknown) => RpcResult> = {};

function renderAt(query: string) {
  return render(
    <MemoryRouter initialEntries={[`/register?${query}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/staff-onboarding" element={<p>ONBOARDING DO COLABORADOR</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const memberRow = [{ id: MEMBER, name: 'TALES FURTADO', role: 'Barbeiro', staff_user_id: null, business_name: 'Moderna Barbearia', user_type: 'barber' }];

describe('Register: convite com token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    rpcHandlers = {
      get_team_member_for_invite: () => ({ data: memberRow, error: null }),
      complete_staff_invite: () => ({ data: MEMBER, error: null }),
    };
    rpc.mockImplementation((name: string, args: unknown) =>
      Promise.resolve(rpcHandlers[name] ? rpcHandlers[name](args) : { data: null, error: null }),
    );
  });

  it('valida o convite repassando o token', async () => {
    renderAt(`company=${COMPANY}&member=${MEMBER}&invite=${TOKEN}`);
    expect(await screen.findByDisplayValue('TALES FURTADO')).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('get_team_member_for_invite', {
      p_company_id: COMPANY,
      p_member_id: MEMBER,
      p_invite_token: TOKEN,
    });
    expect(screen.queryByText(STALE)).not.toBeInTheDocument();
  });

  it('link antigo (sem token): mostra que o convite foi atualizado e não abre o formulário', async () => {
    renderAt(`company=${COMPANY}&member=${MEMBER}`);
    expect(await screen.findByText(STALE)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalledWith('get_team_member_for_invite', expect.anything());
    expect(screen.queryByRole('button', { name: /criar minha conta/i })).not.toBeInTheDocument();
  });

  it('token inválido/vencido (validação não devolve o cadastro): mesma mensagem', async () => {
    rpcHandlers.get_team_member_for_invite = () => ({ data: [], error: null });
    renderAt(`company=${COMPANY}&member=${MEMBER}&invite=${TOKEN}`);
    expect(await screen.findByText(STALE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /criar minha conta/i })).not.toBeInTheDocument();
  });

  it('token malformado: mesma mensagem, sem consultar', async () => {
    renderAt(`company=${COMPANY}&member=${MEMBER}&invite=xyz`);
    expect(await screen.findByText(STALE)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalledWith('get_team_member_for_invite', expect.anything());
  });

  it('cadastro leva o token na metadata e no vínculo', async () => {
    const user = { id: 'staff-new', email: 'novo.colab@gmail.com', identities: [{ id: 'i' }] };
    auth.signUp.mockResolvedValue({ data: { user, session: { user, access_token: 't' } }, error: null });

    renderAt(`company=${COMPANY}&member=${MEMBER}&invite=${TOKEN}`);
    await screen.findByDisplayValue('TALES FURTADO');
    await userEvent.type(screen.getByLabelText(/e-mail \(gmail\)/i), 'novo.colab@gmail.com');
    await userEvent.type(screen.getByLabelText(/data de nascimento/i), '1993-09-17');
    await userEvent.type(screen.getByLabelText('Senha'), 'Senha@2026');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'Senha@2026');
    await userEvent.click(screen.getByRole('button', { name: /criar minha conta/i }));

    expect(await screen.findByText('ONBOARDING DO COLABORADOR')).toBeInTheDocument();
    const payload = auth.signUp.mock.calls[0][0];
    expect(payload.options.data).toMatchObject({ role: 'staff', company_id: COMPANY, member_id: MEMBER, invite_token: TOKEN });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('complete_staff_invite', {
      p_company_id: COMPANY,
      p_member_id: MEMBER,
      p_birth_date: '1993-09-17',
      p_invite_token: TOKEN,
    }));
  }, 15000);
});
