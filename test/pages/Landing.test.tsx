import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { TRIAL_DAYS } from '@/constants';

vi.mock('@/utils/publicAuthTheme', () => ({
  applyPublicAuthTheme: vi.fn(),
}));

describe('Landing de marketing', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('mostra trial de 20 dias, preço real e CTA de cadastro', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByTestId('marketing-landing')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: new RegExp(`${TRIAL_DAYS} dias`, 'i') }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/a agenda que faz/i);
    const solo = screen.getByRole('heading', { name: 'Solo' }).closest('article');
    const equipe = screen.getByRole('heading', { name: 'Equipe' }).closest('article');
    expect(solo).toHaveTextContent('R$ 34,90');
    expect(equipe).toHaveTextContent('R$ 59,90');
    expect(screen.queryByText(/10 dias/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+40%/)).not.toBeInTheDocument();
    expect(screen.getByText('Serviço, preço e clube')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agendar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /termos/i })).toHaveAttribute('href', '/termos');
  });

  it('troca preço para euro e leva o CTA ao cadastro', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /portugal/i }));
    const solo = screen.getByRole('heading', { name: 'Solo' }).closest('article');
    const equipe = screen.getByRole('heading', { name: 'Equipe' }).closest('article');
    expect(solo).toHaveTextContent('€ 9,90');
    expect(equipe).toHaveTextContent('€ 19,90');

    const trialLinks = screen.getAllByRole('link', { name: /testar 20 dias/i });
    expect(trialLinks[0]).toHaveAttribute('href', '/register');
  });
});
