import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '@/pages/Login';

const loginMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    userType: 'barber',
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/services/onboarding', () => ({
  getOnboardingProgress: vi.fn(),
}));

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    document.documentElement.setAttribute('data-theme', 'beauty');
    document.documentElement.setAttribute('data-mode', 'light');
    localStorage.setItem('agendix_color_mode', 'light');
  });

  it('resets leftover session theme when the gateway mounts', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('barber');
      expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
    });
    expect(localStorage.getItem('agendix_color_mode')).toBe('light');
    expect(screen.getByTestId('category-barber')).toBeInTheDocument();
  });

  it('shows, focuses and scrolls to the error message when login fails', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    loginMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByTestId('category-barber'));
    await userEvent.type(screen.getByLabelText('E-mail'), 'owner@test.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /^entrar$/i }));

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('E-mail ou senha incorretos');
    expect(alert).toHaveTextContent('#invalidl');

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
  }, 10000);
});
