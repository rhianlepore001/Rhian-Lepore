import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Register } from '@/pages/Register';

const fetchStaffInvite = vi.hoisted(() => vi.fn());

vi.mock('@/services/staffInvite', async () => {
  const actual = await vi.importActual<typeof import('@/services/staffInvite')>('@/services/staffInvite');
  return {
    ...actual,
    fetchStaffInvite,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    register: vi.fn(),
    userType: 'barber',
  }),
}));

describe('Register — convite de colaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sai de Validando convite e mostra o nome travado quando o convite é válido', async () => {
    fetchStaffInvite.mockResolvedValue({
      status: 'ready',
      member: {
        id: 'member-2',
        name: 'Tales Furtado',
        role: 'Barbeiro',
        staff_user_id: null,
        business_name: 'Barbearia Silva',
        user_type: 'barber',
      },
    });

    render(
      <MemoryRouter initialEntries={['/invite/owner-1/member-2']}>
        <Routes>
          <Route path="/invite/:companyId/:memberId" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Validando convite/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Validando convite/i)).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('staff-name-locked')).toHaveTextContent('Tales Furtado');
    expect(screen.getByLabelText(/E-mail \(Gmail\)/i)).toBeInTheDocument();
  });

  it('não fica preso em Validando convite quando a validação falha', async () => {
    fetchStaffInvite.mockRejectedValue(new Error('boom'));

    render(
      <MemoryRouter initialEntries={['/invite/owner-1/member-2']}>
        <Routes>
          <Route path="/invite/:companyId/:memberId" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Validando convite/i)).not.toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Peça ao gestor um novo link/i)).toBeInTheDocument();
  });
});
