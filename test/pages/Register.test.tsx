import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Register } from '@/pages/Register';

const registerMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    register: registerMock,
    isAuthenticated: false,
    role: 'owner',
    companyId: null,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: {
        id: 'member-1',
        name: 'Marcão',
        role: 'Barbeiro',
        staff_user_id: null,
        business_name: 'Barbearia Silva',
        user_type: 'barber',
      },
      error: null,
    }),
  },
}));

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('explica e-mail já cadastrado e rola até o erro', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    registerMock.mockResolvedValue({
      error: { code: 'user_already_exists', message: 'User already registered' },
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('Seu nome'), 'Marcão');
    await userEvent.type(screen.getByLabelText('Nome do negócio'), 'Barbearia Silva');
    await userEvent.type(screen.getByLabelText('E-mail'), 'marcao@gmail.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'Password123!');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /finalizar cadastro/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('e-mail já tem conta');
    expect(alert).not.toHaveTextContent('User already registered');
    expect(alert).not.toHaveTextContent('#useralre');

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
  }, 10000);

  it('rola até o erro de senha fraca no convite da equipe', async () => {
    render(
      <MemoryRouter initialEntries={['/register?company=owner-1&member=member-1']}>
        <Register />
      </MemoryRouter>
    );

    await screen.findByLabelText(/e-mail \(gmail\)/i);
    await userEvent.type(screen.getByLabelText(/e-mail \(gmail\)/i), 'marcao@gmail.com');
    await userEvent.type(screen.getByLabelText(/data de nascimento/i), '1993-06-06');
    await userEvent.type(screen.getByLabelText('Senha'), 'password');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'password');
    await userEvent.click(screen.getByRole('button', { name: /criar minha conta/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/maiúscula/i);

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, 10000);

  it('convite novo envia o member_id da URL — vínculo no profissional reconvidado', async () => {
    registerMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter initialEntries={['/register?company=owner-1&member=member-new-reinvite']}>
        <Register />
      </MemoryRouter>
    );

    await screen.findByLabelText(/e-mail \(gmail\)/i);
    await userEvent.type(screen.getByLabelText(/e-mail \(gmail\)/i), 'e2e.colab@example.com');
    await userEvent.type(screen.getByLabelText(/data de nascimento/i), '1993-06-06');
    await userEvent.type(screen.getByLabelText('Senha'), 'Password123!');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /criar minha conta/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'e2e.colab@example.com',
          companyId: 'owner-1',
          teamMemberId: 'member-new-reinvite',
        }),
      );
    });
  }, 10000);
});
