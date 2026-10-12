import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Register } from '@/pages/Register';

const registerMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ register: registerMock, isAuthenticated: false, role: 'owner', companyId: null }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: { id: 'member-1', name: 'Ana', role: 'Cabeleireira', staff_user_id: null, business_name: 'Studio Ana', user_type: 'beauty' },
      error: null,
    }),
  },
}));

async function fillOwner(pwd: string) {
  await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
  await userEvent.type(screen.getByLabelText('Nome do negócio'), 'Studio Ana');
  await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await userEvent.type(screen.getByLabelText('Senha'), pwd);
  await userEvent.type(screen.getByLabelText('Confirmar senha'), pwd);
}

describe('Cadastro: nova política de senha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    registerMock.mockResolvedValue({ error: null });
  });

  it('não mostra mais a regra antiga de número e símbolo', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    expect(document.body.textContent).not.toMatch(/1 número e 1 símbolo/);
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'empty');
  });

  it('dono: aceita senha só com 8 caracteres + maiúscula (fraca) e envia', async () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    await fillOwner('Salaoana');
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'weak');
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('Senha fraca');
    await userEvent.click(screen.getByRole('button', { name: /finalizar cadastro/i }));
    await waitFor(() => expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ password: 'Salaoana' })));
  }, 10000);

  it('dono: sem maiúscula bloqueia e diz o que falta', async () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    await fillOwner('salaoana');
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'missing');
    await userEvent.click(screen.getByRole('button', { name: /finalizar cadastro/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A senha precisa de uma letra maiúscula.');
    expect(registerMock).not.toHaveBeenCalled();
  }, 10000);

  it('indicador sobe para forte e muito forte', async () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    const pwd = screen.getByLabelText('Senha');
    await userEvent.type(pwd, 'Salaoana1');
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'strong');
    await userEvent.clear(pwd);
    await userEvent.type(pwd, 'Salao Ana 2026');
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'very_strong');
  });

  it('convite de colaborador usa a mesma regra', async () => {
    render(
      <MemoryRouter initialEntries={['/register?company=owner-1&member=member-1']}>
        <Register />
      </MemoryRouter>,
    );
    await screen.findByLabelText(/e-mail \(gmail\)/i);
    await userEvent.type(screen.getByLabelText(/e-mail \(gmail\)/i), 'ana@gmail.com');
    await userEvent.type(screen.getByLabelText(/data de nascimento/i), '1993-06-06');
    await userEvent.type(screen.getByLabelText('Senha'), 'Cabelos8');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'Cabelos8');
    expect(screen.getByTestId('password-strength')).toHaveAttribute('data-level', 'strong');
    await userEvent.click(screen.getByRole('button', { name: /criar minha conta/i }));
    await waitFor(() => expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ password: 'Cabelos8', teamMemberId: 'member-1' })));
  }, 10000);
});
